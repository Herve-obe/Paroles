/*
 * Module « format-txt » : import et export d'une chanson en fichier .txt.
 * Référence : cahier des charges, section 4.2.
 *
 * Format (UTF-8, éditable dans le Bloc-notes) :
 *   # titre: Titre de la chanson        (obligatoire)
 *   # artiste: ...   # candidat: 1   # categorie: 20   # theme: ...
 *   # mode: ORCHESTRE   # note: ...   # faux1: ...   # faux2: ...
 *
 *   Une ligne de paroles par ligne affichée
 *   Et je chante [ces mots à trouver]
 *
 * Toute erreur est signalée avec le nom du fichier et le numéro de ligne.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Clé d'information sans majuscules ni accents : « Catégorie » → « categorie ». */
  function normaliserCle(cle) {
    return String(cle).trim().toLowerCase().normalize('NFD').replace(/\p{M}/gu, '');
  }

  /** Reconnaît une valeur de catégorie : 10 à 50, « meme » / « même », « finale ». */
  function lireCategorie(valeur) {
    const v = normaliserCle(valeur).replace(/\s+/g, ' ');
    if (['10', '20', '30', '40', '50'].indexOf(v) >= 0) return v;
    if (v === 'meme' || v === 'la meme chanson') return 'meme';
    if (v === 'finale') return 'finale';
    return null;
  }

  /**
   * Lit le contenu texte d'un fichier .txt.
   * @param {string} contenu  texte du fichier
   * @param {string} [nomFichier] nom affiché dans les messages
   * @returns {{ok: boolean, chanson: (object|null), erreurs: Array, avertissements: Array}}
   *   chaque erreur ou avertissement : { ligne (numéro ou null), message, texte (message complet) }
   */
  function lire(contenu, nomFichier) {
    const chanson = Paroles.chanson;
    const fichier = nomFichier || '';
    const erreurs = [];
    const avertissements = [];
    const champs = {};
    const lignesParoles = [];
    let titreVu = false;

    const ajouter = (liste, ligne, message) =>
      liste.push({ ligne: ligne || null, message, texte: chanson.formaterMessage(fichier, ligne, message) });

    const lignes = String(contenu == null ? '' : contenu).replace(/^﻿/, '').split(/\r\n|\r|\n/);

    lignes.forEach((brute, index) => {
      const numero = index + 1;
      const ligne = brute.trim();
      if (!ligne) return;

      if (ligne[0] !== '#') {
        lignesParoles.push({ texte: ligne, numero });
        return;
      }

      /* Ligne d'information « # cle: valeur » */
      const corps = ligne.slice(1);
      const deuxPoints = corps.indexOf(':');
      if (deuxPoints < 0) {
        ajouter(erreurs, numero, 'ligne d\'information sans « : » (forme attendue : « # cle: valeur »)');
        return;
      }
      const cle = normaliserCle(corps.slice(0, deuxPoints));
      const valeur = corps.slice(deuxPoints + 1).trim();

      switch (cle) {
        case 'titre':
          titreVu = true;
          if (!valeur) ajouter(erreurs, numero, 'le titre est vide');
          champs.titre = valeur;
          break;
        case 'artiste':
        case 'theme':
        case 'note':
        case 'faux1':
        case 'faux2':
          champs[cle] = valeur;
          break;
        case 'candidat':
          if (!valeur) break;
          if (!/^\d+$/.test(valeur) || +valeur < 1 || +valeur > chanson.CANDIDAT_MAX) {
            ajouter(erreurs, numero, 'numéro de candidat invalide « ' + valeur + ' » : un nombre de 1 à ' + chanson.CANDIDAT_MAX + ' est attendu');
          } else {
            champs.candidat = +valeur;
          }
          break;
        case 'categorie': {
          if (!valeur) break;
          const code = lireCategorie(valeur);
          if (code === null) {
            ajouter(erreurs, numero, 'catégorie inconnue « ' + valeur + ' » : valeurs possibles 10, 20, 30, 40, 50, meme, finale');
          } else {
            champs.categorie = code;
          }
          break;
        }
        case 'mode': {
          if (!valeur) break;
          const mode = valeur.toUpperCase();
          if (chanson.MODES.indexOf(mode) < 0) {
            ajouter(erreurs, numero, 'mode inconnu « ' + valeur + ' » : ORCHESTRE ou PLAYBACK attendu');
          } else {
            champs.mode = mode;
          }
          break;
        }
        default:
          ajouter(avertissements, numero, 'information inconnue « ' + corps.slice(0, deuxPoints).trim() + ' », ignorée');
      }
    });

    /* Paroles et passage à trou */
    const analyse = chanson.analyserParoles(lignesParoles);
    analyse.erreurs.forEach((e) => ajouter(erreurs, e.ligne, e.message));

    if (!titreVu) ajouter(erreurs, null, 'titre manquant : ajoutez une ligne « # titre: ... » en haut du fichier');

    champs.lignes = analyse.lignes;
    const resultat = chanson.creer(champs);

    if (analyse.erreurs.length === 0 && chanson.motsATrouver(resultat).length === 0) {
      ajouter(erreurs, null, 'aucun mot à trouver : entourez les mots à trouver de crochets [ ]');
    }

    /* Avertissements de l'éditeur (fausses propositions, joker « 2 mots ») */
    if (erreurs.length === 0) {
      chanson.valider(resultat).avertissements.forEach((a) => ajouter(avertissements, null, a.charAt(0).toLowerCase() + a.slice(1)));
    }

    /* Erreurs classées par numéro de ligne ; celles sans ligne à la fin. */
    erreurs.sort((a, b) => (a.ligne || Infinity) - (b.ligne || Infinity));

    const ok = erreurs.length === 0;
    return { ok, chanson: ok ? resultat : null, erreurs, avertissements };
  }

  /** Nettoie une valeur d'information pour l'écrire sur une seule ligne. */
  function surUneLigne(valeur) {
    return String(valeur == null ? '' : valeur).replace(/[\r\n]+/g, ' ').trim();
  }

  /**
   * Écrit une chanson au format .txt (fins de ligne Windows, pour le Bloc-notes).
   * @param {object} chanson
   * @returns {string}
   */
  function ecrire(chanson) {
    const lignes = ['# titre: ' + surUneLigne(chanson.titre)];
    const facultatif = (cle, valeur) => { if (surUneLigne(valeur)) lignes.push('# ' + cle + ': ' + surUneLigne(valeur)); };

    facultatif('artiste', chanson.artiste);
    lignes.push('# candidat: ' + chanson.candidat);
    facultatif('categorie', chanson.categorie);
    facultatif('theme', chanson.theme);
    lignes.push('# mode: ' + chanson.mode);
    facultatif('note', chanson.note);
    facultatif('faux1', chanson.faux1);
    facultatif('faux2', chanson.faux2);
    lignes.push('');
    chanson.lignes.forEach((ligne) => lignes.push(Paroles.chanson.ecrireLigne(ligne.mots)));

    return lignes.join('\r\n') + '\r\n';
  }

  /**
   * Transforme les octets d'un fichier en texte : UTF-8 (avec ou sans BOM),
   * UTF-16 (avec BOM), sinon ANSI Windows-1252 (ancien Bloc-notes).
   * @param {Uint8Array|ArrayBuffer} octets
   * @returns {{texte: string, encodage: string}}
   */
  function decoder(octets) {
    const o = octets instanceof Uint8Array ? octets : new Uint8Array(octets);
    if (o[0] === 0xEF && o[1] === 0xBB && o[2] === 0xBF) {
      return { texte: new TextDecoder('utf-8').decode(o.subarray(3)), encodage: 'utf-8' };
    }
    if (o[0] === 0xFF && o[1] === 0xFE) return { texte: new TextDecoder('utf-16le').decode(o.subarray(2)), encodage: 'utf-16le' };
    if (o[0] === 0xFE && o[1] === 0xFF) return { texte: new TextDecoder('utf-16be').decode(o.subarray(2)), encodage: 'utf-16be' };
    try {
      return { texte: new TextDecoder('utf-8', { fatal: true }).decode(o), encodage: 'utf-8' };
    } catch (e) {
      return { texte: new TextDecoder('windows-1252').decode(o), encodage: 'windows-1252' };
    }
  }

  /**
   * Lit un fichier à partir de ses octets (glisser-déposer ou bouton « Importer »).
   * Ajoute un avertissement si le fichier n'était pas en UTF-8.
   */
  function lireOctets(octets, nomFichier) {
    const decode = decoder(octets);
    const resultat = lire(decode.texte, nomFichier);
    if (decode.encodage === 'windows-1252') {
      const message = 'fichier enregistré en ANSI (Windows-1252), converti automatiquement ; pensez à le réenregistrer en UTF-8';
      resultat.avertissements.unshift({ ligne: null, message, texte: Paroles.chanson.formaterMessage(nomFichier || '', null, message) });
    }
    return resultat;
  }

  Paroles.formatTxt = { lire, ecrire, decoder, lireOctets };
})(typeof globalThis !== 'undefined' ? globalThis : window);

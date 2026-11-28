/*
 * Module « affichage » : calcule ce que montrent les écrans de sortie.
 * Référence : cahier des charges, sections 3.2 et 5.
 *
 * L'écran opérateur calcule ce contenu et l'envoie tel quel aux écrans de
 * sortie, qui n'ont plus qu'à le dessiner. Les mots à trouver sont déjà
 * remplacés par leurs « _ » : leur texte n'est jamais envoyé avant la
 * révélation (impossible de le voir, même en fouillant l'écran de sortie).
 *
 * Contenu envoyé :
 *   { noir: bool, type: 'vide' }
 *   { noir: bool, type: 'titre', titre, artiste }
 *   { noir: bool, type: 'paroles', lignes: [ { index, role: 'courante' | 'suivante',
 *       masquer: bool, mots: [ { texte, masque: bool } ] } ] }
 * « index » est le numéro de la ligne dans la chanson : il permet aux écrans
 * de sortie de faire défiler les lignes au lieu de les redessiner.
 *
 * De la saisie à la révélation (lot 4), les lignes du trou sont envoyées
 * ensemble (rôle 'trou'), et chaque mot porte un « etat » :
 *   'normal' (hors trou), 'vide' (case vide : « _ »), 'propose' (jaune),
 *   'bloque' (bleu), 'juste' (vert, le bon mot), 'faux' (rouge, puis
 *   remplacé par « correction » après « attente » millisecondes).
 * Une fois tout révélé : statut { type: 'bonne' | 'mauvaise', texte, attente }.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Mots d'une ligne prêts à afficher, masqués si besoin. */
  function motsAffiches(ligne, masquer) {
    const mots = Paroles.mots;
    return ligne.mots.map((m) => {
      const aTrouver = m.aTrouver && mots.estMot(m.texte);
      if (masquer && aTrouver) return { texte: mots.masquer(m.texte), masque: true };
      return { texte: m.texte, masque: false };
    });
  }

  /**
   * Lignes du trou pendant la saisie, le blocage et la révélation.
   * Le bon mot n'est envoyé qu'une fois révélé.
   */
  function lignesDuTrou(chanson, jeu, p) {
    const C = Paroles.chanson;
    const trou = C.passage(chanson);
    const aTrouver = C.motsATrouver(chanson);
    const evaluation = Paroles.jeu.evaluation(jeu, chanson, p.accents);
    const delai = Math.round((typeof p.delaiCorrection === 'number' ? p.delaiCorrection : 1.5) * 1000);
    const maintenant = p.maintenant || 0;
    const numero = {}; // « ligne:position » → rang du mot à trouver
    aTrouver.forEach((m, k) => { numero[m.ligne + ':' + m.position] = k; });

    const lignes = [];
    for (let index = trou.debut; index <= trou.fin; index += 1) {
      const mots = [];
      chanson.lignes[index].mots.forEach((m, position) => {
        const k = numero[index + ':' + position];
        if (k === undefined) {
          if (!m.aTrouver) mots.push({ texte: m.texte, masque: false, etat: 'normal' });
          return; // ponctuation du trou : non affichée
        }
        const propose = (jeu.proposition && jeu.proposition[k]) ? jeu.proposition[k].trim() : '';
        const masque = Paroles.mots.masquer(aTrouver[k].texte);
        if (k < jeu.reveles) {
          if (evaluation.mots[k].juste) {
            mots.push({ texte: aTrouver[k].mot, masque: false, etat: 'juste' });
          } else {
            const ecoule = maintenant - (jeu.heures[k] || 0);
            mots.push({
              texte: propose || masque,
              masque: !propose,
              etat: 'faux',
              correction: aTrouver[k].mot,
              attente: Math.max(0, delai - ecoule)
            });
          }
        } else if (propose) {
          mots.push({ texte: propose, masque: false, etat: jeu.phase === 'saisie' ? 'propose' : 'bloque' });
        } else {
          mots.push({ texte: masque, masque: true, etat: 'vide' });
        }
      });
      lignes.push({ index, role: 'trou', masquer: true, mots });
    }

    let statut;
    if (jeu.phase === 'revele') {
      const type = evaluation.statut;
      const textes = p.textesStatut || { bonne: 'Bonne réponse', mauvaise: 'Mauvaise réponse' };
      // Le statut s'affiche quand le dernier mot faux a été corrigé.
      const attente = lignes.reduce((max, l) => l.mots.reduce((m, mot) => Math.max(m, mot.attente || 0), max), 0);
      statut = { type, texte: textes[type], attente };
    }
    return { lignes, statut };
  }

  /**
   * @param {object} p
   * @param {object|null} p.chanson   chanson chargée
   * @param {object|null} p.jeu       état du déroulé (module jeu)
   * @param {number} p.nbLignes       1, 2 ou 3
   * @param {boolean} p.noir          bouton « Noir » enfoncé
   * @param {boolean} [p.ligneSuivante] false pour ne pas montrer la ligne suivante
   * @param {string} [p.accents]       'tolerant' ou 'strict' (lot 4)
   * @param {number} [p.delaiCorrection] secondes avant la correction d'un mot faux
   * @param {object} [p.textesStatut]  { bonne, mauvaise }
   * @param {number} [p.maintenant]    heure actuelle en millisecondes
   */
  function calculer(p) {
    const noir = !!p.noir;
    const chanson = p.chanson;
    const jeu = p.jeu;
    if (!chanson || !jeu) return { noir, type: 'vide' };

    if (jeu.phase === 'chargee') {
      return jeu.titre ? { noir, type: 'titre', titre: chanson.titre, artiste: chanson.artiste } : { noir, type: 'vide' };
    }
    if (jeu.phase === 'intro') return { noir, type: 'vide' }; // écran sans paroles entre titre et ligne 1

    // De la saisie à la révélation : toutes les lignes du trou ensemble (décision 4).
    const surLeTrou = jeu.phase === 'saisie' || jeu.phase === 'bloque' ||
      (jeu.phase === 'revele' && jeu.ligne <= Paroles.chanson.passage(chanson).fin);
    if (surLeTrou) {
      const t = lignesDuTrou(chanson, jeu, p);
      const resultat = { noir, type: 'paroles', lignes: t.lignes };
      if (t.statut) resultat.statut = t.statut;
      return resultat;
    }

    const nombre = p.ligneSuivante === false ? 1 : p.nbLignes || 2;
    const trou = Paroles.chanson.passage(chanson);
    const lignes = Paroles.jeu.lignesVisibles(jeu, chanson, nombre).map((index, rang) => {
      const masquer = !!trou && index >= trou.debut && index <= trou.fin && jeu.phase !== 'revele';
      return { index, role: rang === 0 ? 'courante' : 'suivante', masquer, mots: motsAffiches(chanson.lignes[index], masquer) };
    });
    return { noir, type: 'paroles', lignes };
  }

  Paroles.affichage = { calculer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

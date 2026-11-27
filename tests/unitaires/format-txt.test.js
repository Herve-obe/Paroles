/*
 * Tests de l'import et de l'export des fichiers .txt (section 4.2) :
 * règle de test n° 1 de la section 13, et décisions 1, 2, 3, 15, 16.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;
  const txt = P.formatTxt;

  /* Fichier conforme à l'exemple de la section 4.2 (paroles inventées). */
  const FICHIER_VALIDE = [
    '# titre: Le café du port',
    '# artiste: Les Marées Basses',
    '# candidat: 2',
    '# categorie: 20',
    '# theme: Bord de mer',
    '# mode: PLAYBACK',
    '# note: Prévoir le micro HF 3',
    '# faux1: tous les matins d\'hiver que le premier bateau',
    '# faux2: toutes les nuits d\'automne que le petit navire',
    '',
    'Sur le quai, les mouettes se disputent',
    '',
    'Moi j\'attends sur le banc [tous les soirs d\'été]',
    '[Que le dernier ferry] me ramène à toi',
    'Mais le ferry s\'en va, je reste là'
  ].join('\r\n');

  /** Raccourci : importe un texte construit à partir de lignes. */
  function lire(lignes, nom) {
    return txt.lire(lignes.join('\n'), nom || 'essai.txt');
  }

  /** Raccourci : la liste des mots à trouver, nettoyés. */
  function motsDuTrou(chanson) {
    return P.chanson.motsATrouver(chanson).map((m) => m.mot);
  }

  groupe('Import .txt : fichier valide (règle 1)', () => {
    const resultat = txt.lire(FICHIER_VALIDE, 'cafe.txt');
    const chanson = resultat.chanson;

    test('le fichier est accepté sans erreur ni avertissement', () => {
      vrai(resultat.ok);
      egal(resultat.erreurs, []);
      egal(resultat.avertissements, []);
    });

    test('les informations sont lues', () => {
      egal(chanson.titre, 'Le café du port');
      egal(chanson.artiste, 'Les Marées Basses');
      egal(chanson.candidat, 2);
      egal(chanson.categorie, '20');
      egal(chanson.theme, 'Bord de mer');
      egal(chanson.mode, 'PLAYBACK');
      egal(chanson.note, 'Prévoir le micro HF 3');
    });

    test('les lignes vides sont ignorées : 4 lignes de paroles', () => {
      egal(chanson.lignes.length, 4);
    });

    test('les mots de chaque ligne sont bien découpés', () => {
      egal(chanson.lignes[0].mots.map((m) => m.texte), ['Sur', 'le', 'quai,', 'les', 'mouettes', 'se', 'disputent']);
      egal(chanson.lignes[1].mots.map((m) => m.aTrouver), [false, false, false, false, false, true, true, true, true]);
    });

    test('le passage à trou est trouvé : lignes 2 et 3 (numérotées à partir de 1), 8 mots', () => {
      egal(P.chanson.passage(chanson), { debut: 1, fin: 2 });
      egal(motsDuTrou(chanson), ['tous', 'les', 'soirs', "d'été", 'Que', 'le', 'dernier', 'ferry']);
    });

    test('une ligne après le trou est acceptée et sans mot à trouver', () => {
      egal(chanson.lignes[3].mots.every((m) => !m.aTrouver), true);
    });

    test('les fausses propositions sont lues', () => {
      egal(chanson.faux1, "tous les matins d'hiver que le premier bateau");
      egal(chanson.faux2, "toutes les nuits d'automne que le petit navire");
      vrai(P.chanson.troisPropositionsDisponible(chanson));
    });
  });

  groupe('Import .txt : variantes acceptées', () => {
    test('les clés ignorent majuscules et accents (Catégorie = categorie)', () => {
      const r = lire(['# Titre: A', '# Catégorie: 50', '# Thème: X', '# MODE: orchestre', 'la [suite]']);
      vrai(r.ok);
      egal(r.chanson.categorie, '50');
      egal(r.chanson.theme, 'X');
      egal(r.chanson.mode, 'ORCHESTRE');
    });

    test('« meme » et « même » donnent la catégorie La même chanson ; « finale » est acceptée', () => {
      egal(lire(['# titre: A', '# categorie: même', 'la [suite]']).chanson.categorie, 'meme');
      egal(lire(['# titre: A', '# categorie: meme', 'la [suite]']).chanson.categorie, 'meme');
      egal(lire(['# titre: A', '# categorie: Finale', 'la [suite]']).chanson.categorie, 'finale');
    });

    test('valeurs par défaut : candidat 1, mode ORCHESTRE, champs vides', () => {
      const c = lire(['# titre: A', 'la [suite]']).chanson;
      egal(c.candidat, 1);
      egal(c.mode, 'ORCHESTRE');
      egal(c.artiste, '');
      egal(c.categorie, '');
    });

    test('des mots non marqués au milieu du trou restent en clair (décision 2)', () => {
      const r = lire(['# titre: A', 'Ce soir [on oublie tout] et [peut-être] demain ?']);
      vrai(r.ok);
      egal(motsDuTrou(r.chanson), ['on', 'oublie', 'tout', 'peut-être']);
    });

    test('plusieurs groupes sur des lignes qui se suivent forment un seul passage', () => {
      const r = lire(['# titre: A', 'intro', 'une [première] ligne', '[deuxième] ligne', '[troisième]']);
      vrai(r.ok);
      egal(P.chanson.passage(r.chanson), { debut: 1, fin: 3 });
    });

    test('une ligne vide entre deux lignes à trou ne coupe pas le passage', () => {
      const r = lire(['# titre: A', 'une [première] ligne', '', '[deuxième] ligne']);
      vrai(r.ok);
    });

    test('la ponctuation collée au crochet est acceptée : [toi], «[oui]» et [toi ?]', () => {
      const r = lire(['# titre: A', 'pour [toi], «[oui]» et [toi ?]']);
      vrai(r.ok, JSON.stringify(r.erreurs));
      egal(motsDuTrou(r.chanson), ['toi', 'oui', 'toi']);
    });

    test('une clé inconnue donne un avertissement et n\'empêche pas l\'import', () => {
      const r = lire(['# titre: A', '# tempo: 120', 'la [suite]']);
      vrai(r.ok);
      vrai(r.avertissements.some((a) => /ligne 2 :/.test(a.texte) && /tempo/.test(a.texte)), JSON.stringify(r.avertissements));
    });

    test('un fichier avec BOM UTF-8 au début est lu normalement', () => {
      const r = txt.lire('﻿# titre: A\nla [suite]', 'a.txt');
      vrai(r.ok);
      egal(r.chanson.titre, 'A');
    });
  });

  groupe('Import .txt : fichiers invalides refusés avec la ligne (règle 1)', () => {
    /** Vérifie que l'import échoue et que le message cite le fichier et la ligne. */
    function refuse(lignes, numeroLigne, motCle) {
      const r = lire(lignes, 'faux.txt');
      faux(r.ok, 'le fichier aurait dû être refusé');
      vrai(r.erreurs.length >= 1, 'au moins une erreur attendue');
      const e = r.erreurs[0];
      if (numeroLigne !== null) {
        egal(e.ligne, numeroLigne, 'numéro de ligne');
        vrai(e.texte.indexOf('faux.txt, ligne ' + numeroLigne + ' :') === 0, 'message : ' + e.texte);
      } else {
        vrai(e.texte.indexOf('faux.txt') === 0, 'message : ' + e.texte);
      }
      if (motCle) vrai(e.message.toLowerCase().indexOf(motCle) >= 0, 'message : ' + e.message);
      return r;
    }

    test('titre manquant', () => {
      refuse(['# artiste: X', 'la [suite]'], null, 'titre');
    });

    test('titre vide', () => {
      refuse(['# titre:   ', 'la [suite]'], 1, 'titre');
    });

    test('aucun mot à trouver', () => {
      refuse(['# titre: A', 'pas de crochets ici'], null, 'aucun mot');
    });

    test('crochet non fermé sur la même ligne (décision 3)', () => {
      refuse(['# titre: A', 'intro', 'la [suite', 'du trou]'], 3, 'non fermé');
    });

    test('crochet fermé sans avoir été ouvert', () => {
      refuse(['# titre: A', 'la suite]'], 2, 'ouvert');
    });

    test('crochet ouvert deux fois', () => {
      refuse(['# titre: A', 'la [suite [du] trou]'], 2, 'deux fois');
    });

    test('crochet au milieu d\'un mot : chan[tons] (décision 3)', () => {
      refuse(['# titre: A', 'nous chan[tons]'], 2, 'milieu');
    });

    test('crochet au milieu d\'un mot : [chan]tons', () => {
      refuse(['# titre: A', 'nous [chan]tons'], 2, 'milieu');
    });

    test("crochet au milieu d'un mot : l'[amour] et [peut]-être", () => {
      refuse(['# titre: A', "l'[amour]"], 2, 'milieu');
      refuse(['# titre: A', '[peut]-être'], 2, 'milieu');
    });

    test('crochets vides ou sans mot', () => {
      refuse(['# titre: A', 'la [] suite'], 2, 'vide');
      refuse(['# titre: A', 'la [ ? ] suite'], 2, 'vide');
    });

    test('deux passages à trou séparés par une ligne sans crochet (décision 2)', () => {
      refuse(['# titre: A', 'une [première] ligne', 'une ligne normale', 'une [autre] ligne'], 4, 'passage');
    });

    test('catégorie inconnue', () => {
      refuse(['# titre: A', '# categorie: 25', 'la [suite]'], 2, 'catégorie');
    });

    test('mode inconnu', () => {
      refuse(['# titre: A', '# mode: KARAOKE', 'la [suite]'], 2, 'mode');
    });

    test('numéro de candidat invalide (décision 16 : de 1 à 4)', () => {
      refuse(['# titre: A', '# candidat: 5', 'la [suite]'], 2, 'candidat');
      refuse(['# titre: A', '# candidat: Paul', 'la [suite]'], 2, 'candidat');
    });

    test('ligne d\'information sans « : »', () => {
      refuse(['# titre Le café', 'la [suite]'], 1, ':');
    });

    test('sans nom de fichier, le message commence par « Ligne »', () => {
      const r = txt.lire('# titre: A\nla [suite', '');
      vrai(r.erreurs[0].texte.indexOf('Ligne 2 :') === 0, r.erreurs[0].texte);
    });
  });

  groupe('Export .txt', () => {
    /** Retire l'identifiant interne, qui change à chaque import. */
    function sansId(chanson) {
      const copie = JSON.parse(JSON.stringify(chanson));
      delete copie.id;
      return copie;
    }

    test('un fichier exporté puis réimporté redonne exactement la même chanson', () => {
      const premiere = txt.lire(FICHIER_VALIDE, 'cafe.txt').chanson;
      const exporte = txt.ecrire(premiere);
      const seconde = txt.lire(exporte, 'export.txt');
      vrai(seconde.ok, JSON.stringify(seconde.erreurs));
      egal(sansId(seconde.chanson), sansId(premiere));
    });

    test('les mots à trouver qui se suivent sont regroupés dans une seule paire de crochets', () => {
      const c = lire(['# titre: A', 'Moi [tous] [les] [soirs]']).chanson;
      vrai(txt.ecrire(c).indexOf('Moi [tous les soirs]') >= 0);
    });

    test('la ponctuation collée au bord du groupe reste hors des crochets', () => {
      const c = lire(['# titre: A', 'pour «[toi, mon ami]» !']).chanson;
      vrai(txt.ecrire(c).indexOf('pour «[toi, mon ami]» !') >= 0, txt.ecrire(c));
    });

    test('l\'export commence par les informations et contient le titre', () => {
      const c = txt.lire(FICHIER_VALIDE, 'cafe.txt').chanson;
      const sortie = txt.ecrire(c);
      vrai(sortie.indexOf('# titre: Le café du port') === 0);
      vrai(sortie.indexOf('# theme: Bord de mer') >= 0);
      vrai(sortie.indexOf('# note: Prévoir le micro HF 3') >= 0);
    });

    test('l\'export utilise des fins de ligne Windows (Bloc-notes)', () => {
      const c = lire(['# titre: A', 'la [suite]']).chanson;
      vrai(txt.ecrire(c).indexOf('\r\n') > 0);
    });
  });

  groupe('Encodage des fichiers', () => {
    test('un fichier UTF-8 est lu tel quel', () => {
      const octets = new Uint8Array([0xC3, 0xA9, 0x74, 0xC3, 0xA9]); // « été » en UTF-8
      egal(txt.decoder(octets), { texte: 'été', encodage: 'utf-8' });
    });

    test('un fichier ANSI (Windows-1252) est converti', () => {
      const octets = new Uint8Array([0xE9, 0x74, 0xE9, 0x20, 0x9C]); // « été œ » en Windows-1252
      egal(txt.decoder(octets), { texte: 'été œ', encodage: 'windows-1252' });
    });

    test('le BOM UTF-8 est retiré', () => {
      egal(txt.decoder(new Uint8Array([0xEF, 0xBB, 0xBF, 0x61])), { texte: 'a', encodage: 'utf-8' });
    });

    test('lireOctets ajoute un avertissement quand le fichier était en ANSI', () => {
      const texte = '# titre: Ete\nla [suite] ';
      const octets = new Uint8Array(Array.from(texte, (c) => c.charCodeAt(0)).concat([0xE9]));
      const r = txt.lireOctets(octets, 'ansi.txt');
      vrai(r.ok);
      vrai(r.avertissements.some((a) => /ANSI \(Windows-1252\)/.test(a.texte)), JSON.stringify(r.avertissements));
    });
  });

  /* Les fichiers d'exemple livrés avec l'application doivent s'importer
     sans erreur ni avertissement (lu seulement sous Node.js). */
  if (globalThis.Tests.enNode) {
    groupe('Chansons d\'exemple livrées', () => {
      const fs = require('node:fs');
      const chemin = require('node:path');
      const dossier = chemin.join(__dirname, '..', '..', 'app', 'exemples');
      const fichiers = fs.readdirSync(dossier).filter((f) => f.endsWith('.txt'));

      test('il y a 2 chansons d\'exemple', () => {
        egal(fichiers.length, 2);
      });

      fichiers.forEach((fichier) => {
        test(fichier + ' s\'importe sans erreur ni avertissement', () => {
          const r = txt.lireOctets(fs.readFileSync(chemin.join(dossier, fichier)), fichier);
          egal(r.erreurs, []);
          egal(r.avertissements, []);
          vrai(P.chanson.troisPropositionsDisponible(r.chanson));
          vrai(P.chanson.deuxMotsDisponible(r.chanson));
        });
      });
    });
  }
})();

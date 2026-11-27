/*
 * Tests des boutons « Marquer comme mots à trouver » et « Démarquer » de
 * l'éditeur (section 4.1) : la sélection faite à la souris est étendue aux
 * mots entiers, et les crochets sont posés ou retirés dans le texte.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai } = globalThis.Tests;
  const edition = globalThis.Paroles.edition;

  /** Sélectionne la première occurrence de « morceau » et applique marquer(). */
  function surSelection(texte, morceau, valeur) {
    const debut = texte.indexOf(morceau);
    if (debut < 0) throw new Error('morceau introuvable : ' + morceau);
    return edition.marquer(texte, debut, debut + morceau.length, valeur);
  }

  groupe('Marquer comme mots à trouver (section 4.1)', () => {
    test('les mots sélectionnés sont entourés de crochets', () => {
      egal(surSelection('Et je chante ces mots', 'ces mots', true).texte, 'Et je chante [ces mots]');
    });

    test('une sélection partielle est étendue au mot entier', () => {
      egal(surSelection('Et je chante ces mots', 'han', true).texte, 'Et je [chante] ces mots');
    });

    test('sans sélection, le mot sous le curseur est marqué', () => {
      const texte = 'Et je chante';
      egal(edition.marquer(texte, 7, 7, true).texte, 'Et je [chante]');
    });

    test('une sélection sur deux lignes marque les mots des deux lignes', () => {
      egal(surSelection('un deux trois\nquatre cinq', 'trois\nquatre', true).texte, 'un deux [trois]\n[quatre] cinq');
    });

    test('un mot marqué à côté d\'un groupe existant le rejoint', () => {
      egal(surSelection('Moi [tous] les soirs', 'les', true).texte, 'Moi [tous les] soirs');
    });

    test('la ponctuation reste hors des crochets', () => {
      egal(surSelection('pour toi, mon ami !', 'toi, mon ami', true).texte, 'pour [toi, mon ami] !');
    });

    test('les lignes non concernées sont laissées telles quelles', () => {
      egal(surSelection('a   b\nc d', 'd', true).texte, 'a   b\nc [d]');
    });

    test('le curseur est placé à la fin de la dernière ligne modifiée', () => {
      const r = surSelection('un deux\ntrois', 'deux', true);
      egal(r.curseur, 'un [deux]'.length);
      vrai(r.modifie);
    });
  });

  groupe('Démarquer (section 4.1)', () => {
    test('retire les crochets des mots sélectionnés', () => {
      egal(surSelection('Et je chante [ces mots]', 'ces mots', false).texte, 'Et je chante ces mots');
    });

    test('démarquer un mot au milieu d\'un groupe coupe le groupe en deux', () => {
      egal(surSelection('Moi [tous les soirs]', 'les', false).texte, 'Moi [tous] les [soirs]');
    });

    test('démarquer des mots non marqués ne change rien', () => {
      const r = surSelection('Moi tous les soirs', 'tous', false);
      egal(r.texte, 'Moi tous les soirs');
      egal(r.modifie, false);
    });
  });

  groupe('Cas d\'erreur', () => {
    test('une ligne qui contient déjà une erreur de crochets est signalée, sans rien modifier', () => {
      const r = surSelection('ligne ok\nla [suite', 'suite', true);
      vrai(typeof r.erreur === 'string' && r.erreur.indexOf('Ligne 2 :') === 0, r.erreur);
    });
  });
})();

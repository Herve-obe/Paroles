/*
 * Tests de la comparaison des mots (section 9.1) et du statut de la
 * réponse (section 9.3) : règles de test n° 3, 4 et 5 de la section 13.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const comparaison = globalThis.Paroles.comparaison;
  const egaux = comparaison.motsEgaux;

  groupe('Comparaison des mots (règle 3)', () => {
    test("J'AI = j’ai (majuscules et apostrophe typographique), dans les deux modes", () => {
      vrai(egaux("J'AI", 'j’ai', 'tolerant'));
      vrai(egaux("J'AI", 'j’ai', 'strict'));
    });

    test('toi, = toi (ponctuation ignorée), dans les deux modes', () => {
      vrai(egaux('toi,', 'toi', 'tolerant'));
      vrai(egaux('toi,', 'toi', 'strict'));
    });

    test('les espaces en trop sont ignorés', () => {
      vrai(egaux('  soir ', 'soir', 'tolerant'));
      vrai(egaux('  soir ', 'soir', 'strict'));
    });

    test('coeur = cœur en mode tolérant, mais pas en mode strict', () => {
      vrai(egaux('coeur', 'cœur', 'tolerant'));
      faux(egaux('coeur', 'cœur', 'strict'));
    });

    test('ete = été en mode tolérant, mais pas en mode strict', () => {
      vrai(egaux('ete', 'été', 'tolerant'));
      faux(egaux('ete', 'été', 'strict'));
    });

    test("jai = j'ai en mode tolérant, mais pas en mode strict", () => {
      vrai(egaux('jai', "j'ai", 'tolerant'));
      faux(egaux('jai', "j'ai", 'strict'));
    });

    test('peutetre = peut-être en mode tolérant, mais pas en mode strict', () => {
      vrai(egaux('peutetre', 'peut-être', 'tolerant'));
      faux(egaux('peutetre', 'peut-être', 'strict'));
    });

    test('ÉTÉ = été en mode strict (seules les majuscules diffèrent)', () => {
      vrai(egaux('ÉTÉ', 'été', 'strict'));
    });

    test('le mode tolérant est le mode par défaut', () => {
      vrai(egaux('ete', 'été'));
    });

    test('deux mots différents ne sont jamais égaux', () => {
      faux(egaux('soir', 'soirs', 'tolerant'));
      faux(egaux('matin', 'soir', 'tolerant'));
    });

    test('une case vide ne correspond jamais à un mot', () => {
      faux(egaux('', 'soir', 'tolerant'));
      faux(egaux('   ', 'soir', 'tolerant'));
    });
  });

  groupe('Statut de la réponse (règle 4)', () => {
    const attendus = ['tous', 'les', 'soirs', "d'été"];

    test('tous les mots justes donnent « Bonne réponse »', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['Tous', 'les', 'soirs', 'd’ete'] });
      vrai(resultat.toutJuste);
      egal(resultat.statut, 'bonne');
      egal(resultat.mots.map((m) => m.juste), [true, true, true, true]);
    });

    test('un seul mot faux donne « Mauvaise réponse »', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous', 'les', 'matins', "d'été"] });
      faux(resultat.toutJuste);
      egal(resultat.statut, 'mauvaise');
      egal(resultat.mots.map((m) => m.juste), [true, true, false, true]);
    });

    test('une case vide compte comme un mot faux', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous', '', 'soirs', "d'été"] });
      egal(resultat.mots[1].juste, false);
      egal(resultat.statut, 'mauvaise');
    });

    test('une proposition plus courte que le trou : les cases manquantes sont fausses', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous'] });
      egal(resultat.mots.map((m) => m.juste), [true, false, false, false]);
    });

    test('le mode strict est appliqué quand il est demandé', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous', 'les', 'soirs', "d'ete"], accents: 'strict' });
      egal(resultat.mots[3].juste, false);
    });
  });

  groupe('Bascule manuelle et joker (règle 5)', () => {
    const attendus = ['tous', 'les', 'soirs', "d'été"];

    test('une bascule « juste » l\'emporte sur un mot calculé faux', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous', 'les', 'soir', "d'été"], bascules: { 2: true } });
      egal(resultat.mots[2].calcule, false);
      egal(resultat.mots[2].juste, true);
      egal(resultat.statut, 'bonne');
    });

    test('une bascule « faux » l\'emporte sur un mot calculé juste', () => {
      const resultat = comparaison.evaluer({ attendus, proposes: ['tous', 'les', 'soirs', "d'été"], bascules: { 0: false } });
      egal(resultat.mots[0].calcule, true);
      egal(resultat.mots[0].juste, false);
      egal(resultat.statut, 'mauvaise');
    });

    test('un mot révélé par le joker « 2 mots » est toujours juste, même basculé', () => {
      const resultat = comparaison.evaluer({
        attendus, proposes: ['tous', 'les', 'soirs', "d'été"], joker: [1], bascules: { 1: false }
      });
      egal(resultat.mots[1].juste, true);
      egal(resultat.mots[1].joker, true);
    });
  });
})();

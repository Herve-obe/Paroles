/*
 * Tests du découpage en mots (section 4.3) et de l'affichage des « _ »
 * (section 5, règle de test n° 2 de la section 13).
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const mots = globalThis.Paroles.mots;

  groupe('Découpage en mots (section 4.3)', () => {
    test('un mot est une suite de caractères séparée par des espaces', () => {
      egal(mots.decouper('Et je chante'), ['Et', 'je', 'chante']);
    });

    test('les espaces multiples, en début et en fin de ligne sont ignorés', () => {
      egal(mots.decouper('  Et   je\tchante  '), ['Et', 'je', 'chante']);
    });

    test("l'apostrophe reste dans le mot : j'ai et aujourd'hui comptent pour un mot", () => {
      egal(mots.compterMots("j'ai aujourd'hui"), 2);
      egal(mots.compterMots('j’ai aujourd’hui'), 2);
    });

    test('le trait d\'union reste dans le mot : peut-être compte pour un mot', () => {
      egal(mots.compterMots('peut-être'), 1);
    });

    test('la ponctuation collée est retirée du mot nettoyé', () => {
      egal(mots.nettoyer('toi,'), 'toi');
      egal(mots.nettoyer('peut-être,'), 'peut-être');
      egal(mots.nettoyer('«oui»'), 'oui');
      egal(mots.nettoyer('fin...'), 'fin');
      egal(mots.nettoyer('(vraiment)'), 'vraiment');
    });

    test('un signe de ponctuation isolé n\'est pas un mot', () => {
      faux(mots.estMot('?'));
      faux(mots.estMot('«'));
      faux(mots.estMot('...'));
      egal(mots.compterMots('Quoi ? « oui » !'), 2);
    });

    test('les chiffres forment des mots', () => {
      vrai(mots.estMot('2027'));
      egal(mots.compterMots('en 2027'), 2);
    });
  });

  groupe('Affichage des « _ » (règle 2)', () => {
    test('soir donne ____', () => {
      egal(mots.masquer('soir'), '____');
    });

    test("j'ai donne _'__", () => {
      egal(mots.masquer("j'ai"), "_'__");
    });

    test('peut-être, donne ____-____ (ponctuation non affichée)', () => {
      egal(mots.masquer('peut-être,'), '____-____');
    });

    test('été donne ___ (un « _ » par lettre accentuée)', () => {
      egal(mots.masquer('été'), '___');
    });

    test('une lettre accentuée écrite en deux caractères Unicode compte pour une seule lettre', () => {
      egal(mots.masquer('été'), '___');
    });

    test('un chiffre donne un « _ »', () => {
      egal(mots.masquer('2027'), '____');
    });

    test("l'apostrophe typographique reste visible", () => {
      egal(mots.masquer('j’ai'), '_’__');
    });

    test('un mot avec majuscule et ponctuation avant et après', () => {
      egal(mots.masquer('«Aujourd\'hui!»'), "_______'___");
    });
  });
})();

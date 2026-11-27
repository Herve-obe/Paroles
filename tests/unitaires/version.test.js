/*
 * Le numéro de version est le même partout (protocole de livraison, étape 3) :
 * app/js/version.js, package.json, LISEZMOI.md et docs/etat-avancement.md.
 * Lu seulement sous Node.js (la page tests.html ne peut pas lire ces fichiers).
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai } = globalThis.Tests;
  if (!globalThis.Tests.enNode) return;

  const fs = require('node:fs');
  const chemin = require('node:path');
  const racine = chemin.join(__dirname, '..', '..');
  require('../../app/js/version.js');
  const version = globalThis.Paroles.VERSION;

  groupe('Numéro de version', () => {
    test('le numéro a la forme X.Y.Z', () => {
      vrai(/^\d+\.\d+\.\d+$/.test(version), version);
    });

    test('package.json porte le même numéro', () => {
      egal(JSON.parse(fs.readFileSync(chemin.join(racine, 'package.json'), 'utf8')).version, version);
    });

    test('LISEZMOI.md annonce le même numéro', () => {
      vrai(fs.readFileSync(chemin.join(racine, 'LISEZMOI.md'), 'utf8').indexOf('Version ' + version + ' ·') >= 0);
    });

    test('docs/etat-avancement.md commence par la situation de cette version', () => {
      vrai(fs.readFileSync(chemin.join(racine, 'docs', 'etat-avancement.md'), 'utf8').indexOf('## Situation actuelle : ' + version) >= 0);
    });
  });
})();

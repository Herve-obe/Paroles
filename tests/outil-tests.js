/*
 * Petit outil de test commun à Node.js et au navigateur.
 *
 * Les fichiers de test utilisent toujours les mêmes fonctions :
 *   Tests.groupe(nom, fonction)   regroupe des tests
 *   Tests.test(nom, fonction)     un test
 *   Tests.egal(obtenu, attendu)   égalité (y compris objets et tableaux)
 *   Tests.vrai(valeur) / Tests.faux(valeur)
 *
 * Dans Node.js (commande « npm test »), ces fonctions s'appuient sur le
 * module de test intégré à Node (node:test), sans rien installer.
 * Dans le navigateur (tests/tests.html ouvert par double-clic), elles
 * exécutent les tests directement et affichent le résultat dans la page.
 */
(function (racine) {
  'use strict';

  const enNode = typeof module !== 'undefined' && !!module.exports && typeof require === 'function';

  /** Compare deux valeurs en profondeur (objets, tableaux, valeurs simples). */
  function egalProfond(a, b) {
    if (a === b) return true;
    if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') {
      return Number.isNaN(a) && Number.isNaN(b);
    }
    if (Array.isArray(a) !== Array.isArray(b)) return false;
    const clesA = Object.keys(a);
    const clesB = Object.keys(b);
    if (clesA.length !== clesB.length) return false;
    return clesA.every((cle) => Object.prototype.hasOwnProperty.call(b, cle) && egalProfond(a[cle], b[cle]));
  }

  function texte(valeur) {
    try { return JSON.stringify(valeur); } catch (e) { return String(valeur); }
  }

  /* Vérifications, identiques dans les deux environnements. */
  function egal(obtenu, attendu, message) {
    if (!egalProfond(obtenu, attendu)) {
      throw new Error((message ? message + ' : ' : '') + 'obtenu ' + texte(obtenu) + ', attendu ' + texte(attendu));
    }
  }
  function vrai(valeur, message) {
    if (!valeur) throw new Error(message || 'valeur attendue vraie, obtenu ' + texte(valeur));
  }
  function faux(valeur, message) {
    if (valeur) throw new Error(message || 'valeur attendue fausse, obtenu ' + texte(valeur));
  }

  let Tests;

  if (enNode) {
    /* Node.js : on délègue au lanceur de tests intégré. */
    const nodeTest = require('node:test');
    Tests = { groupe: nodeTest.describe, test: nodeTest.test, egal, vrai, faux, enNode: true };
  } else {
    /* Navigateur : exécution immédiate et mémorisation des résultats. */
    const resultats = [];
    const pile = [];
    Tests = {
      enNode: false,
      egal, vrai, faux,
      resultats,
      groupe(nom, fonction) {
        pile.push(nom);
        try { fonction(); } finally { pile.pop(); }
      },
      test(nom, fonction) {
        const chemin = pile.concat(nom).join(' > ');
        try {
          fonction();
          resultats.push({ nom: chemin, ok: true });
        } catch (erreur) {
          resultats.push({ nom: chemin, ok: false, message: erreur && erreur.message ? erreur.message : String(erreur) });
        }
      }
    };
  }

  racine.Tests = Tests;
  if (enNode) module.exports = Tests;
})(typeof globalThis !== 'undefined' ? globalThis : window);

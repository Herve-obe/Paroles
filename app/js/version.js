/*
 * Numéro de version de l'application (protocole de livraison, étape 3).
 * À changer dès que le contenu livré change, en même temps que :
 * package.json, LISEZMOI.md (ligne « Version ») et docs/etat-avancement.md.
 * Un test vérifie que ces numéros sont identiques.
 */
(function (racine) {
  'use strict';
  const Paroles = (racine.Paroles = racine.Paroles || {});
  Paroles.VERSION = '0.3.1';
  Paroles.DATE_VERSION = '27 novembre 2026';
})(typeof globalThis !== 'undefined' ? globalThis : window);

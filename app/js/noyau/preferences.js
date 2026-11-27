/*
 * Module « preferences » : réglages de l'émission et leurs valeurs par
 * défaut (section 11). La fenêtre « Préférences » qui permet de les
 * modifier arrive au lot 6 ; les écrans de sortie s'en servent déjà.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Crée un jeu de préférences avec les valeurs par défaut. */
  function creer() {
    return {
      ecrans: [{ mode: 'prompteur' }, { mode: 'incrustation' }], // mode de l'écran de sortie 1 et 2
      nbLignes: 2,                  // lignes affichées : 1, 2 ou 3
      ligneSuivante: true,          // ligne suivante atténuée affichée
      fondIncrustation: '#000000',  // fond autour du bandeau : noir, vert ou couleur libre
      fondBandeau: '#14213d',       // fond opaque du bandeau d'incrustation (bleu nuit)
      fonduTitre: 0.6,              // durée du fondu du titre, en secondes
      defilement: 0.35              // durée du défilement des lignes, en secondes (0 = affichage sec)
    };
  }

  Paroles.preferences = { creer, MODES_ECRAN: ['prompteur', 'incrustation'] };
})(typeof globalThis !== 'undefined' ? globalThis : window);

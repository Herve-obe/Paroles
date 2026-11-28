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
      // Lignes affichées (1, 2 ou 3) selon le mode de l'écran : le prompteur
      // montre la ligne à chanter et la suivante ; l'incrustation, la ligne
      // à chanter seule (retour d'essai de la 0.3.1).
      nbLignes: { prompteur: 2, incrustation: 1 },
      ligneSuivante: true,          // ligne suivante atténuée affichée
      fondIncrustation: '#000000',  // fond autour du bandeau : noir, vert ou couleur libre
      fondBandeau: '#14213d',       // fond opaque du bandeau d'incrustation (bleu nuit)
      delaiCorrection: 1.5,         // délai avant qu'un mot faux soit remplacé par le bon mot, en secondes
      accents: 'tolerant',          // comparaison des accents : 'tolerant' ou 'strict'
      textesStatut: { bonne: 'Bonne réponse', mauvaise: 'Mauvaise réponse' },
      fonduTitre: 0.6,              // durée du fondu du titre, en secondes
      defilement: 0.35              // durée du défilement des lignes, en secondes (0 = affichage sec)
    };
  }

  Paroles.preferences = { creer, MODES_ECRAN: ['prompteur', 'incrustation'] };
})(typeof globalThis !== 'undefined' ? globalThis : window);

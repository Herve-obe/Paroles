/*
 * Module « jeu » : déroulé d'une chanson, étape par étape.
 * Référence : cahier des charges, sections 3.3 et 5.
 *
 * L'état du déroulé est un petit objet :
 *   { phase: 'chargee' | 'jeu', titre: true/false, ligne: index ou null }
 * (les phases « saisie », « bloque » et « revele » arrivent aux lots 4 et 5).
 *
 * « appliquer » ne modifie jamais l'état reçu : il en renvoie un nouveau.
 * On peut donc garder les états précédents pour « Annuler la dernière action ».
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** État d'une chanson qu'on vient de charger. */
  function creer() {
    return { phase: 'chargee', titre: false, ligne: null };
  }

  /** Index de la dernière ligne qu'on peut afficher dans la phase en cours. */
  function derniereLigneAccessible(etat, chanson) {
    const derniere = chanson.lignes.length - 1;
    const trou = Paroles.chanson.passage(chanson);
    // Avant la révélation, on s'arrête à la dernière ligne du trou (décision 1).
    if (trou && etat.phase !== 'revele') return trou.fin;
    return derniere;
  }

  /**
   * Étape affichée à l'opérateur (section 3.3) :
   * 'chargee', 'defilement' ou 'trou'.
   */
  function etape(etat, chanson) {
    if (etat.phase === 'chargee') return 'chargee';
    if (etat.phase !== 'jeu') return etat.phase;
    const trou = Paroles.chanson.passage(chanson);
    if (trou && etat.ligne >= trou.debut && etat.ligne <= trou.fin) return 'trou';
    return 'defilement';
  }

  /* Chaque action : condition pour être possible, et effet. */
  const ACTIONS = {
    afficherTitre: {
      possible: (etat) => etat.phase === 'chargee',
      effet: (etat) => ({ titre: !etat.titre })
    },
    commencer: {
      possible: (etat, chanson) => etat.phase === 'chargee' && chanson.lignes.length > 0,
      effet: () => ({ phase: 'jeu', titre: false, ligne: 0 })
    },
    ligneSuivante: {
      possible: (etat, chanson) =>
        etat.phase === 'chargee'
          ? chanson.lignes.length > 0
          : etat.phase === 'jeu' && etat.ligne < derniereLigneAccessible(etat, chanson),
      effet: (etat) => (etat.phase === 'chargee' ? { phase: 'jeu', titre: false, ligne: 0 } : { ligne: etat.ligne + 1 })
    },
    lignePrecedente: {
      possible: (etat) => etat.phase === 'jeu' && etat.ligne > 0,
      effet: (etat) => ({ ligne: etat.ligne - 1 })
    }
  };

  /** Indique si une action est possible maintenant. */
  function possible(etat, chanson, action) {
    const a = ACTIONS[action];
    return !!a && a.possible(etat, chanson);
  }

  /** Applique une action ; renvoie le même état si elle est impossible. */
  function appliquer(etat, chanson, action) {
    if (!possible(etat, chanson, action)) return etat;
    return Object.assign({}, etat, ACTIONS[action].effet(etat, chanson));
  }

  /**
   * Lignes à montrer sur les écrans de sortie : la ligne en cours puis les
   * suivantes (réglage 1, 2 ou 3 lignes), sans dépasser l'arrêt au trou.
   */
  function lignesVisibles(etat, chanson, nombre) {
    if (etat.ligne == null) return [];
    const fin = Math.min(etat.ligne + nombre - 1, derniereLigneAccessible(etat, chanson));
    const lignes = [];
    for (let i = etat.ligne; i <= fin; i += 1) lignes.push(i);
    return lignes;
  }

  /** Ligne repérée comme « suivante » sur l'écran opérateur, ou null. */
  function ligneSuivanteIndex(etat, chanson) {
    if (etat.ligne == null) return chanson.lignes.length ? 0 : null;
    return etat.ligne < derniereLigneAccessible(etat, chanson) ? etat.ligne + 1 : null;
  }

  /**
   * Historique pour « Annuler la dernière action », limité en taille
   * (fonctionnement continu sans ralentissement, section 12).
   */
  function creerHistorique(tailleMax) {
    const max = tailleMax || 200;
    let pile = [];
    return {
      memoriser(etat) {
        pile.push(etat);
        if (pile.length > max) pile = pile.slice(pile.length - max);
      },
      annuler() { return pile.length ? pile.pop() : null; },
      peutAnnuler() { return pile.length > 0; },
      taille() { return pile.length; },
      vider() { pile = []; }
    };
  }

  Paroles.jeu = { creer, etape, possible, appliquer, lignesVisibles, ligneSuivanteIndex, derniereLigneAccessible, creerHistorique };
})(typeof globalThis !== 'undefined' ? globalThis : window);

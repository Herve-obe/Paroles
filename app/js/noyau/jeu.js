/*
 * Module « jeu » : déroulé d'une chanson, étape par étape.
 * Référence : cahier des charges, sections 3.3 et 5.
 *
 * L'état du déroulé est un petit objet :
 *   { phase, titre: true/false, ligne: index ou null,
 *     proposition: [mots saisis] ou null, bascules: { index: juste/faux },
 *     reveles: nombre de mots révélés, heures: [heure de révélation de chaque mot] }
 * Phases : 'chargee', 'intro' (écran sans paroles entre le titre et la
 * ligne 1), 'jeu' (défilement), 'saisie', 'bloque', 'revele'.
 *
 * Une action est un nom (« ligneSuivante ») ou un objet quand elle a besoin
 * de précisions : { type: 'modifierMot', index, texte },
 * { type: 'revelerSuivant', maintenant }, { type: 'basculer', index, accents }.
 *
 * « appliquer » ne modifie jamais l'état reçu : il en renvoie un nouveau.
 * On peut donc garder les états précédents pour « Annuler la dernière action ».
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** État d'une chanson qu'on vient de charger. */
  function creer() {
    return { phase: 'chargee', titre: false, ligne: null, proposition: null, bascules: {}, reveles: 0, heures: [] };
  }

  /** Nombre de mots à trouver de la chanson. */
  function nbMots(chanson) {
    return Paroles.chanson.motsATrouver(chanson).length;
  }

  /** Vrai si la ligne en cours est dans le passage à trou. */
  function dansLeTrou(etat, chanson) {
    const trou = Paroles.chanson.passage(chanson);
    return !!trou && etat.ligne != null && etat.ligne >= trou.debut && etat.ligne <= trou.fin;
  }

  /**
   * Évaluation de la proposition, mot par mot (module comparaison) :
   * bascules de l'opérateur comprises.
   */
  function evaluation(etat, chanson, accents) {
    return Paroles.comparaison.evaluer({
      attendus: Paroles.chanson.motsATrouver(chanson).map((m) => m.texte),
      proposes: etat.proposition || [],
      bascules: etat.bascules || {},
      joker: etat.joker || [],
      accents
    });
  }

  /** « bonne » ou « mauvaise » une fois tous les mots révélés, sinon null. */
  function statut(etat, chanson, accents) {
    if (etat.phase !== 'revele') return null;
    return evaluation(etat, chanson, accents).statut;
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
   * 'chargee', 'intro', 'defilement' ou 'trou'.
   */
  function etape(etat, chanson) {
    if (etat.phase !== 'jeu') return etat.phase; // chargee, intro, saisie, bloque, revele
    return dansLeTrou(etat, chanson) ? 'trou' : 'defilement';
  }

  /** Révèle les mots jusqu'au rang « jusqua » (exclu), à l'heure donnée. */
  function revelerJusqua(etat, chanson, jusqua, maintenant) {
    const heures = etat.heures.slice();
    while (heures.length < jusqua) heures.push(maintenant);
    return { reveles: jusqua, heures, phase: jusqua >= nbMots(chanson) ? 'revele' : 'bloque' };
  }

  /**
   * Effet de « Commencer » : si le titre est à l'écran, on passe d'abord par
   * un écran sans paroles (intro) ; sinon, la ligne 1 s'affiche directement.
   */
  function demarrer(etat) {
    if (etat.phase === 'chargee' && etat.titre) return { phase: 'intro', titre: false, ligne: null };
    return { phase: 'jeu', titre: false, ligne: 0 };
  }

  /* Chaque action : condition pour être possible, et effet. */
  const ACTIONS = {
    afficherTitre: {
      possible: (etat) => etat.phase === 'chargee',
      effet: (etat) => ({ titre: !etat.titre })
    },
    commencer: {
      possible: (etat, chanson) => (etat.phase === 'chargee' || etat.phase === 'intro') && chanson.lignes.length > 0,
      effet: demarrer
    },
    ligneSuivante: {
      possible: (etat, chanson) => {
        if (etat.phase === 'chargee' || etat.phase === 'intro') return chanson.lignes.length > 0;
        if (etat.phase === 'jeu') return etat.ligne < derniereLigneAccessible(etat, chanson);
        if (etat.phase === 'revele') return ligneApresRevelation(etat, chanson) < chanson.lignes.length;
        return false; // saisie et blocage : défilement arrêté
      },
      effet: (etat, chanson) => {
        if (etat.phase === 'jeu') return { ligne: etat.ligne + 1 };
        if (etat.phase === 'revele') return { ligne: ligneApresRevelation(etat, chanson) };
        return demarrer(etat);
      }
    },
    lignePrecedente: {
      possible: (etat, chanson) => {
        if (etat.phase === 'jeu') return etat.ligne > 0;
        // Après la révélation : retour possible jusqu'au passage à trou révélé.
        if (etat.phase === 'revele') return etat.ligne > Paroles.chanson.passage(chanson).fin;
        return false;
      },
      effet: (etat) => ({ ligne: etat.ligne - 1 })
    },

    /* ----- Lot 4 : saisie, blocage, révélation ----- */
    saisir: {
      possible: (etat, chanson) => etat.phase === 'jeu' && dansLeTrou(etat, chanson),
      effet: (etat, chanson) => ({
        phase: 'saisie',
        proposition: etat.proposition || new Array(nbMots(chanson)).fill('')
      })
    },
    modifierMot: {
      possible: (etat, chanson, a) => etat.phase === 'saisie' && a.index >= 0 && a.index < nbMots(chanson),
      effet: (etat, chanson, a) => {
        const proposition = etat.proposition.slice();
        proposition[a.index] = String(a.texte == null ? '' : a.texte);
        return { proposition };
      }
    },
    bloquer: {
      possible: (etat) => etat.phase === 'saisie',
      effet: () => ({ phase: 'bloque', reveles: 0, heures: [] })
    },
    debloquer: {
      possible: (etat) => etat.phase === 'bloque' && etat.reveles === 0,
      effet: () => ({ phase: 'saisie' })
    },
    revelerSuivant: {
      possible: (etat) => etat.phase === 'bloque',
      effet: (etat, chanson, a) => revelerJusqua(etat, chanson, etat.reveles + 1, a.maintenant || 0)
    },
    toutReveler: {
      possible: (etat) => etat.phase === 'bloque',
      effet: (etat, chanson, a) => revelerJusqua(etat, chanson, nbMots(chanson), a.maintenant || 0)
    },
    basculer: {
      possible: (etat, chanson, a) =>
        (etat.phase === 'saisie' || etat.phase === 'bloque' || etat.phase === 'revele') &&
        a.index >= 0 && a.index < nbMots(chanson) && (etat.joker || []).indexOf(a.index) < 0,
      effet: (etat, chanson, a) => {
        const juste = evaluation(etat, chanson, a.accents).mots[a.index].juste;
        const bascules = Object.assign({}, etat.bascules);
        bascules[a.index] = !juste;
        return { bascules };
      }
    }
  };

  /**
   * Après la révélation, « Ligne suivante » saute directement à la première
   * ligne qui suit le trou (les lignes du trou étaient affichées ensemble).
   */
  function ligneApresRevelation(etat, chanson) {
    return Math.max(etat.ligne + 1, Paroles.chanson.passage(chanson).fin + 1);
  }

  /** Une action sous forme d'objet { type, ... } (un simple nom est accepté). */
  function normaliser(action) {
    return typeof action === 'string' ? { type: action } : action || {};
  }

  /** Indique si une action est possible maintenant. */
  function possible(etat, chanson, action) {
    const a = normaliser(action);
    const definition = ACTIONS[a.type];
    return !!definition && definition.possible(etat, chanson, a);
  }

  /** Applique une action ; renvoie le même état si elle est impossible. */
  function appliquer(etat, chanson, action) {
    if (!possible(etat, chanson, action)) return etat;
    const a = normaliser(action);
    return Object.assign({}, etat, ACTIONS[a.type].effet(etat, chanson, a));
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

  Paroles.jeu = {
    creer,
    etape,
    possible,
    appliquer,
    lignesVisibles,
    ligneSuivanteIndex,
    derniereLigneAccessible,
    dansLeTrou,
    evaluation,
    statut,
    creerHistorique
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

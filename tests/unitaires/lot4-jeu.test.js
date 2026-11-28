/*
 * Tests du lot 4 : saisie de la proposition (section 6), blocage
 * (section 8), révélation, correction et statut (section 9), étape
 * « Révélé » et suite de la chanson après le trou (décision 1).
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;
  const jeu = P.jeu;

  /* 6 lignes : trou de 4 mots sur les lignes d'index 2 et 3, puis 2 lignes après. */
  const chanson = P.chanson.creer({
    titre: 'Essai',
    lignes: P.chanson.analyserTexte('ligne un\nligne deux\nmoi [tous les soirs],\n[été] ligne\nligne cinq\nligne six').lignes
  });

  /** Applique une suite d'actions (texte ou objet) à partir d'une chanson chargée. */
  function apres(actions) {
    return actions.reduce((etat, action) => jeu.appliquer(etat, chanson, action), jeu.creer());
  }
  const AU_TROU = ['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante'];
  const SAISIE = AU_TROU.concat(['saisir']);
  const mot = (index, texte) => ({ type: 'modifierMot', index, texte });
  const reveler = (maintenant) => ({ type: 'revelerSuivant', maintenant: maintenant || 1000 });

  groupe('Saisie de la proposition (section 6)', () => {
    test('« Saisir la proposition » est possible au passage à trou, pas avant', () => {
      faux(jeu.possible(apres(['commencer']), chanson, 'saisir'));
      vrai(jeu.possible(apres(AU_TROU), chanson, 'saisir'));
      vrai(jeu.possible(apres(['commencer', 'ligneSuivante', 'ligneSuivante']), chanson, 'saisir'), 'dès la première ligne du trou');
    });

    test('la saisie ouvre une case vide par mot à trouver', () => {
      const etat = apres(SAISIE);
      egal(jeu.etape(etat, chanson), 'saisie');
      egal(etat.proposition, ['', '', '', '']);
    });

    test('chaque mot tapé remplit sa case ; l\'opérateur peut tout corriger', () => {
      const etat = apres(SAISIE.concat([mot(0, 'tous'), mot(2, 'matins'), mot(2, 'soirs')]));
      egal(etat.proposition, ['tous', '', 'soirs', '']);
    });

    test('pendant la saisie, le défilement est arrêté', () => {
      const etat = apres(SAISIE);
      faux(jeu.possible(etat, chanson, 'ligneSuivante'));
      faux(jeu.possible(etat, chanson, 'lignePrecedente'));
    });
  });

  groupe('Bloquer (section 8)', () => {
    test('« Bloquer » est possible même avec des cases vides', () => {
      const etat = apres(SAISIE.concat([mot(0, 'tous'), 'bloquer']));
      egal(jeu.etape(etat, chanson), 'bloque');
    });

    test('une fois bloquée, la proposition n\'est plus modifiable', () => {
      const etat = apres(SAISIE.concat([mot(0, 'tous'), 'bloquer']));
      faux(jeu.possible(etat, chanson, mot(1, 'les')));
      egal(jeu.appliquer(etat, chanson, mot(1, 'les')), etat);
    });

    test('« Débloquer » ramène à la saisie, sans rien perdre', () => {
      const etat = apres(SAISIE.concat([mot(0, 'tous'), 'bloquer', 'debloquer']));
      egal(jeu.etape(etat, chanson), 'saisie');
      egal(etat.proposition, ['tous', '', '', '']);
    });

    test('« Débloquer » est impossible une fois la révélation commencée', () => {
      faux(jeu.possible(apres(SAISIE.concat(['bloquer', reveler()])), chanson, 'debloquer'));
    });
  });

  groupe('Révélation (section 9.2)', () => {
    const PROPOSITION = SAISIE.concat([mot(0, 'tous'), mot(1, 'les'), mot(2, 'matins'), 'bloquer']);

    test('« Révéler le mot suivant » révèle les mots un par un, de gauche à droite', () => {
      const etat = apres(PROPOSITION.concat([reveler(1000), reveler(2000)]));
      egal(etat.reveles, 2);
      egal(etat.heures, [1000, 2000]);
      egal(jeu.etape(etat, chanson), 'bloque');
    });

    test('quand le dernier mot est révélé : étape « Révélé »', () => {
      const etat = apres(PROPOSITION.concat([reveler(), reveler(), reveler(), reveler()]));
      egal(etat.reveles, 4);
      egal(jeu.etape(etat, chanson), 'revele');
    });

    test('« Tout révéler » révèle les mots restants d\'un coup', () => {
      const etat = apres(PROPOSITION.concat([reveler(1000), { type: 'toutReveler', maintenant: 5000 }]));
      egal(etat.reveles, 4);
      egal(etat.heures, [1000, 5000, 5000, 5000]);
      egal(jeu.etape(etat, chanson), 'revele');
    });

    test('la révélation est impossible avant le blocage', () => {
      faux(jeu.possible(apres(SAISIE), chanson, reveler()));
    });
  });

  groupe('Statut et bascule (sections 9.1 et 9.3)', () => {
    test('tous les mots justes : « bonne »', () => {
      const etat = apres(SAISIE.concat([mot(0, 'Tous'), mot(1, 'les'), mot(2, 'soirs'), mot(3, 'ete'), 'bloquer', { type: 'toutReveler', maintenant: 1 }]));
      egal(jeu.statut(etat, chanson, 'tolerant'), 'bonne');
    });

    test('un mot faux ou une case vide : « mauvaise »', () => {
      const etat = apres(SAISIE.concat([mot(0, 'tous'), mot(1, 'les'), mot(2, 'soirs'), 'bloquer', { type: 'toutReveler', maintenant: 1 }]));
      egal(jeu.statut(etat, chanson, 'tolerant'), 'mauvaise');
    });

    test('pas de statut tant que tout n\'est pas révélé', () => {
      egal(jeu.statut(apres(SAISIE.concat(['bloquer', reveler()])), chanson, 'tolerant'), null);
    });

    test('une bascule manuelle change le mot et le statut (règle 5)', () => {
      const base = SAISIE.concat([mot(0, 'tous'), mot(1, 'les'), mot(2, 'soir'), mot(3, 'été'), 'bloquer']);
      const etat = apres(base.concat([{ type: 'basculer', index: 2, accents: 'tolerant' }, { type: 'toutReveler', maintenant: 1 }]));
      egal(etat.bascules, { 2: true });
      egal(jeu.statut(etat, chanson, 'tolerant'), 'bonne');
      const retour = jeu.appliquer(etat, chanson, { type: 'basculer', index: 2, accents: 'tolerant' });
      egal(jeu.statut(retour, chanson, 'tolerant'), 'mauvaise');
    });

    test('la bascule est possible pendant la saisie, le blocage et après la révélation', () => {
      const b = { type: 'basculer', index: 0, accents: 'tolerant' };
      vrai(jeu.possible(apres(SAISIE), chanson, b));
      vrai(jeu.possible(apres(SAISIE.concat(['bloquer'])), chanson, b));
      vrai(jeu.possible(apres(SAISIE.concat(['bloquer', { type: 'toutReveler', maintenant: 1 }])), chanson, b));
      faux(jeu.possible(apres(AU_TROU), chanson, b));
    });
  });

  groupe('Après la révélation (décision 1)', () => {
    const REVELE = ['commencer', 'ligneSuivante', 'ligneSuivante', 'saisir', 'bloquer', { type: 'toutReveler', maintenant: 1 }];

    test('« Ligne suivante » affiche la première ligne après le trou', () => {
      const etat = apres(REVELE);
      egal(etat.ligne, 2, 'saisie lancée sur la première ligne du trou');
      vrai(jeu.possible(etat, chanson, 'ligneSuivante'));
      egal(jeu.appliquer(etat, chanson, 'ligneSuivante').ligne, 4);
    });

    test('on peut aller jusqu\'à la dernière ligne de la chanson', () => {
      const etat = apres(REVELE.concat(['ligneSuivante', 'ligneSuivante']));
      egal(etat.ligne, 5);
      faux(jeu.possible(etat, chanson, 'ligneSuivante'));
    });

    test('« Ligne précédente » revient au passage à trou révélé', () => {
      const etat = apres(REVELE.concat(['ligneSuivante', 'lignePrecedente']));
      egal(etat.ligne, 3);
      egal(jeu.etape(etat, chanson), 'revele');
    });

    test('chaque état reste intact : l\'annulation peut y revenir', () => {
      const avant = apres(SAISIE.concat(['bloquer']));
      jeu.appliquer(avant, chanson, reveler());
      egal(avant.reveles, 0);
    });
  });
})();

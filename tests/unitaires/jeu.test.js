/*
 * Tests du déroulé d'une chanson (sections 3.3 et 5) : chanson chargée,
 * titre, défilement, arrêt au passage à trou, annulation.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;
  const jeu = P.jeu;

  /* Chanson de 6 lignes : trou sur les lignes d'index 2 et 3, puis 2 lignes après. */
  const chanson = P.chanson.creer({
    titre: 'Essai',
    lignes: P.chanson.analyserTexte('ligne un\nligne deux\nligne [trois]\n[quatre] ligne\nligne cinq\nligne six').lignes
  });

  /** Applique une suite d'actions à partir d'une chanson chargée. */
  function apres(actions) {
    return actions.reduce((etat, action) => jeu.appliquer(etat, chanson, action), jeu.creer(chanson));
  }

  groupe('Chanson chargée et titre (sections 3.3 et 5)', () => {
    test('une chanson chargée est à l\'étape « chargée », sans ligne affichée', () => {
      const etat = jeu.creer(chanson);
      egal(jeu.etape(etat, chanson), 'chargee');
      egal(etat.ligne, null);
      faux(etat.titre);
    });

    test('« Afficher le titre » affiche puis masque le titre', () => {
      vrai(apres(['afficherTitre']).titre);
      faux(apres(['afficherTitre', 'afficherTitre']).titre);
    });

    test('« Commencer » affiche la ligne 1 et masque le titre', () => {
      const etat = apres(['afficherTitre', 'commencer']);
      egal(etat.ligne, 0);
      faux(etat.titre);
      egal(jeu.etape(etat, chanson), 'defilement');
    });

    test('« Ligne suivante » sur une chanson chargée équivaut à « Commencer »', () => {
      egal(apres(['ligneSuivante']).ligne, 0);
    });

    test('le titre ne peut plus être affiché une fois la chanson commencée', () => {
      faux(jeu.possible(apres(['commencer']), chanson, 'afficherTitre'));
    });
  });

  groupe('Défilement (section 5)', () => {
    test('« Ligne suivante » avance d\'une ligne', () => {
      egal(apres(['commencer', 'ligneSuivante']).ligne, 1);
    });

    test('« Ligne précédente » recule d\'une ligne', () => {
      egal(apres(['commencer', 'ligneSuivante', 'ligneSuivante', 'lignePrecedente']).ligne, 1);
    });

    test('« Ligne précédente » est impossible sur la première ligne', () => {
      const etat = apres(['commencer']);
      faux(jeu.possible(etat, chanson, 'lignePrecedente'));
      egal(jeu.appliquer(etat, chanson, 'lignePrecedente'), etat);
    });

    test('l\'étape devient « passage à trou » quand la ligne en cours est dans le trou', () => {
      egal(jeu.etape(apres(['commencer', 'ligneSuivante', 'ligneSuivante']), chanson), 'trou');
      egal(jeu.etape(apres(['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante']), chanson), 'trou');
    });

    test('avant la révélation, le défilement s\'arrête à la dernière ligne du trou (décision 1)', () => {
      const etat = apres(['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante']);
      egal(etat.ligne, 3);
      faux(jeu.possible(etat, chanson, 'ligneSuivante'));
    });

    test('une action impossible ne change pas l\'état', () => {
      const etat = jeu.creer(chanson);
      egal(jeu.appliquer(etat, chanson, 'lignePrecedente'), etat);
      egal(jeu.appliquer(etat, chanson, 'actionInconnue'), etat);
    });

    test('appliquer une action ne modifie jamais l\'état précédent (nécessaire pour l\'annulation)', () => {
      const etat = apres(['commencer']);
      jeu.appliquer(etat, chanson, 'ligneSuivante');
      egal(etat.ligne, 0);
    });
  });

  groupe('Lignes visibles sur les écrans de sortie (section 5)', () => {
    test('2 lignes par défaut : la ligne en cours et la suivante', () => {
      egal(jeu.lignesVisibles(apres(['commencer']), chanson, 2), [0, 1]);
    });

    test('réglage à 1 ou 3 lignes', () => {
      egal(jeu.lignesVisibles(apres(['commencer']), chanson, 1), [0]);
      egal(jeu.lignesVisibles(apres(['commencer']), chanson, 3), [0, 1, 2]);
    });

    test('la ligne qui suit le trou n\'est pas montrée avant la révélation', () => {
      egal(jeu.lignesVisibles(apres(['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante']), chanson, 3), [3]);
    });

    test('aucune ligne visible tant que la chanson n\'a pas commencé', () => {
      egal(jeu.lignesVisibles(jeu.creer(chanson), chanson, 2), []);
    });

    test('ligneSuivanteIndex donne la ligne repérée comme suivante, ou null', () => {
      egal(jeu.ligneSuivanteIndex(apres(['commencer']), chanson), 1);
      egal(jeu.ligneSuivanteIndex(apres(['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante']), chanson), null);
    });
  });

  groupe('Annulation de la dernière action (section 3.3)', () => {
    test('l\'historique rend les états précédents dans l\'ordre inverse', () => {
      const h = jeu.creerHistorique();
      const e1 = jeu.creer(chanson);
      const e2 = jeu.appliquer(e1, chanson, 'commencer');
      h.memoriser(e1);
      h.memoriser(e2);
      egal(h.annuler(), e2);
      egal(h.annuler(), e1);
      egal(h.annuler(), null);
    });

    test('l\'historique est limité en taille pour tenir 4 heures sans ralentir', () => {
      const h = jeu.creerHistorique(5);
      for (let i = 0; i < 20; i += 1) h.memoriser({ n: i });
      egal(h.taille(), 5);
      egal(h.annuler(), { n: 19 });
    });

    test('vider() efface l\'historique (changement de chanson)', () => {
      const h = jeu.creerHistorique();
      h.memoriser({});
      h.vider();
      faux(h.peutAnnuler());
    });
  });
})();

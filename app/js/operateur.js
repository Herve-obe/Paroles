/*
 * Démarrage de l'écran opérateur : état de l'application et lien entre
 * les modules (conduite, éditeur, chanson en cours, pilotage, clavier).
 *
 * Toutes les actions passent par l'objet « app » ci-dessous ; après chaque
 * action, app.rafraichir() redessine l'écran.
 */
(function (racine) {
  'use strict';

  const P = racine.Paroles;

  const app = {
    emission: P.emission.creer(),
    selection: null,     // chanson sélectionnée dans la conduite (pour Modifier, Monter...)
    courante: null,      // chanson chargée pour le direct
    jeu: null,           // état du déroulé de la chanson chargée (module jeu)
    historique: P.jeu.creerHistorique(),
    preferences: P.preferences.creer(),  // modifiables au lot 6
    noir: false,         // bouton « Noir » enfoncé

    /** La chanson chargée, ou null. */
    chansonCourante() {
      return app.courante ? P.emission.trouver(app.emission, app.courante) : null;
    },

    /** Vrai si la chanson chargée a commencé et n'est pas terminée. */
    chansonEnCours() {
      return !!app.jeu && app.jeu.phase !== 'chargee' && app.jeu.phase !== 'revele';
    },

    /** Action de jeu (bouton ou raccourci), mémorisée pour pouvoir l'annuler. */
    action(nom) {
      const chanson = app.chansonCourante();
      if (!chanson) return false;
      const nouvelEtat = P.jeu.appliquer(app.jeu, chanson, nom);
      if (nouvelEtat === app.jeu) return false; // action impossible à cette étape
      app.historique.memoriser(app.jeu);
      app.jeu = nouvelEtat;
      app.rafraichir();
      return true;
    },

    /** « Annuler la dernière action » (limité à la chanson en cours). */
    annuler() {
      const precedent = app.historique.annuler();
      if (!precedent) return;
      app.jeu = precedent;
      app.rafraichir();
    },

    /**
     * Charge une chanson pour le direct. Si une chanson est en cours,
     * demande d'abord une confirmation dans la page (section 11.1).
     */
    async chargerChanson(id) {
      if (!id || id === app.courante) return;
      if (app.chansonEnCours()) {
        const actuelle = app.chansonCourante();
        const ok = await P.dialogues.confirmer(
          'Changer de chanson ?',
          '« ' + actuelle.titre + ' » est en cours. Charger une autre chanson l\'arrête et la remet « à venir ».',
          'Changer de chanson'
        );
        if (!ok) return;
      }
      // La chanson quittée redevient « à venir » si elle n'était pas terminée.
      if (app.courante && P.emission.etat(app.emission, app.courante) === 'en_cours') {
        P.emission.definirEtat(app.emission, app.courante, 'a_venir');
      }
      app.courante = id;
      app.selection = id;
      app.jeu = P.jeu.creer();
      app.historique.vider();
      P.emission.definirEtat(app.emission, id, 'en_cours');
      app.rafraichir();
    },

    /** Remet la chanson chargée au début (après modification dans l'éditeur). */
    rechargerCourante() {
      app.jeu = P.jeu.creer();
      app.historique.vider();
    },

    /** Plus aucune chanson chargée (après suppression de la chanson chargée). */
    dechargerChanson() {
      app.courante = null;
      app.jeu = null;
      app.historique.vider();
    },

    /** « Noir » : vide les écrans de sortie ; un second appui réaffiche. */
    basculerNoir() {
      app.noir = !app.noir;
      app.rafraichir();
    },

    /** Raccourcis clavier : même effet que les boutons. */
    executer(action) {
      const chanson = app.chansonCourante();
      const etape = chanson ? P.jeu.etape(app.jeu, chanson) : 'aucune';
      switch (action) {
        case 'ligneSuivante':
        case 'lignePrecedente':
          app.action(action);
          break;
        case 'etapeSuivante':
          if (etape === 'chargee') app.action('commencer');
          break;
        case 'chansonPrecedente':
        case 'chansonSuivante': {
          // Seulement quand aucune chanson n'est en cours (décision 8).
          if (etape !== 'aucune' && etape !== 'chargee' && etape !== 'revele') {
            P.dialogues.notifier('Flèches haut et bas inactives pendant une chanson : utilisez la conduite.');
            break;
          }
          const voisine = P.emission.voisine(app.emission, app.courante, action === 'chansonSuivante' ? 1 : -1);
          if (voisine) app.chargerChanson(voisine);
          break;
        }
        case 'annuler':
          app.annuler();
          break;
        case 'noir':
          app.basculerNoir();
          break;
        case 'ouvrirEcran':
          P.sorties.ouvrir();
          break;
        default:
          break;
      }
    },

    /** Redessine tout l'écran (quelques dizaines d'éléments : bien moins de 50 ms). */
    rafraichir() {
      document.getElementById('nom-emission').textContent = app.emission.nom;
      P.conduite.afficher(app);
      P.chansonEnCours.afficher(app);
      P.pilotage.afficher(app);
      const boutonNoir = document.getElementById('btn-noir');
      boutonNoir.classList.toggle('actif', app.noir);
      boutonNoir.title = app.noir ? 'Écrans de sortie au noir : cliquez pour réafficher' : 'Vider tous les écrans de sortie';
      P.sorties.diffuser(app);
    }
  };

  /* Branchements */
  P.conduite.installer(app);
  P.fichiers.installer(app);
  P.pilotage.installer(app);
  P.sorties.installer(app);
  P.raccourcis.installer({
    executer: app.executer,
    estBloque: () => P.dialogues.estOuvert() || P.editeur.estOuvert(),
    // Dialogue puis éditeur sont prioritaires sur les raccourcis du jeu.
    avant: (e) => P.dialogues.gererClavier(e) || P.editeur.gererClavier(e)
  });
  P.raccourcis.afficherAideMemoire(document.getElementById('aide-memoire'));

  // Accès pour les tests automatiques de l'interface.
  P.app = app;
  app.rafraichir();
})(typeof globalThis !== 'undefined' ? globalThis : window);

/*
 * Module « sorties » (côté opérateur) : ouverture des écrans de sortie,
 * voyants du bandeau, envoi de l'affichage et aperçus (sections 3.1 et 3.2).
 *
 * À chaque changement, l'opérateur envoie l'affichage complet (et pas une
 * différence) : un écran de sortie ne peut donc jamais « dériver », et un
 * écran rouvert se recale dès le premier message.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const CLE_SAUVEGARDE = 'paroles.affichage';
  const DELAI_ABSENCE = 2500; // ms sans nouvelle d'un écran : il est considéré fermé

  const etat = {
    app: null,
    liaison: null,
    session: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    seq: 0,
    message: null,
    fenetres: { 1: null, 2: null },                 // fenêtres ouvertes par cet écran opérateur
    presence: { 1: { vu: 0, plein: false }, 2: { vu: 0, plein: false } }
  };

  /** Vrai si l'écran de sortie n° numero est ouvert. */
  function estOuvert(numero) {
    const f = etat.fenetres[numero];
    return Date.now() - etat.presence[numero].vu < DELAI_ABSENCE || (!!f && !f.closed && etat.presence[numero].vu === 0);
  }

  /** Les deux fenêtres connues (pour l'envoi direct). */
  function fenetres() {
    return [etat.fenetres[1], etat.fenetres[2]];
  }

  /** Message « etat » envoyé aux écrans de sortie. */
  function construireMessage(app) {
    const chanson = app.chansonCourante();
    const prefs = app.preferences;
    return {
      type: 'etat',
      session: etat.session,
      seq: ++etat.seq,
      affichage: Paroles.affichage.calculer({
        chanson,
        jeu: app.jeu,
        // On envoie assez de lignes pour l'écran qui en montre le plus ;
        // chaque écran ne garde que celles de son mode.
        nbLignes: Math.max(prefs.nbLignes.prompteur, prefs.nbLignes.incrustation),
        ligneSuivante: prefs.ligneSuivante,
        noir: app.noir
      }),
      preferences: {
        ecrans: prefs.ecrans,
        nbLignes: prefs.nbLignes,
        fondIncrustation: prefs.fondIncrustation,
        fondBandeau: prefs.fondBandeau,
        fonduTitre: prefs.fonduTitre,
        defilement: prefs.defilement
      }
    };
  }

  /** Envoie l'affichage en cours aux écrans et met à jour les aperçus. */
  function diffuser(app) {
    etat.message = construireMessage(app);
    etat.liaison.envoyer(etat.message, fenetres());
    // Copie dans la mémoire du navigateur : un écran rechargé l'affiche aussitôt.
    try { localStorage.setItem(CLE_SAUVEGARDE, JSON.stringify(etat.message)); } catch (e) { /* mémoire pleine ou bloquée */ }
    dessinerApercus();
  }

  /** Aperçus en temps réel de chaque écran de sortie, à droite de l'écran opérateur. */
  function dessinerApercus() {
    if (!etat.message) return;
    document.querySelectorAll('[data-apercu-ecran]').forEach((cadre) => {
      const numero = Number(cadre.dataset.apercuEcran);
      const scene = cadre.querySelector('.scene');
      Paroles.renduSortie.dessiner(scene, etat.message, numero);
      Paroles.renduSortie.mettreALEchelle(scene, cadre.clientWidth, cadre.clientHeight);
      const mode = etat.app.preferences.ecrans[numero - 1].mode;
      cadre.parentElement.querySelector('.apercu-nom').textContent = 'Écran ' + numero + ' : ' + mode;
    });
  }

  /** Voyants du bandeau : un par écran de sortie ; un clic ouvre ou ferme cet écran. */
  function majVoyants() {
    const app = etat.app;
    const zone = document.getElementById('voyants');
    [1, 2].forEach((numero) => {
      let voyant = zone.querySelector('[data-ecran="' + numero + '"]');
      if (!voyant) {
        voyant = document.createElement('button');
        voyant.type = 'button';
        voyant.dataset.ecran = String(numero);
        zone.appendChild(voyant);
      }
      const ouvert = estOuvert(numero);
      const plein = ouvert && etat.presence[numero].plein;
      const mode = app.preferences.ecrans[numero - 1].mode;
      const texte = 'Écran ' + numero + ' : ' + (ouvert ? mode + (plein ? ' · plein écran' : ' · fenêtre') : 'fermé');
      if (voyant.textContent !== texte) voyant.textContent = texte;
      voyant.className = 'voyant' + (ouvert ? ' ouvert' : '') + (plein ? ' plein' : '');
      voyant.title = ouvert
        ? (plein ? 'Ouvert en plein écran.' : 'Ouvert, pas en plein écran : double-cliquez dans la fenêtre.') + ' Cliquez ici pour fermer cet écran.'
        : 'Fermé. Cliquez ici pour ouvrir cet écran.';
    });
    document.getElementById('btn-ouvrir-ecran').disabled = estOuvert(1) && estOuvert(2);
  }

  /**
   * Ouvre un écran de sortie : celui demandé (clic sur son voyant) ou la
   * première place libre (bouton « Ouvrir un écran de sortie », F2).
   * Doit être appelé depuis un clic ou une touche (sinon le navigateur bloque la fenêtre).
   */
  function ouvrir(numeroDemande) {
    const numero = numeroDemande || [1, 2].find((n) => !estOuvert(n));
    if (!numero) {
      Paroles.dialogues.notifier('Les 2 écrans de sortie sont déjà ouverts.');
      return;
    }
    const decalage = 40 * numero;
    const fenetre = window.open(
      'sortie.html?ecran=' + numero,
      'paroles-ecran-' + numero,
      'popup=yes,width=960,height=540,left=' + (window.screenX + decalage) + ',top=' + (window.screenY + decalage)
    );
    if (!fenetre) {
      Paroles.dialogues.informer(
        'Fenêtre bloquée',
        'Le navigateur a bloqué l\'ouverture de l\'écran de sortie. Autorisez les fenêtres pop-up pour cette page (icône à droite de la barre d\'adresse), puis recommencez.'
      );
      return;
    }
    etat.fenetres[numero] = fenetre;
    etat.presence[numero] = { vu: 0, plein: false };
    majVoyants();
  }

  /** Ferme l'écran de sortie n° numero (après confirmation dans la page). */
  async function fermer(numero) {
    const ok = await Paroles.dialogues.confirmer(
      'Fermer l\'écran de sortie ' + numero + ' ?',
      'La fenêtre de l\'écran ' + numero + ' sera fermée. Un clic sur son voyant la rouvrira.',
      'Fermer l\'écran',
      'danger'
    );
    if (!ok) return;
    // L'écran se ferme lui-même à la réception du message ; on le ferme aussi
    // directement quand cet écran opérateur l'a ouvert.
    etat.liaison.envoyer({ type: 'fermer', ecran: numero }, fenetres());
    const f = etat.fenetres[numero];
    try { if (f && !f.closed) f.close(); } catch (e) { /* déjà fermée */ }
    etat.fenetres[numero] = null;
    etat.presence[numero] = { vu: 1, plein: false };
    majVoyants();
  }

  /** Messages reçus des écrans de sortie. */
  function recevoir(message, source) {
    const numero = message.ecran === 2 ? 2 : 1;
    if (source && (message.type === 'bonjour' || message.type === 'presence')) etat.fenetres[numero] = source;

    if (message.type === 'bonjour' || message.type === 'presence') {
      etat.presence[numero] = { vu: Date.now(), plein: !!message.pleinEcran };
      // Un écran qui arrive reçoit tout de suite l'affichage en cours.
      if (message.type === 'bonjour' && etat.app) diffuser(etat.app);
      majVoyants();
    } else if (message.type === 'au-revoir') {
      etat.presence[numero] = { vu: 1, plein: false }; // vu très ancien : fermé
      etat.fenetres[numero] = null;
      majVoyants();
    } else if (message.type === 'touche') {
      Paroles.raccourcis.toucheDistante(message);
    }
  }

  function installer(app) {
    etat.app = app;
    etat.liaison = Paroles.liaison.creer(recevoir);
    document.getElementById('btn-ouvrir-ecran').addEventListener('click', () => ouvrir());
    document.getElementById('voyants').addEventListener('click', (e) => {
      const voyant = e.target.closest('[data-ecran]');
      if (!voyant) return;
      const numero = Number(voyant.dataset.ecran);
      if (estOuvert(numero)) fermer(numero);
      else ouvrir(numero);
    });
    document.getElementById('btn-noir').addEventListener('click', () => app.basculerNoir());
    // Les écrans déjà ouverts (écran opérateur rechargé) se signalent tout de suite.
    etat.liaison.envoyer({ type: 'appel' });
    setInterval(majVoyants, 500);
    // Les aperçus suivent la taille de leur cadre.
    if (typeof ResizeObserver === 'function') {
      const observateur = new ResizeObserver(() => dessinerApercus());
      document.querySelectorAll('[data-apercu-ecran]').forEach((cadre) => observateur.observe(cadre));
    }
    majVoyants();
  }

  Paroles.sorties = { installer, diffuser, ouvrir, fermer, estOuvert };
})(typeof globalThis !== 'undefined' ? globalThis : window);

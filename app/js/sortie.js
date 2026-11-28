/*
 * Démarrage d'un écran de sortie (section 3.2).
 *
 * - Affiche ce que l'écran opérateur lui envoie, sans rien calculer.
 * - Au chargement (ou rechargement), reprend tout de suite le dernier
 *   affichage connu, puis demande l'affichage en cours à l'opérateur.
 * - Signale sa présence toutes les secondes (voyants de l'écran opérateur).
 * - Double-clic : plein écran (le navigateur exige un geste de l'utilisateur).
 * - Les touches frappées ici sont transmises à l'écran opérateur, pour que
 *   les raccourcis marchent même si cette fenêtre a le focus.
 */
(function (racine) {
  'use strict';

  const P = racine.Paroles;
  const numero = Number(new URLSearchParams(location.search).get('ecran')) === 2 ? 2 : 1;
  const scene = document.getElementById('scene');
  const aide = document.getElementById('aide-sortie');
  const CLE_SAUVEGARDE = 'paroles.affichage';

  let dernier = null; // dernier message « etat » affiché

  document.title = 'Paroles : écran de sortie ' + numero;

  /** Met la scène 1920 × 1080 à la taille de la fenêtre. */
  function ajuster() {
    P.renduSortie.mettreALEchelle(scene, window.innerWidth, window.innerHeight);
  }

  /** Affiche un message « etat » s'il est plus récent que le précédent. */
  function afficher(message) {
    if (dernier && message.session === dernier.session && message.seq <= dernier.seq) return;
    dernier = message;
    P.renduSortie.dessiner(scene, message, numero);
    // Le fond de la fenêtre suit celui de la scène (pas de bord d'une autre couleur).
    document.body.style.background = getComputedStyle(scene).backgroundColor;
    const mode = scene.dataset.mode;
    aide.textContent = 'Écran de sortie ' + numero + ' (' + mode + ') : double-cliquez pour passer en plein écran';
  }

  const liaison = P.liaison.creer((message) => {
    if (message.type === 'etat') afficher(message);
    else if (message.type === 'appel') signalerPresence(); // l'opérateur vient de (re)démarrer
    else if (message.type === 'fermer' && message.ecran === numero) window.close(); // clic sur le voyant
  });

  /** Envoi vers l'écran opérateur (canal de diffusion + fenêtre qui m'a ouvert). */
  function envoyer(message) {
    liaison.envoyer(Object.assign({ ecran: numero }, message), [window.opener]);
  }

  function signalerPresence() {
    envoyer({ type: 'presence', pleinEcran: !!document.fullscreenElement });
  }

  /* Reprise immédiate du dernier affichage connu (rechargement, réouverture). */
  try {
    const sauvegarde = localStorage.getItem(CLE_SAUVEGARDE);
    if (sauvegarde) afficher(JSON.parse(sauvegarde));
  } catch (e) { /* mémoire du navigateur indisponible : on attend l'opérateur */ }

  ajuster();
  window.addEventListener('resize', ajuster);

  envoyer({ type: 'bonjour', pleinEcran: false });
  setInterval(signalerPresence, 1000);
  window.addEventListener('pagehide', () => envoyer({ type: 'au-revoir' }));

  /* Plein écran par double-clic ; pas de curseur ni d'aide en plein écran.
     Le double-clic ne doit sélectionner aucun mot. */
  document.addEventListener('mousedown', (e) => { if (e.detail > 1) e.preventDefault(); });
  document.addEventListener('dblclick', () => {
    if (window.getSelection) window.getSelection().removeAllRanges();
    if (document.fullscreenElement) document.exitFullscreen();
    else document.documentElement.requestFullscreen().catch(() => {});
  });
  document.addEventListener('fullscreenchange', () => {
    const plein = !!document.fullscreenElement;
    document.body.classList.toggle('plein-ecran', plein);
    aide.hidden = plein;
    signalerPresence();
  });

  /* Touches transmises à l'écran opérateur (sauf celles du navigateur). */
  const TOUCHES_LOCALES = ['F5', 'F11', 'F12', 'Escape'];
  document.addEventListener('keydown', (e) => {
    if (TOUCHES_LOCALES.indexOf(e.key) >= 0 || (e.ctrlKey && /^[rR]$/.test(e.key))) return;
    e.preventDefault();
    envoyer({ type: 'touche', key: e.key, ctrlKey: e.ctrlKey, shiftKey: e.shiftKey, altKey: e.altKey, repeat: e.repeat });
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);

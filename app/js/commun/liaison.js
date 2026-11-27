/*
 * Module « liaison » : messages entre l'écran opérateur et les écrans de
 * sortie (section 3.2).
 *
 * Deux chemins sont utilisés en même temps, pour qu'une panne de l'un ne
 * coupe pas l'affichage :
 *   1. le canal de diffusion du navigateur (BroadcastChannel) ;
 *   2. l'envoi direct de fenêtre à fenêtre (postMessage), qui fonctionne
 *      aussi quand le navigateur isole les pages ouvertes par double-clic
 *      (cas possible avec Firefox).
 * Un même message peut donc arriver deux fois : chaque message porte un
 * identifiant, et les doublons sont ignorés à la réception.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const NOM_CANAL = 'paroles-liaison';
  const MARQUE = 'paroles'; // repère nos messages parmi d'éventuels autres

  /**
   * @param {function(object, (Window|null)): void} recevoir
   *   appelée pour chaque message reçu (une seule fois par message), avec la
   *   fenêtre d'origine quand elle est connue.
   */
  function creer(recevoir) {
    const prefixe = Math.random().toString(36).slice(2, 8);
    let compteur = 0;
    const recus = new Set();
    const ordreRecus = [];
    let canal = null;

    function traiter(donnees, source) {
      if (!donnees || donnees.marque !== MARQUE || !donnees.id) return;
      if (recus.has(donnees.id)) return; // doublon (arrivé par l'autre chemin)
      recus.add(donnees.id);
      ordreRecus.push(donnees.id);
      if (ordreRecus.length > 500) recus.delete(ordreRecus.shift()); // mémoire bornée (4 h de direct)
      recevoir(donnees, source || null);
    }

    try {
      canal = new BroadcastChannel(NOM_CANAL);
      canal.onmessage = (e) => traiter(e.data, null);
    } catch (e) {
      canal = null; // navigateur sans canal de diffusion : seul l'envoi direct reste
    }
    window.addEventListener('message', (e) => traiter(e.data, e.source));

    return {
      /**
       * Envoie un message par les deux chemins.
       * @param {object} message
       * @param {Array<Window|null>} [fenetres] fenêtres à joindre directement
       */
      envoyer(message, fenetres) {
        compteur += 1;
        const complet = Object.assign({}, message, { marque: MARQUE, id: prefixe + '-' + compteur });
        if (canal) {
          try { canal.postMessage(complet); } catch (e) { /* canal fermé : l'envoi direct suffit */ }
        }
        (fenetres || []).forEach((fenetre) => {
          try {
            if (fenetre && !fenetre.closed) fenetre.postMessage(complet, '*');
          } catch (e) { /* fenêtre en cours de fermeture */ }
        });
      }
    };
  }

  Paroles.liaison = { creer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

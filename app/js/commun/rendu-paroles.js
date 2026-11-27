/*
 * Module « rendu-paroles » : fabrique l'affichage d'une ligne de paroles.
 * Utilisé par l'écran opérateur, par l'aperçu de l'éditeur et, à partir du
 * lot 3, par les écrans de sortie : tous montrent donc exactement la même
 * chose.
 *
 * Le texte est toujours inséré avec textContent (jamais comme du HTML) :
 * des paroles contenant « < » ou « & » s'affichent telles quelles.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /**
   * Crée l'élément d'une ligne de paroles.
   * @param {{mots: Array<{texte: string, aTrouver: boolean}>}} ligne
   * @param {object} [options]
   * @param {boolean} [options.masquer] remplace les mots à trouver par des « _ » (section 5)
   * @param {boolean} [options.signalerTrou] souligne les mots à trouver en clair (vue opérateur)
   * @returns {HTMLElement}
   */
  function ligne(ligneParoles, options) {
    const opt = options || {};
    const mots = Paroles.mots;
    const element = document.createElement('div');
    element.className = 'ligne-paroles';

    ligneParoles.mots.forEach((mot) => {
      const aTrouver = mot.aTrouver && mots.estMot(mot.texte);
      // Dans le passage à trou, la ponctuation n'est pas affichée (section 5).
      if (opt.masquer && mot.aTrouver && !aTrouver) return;

      const span = document.createElement('span');
      span.className = 'mot';
      if (aTrouver && opt.masquer) {
        span.classList.add('masque');
        span.textContent = mots.masquer(mot.texte);
      } else {
        if (aTrouver && opt.signalerTrou) span.classList.add('a-trouver');
        span.textContent = mot.texte;
      }
      // Vrai espace entre les mots (copier-coller, lecteurs d'écran) ; l'écart
      // plus large autour des mots masqués est réglé dans commun.css.
      if (element.firstChild) element.appendChild(document.createTextNode(' '));
      element.appendChild(span);
    });
    return element;
  }

  Paroles.rendu = { ligne };
})(typeof globalThis !== 'undefined' ? globalThis : window);

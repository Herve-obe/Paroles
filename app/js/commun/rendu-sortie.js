/*
 * Module « rendu-sortie » : dessine un écran de sortie (section 3.2).
 * Utilisé par les fenêtres de sortie et par les aperçus de l'écran
 * opérateur : ils montrent exactement la même chose.
 *
 * Tout est dessiné sur une « scène » de 1920 × 1080 points, ensuite mise à
 * l'échelle de la fenêtre ou de l'aperçu. La mise en page est donc
 * identique quelle que soit la taille réelle.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const LARGEUR = 1920;
  const HAUTEUR = 1080;

  /** Crée une ligne de paroles déjà préparée par le module « affichage ». */
  function ligne(ligneAffichee) {
    const element = document.createElement('div');
    element.className = 'ligne-paroles ligne-sortie ajustable ' + ligneAffichee.role;
    ligneAffichee.mots.forEach((mot) => {
      if (element.firstChild) element.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'mot' + (mot.masque ? ' masque' : '');
      span.textContent = mot.texte;
      element.appendChild(span);
    });
    return element;
  }

  /**
   * Dessine le contenu d'un message « etat » de l'opérateur.
   * @param {HTMLElement} scene   élément de 1920 × 1080
   * @param {object} message      { affichage, preferences }
   * @param {number} numeroEcran  1 ou 2
   */
  function dessiner(scene, message, numeroEcran) {
    const prefs = message.preferences;
    const reglage = prefs.ecrans[numeroEcran - 1] || { mode: 'prompteur' };
    const mode = reglage.mode === 'incrustation' ? 'incrustation' : 'prompteur';
    const a = message.affichage;

    scene.dataset.mode = mode;
    scene.style.setProperty('--fond-incrustation', prefs.fondIncrustation);
    scene.style.setProperty('--fond-bandeau', prefs.fondBandeau);
    scene.textContent = '';

    // « Noir » ou rien à montrer : prompteur noir, incrustation réduite à son fond.
    if (a.noir || a.type === 'vide') return;

    let conteneur = scene;
    if (mode === 'incrustation') {
      conteneur = document.createElement('div');
      conteneur.className = 'bandeau-incrustation';
      scene.appendChild(conteneur);
    }

    if (a.type === 'titre') {
      const bloc = document.createElement('div');
      bloc.className = 'titre-sortie';
      const titre = document.createElement('div');
      titre.className = 'titre ajustable';
      titre.textContent = a.titre;
      bloc.appendChild(titre);
      if (a.artiste) {
        const artiste = document.createElement('div');
        artiste.className = 'artiste ajustable';
        artiste.textContent = a.artiste;
        bloc.appendChild(artiste);
      }
      conteneur.appendChild(bloc);
    } else if (a.type === 'paroles') {
      const bloc = document.createElement('div');
      bloc.className = 'paroles-sortie';
      a.lignes.forEach((l) => bloc.appendChild(ligne(l)));
      conteneur.appendChild(bloc);
    }

    ajusterTailles(scene);
  }

  /**
   * Taille automatique (section 5) : une ligne trop longue voit sa taille
   * de texte diminuer pour tenir sur une seule ligne ; un mot n'est jamais coupé.
   */
  function ajusterTailles(scene) {
    scene.querySelectorAll('.ajustable').forEach((element) => {
      element.style.fontSize = '';
      const disponible = element.clientWidth;
      const necessaire = element.scrollWidth;
      if (disponible > 0 && necessaire > disponible) {
        const taille = parseFloat(getComputedStyle(element).fontSize);
        element.style.fontSize = Math.floor(taille * (disponible / necessaire) * 0.98) + 'px';
      }
    });
  }

  /**
   * Met la scène de 1920 × 1080 à l'échelle de son conteneur, centrée.
   * @param {HTMLElement} scene
   * @param {number} largeur  largeur disponible
   * @param {number} hauteur  hauteur disponible
   */
  function mettreALEchelle(scene, largeur, hauteur) {
    const echelle = Math.min(largeur / LARGEUR, hauteur / HAUTEUR);
    const decalageX = (largeur - LARGEUR * echelle) / 2;
    const decalageY = (hauteur - HAUTEUR * echelle) / 2;
    scene.style.transform = 'translate(' + decalageX + 'px, ' + decalageY + 'px) scale(' + echelle + ')';
  }

  Paroles.renduSortie = { LARGEUR, HAUTEUR, dessiner, mettreALEchelle, ajusterTailles };
})(typeof globalThis !== 'undefined' ? globalThis : window);

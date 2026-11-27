/*
 * Module « rendu-sortie » : dessine un écran de sortie (section 3.2).
 * Utilisé par les fenêtres de sortie et par les aperçus de l'écran
 * opérateur : ils montrent exactement la même chose.
 *
 * Tout est dessiné sur une « scène » de 1920 × 1080 points, ensuite mise à
 * l'échelle de la fenêtre ou de l'aperçu.
 *
 * Transitions (section 5) :
 * - le titre apparaît et disparaît en fondu ;
 * - les paroles défilent du bas vers le haut : la ligne à chanter est au
 *   milieu de l'écran, la suivante en dessous, plus petite et plus foncée.
 *   Chaque ligne garde son élément d'un affichage à l'autre et glisse vers
 *   sa nouvelle place (le mouvement démarre immédiatement) ;
 * - « Noir » coupe tout, sans fondu.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const LARGEUR = 1920;
  const HAUTEUR = 1080;

  /*
   * Places des lignes, en points, pour chaque mode :
   *   pas[r]     : décalage vertical de la ligne de rang r (0 = ligne à chanter)
   *   echelle[r] : taille relative (la ligne suivante est plus petite)
   *   opacite[r] : la ligne suivante est plus foncée
   *   sortie     : position d'une ligne qui sort par le haut
   *   entree     : distance sous la dernière place d'où arrive une nouvelle ligne
   */
  const GEOMETRIE = {
    prompteur: { pas: [0, 140, 245, 345], echelle: [1, 0.72, 0.62, 0.55], opacite: [1, 0.5, 0.38, 0.3], sortie: -150, entree: 110 },
    incrustation: { pas: [0, 84, 148, 210], echelle: [1, 0.74, 0.64, 0.58], opacite: [1, 0.58, 0.45, 0.38], sortie: -95, entree: 70 }
  };

  /* Hauteur du bandeau d'incrustation selon le nombre de lignes affichées. */
  const HAUTEUR_BANDEAU = { 1: 140, 2: 210, 3: 270 };

  function div(classe) {
    const d = document.createElement('div');
    d.className = classe;
    return d;
  }

  /** Remplit l'élément d'une ligne avec ses mots (masqués ou non). */
  function remplirLigne(element, ligneAffichee) {
    element.textContent = '';
    ligneAffichee.mots.forEach((mot) => {
      if (element.firstChild) element.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'mot' + (mot.masque ? ' masque' : '');
      span.textContent = mot.texte;
      element.appendChild(span);
    });
    element.dataset.signature = JSON.stringify(ligneAffichee.mots);
  }

  /**
   * Taille automatique (section 5) : une ligne trop longue voit sa taille
   * de texte diminuer pour tenir sur une seule ligne ; un mot n'est jamais coupé.
   */
  function ajusterTaille(element) {
    element.style.fontSize = '';
    const disponible = element.clientWidth;
    const necessaire = element.scrollWidth;
    if (disponible > 0 && necessaire > disponible) {
      const taille = parseFloat(getComputedStyle(element).fontSize);
      element.style.fontSize = Math.floor(taille * (disponible / necessaire) * 0.98) + 'px';
    }
  }

  function ajusterTailles(scene) {
    scene.querySelectorAll('.ajustable').forEach(ajusterTaille);
  }

  /** Place une ligne, avec ou sans mouvement. */
  function placer(element, y, echelle, opacite, duree) {
    element.style.transition = duree > 0 ? 'transform ' + duree + 's ease-out, opacity ' + duree + 's ease-out' : 'none';
    element.style.transform = 'translateY(' + y + 'px) scale(' + echelle + ')';
    element.style.opacity = String(opacite);
  }

  /** Crée (une seule fois par scène et par mode) les éléments fixes de la scène. */
  function structure(scene, mode) {
    if (scene.etatRendu && scene.etatRendu.mode === mode) return scene.etatRendu;
    if (scene.etatRendu) {
      clearTimeout(scene.etatRendu.minuteurTitre);
      clearTimeout(scene.etatRendu.minuteurParoles);
    }
    scene.textContent = '';
    const cadre = div(mode === 'incrustation' ? 'cadre bandeau-incrustation' : 'cadre');
    const titre = div('calque calque-titre');
    const paroles = div('calque calque-paroles');
    cadre.append(titre, paroles);
    scene.appendChild(cadre);
    scene.etatRendu = { mode, cadre, titre, paroles, lignes: new Map(), cleTitre: null, minuteurTitre: null, minuteurParoles: null, dernierCourant: null };
    return scene.etatRendu;
  }

  /** Titre et artiste, en fondu. */
  function dessinerTitre(r, a, fondu) {
    if (a.type === 'titre') {
      clearTimeout(r.minuteurTitre);
      const cle = a.titre + '\n' + (a.artiste || '');
      if (r.cleTitre !== cle) {
        r.titre.textContent = '';
        const bloc = div('titre-sortie');
        const titre = div('titre ajustable');
        titre.textContent = a.titre;
        bloc.appendChild(titre);
        if (a.artiste) {
          const artiste = div('artiste ajustable');
          artiste.textContent = a.artiste;
          bloc.appendChild(artiste);
        }
        r.titre.appendChild(bloc);
        r.cleTitre = cle;
        ajusterTailles(r.titre);
      }
      r.titre.classList.add('visible');
    } else if (r.cleTitre !== null) {
      r.titre.classList.remove('visible');
      clearTimeout(r.minuteurTitre);
      // Le contenu est retiré une fois le fondu terminé.
      r.minuteurTitre = setTimeout(() => { r.titre.textContent = ''; r.cleTitre = null; }, fondu * 1000 + 60);
    }
  }

  /** Lignes de paroles : défilement du bas vers le haut. */
  function dessinerParoles(r, a, mode, duree) {
    if (a.type !== 'paroles') {
      if (r.lignes.size || r.paroles.classList.contains('visible')) {
        r.paroles.classList.remove('visible');
        clearTimeout(r.minuteurParoles);
        r.minuteurParoles = setTimeout(() => {
          r.lignes.forEach((el) => el.remove());
          r.lignes.clear();
          r.dernierCourant = null;
        }, duree * 1000 + 60);
      }
      return;
    }

    clearTimeout(r.minuteurParoles);
    r.paroles.classList.add('visible');
    const g = GEOMETRIE[mode];
    const dernierRang = g.pas.length - 1;
    const courant = a.lignes.length ? a.lignes[0].index : 0;
    const monte = r.dernierCourant === null || courant >= r.dernierCourant;
    r.dernierCourant = courant;
    const affichees = new Set(a.lignes.map((l) => l.index));

    // Lignes qui quittent l'écran : par le haut si on avance, par le bas si on recule.
    r.lignes.forEach((element, index) => {
      if (affichees.has(index)) return;
      element.classList.remove('courante', 'suivante');
      element.classList.add('sortante');
      if (index < courant) placer(element, g.sortie, 1, 0, duree);
      else placer(element, g.pas[dernierRang] + g.entree, g.echelle[dernierRang], 0, duree);
      r.lignes.delete(index);
      setTimeout(() => element.remove(), duree * 1000 + 60);
    });

    // Lignes affichées : nouvelles (elles arrivent par le bas) ou déplacées.
    a.lignes.forEach((ligne, rang) => {
      const place = Math.min(rang, dernierRang);
      let element = r.lignes.get(ligne.index);
      if (!element) {
        element = div('ligne-paroles ligne-sortie ajustable');
        element.dataset.index = String(ligne.index);
        remplirLigne(element, ligne);
        r.paroles.appendChild(element);
        r.lignes.set(ligne.index, element);
        ajusterTaille(element);
        const depart = monte ? g.pas[Math.min(rang + 1, dernierRang)] + g.entree : g.sortie;
        placer(element, depart, g.echelle[place], 0, 0);
        void element.offsetWidth; // position de départ prise en compte avant le mouvement
      } else if (element.dataset.signature !== JSON.stringify(ligne.mots)) {
        remplirLigne(element, ligne);
        ajusterTaille(element);
      }
      element.classList.remove('sortante', 'courante', 'suivante');
      element.classList.add(rang === 0 ? 'courante' : 'suivante');
      placer(element, g.pas[place], g.echelle[place], g.opacite[place], duree);
    });
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
    const fondu = typeof prefs.fonduTitre === 'number' ? prefs.fonduTitre : 0.6;
    const duree = typeof prefs.defilement === 'number' ? prefs.defilement : 0.35;

    const r = structure(scene, mode);
    scene.dataset.mode = mode;
    scene.style.setProperty('--fond-incrustation', prefs.fondIncrustation);
    scene.style.setProperty('--fond-bandeau', prefs.fondBandeau);
    scene.style.setProperty('--fondu-titre', fondu + 's');
    scene.style.setProperty('--fondu-paroles', duree + 's');
    if (mode === 'incrustation') r.cadre.style.height = (HAUTEUR_BANDEAU[prefs.nbLignes] || HAUTEUR_BANDEAU[2]) + 'px';

    // « Noir » : coupure franche, sans fondu.
    scene.classList.toggle('noir', !!a.noir);
    // Le bandeau d'incrustation disparaît en fondu quand il n'y a rien à montrer.
    r.cadre.classList.toggle('visible', a.type === 'titre' || a.type === 'paroles');

    dessinerTitre(r, a, fondu);
    dessinerParoles(r, a, mode, duree);
  }

  /** Texte réellement visible (sans les lignes en train de sortir) : sert aux tests. */
  function texteVisible(scene) {
    const r = scene.etatRendu;
    if (!r || scene.classList.contains('noir')) return '';
    const morceaux = [];
    if (r.titre.classList.contains('visible')) morceaux.push(r.titre.textContent);
    if (r.paroles.classList.contains('visible')) {
      // Ordre de la chanson (l'ordre dans la page peut différer après un retour en arrière).
      Array.from(r.paroles.querySelectorAll('.ligne-sortie:not(.sortante)'))
        .sort((x, y) => Number(x.dataset.index) - Number(y.dataset.index))
        .forEach((l) => morceaux.push(l.textContent));
    }
    return morceaux.join(' ').replace(/\s+/g, ' ').trim();
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

  Paroles.renduSortie = { LARGEUR, HAUTEUR, dessiner, mettreALEchelle, ajusterTailles, texteVisible };
})(typeof globalThis !== 'undefined' ? globalThis : window);

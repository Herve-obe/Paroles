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
 *   sa nouvelle place (le mouvement démarre immédiatement) ; la ligne qui
 *   vient d'être chantée disparaît aussitôt ;
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
   *   sortie     : position de départ d'une ligne qui revient par le haut (retour en arrière)
   *   entree     : distance sous la dernière place d'où arrive une nouvelle ligne
   */
  const GEOMETRIE = {
    prompteur: { pas: [0, 140, 245, 345], echelle: [1, 0.72, 0.62, 0.55], opacite: [1, 0.5, 0.38, 0.3], sortie: -150, entree: 110 },
    incrustation: { pas: [0, 84, 148, 210], echelle: [1, 0.74, 0.64, 0.58], opacite: [1, 0.58, 0.45, 0.38], sortie: -95, entree: 70 }
  };

  /** Nombre de lignes montrées par un écran, selon son mode (préférences). */
  function nombreDeLignes(prefs, mode) {
    const n = prefs.nbLignes;
    if (typeof n === 'number') return n;
    if (n && n[mode]) return n[mode];
    return mode === 'incrustation' ? 1 : 2;
  }

  /* Hauteur du bandeau d'incrustation selon le nombre de lignes affichées. */
  const HAUTEUR_BANDEAU = { 1: 140, 2: 210, 3: 270 };

  /*
   * Passage à trou, de la saisie à la révélation (lot 4) : toutes les lignes
   * du trou ensemble, à la même taille, centrées ; le statut en dessous.
   * PAS_TROU : écart entre deux lignes du trou ; RANG_STATUT : place du statut.
   */
  const PAS_TROU = { prompteur: 130, incrustation: 84 };
  const RANG_STATUT = { prompteur: 140, incrustation: 84 };

  function div(classe) {
    const d = document.createElement('div');
    d.className = classe;
    return d;
  }

  /**
   * Signature d'une ligne : sert à ne la redessiner que si elle change.
   * L'attente avant correction n'en fait pas partie : elle diminue à chaque
   * message, et redessiner relancerait le délai d'un mot faux.
   */
  function signature(ligneAffichee) {
    return JSON.stringify(ligneAffichee.mots.map((m) => [m.texte, m.masque, m.etat || '', m.correction || '']));
  }

  /** Un mot faux est remplacé par le bon mot, marqué comme correction (section 9.2). */
  function corriger(span, mot) {
    span.textContent = mot.correction;
    span.classList.remove('etat-faux', 'masque');
    span.classList.add('etat-correction');
  }

  /** Remplit l'élément d'une ligne avec ses mots (masqués ou non, colorés selon leur état). */
  function remplirLigne(element, ligneAffichee) {
    element.textContent = '';
    ligneAffichee.mots.forEach((mot) => {
      if (element.firstChild) element.appendChild(document.createTextNode(' '));
      const span = document.createElement('span');
      span.className = 'mot' + (mot.masque ? ' masque' : '') + (mot.etat ? ' etat-' + mot.etat : '');
      span.textContent = mot.texte;
      element.appendChild(span);
      if (mot.etat === 'faux' && mot.correction) {
        // Rouge d'abord, puis le bon mot après le délai (déjà écoulé : tout de suite).
        if (mot.attente > 0) setTimeout(() => { if (span.isConnected) corriger(span, mot); }, mot.attente);
        else corriger(span, mot);
      }
    });
    element.dataset.signature = signature(ligneAffichee);
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
    const statut = div('statut-sortie');
    paroles.appendChild(statut);
    cadre.append(titre, paroles);
    scene.appendChild(cadre);
    scene.etatRendu = {
      mode, cadre, titre, paroles, statut, lignes: new Map(), cleTitre: null, cleStatut: null,
      minuteurTitre: null, minuteurParoles: null, minuteurStatut: null, dernierCourant: null
    };
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
  function dessinerParoles(r, a, mode, duree, nombre) {
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
      dessinerStatut(r, undefined, mode, 0);
      return;
    }
    if (a.lignes.length && a.lignes[0].role === 'trou') {
      dessinerTrou(r, a, mode, duree);
      return;
    }
    dessinerStatut(r, undefined, mode, 0);

    clearTimeout(r.minuteurParoles);
    r.paroles.classList.add('visible');
    const g = GEOMETRIE[mode];
    const dernierRang = g.pas.length - 1;
    // Seules les lignes de ce mode d'écran (l'incrustation : la ligne à chanter seule).
    const lignes = a.lignes.slice(0, Math.max(1, nombre));
    // Incrustation : le bloc de lignes est centré verticalement dans le bandeau.
    const decalage = mode === 'incrustation' ? -g.pas[lignes.length - 1] / 2 : 0;
    const courant = lignes.length ? lignes[0].index : 0;
    const monte = r.dernierCourant === null || courant >= r.dernierCourant;
    r.dernierCourant = courant;
    const affichees = new Set(lignes.map((l) => l.index));

    // Lignes qui quittent l'écran : elles disparaissent aussitôt (demande du
    // formateur : la ligne qui vient d'être chantée n'est plus affichée, seules
    // la ligne à chanter et la suivante restent visibles, même pendant le mouvement).
    r.lignes.forEach((element, index) => {
      if (affichees.has(index)) return;
      element.remove();
      r.lignes.delete(index);
    });

    // Lignes affichées : nouvelles (elles arrivent par le bas) ou déplacées.
    lignes.forEach((ligne, rang) => {
      const place = Math.min(rang, dernierRang);
      let element = r.lignes.get(ligne.index);
      if (!element) {
        element = div('ligne-paroles ligne-sortie ajustable');
        element.dataset.index = String(ligne.index);
        remplirLigne(element, ligne);
        r.paroles.appendChild(element);
        r.lignes.set(ligne.index, element);
        ajusterTaille(element);
        const depart = (monte ? g.pas[Math.min(rang + 1, dernierRang)] + g.entree : g.sortie) + decalage;
        placer(element, depart, g.echelle[place], 0, 0);
        void element.offsetWidth; // position de départ prise en compte avant le mouvement
      } else if (element.dataset.signature !== signature(ligne)) {
        remplirLigne(element, ligne);
        ajusterTaille(element);
      }
      element.classList.remove('courante', 'suivante', 'trou');
      element.classList.add(rang === 0 ? 'courante' : 'suivante');
      placer(element, g.pas[place] + decalage, g.echelle[place], g.opacite[place], duree);
    });
  }

  /**
   * Passage à trou de la saisie à la révélation : toutes les lignes du trou
   * ensemble, à la même taille, centrées (le bloc remonte s'il y a un statut).
   */
  function dessinerTrou(r, a, mode, duree) {
    clearTimeout(r.minuteurParoles);
    r.paroles.classList.add('visible');
    const k = a.lignes.length;
    const pas = PAS_TROU[mode];
    const avecStatut = !!a.statut;
    const decalage = avecStatut ? -RANG_STATUT[mode] / 2 : 0;
    const affichees = new Set(a.lignes.map((l) => l.index));

    r.lignes.forEach((element, index) => {
      if (affichees.has(index)) return;
      element.remove();
      r.lignes.delete(index);
    });

    a.lignes.forEach((ligne, rang) => {
      let element = r.lignes.get(ligne.index);
      const y = (rang - (k - 1) / 2) * pas + decalage;
      if (!element) {
        element = div('ligne-paroles ligne-sortie ajustable');
        element.dataset.index = String(ligne.index);
        remplirLigne(element, ligne);
        r.paroles.appendChild(element);
        r.lignes.set(ligne.index, element);
        ajusterTaille(element);
        placer(element, y + GEOMETRIE[mode].entree, 1, 0, 0);
        void element.offsetWidth;
      } else if (element.dataset.signature !== signature(ligne)) {
        remplirLigne(element, ligne);
        ajusterTaille(element);
      }
      element.classList.remove('courante', 'suivante');
      element.classList.add('trou');
      placer(element, y, 1, 1, duree);
    });
    r.dernierCourant = a.lignes[0].index;

    dessinerStatut(r, a.statut, mode, (k - 1) / 2 * pas + decalage + RANG_STATUT[mode]);
  }

  /**
   * Statut « Bonne réponse » / « Mauvaise réponse » (section 9.3), affiché
   * une fois le dernier mot faux corrigé (attente en millisecondes).
   */
  function dessinerStatut(r, statut, mode, y) {
    if (!statut) {
      clearTimeout(r.minuteurStatut);
      r.statut.classList.remove('visible');
      r.cleStatut = null;
      return;
    }
    r.statut.style.transform = 'translateY(' + y + 'px)';
    const cle = statut.type + '|' + statut.texte;
    if (r.cleStatut === cle) return; // déjà affiché ou déjà programmé
    r.cleStatut = cle;
    clearTimeout(r.minuteurStatut);
    r.statut.classList.remove('visible', 'bonne', 'mauvaise');
    r.statut.classList.add(statut.type);
    r.statut.textContent = statut.texte;
    const montrer = () => r.statut.classList.add('visible');
    if (statut.attente > 0) r.minuteurStatut = setTimeout(montrer, statut.attente);
    else montrer();
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
    const nombre = nombreDeLignes(prefs, mode);
    if (mode === 'incrustation') {
      // Le bandeau s'agrandit le temps du jeu pour montrer toutes les lignes du trou (et le statut).
      const surLeTrou = a.type === 'paroles' && a.lignes.length && a.lignes[0].role === 'trou';
      const hauteur = surLeTrou
        ? HAUTEUR_BANDEAU[1] + (a.lignes.length - 1) * PAS_TROU.incrustation + (a.statut ? RANG_STATUT.incrustation : 0)
        : (HAUTEUR_BANDEAU[nombre] || HAUTEUR_BANDEAU[1]);
      r.cadre.style.height = hauteur + 'px';
    }
    // Couleurs du jeu (réglables au lot 6).
    if (prefs.couleurs) {
      Object.keys(prefs.couleurs).forEach((nom) => scene.style.setProperty('--' + nom, prefs.couleurs[nom]));
    }

    // « Noir » : coupure franche, sans fondu.
    scene.classList.toggle('noir', !!a.noir);
    // Le bandeau d'incrustation disparaît en fondu quand il n'y a rien à montrer.
    r.cadre.classList.toggle('visible', a.type === 'titre' || a.type === 'paroles');

    dessinerTitre(r, a, fondu);
    dessinerParoles(r, a, mode, duree, nombre);
  }

  /** Texte réellement visible, dans l'ordre de la chanson : sert aux tests. */
  function texteVisible(scene) {
    const r = scene.etatRendu;
    if (!r || scene.classList.contains('noir')) return '';
    const morceaux = [];
    if (r.titre.classList.contains('visible')) morceaux.push(r.titre.textContent);
    if (r.paroles.classList.contains('visible')) {
      // Ordre de la chanson (l'ordre dans la page peut différer après un retour en arrière).
      Array.from(r.paroles.querySelectorAll('.ligne-sortie'))
        .sort((x, y) => Number(x.dataset.index) - Number(y.dataset.index))
        .forEach((l) => morceaux.push(l.textContent));
      if (r.statut.classList.contains('visible')) morceaux.push(r.statut.textContent);
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

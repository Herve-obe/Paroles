/*
 * Module « raccourcis » : touches du clavier de l'écran opérateur.
 * Référence : cahier des charges, section 11.1.
 *
 * Chaque raccourci déclenche la même action qu'un bouton visible : le
 * clavier est un plus, jamais le seul moyen d'agir. Les touches seront
 * modifiables dans les préférences au lot 6 ; ce module contient la table
 * par défaut des actions disponibles à ce stade.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /* Table par défaut (section 11.1), limitée aux actions déjà disponibles. */
  const PAR_DEFAUT = [
    { action: 'ligneSuivante', libelle: 'Ligne suivante', touches: ['Espace', 'Flèche droite'] },
    { action: 'lignePrecedente', libelle: 'Ligne précédente', touches: ['Flèche gauche'] },
    { action: 'etapeSuivante', libelle: 'Étape suivante (commencer)', touches: ['Entrée'] },
    { action: 'chansonPrecedente', libelle: 'Chanson précédente', touches: ['Flèche haut'] },
    { action: 'chansonSuivante', libelle: 'Chanson suivante', touches: ['Flèche bas'] },
    { action: 'annuler', libelle: 'Annuler la dernière action', touches: ['Ctrl+Z'] },
    { action: 'noir', libelle: 'Noir (second appui : réaffiche)', touches: ['F1'] },
    { action: 'ouvrirEcran', libelle: 'Ouvrir un écran de sortie', touches: ['F2'] }
  ];

  /* Noms en français des touches spéciales. */
  const NOMS = {
    ' ': 'Espace',
    Enter: 'Entrée',
    ArrowRight: 'Flèche droite',
    ArrowLeft: 'Flèche gauche',
    ArrowUp: 'Flèche haut',
    ArrowDown: 'Flèche bas',
    Escape: 'Échap',
    Backspace: 'Retour arrière',
    Delete: 'Suppr',
    Tab: 'Tab'
  };

  let table = PAR_DEFAUT;
  let executer = () => {};
  let estBloque = () => false;

  /**
   * Nom de la touche ou combinaison d'un événement clavier, par exemple
   * « Ctrl+Z », « Maj+R », « Espace ». Les lettres sont lues d'après le
   * clavier réel (AZERTY compris).
   */
  function nommer(e) {
    let touche = NOMS[e.key] || e.key;
    if (touche.length === 1) touche = touche.toUpperCase();
    if (['Control', 'Shift', 'Alt', 'Meta'].indexOf(e.key) >= 0) return '';
    const prefixes = [];
    if (e.ctrlKey) prefixes.push('Ctrl');
    if (e.altKey) prefixes.push('Alt');
    // Maj n'est noté que pour les touches qui ne sont pas des caractères
    // (« Maj+R » pour une lettre, mais « ? » reste « ? »).
    if (e.shiftKey && (touche.length > 1 || /[A-Z]/.test(touche))) prefixes.push('Maj');
    return prefixes.concat(touche).join('+');
  }

  /** L'action associée à une touche, ou null. */
  function actionDe(nomTouche) {
    const entree = table.find((r) => r.touches.indexOf(nomTouche) >= 0);
    return entree ? entree.action : null;
  }

  /** Touches de l'action, pour les afficher sur les boutons. */
  function touchesDe(action) {
    const entree = table.find((r) => r.action === action);
    return entree ? entree.touches : [];
  }

  /** Vrai si l'élément est une zone de saisie (les lettres y servent à taper). */
  function estChampDeSaisie(element) {
    if (!element) return false;
    const balise = element.tagName;
    return balise === 'INPUT' || balise === 'TEXTAREA' || balise === 'SELECT' || element.isContentEditable;
  }

  /**
   * Branche le clavier.
   * @param {object} p
   * @param {function(string): void} p.executer   lance une action
   * @param {function(KeyboardEvent): boolean} p.avant  traitement prioritaire (dialogue, éditeur) ; renvoie true si la touche est prise
   */
  function installer(p) {
    executer = p.executer;
    if (p.estBloque) estBloque = p.estBloque;

    document.addEventListener('keydown', (e) => {
      if (p.avant && p.avant(e)) return;
      // Dans un champ de saisie, les touches servent à taper (Ctrl+Z annule la frappe).
      if (estChampDeSaisie(e.target)) return;
      const action = actionDe(nommer(e));
      if (!action) return;
      e.preventDefault(); // évite le défilement de la page par Espace et les flèches
      // Une touche maintenue enfoncée ne répète pas l'action : on évite de
      // sauter plusieurs lignes par erreur en direct.
      if (!e.repeat) executer(action);
    });

    // Espace sur un bouton qui a le focus déclencherait aussi le bouton : on l'empêche.
    document.addEventListener('keyup', (e) => {
      if (e.key === ' ' && e.target && e.target.tagName === 'BUTTON' && actionDe('Espace')) e.preventDefault();
    });

    // Un clic de souris ne donne pas le focus aux boutons : les raccourcis
    // restent toujours actifs après un clic.
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest && e.target.closest('button') && !e.target.closest('.voile')) e.preventDefault();
    });
  }

  /**
   * Touche frappée sur un écran de sortie et transmise à l'écran opérateur :
   * même effet qu'au clavier de l'écran opérateur, sauf si un dialogue ou
   * l'éditeur est ouvert ici.
   * @param {{key: string, ctrlKey: boolean, shiftKey: boolean, altKey: boolean, repeat: boolean}} touche
   */
  function toucheDistante(touche) {
    if (estBloque() || touche.repeat) return;
    const action = actionDe(nommer(touche));
    if (action) executer(action);
  }

  /** Remplit l'aide-mémoire avec les touches réellement actives (section 11.1). */
  function afficherAideMemoire(conteneur) {
    conteneur.textContent = '';
    table.forEach((r) => {
      const dt = document.createElement('dt');
      r.touches.forEach((t, i) => {
        if (i) dt.appendChild(document.createTextNode(' '));
        const kbd = document.createElement('kbd');
        kbd.textContent = t;
        dt.appendChild(kbd);
      });
      const dd = document.createElement('dd');
      dd.textContent = r.libelle;
      conteneur.appendChild(dt);
      conteneur.appendChild(dd);
    });
  }

  Paroles.raccourcis = { PAR_DEFAUT, nommer, actionDe, touchesDe, installer, toucheDistante, afficherAideMemoire, estChampDeSaisie };
})(typeof globalThis !== 'undefined' ? globalThis : window);

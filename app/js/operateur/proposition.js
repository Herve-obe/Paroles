/*
 * Module « proposition » : zone de saisie de la proposition du candidat,
 * à droite de l'écran opérateur (sections 6, 8 et 9.1).
 *
 * - Une case par mot à trouver, dans l'ordre.
 * - Espace, Tab ou Entrée : case suivante ; Maj+Tab : case précédente ;
 *   Ctrl+Entrée : bloquer (Entrée ne bloque jamais, décision 6).
 * - Chaque lettre tapée part en direct sur les écrans de sortie (jaune) ;
 *   « Annuler la dernière action » revient case par case, pas lettre par lettre.
 * - Une fois bloquée : la suggestion « Juste » / « Faux » de chaque mot, que
 *   l'opérateur peut basculer d'un clic (faute de frappe, mot bien chanté).
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const PHASES_SAISIE = ['saisie', 'bloque', 'revele'];

  /** Construit les lignes de la zone (une par mot à trouver). */
  function construire(zone, nombre) {
    zone.textContent = '';
    const liste = document.createElement('ol');
    liste.className = 'liste-cases';
    for (let k = 0; k < nombre; k += 1) {
      const li = document.createElement('li');
      const etiquette = document.createElement('label');
      etiquette.className = 'numero-case';
      etiquette.textContent = 'Mot ' + (k + 1);
      const champ = document.createElement('input');
      champ.className = 'case-mot';
      champ.dataset.index = String(k);
      champ.autocomplete = 'off';
      champ.spellcheck = false;
      champ.id = 'case-mot-' + k;
      etiquette.htmlFor = champ.id;
      const bascule = document.createElement('button');
      bascule.type = 'button';
      bascule.className = 'bascule-mot';
      bascule.dataset.index = String(k);
      li.append(etiquette, champ, bascule);
      liste.appendChild(li);
    }
    zone.appendChild(liste);
    zone.dataset.cases = String(nombre);
  }

  function afficher(app) {
    const P = Paroles;
    const zone = document.getElementById('zone-proposition');
    const chanson = app.chansonCourante();
    const jeu = app.jeu;

    if (!chanson || !jeu || PHASES_SAISIE.indexOf(jeu.phase) < 0) {
      zone.dataset.cases = '';
      zone.textContent = '';
      const p = document.createElement('p');
      p.className = 'aide-proposition';
      p.textContent = 'La saisie s\'ouvre au passage à trou : « Saisir la proposition » (Entrée).';
      zone.appendChild(p);
      return;
    }

    const nombre = jeu.proposition.length;
    if (zone.dataset.cases !== String(nombre)) construire(zone, nombre);

    const evaluation = P.jeu.evaluation(jeu, chanson, app.preferences.accents);
    const enSaisie = jeu.phase === 'saisie';
    zone.querySelectorAll('.case-mot').forEach((champ) => {
      const k = Number(champ.dataset.index);
      // On ne touche pas à la case en cours de frappe (le curseur resterait en place).
      if (document.activeElement !== champ && champ.value !== jeu.proposition[k]) champ.value = jeu.proposition[k];
      champ.disabled = !enSaisie;
      champ.classList.toggle('revele', k < jeu.reveles);
    });
    zone.querySelectorAll('.bascule-mot').forEach((bouton) => {
      const k = Number(bouton.dataset.index);
      const m = evaluation.mots[k];
      bouton.hidden = enSaisie; // suggestion montrée une fois la proposition bloquée
      bouton.textContent = m.juste ? 'Juste' : 'Faux';
      bouton.className = 'bascule-mot ' + (m.juste ? 'juste' : 'faux') + (m.bascule !== null ? ' modifie' : '');
      bouton.title = (m.bascule !== null ? 'Modifié par l\'opérateur. ' : 'Suggestion calculée. ') +
        'Mot attendu : « ' + m.attendu + ' ». Cliquez pour basculer juste / faux.';
    });
  }

  /** Donne le curseur à une case (après « Saisir la proposition »). */
  function donnerFocus(index) {
    const champ = document.querySelector('.case-mot[data-index="' + index + '"]');
    if (champ && !champ.disabled) {
      champ.focus();
      champ.select();
    }
  }

  function installer(app) {
    const zone = document.getElementById('zone-proposition');

    // Début de frappe dans une case : on garde l'état d'avant pour l'annulation.
    zone.addEventListener('focusin', (e) => {
      if (e.target.classList.contains('case-mot')) app.debutSaisieMot();
    });
    // Chaque lettre part en direct vers les écrans de sortie.
    zone.addEventListener('input', (e) => {
      if (e.target.classList.contains('case-mot')) app.modifierMot(Number(e.target.dataset.index), e.target.value);
    });
    // Case quittée : une seule étape d'annulation pour toute la case.
    zone.addEventListener('focusout', (e) => {
      if (e.target.classList.contains('case-mot')) app.finSaisieMot();
    });

    zone.addEventListener('keydown', (e) => {
      if (!e.target.classList.contains('case-mot')) return;
      const k = Number(e.target.dataset.index);
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        e.target.blur();
        app.action('bloquer');
      } else if (e.key === ' ' || e.key === 'Enter' || (e.key === 'Tab' && !e.shiftKey)) {
        e.preventDefault(); // un mot ne contient pas d'espace : Espace passe à la case suivante
        donnerFocus(k + 1);
      } else if (e.key === 'Tab' && e.shiftKey) {
        e.preventDefault();
        donnerFocus(k - 1);
      } else if (e.key === 'Escape') {
        e.target.blur();
      }
    });

    zone.addEventListener('click', (e) => {
      const bouton = e.target.closest('.bascule-mot');
      if (bouton) app.action({ type: 'basculer', index: Number(bouton.dataset.index) });
    });
  }

  Paroles.proposition = { afficher, installer, donnerFocus };
})(typeof globalThis !== 'undefined' ? globalThis : window);

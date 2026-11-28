/*
 * Module « pilotage » : gros boutons de l'étape en cours, à droite de
 * l'écran opérateur (section 3.3). Seuls les boutons utiles à l'étape
 * sont montrés en grand, pour éviter les erreurs.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const NOMS_ETAPES = {
    aucune: 'Aucune chanson chargée',
    chargee: 'Chanson chargée',
    intro: 'Intro (écran sans paroles)',
    defilement: 'Défilement',
    trou: 'Passage à trou'
  };

  /** Boutons de chaque étape : action, libellé, style, raccourci affiché. */
  function boutonsDeLEtape(app, etape) {
    const titreAffiche = app.jeu && app.jeu.titre;
    switch (etape) {
      case 'chargee':
        return [
          { action: 'afficherTitre', libelle: titreAffiche ? 'Masquer le titre' : 'Afficher le titre' },
          { action: 'commencer', libelle: 'Commencer', style: 'principal', raccourci: 'etapeSuivante' }
        ];
      case 'intro':
        return [
          { action: 'ligneSuivante', libelle: 'Afficher la première ligne', style: 'principal' }
        ];
      case 'defilement':
        return [
          { action: 'ligneSuivante', libelle: 'Ligne suivante', style: 'principal' },
          { action: 'lignePrecedente', libelle: 'Ligne précédente', style: 'secondaire' }
        ];
      case 'trou':
        return [
          { action: 'ligneSuivante', libelle: 'Ligne suivante', style: 'principal' },
          { action: 'saisir', libelle: 'Saisir la proposition', indisponible: 'Disponible au lot 4' },
          { action: 'lignePrecedente', libelle: 'Ligne précédente', style: 'secondaire' }
        ];
      default:
        return [];
    }
  }

  function afficher(app) {
    const P = Paroles;
    const chanson = app.chansonCourante();
    const etape = chanson ? P.jeu.etape(app.jeu, chanson) : 'aucune';
    document.getElementById('titre-etape').textContent = 'Étape : ' + (NOMS_ETAPES[etape] || etape);

    const zone = document.getElementById('boutons-etape');
    zone.textContent = '';

    if (!chanson) {
      const p = document.createElement('p');
      p.className = 'etape-message';
      p.textContent = 'Chargez une chanson depuis la conduite.';
      zone.appendChild(p);
    }

    boutonsDeLEtape(app, etape).forEach((b) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.className = 'bouton-etape' + (b.style ? ' ' + b.style : '');
      bouton.dataset.action = b.action;
      const libelle = document.createElement('span');
      libelle.textContent = b.libelle;
      bouton.appendChild(libelle);

      const touches = P.raccourcis.touchesDe(b.raccourci || b.action);
      if (touches.length) {
        const kbd = document.createElement('kbd');
        kbd.textContent = touches[0];
        bouton.appendChild(kbd);
      }

      if (b.indisponible) {
        bouton.disabled = true;
        bouton.title = b.indisponible;
      } else {
        bouton.disabled = !P.jeu.possible(app.jeu, chanson, b.action);
      }
      zone.appendChild(bouton);
    });

    document.getElementById('btn-annuler').disabled = !app.historique.peutAnnuler();
    document.getElementById('btn-arreter').disabled = !chanson;
  }

  function installer(app) {
    document.getElementById('boutons-etape').addEventListener('click', (e) => {
      const bouton = e.target.closest('button[data-action]');
      if (bouton && !bouton.disabled) app.action(bouton.dataset.action);
    });
    document.getElementById('btn-annuler').addEventListener('click', () => app.annuler());
    document.getElementById('btn-arreter').addEventListener('click', () => app.arreterChanson());
  }

  Paroles.pilotage = { afficher, installer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

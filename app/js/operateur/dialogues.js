/*
 * Module « dialogues » : confirmations et messages affichés dans la page.
 * Le cahier des charges interdit les fenêtres bloquantes du navigateur
 * (alert, confirm) : tout passe par ce module (section 12).
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  let ouvert = null; // dialogue affiché : { resoudre, boutons, valeurAnnuler }

  /**
   * Ouvre un dialogue et attend le clic sur un bouton.
   * @param {object} p
   * @param {string} p.titre
   * @param {string|Node} p.message   texte ou contenu déjà construit
   * @param {Array<{libelle: string, valeur: *, style?: string}>} p.boutons
   * @param {*} [p.defaut]        valeur du bouton validé par Entrée
   * @param {*} [p.annuler]       valeur renvoyée par Échap
   * @returns {Promise<*>} la valeur du bouton cliqué
   */
  function ouvrir(p) {
    const voile = document.getElementById('dialogue');
    if (ouvert) fermer(ouvert.valeurAnnuler);

    voile.textContent = '';
    const boite = document.createElement('div');
    boite.className = 'boite boite-dialogue';
    boite.setAttribute('role', 'dialog');
    boite.setAttribute('aria-modal', 'true');

    const titre = document.createElement('h2');
    titre.textContent = p.titre;
    boite.appendChild(titre);

    const contenu = document.createElement('div');
    contenu.className = 'contenu';
    if (typeof p.message === 'string') contenu.textContent = p.message;
    else if (p.message) contenu.appendChild(p.message);
    boite.appendChild(contenu);

    const actions = document.createElement('div');
    actions.className = 'actions';
    let boutonDefaut = null;
    p.boutons.forEach((b) => {
      const bouton = document.createElement('button');
      bouton.type = 'button';
      bouton.textContent = b.libelle;
      if (b.style) bouton.classList.add(b.style);
      bouton.addEventListener('click', () => fermer(b.valeur));
      actions.appendChild(bouton);
      if (b.valeur === p.defaut) boutonDefaut = bouton;
    });
    boite.appendChild(actions);
    voile.appendChild(boite);
    voile.hidden = false;

    return new Promise((resoudre) => {
      ouvert = { resoudre, valeurAnnuler: p.annuler, valeurDefaut: p.defaut, aDefaut: p.defaut !== undefined };
      (boutonDefaut || actions.lastChild).focus();
    });
  }

  /** Ferme le dialogue ouvert en renvoyant une valeur. */
  function fermer(valeur) {
    if (!ouvert) return;
    const { resoudre } = ouvert;
    ouvert = null;
    const voile = document.getElementById('dialogue');
    voile.hidden = true;
    voile.textContent = '';
    resoudre(valeur);
  }

  /** Clavier quand un dialogue est ouvert : Échap annule, Entrée valide le choix par défaut. */
  function gererClavier(e) {
    if (!ouvert) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      fermer(ouvert.valeurAnnuler);
    } else if (e.key === 'Enter' && ouvert.aDefaut && !(e.target && e.target.tagName === 'BUTTON')) {
      e.preventDefault();
      fermer(ouvert.valeurDefaut);
    }
    // Les autres touches restent dans le dialogue (Tab, Entrée sur un bouton).
    return true;
  }

  /** Demande une confirmation simple : renvoie true si l'opérateur confirme. */
  function confirmer(titre, message, libelleOui, style) {
    return ouvrir({
      titre,
      message,
      boutons: [
        { libelle: 'Annuler', valeur: false },
        { libelle: libelleOui || 'Confirmer', valeur: true, style: style || 'principal' }
      ],
      defaut: true,
      annuler: false
    });
  }

  /** Message d'information avec un seul bouton « OK ». */
  function informer(titre, message) {
    return ouvrir({ titre, message, boutons: [{ libelle: 'OK', valeur: true, style: 'principal' }], defaut: true, annuler: true });
  }

  /**
   * Petite notification en bas de l'écran, qui disparaît seule.
   * @param {string} message
   * @param {string} [type] 'erreur' pour une notification rouge
   */
  function notifier(message, type) {
    const zone = document.getElementById('notifications');
    const n = document.createElement('div');
    n.className = 'notification' + (type ? ' ' + type : '');
    n.textContent = message;
    zone.appendChild(n);
    setTimeout(() => n.remove(), 3500);
  }

  /** Construit une liste à puces (pour les erreurs et avertissements). */
  function liste(elements, classe) {
    const ul = document.createElement('ul');
    elements.forEach((texte) => {
      const li = document.createElement('li');
      li.textContent = texte;
      if (classe) li.className = classe;
      ul.appendChild(li);
    });
    return ul;
  }

  Paroles.dialogues = {
    ouvrir,
    fermer,
    confirmer,
    informer,
    notifier,
    liste,
    gererClavier,
    estOuvert: () => !!ouvert
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

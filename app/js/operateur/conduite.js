/*
 * Module « conduite » : liste des chansons de l'émission, à gauche de
 * l'écran opérateur (section 3.1), et ses boutons.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Affiche la liste des chansons et met à jour l'état des boutons. */
  function afficher(app) {
    const P = Paroles;
    const em = app.emission;
    const liste = document.getElementById('liste-conduite');
    liste.textContent = '';

    document.getElementById('conduite-compte').textContent =
      em.chansons.length + ' chanson' + (em.chansons.length > 1 ? 's' : '');

    if (!em.chansons.length) {
      const vide = document.createElement('li');
      vide.className = 'liste-vide';
      vide.textContent = 'Aucune chanson. Cliquez sur « Nouvelle chanson » ou importez des fichiers .txt.';
      liste.appendChild(vide);
    }

    em.chansons.forEach((chanson) => {
      const li = document.createElement('li');
      li.dataset.id = chanson.id;
      if (chanson.id === app.selection) li.classList.add('selectionnee');
      if (chanson.id === app.courante) li.classList.add('chargee');

      const titre = document.createElement('span');
      titre.className = 'conduite-titre';
      titre.textContent = chanson.titre || '(sans titre)';
      titre.title = chanson.titre + (chanson.artiste ? ' (' + chanson.artiste + ')' : '');

      const etat = P.emission.etat(em, chanson.id);
      const badge = document.createElement('span');
      badge.className = 'etat etat-' + etat;
      const resultat = P.emission.resultat(em, chanson.id);
      badge.textContent = P.emission.LIBELLES_ETAT[etat] + (etat === 'jouee' && resultat ? ' · ' + (resultat === 'bonne' ? 'bonne réponse' : 'mauvaise réponse') : '');
      if (etat === 'jouee' && resultat) badge.classList.add('resultat-' + resultat);

      const details = document.createElement('span');
      details.className = 'conduite-details';
      const categorie = P.chanson.categorie(chanson.categorie);
      details.textContent = [
        P.emission.nomCandidat(em, chanson.candidat),
        categorie ? categorie.libelle : 'catégorie non précisée',
        chanson.mode
      ].join(' · ');

      li.append(titre, badge, details);
      liste.appendChild(li);
    });

    mettreAJourBoutons(app);
  }

  /** Active seulement les boutons qui ont un sens pour la chanson sélectionnée. */
  function mettreAJourBoutons(app) {
    const P = Paroles;
    const em = app.emission;
    const i = P.emission.index(em, app.selection);
    const aSelection = i >= 0;
    document.getElementById('btn-modifier').disabled = !aSelection;
    document.getElementById('btn-charger').disabled = !aSelection || app.selection === app.courante;
    document.getElementById('btn-supprimer').disabled = !aSelection;
    document.getElementById('btn-exporter').disabled = !aSelection;
    document.getElementById('btn-monter').disabled = !aSelection || i === 0;
    document.getElementById('btn-descendre').disabled = !aSelection || i === em.chansons.length - 1;
  }

  /** Branche les clics de la conduite. */
  function installer(app) {
    const P = Paroles;
    const liste = document.getElementById('liste-conduite');

    // Clic : sélectionner ; double-clic : charger.
    // Le clic ne redessine pas la liste (seulement la surbrillance et les
    // boutons) : sinon le second clic d'un double-clic tomberait sur un
    // élément neuf et le double-clic ne serait pas reconnu.
    liste.addEventListener('click', (e) => {
      const li = e.target.closest('li[data-id]');
      if (!li) return;
      app.selection = li.dataset.id;
      liste.querySelectorAll('li.selectionnee').forEach((el) => el.classList.remove('selectionnee'));
      li.classList.add('selectionnee');
      mettreAJourBoutons(app);
    });
    liste.addEventListener('dblclick', (e) => {
      const li = e.target.closest('li[data-id]');
      if (li) app.chargerChanson(li.dataset.id);
    });

    document.getElementById('btn-nouvelle').addEventListener('click', () => P.editeur.ouvrir(app, null));
    document.getElementById('btn-modifier').addEventListener('click', () => {
      const chanson = P.emission.trouver(app.emission, app.selection);
      if (chanson) P.editeur.ouvrir(app, chanson);
    });
    document.getElementById('btn-charger').addEventListener('click', () => app.chargerChanson(app.selection));
    document.getElementById('btn-monter').addEventListener('click', () => {
      if (P.emission.deplacer(app.emission, app.selection, -1)) app.rafraichir();
    });
    document.getElementById('btn-descendre').addEventListener('click', () => {
      if (P.emission.deplacer(app.emission, app.selection, 1)) app.rafraichir();
    });
    document.getElementById('btn-supprimer').addEventListener('click', () => supprimer(app));
  }

  /** Supprime la chanson sélectionnée, après confirmation dans la page. */
  async function supprimer(app) {
    const P = Paroles;
    const chanson = P.emission.trouver(app.emission, app.selection);
    if (!chanson) return;
    const enCours = chanson.id === app.courante;
    const ok = await P.dialogues.confirmer(
      'Supprimer la chanson ?',
      '« ' + (chanson.titre || 'sans titre') + ' » sera retirée de la conduite.' +
        (enCours ? ' C\'est la chanson chargée : elle sera déchargée.' : '') +
        ' Pensez à l\'exporter avant si vous voulez la garder.',
      'Supprimer',
      'danger'
    );
    if (!ok) return;
    const index = P.emission.index(app.emission, chanson.id);
    P.emission.supprimerChanson(app.emission, chanson.id);
    if (enCours) app.dechargerChanson();
    const voisine = app.emission.chansons[Math.min(index, app.emission.chansons.length - 1)];
    app.selection = voisine ? voisine.id : null;
    app.rafraichir();
    P.dialogues.notifier('Chanson supprimée.');
  }

  Paroles.conduite = { afficher, installer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

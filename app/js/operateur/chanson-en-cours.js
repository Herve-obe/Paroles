/*
 * Module « chanson-en-cours » : zone centrale de l'écran opérateur
 * (section 3.1). Toutes les lignes, la ligne à l'antenne surlignée, la
 * ligne suivante repérée, le passage à trou encadré. Les mots à trouver
 * restent lisibles en clair pour l'opérateur (soulignés en violet).
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  function afficher(app) {
    const P = Paroles;
    const entete = document.getElementById('entete-chanson');
    const zone = document.getElementById('lignes-chanson');
    const chanson = app.chansonCourante();
    entete.textContent = '';
    zone.textContent = '';

    if (!chanson) {
      const h2 = document.createElement('h2');
      h2.id = 'titre-chanson';
      h2.textContent = 'Aucune chanson chargée';
      entete.appendChild(h2);
      const message = document.createElement('p');
      message.className = 'message-centre';
      message.textContent = 'Sélectionnez une chanson dans la conduite puis cliquez sur « Charger » (ou double-cliquez dessus).';
      zone.appendChild(message);
      return;
    }

    // En-tête : titre, artiste, candidat, catégorie, mode.
    const infos = document.createElement('div');
    infos.className = 'entete-infos';
    const h2 = document.createElement('h2');
    h2.id = 'titre-chanson';
    h2.textContent = chanson.titre;
    const details = document.createElement('div');
    details.className = 'discret';
    const categorie = P.chanson.categorie(chanson.categorie);
    [chanson.artiste, P.emission.nomCandidat(app.emission, chanson.candidat), categorie && categorie.libelle, chanson.theme]
      .filter(Boolean)
      .forEach((texte) => {
        const s = document.createElement('span');
        s.textContent = texte;
        details.appendChild(s);
      });
    infos.append(h2, details);
    const mode = document.createElement('span');
    mode.className = 'badge-mode';
    mode.textContent = chanson.mode;
    entete.append(infos, mode);

    // Titre affiché à l'antenne (étape « Chanson chargée »).
    if (app.jeu.titre) {
      const titre = document.createElement('div');
      titre.className = 'titre-antenne';
      const strong = document.createElement('strong');
      strong.textContent = 'Titre à l\'antenne';
      titre.append(strong, document.createTextNode(chanson.titre + (chanson.artiste ? ' : ' + chanson.artiste : '')));
      zone.appendChild(titre);
    }

    // Intro : écran sans paroles entre le titre et la première ligne.
    if (app.jeu.phase === 'intro') {
      const intro = document.createElement('div');
      intro.className = 'titre-antenne';
      const strong = document.createElement('strong');
      strong.textContent = 'Intro : écran sans paroles';
      intro.append(strong, document.createTextNode('La première ligne est prête : « Afficher la première ligne » ou Espace.'));
      zone.appendChild(intro);
    }

    // Lignes, avec le passage à trou dans un cadre.
    const trou = P.chanson.passage(chanson);
    const suivante = P.jeu.ligneSuivanteIndex(app.jeu, chanson);
    let cadre = null;
    let elementAntenne = null;

    chanson.lignes.forEach((ligne, i) => {
      const dansTrou = trou && i >= trou.debut && i <= trou.fin;
      if (dansTrou && i === trou.debut) {
        cadre = document.createElement('div');
        cadre.className = 'cadre-trou';
        const t = document.createElement('div');
        t.className = 'cadre-trou-titre';
        t.textContent = 'Passage à trou';
        cadre.appendChild(t);
        zone.appendChild(cadre);
      }

      const rangee = document.createElement('div');
      rangee.className = 'ligne-op';
      rangee.dataset.ligne = String(i);
      const numero = document.createElement('span');
      numero.className = 'numero';
      numero.textContent = String(i + 1);
      const repere = document.createElement('span');
      repere.className = 'repere';

      if (i === app.jeu.ligne) {
        rangee.classList.add('antenne');
        repere.textContent = 'À l\'antenne';
        elementAntenne = rangee;
      } else if (i === suivante && app.jeu.phase !== 'chargee') {
        rangee.classList.add('suivante');
        repere.textContent = 'Suivante';
      } else if (app.jeu.ligne != null && i < app.jeu.ligne) {
        rangee.classList.add('passee');
      }
      if (trou && i > trou.fin) rangee.classList.add('apres-trou');

      rangee.append(numero, P.rendu.ligne(ligne, { signalerTrou: true }), repere);
      (dansTrou ? cadre : zone).appendChild(rangee);
    });

    // La ligne à l'antenne reste visible (sans animation : affichage immédiat).
    if (elementAntenne) elementAntenne.scrollIntoView({ block: 'center' });
  }

  Paroles.chansonEnCours = { afficher };
})(typeof globalThis !== 'undefined' ? globalThis : window);

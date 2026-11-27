/*
 * Module « editeur » : formulaire « Nouvelle chanson » / « Modifier ».
 * Référence : cahier des charges, section 4.1.
 *
 * La zone « Paroles » contient le texte au format du fichier .txt : les
 * mots à trouver sont entre crochets, et surlignés grâce à un calque placé
 * derrière la zone de texte. Les boutons « Marquer » et « Démarquer »
 * posent ou retirent les crochets autour des mots sélectionnés.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  let session = null; // éditeur ouvert : { app, origine, modifie, elements }

  /* Structure du formulaire : uniquement des libellés fixes, jamais de
     données saisies (celles-ci passent par .value et textContent). */
  const GABARIT = `
    <div class="boite boite-editeur" role="dialog" aria-modal="true" aria-labelledby="editeur-titre">
      <div class="editeur-entete">
        <h2 id="editeur-titre"></h2>
        <span class="discret">Les champs marqués <span class="obligatoire">*</span> sont obligatoires.</span>
      </div>
      <div class="editeur-corps">
        <div class="editeur-champs">
          <label class="champ"><span>Titre <span class="obligatoire">*</span></span><input name="titre" maxlength="200"></label>
          <label class="champ"><span>Artiste</span><input name="artiste" maxlength="200"></label>
          <label class="champ"><span>Candidat</span><select name="candidat"></select></label>
          <label class="champ"><span>Catégorie</span><select name="categorie"></select></label>
          <label class="champ"><span>Thème</span><input name="theme" maxlength="200" placeholder="par exemple : Années 80"></label>
          <div class="champ"><span>Mode (information pour l'opérateur)</span>
            <div class="champ-radio">
              <label><input type="radio" name="mode" value="ORCHESTRE"> ORCHESTRE</label>
              <label><input type="radio" name="mode" value="PLAYBACK"> PLAYBACK</label>
            </div>
          </div>
          <label class="champ"><span id="libelle-faux1">Fausse proposition 1</span><input name="faux1"><span class="etat-champ" data-etat="faux1"></span></label>
          <label class="champ"><span id="libelle-faux2">Fausse proposition 2</span><input name="faux2"><span class="etat-champ" data-etat="faux2"></span></label>
          <label class="champ"><span>Note libre</span><textarea name="note" rows="3"></textarea></label>
        </div>
        <div class="editeur-paroles">
          <div class="outils">
            <button type="button" data-action="marquer" class="principal">Marquer comme mots à trouver</button>
            <button type="button" data-action="demarquer">Démarquer</button>
            <span class="discret">Une ligne de texte = une ligne à l'écran. Sélectionnez des mots à la souris, puis « Marquer ».</span>
          </div>
          <div class="zone-surlignee">
            <div class="calque" aria-hidden="true"></div>
            <textarea name="paroles" spellcheck="false" aria-label="Paroles"></textarea>
          </div>
          <div class="infos-paroles" data-infos></div>
          <div class="apercu" data-apercu hidden></div>
        </div>
      </div>
      <div class="editeur-pied">
        <button type="button" data-action="apercu">Aperçu</button>
        <div class="groupe">
          <button type="button" data-action="fermer">Annuler</button>
          <button type="button" data-action="enregistrer" class="principal">Enregistrer</button>
        </div>
      </div>
    </div>`;

  /**
   * Ouvre l'éditeur.
   * @param {object} app
   * @param {object|null} chanson  null pour une nouvelle chanson
   */
  function ouvrir(app, chanson) {
    const P = Paroles;
    const voile = document.getElementById('editeur');
    voile.innerHTML = GABARIT;
    const q = (selecteur) => voile.querySelector(selecteur);
    const champ = (nom) => voile.querySelector('[name="' + nom + '"]');

    q('#editeur-titre').textContent = chanson ? 'Modifier la chanson' : 'Nouvelle chanson';

    // Listes déroulantes : candidats de l'émission et catégories.
    const selectCandidat = champ('candidat');
    const nbCandidats = Math.max(app.emission.candidats.length, chanson ? chanson.candidat : 1);
    for (let n = 1; n <= nbCandidats; n += 1) {
      selectCandidat.add(new Option(n + ' : ' + P.emission.nomCandidat(app.emission, n), String(n)));
    }
    const selectCategorie = champ('categorie');
    selectCategorie.add(new Option('Non précisée', ''));
    P.chanson.CATEGORIES.forEach((c) => selectCategorie.add(new Option(c.libelle, c.code)));

    // Valeurs de départ.
    const c = chanson || P.chanson.creer({});
    ['titre', 'artiste', 'theme', 'faux1', 'faux2', 'note'].forEach((nom) => { champ(nom).value = c[nom]; });
    selectCandidat.value = String(c.candidat);
    selectCategorie.value = c.categorie;
    voile.querySelector('input[name="mode"][value="' + c.mode + '"]').checked = true;
    champ('paroles').value = chanson ? P.chanson.texteParoles(chanson) : '';

    session = { app, origine: chanson, modifie: false, voile, champ, q };

    // Toute saisie met à jour les contrôles en direct.
    voile.addEventListener('input', () => { session.modifie = true; actualiser(); });
    voile.addEventListener('change', () => { session.modifie = true; });
    const zone = champ('paroles');
    zone.addEventListener('scroll', () => { q('.calque').scrollTop = zone.scrollTop; });

    voile.addEventListener('click', (e) => {
      const bouton = e.target.closest('button[data-action]');
      if (!bouton) return;
      const action = bouton.dataset.action;
      if (action === 'marquer') marquer(true);
      else if (action === 'demarquer') marquer(false);
      else if (action === 'apercu') basculerApercu();
      else if (action === 'fermer') fermer(false);
      else if (action === 'enregistrer') enregistrer();
    });

    voile.hidden = false;
    actualiser();
    champ(chanson ? 'paroles' : 'titre').focus();
  }

  /** Construit la chanson à partir du formulaire (lignes sans erreur seulement). */
  function lireFormulaire() {
    const P = Paroles;
    const champ = session.champ;
    const analyse = P.chanson.analyserTexte(champ('paroles').value);
    const mode = session.voile.querySelector('input[name="mode"]:checked');
    const chanson = P.chanson.creer({
      id: session.origine ? session.origine.id : undefined,
      titre: champ('titre').value,
      artiste: champ('artiste').value,
      candidat: champ('candidat').value,
      categorie: champ('categorie').value,
      theme: champ('theme').value,
      mode: mode ? mode.value : 'ORCHESTRE',
      note: champ('note').value,
      faux1: champ('faux1').value,
      faux2: champ('faux2').value,
      lignes: analyse.lignes
    });
    return { chanson, analyse };
  }

  /** Met à jour le surlignage, le nombre de mots, les fausses propositions et l'aperçu. */
  function actualiser() {
    if (!session) return;
    const P = Paroles;
    const { q, champ } = session;
    const texte = champ('paroles').value;

    // Calque de surlignage : même texte, groupes [ ] surlignés.
    const calque = q('.calque');
    calque.textContent = '';
    let dernier = 0;
    texte.replace(/\[[^\[\]\n]*\]/g, (groupe, position) => {
      calque.appendChild(document.createTextNode(texte.slice(dernier, position)));
      const mark = document.createElement('mark');
      mark.textContent = groupe;
      calque.appendChild(mark);
      dernier = position + groupe.length;
      return groupe;
    });
    calque.appendChild(document.createTextNode(texte.slice(dernier) + '\n'));
    calque.scrollTop = champ('paroles').scrollTop;

    const { chanson, analyse } = lireFormulaire();
    const mots = P.chanson.motsATrouver(chanson);
    const nb = mots.length;

    // Infos sous la zone de texte : mots à trouver et erreurs.
    const infos = q('[data-infos]');
    infos.textContent = '';
    if (analyse.erreurs.length) {
      infos.appendChild(P.dialogues.liste(analyse.erreurs.map((e) => e.texte), 'erreur-texte'));
    } else if (nb) {
      infos.appendChild(document.createTextNode('Mots à trouver : ' + nb + ' ('));
      const liste = document.createElement('span');
      liste.className = 'liste-mots';
      liste.textContent = mots.map((m) => m.mot).join(' ');
      infos.appendChild(liste);
      infos.appendChild(document.createTextNode(')'));
      const valid = P.chanson.valider(chanson);
      if (valid.erreurs.some((e) => e.indexOf('deux passages') >= 0)) {
        infos.appendChild(P.dialogues.liste(['Il y a deux passages à trou séparés : un seul passage par chanson.'], 'erreur-texte'));
      }
    } else {
      infos.textContent = 'Aucun mot à trouver pour l\'instant.';
    }

    // Fausses propositions : nombre de mots attendu et contrôle (règle 8).
    ['faux1', 'faux2'].forEach((nom, i) => {
      q('#libelle-' + nom).textContent = 'Fausse proposition ' + (i + 1) + (nb ? ' (' + nb + ' mot' + (nb > 1 ? 's' : '') + ' attendu' + (nb > 1 ? 's' : '') + ')' : '');
      const etat = q('[data-etat="' + nom + '"]');
      const v = P.chanson.verifierFausseProposition(champ(nom).value, nb);
      etat.className = 'etat-champ';
      if (!nb) {
        etat.textContent = 'Marquez d\'abord les mots à trouver.';
      } else if (v.vide) {
        etat.textContent = 'Facultative : sans elle, le joker « 3 propositions » est indisponible.';
      } else if (!v.valide) {
        etat.classList.add('ko');
        etat.textContent = 'Refusée : ' + v.message + '.';
      } else {
        etat.classList.add('ok');
        etat.textContent = 'Correcte : ' + v.nbMots + ' mot' + (v.nbMots > 1 ? 's' : '') + '.';
      }
    });

    if (!q('[data-apercu]').hidden) afficherApercu(chanson);
  }

  /** Aperçu de la chanson telle qu'elle s'affichera, « _ » compris. */
  function afficherApercu(chanson) {
    const apercu = session.q('[data-apercu]');
    apercu.textContent = '';
    const titre = document.createElement('h3');
    titre.textContent = 'Aperçu : les mots à trouver sont remplacés par un « _ » par lettre.';
    apercu.appendChild(titre);
    chanson.lignes.forEach((ligne) => apercu.appendChild(Paroles.rendu.ligne(ligne, { masquer: true })));
  }

  function basculerApercu() {
    const apercu = session.q('[data-apercu]');
    apercu.hidden = !apercu.hidden;
    session.q('[data-action="apercu"]').textContent = apercu.hidden ? 'Aperçu' : 'Masquer l\'aperçu';
    actualiser();
  }

  /** Boutons « Marquer comme mots à trouver » et « Démarquer ». */
  function marquer(valeur) {
    const zone = session.champ('paroles');
    const r = Paroles.edition.marquer(zone.value, zone.selectionStart, zone.selectionEnd, valeur);
    if (r.erreur) {
      Paroles.dialogues.notifier(r.erreur, 'erreur');
      return;
    }
    if (!r.modifie) {
      Paroles.dialogues.notifier(valeur ? 'Sélectionnez d\'abord des mots dans les paroles.' : 'Aucun mot marqué dans la sélection.');
      zone.focus();
      return;
    }
    const defilement = zone.scrollTop;
    zone.value = r.texte;
    zone.focus();
    zone.setSelectionRange(r.curseur, r.curseur);
    zone.scrollTop = defilement;
    session.modifie = true;
    actualiser();
  }

  /** « Enregistrer » : contrôles de la section 4.1, puis ajout ou mise à jour dans la conduite. */
  async function enregistrer() {
    const P = Paroles;
    const { app } = session;
    const { chanson, analyse } = lireFormulaire();

    if (analyse.erreurs.length) {
      await P.dialogues.informer('Impossible d\'enregistrer', P.dialogues.liste(analyse.erreurs.map((e) => e.texte), 'erreur-texte'));
      return;
    }
    const controle = P.chanson.valider(chanson);
    if (controle.erreurs.length) {
      await P.dialogues.informer('Impossible d\'enregistrer', P.dialogues.liste(controle.erreurs, 'erreur-texte'));
      return;
    }
    if (controle.avertissements.length) {
      const ok = await P.dialogues.ouvrir({
        titre: 'Enregistrer malgré les avertissements ?',
        message: P.dialogues.liste(controle.avertissements, 'avertissement-texte'),
        boutons: [{ libelle: 'Revenir à l\'édition', valeur: false }, { libelle: 'Enregistrer', valeur: true, style: 'principal' }],
        defaut: true,
        annuler: false
      });
      if (!ok) return;
    }

    const estCourante = session.origine && session.origine.id === app.courante;
    if (estCourante && app.chansonEnCours()) {
      const ok = await P.dialogues.confirmer(
        'Chanson en cours',
        'Cette chanson est en cours de déroulé. L\'enregistrer la remet au début (étape « Chanson chargée »).',
        'Enregistrer'
      );
      if (!ok) return;
    }

    if (session.origine) P.emission.remplacerChanson(app.emission, chanson);
    else P.emission.ajouterChanson(app.emission, chanson);
    app.selection = chanson.id;
    if (estCourante) app.rechargerCourante();
    fermer(true);
    app.rafraichir();
    P.dialogues.notifier('Chanson enregistrée : ' + chanson.titre + '.');
  }

  /**
   * Ferme l'éditeur. Si des modifications n'ont pas été enregistrées,
   * demande confirmation (sauf après un enregistrement).
   */
  async function fermer(apresEnregistrement) {
    if (!session) return;
    if (!apresEnregistrement && session.modifie) {
      const ok = await Paroles.dialogues.confirmer('Abandonner les modifications ?', 'Les modifications de cette chanson seront perdues.', 'Abandonner', 'danger');
      if (!ok) return;
    }
    session.voile.hidden = true;
    session.voile.textContent = '';
    session = null;
  }

  /** Clavier quand l'éditeur est ouvert : Échap ferme ; les raccourcis du jeu sont inactifs. */
  function gererClavier(e) {
    if (!session) return false;
    if (e.key === 'Escape') {
      e.preventDefault();
      fermer(false);
    }
    return true;
  }

  Paroles.editeur = { ouvrir, fermer, gererClavier, estOuvert: () => !!session };
})(typeof globalThis !== 'undefined' ? globalThis : window);

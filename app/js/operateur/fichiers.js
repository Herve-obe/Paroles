/*
 * Module « fichiers » : import de fichiers .txt (bouton ou glisser-déposer)
 * et export de la chanson sélectionnée (section 4.2).
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Lit un fichier choisi par l'opérateur et renvoie ses octets. */
  function lireOctets(fichier) {
    return new Promise((resoudre, rejeter) => {
      const lecteur = new FileReader();
      lecteur.onload = () => resoudre(new Uint8Array(lecteur.result));
      lecteur.onerror = () => rejeter(lecteur.error);
      lecteur.readAsArrayBuffer(fichier);
    });
  }

  /**
   * Importe une liste de fichiers .txt : chaque fichier valide devient une
   * chanson ajoutée à la fin de la conduite. Un compte rendu est affiché.
   */
  async function importer(app, fichiers) {
    const P = Paroles;
    const importes = [];
    const refuses = [];     // { nom, erreurs: [texte] }
    const avertissements = [];

    for (const fichier of Array.from(fichiers)) {
      if (!/\.txt$/i.test(fichier.name)) {
        refuses.push({ nom: fichier.name, erreurs: [fichier.name + ' : ce n\'est pas un fichier .txt'] });
        continue;
      }
      try {
        const resultat = P.formatTxt.lireOctets(await lireOctets(fichier), fichier.name);
        if (resultat.ok) {
          P.emission.ajouterChanson(app.emission, resultat.chanson);
          importes.push(resultat.chanson);
          resultat.avertissements.forEach((a) => avertissements.push(a.texte));
        } else {
          refuses.push({ nom: fichier.name, erreurs: resultat.erreurs.map((e) => e.texte) });
        }
      } catch (erreur) {
        refuses.push({ nom: fichier.name, erreurs: [fichier.name + ' : lecture impossible (' + erreur.message + ')'] });
      }
    }

    if (importes.length) {
      app.selection = importes[importes.length - 1].id;
      app.rafraichir();
    }

    const bilan = importes.length + ' chanson' + (importes.length > 1 ? 's importées' : ' importée');
    if (!refuses.length && !avertissements.length) {
      if (importes.length) P.dialogues.notifier(bilan + '.');
      return;
    }

    // Compte rendu détaillé dans la page.
    const contenu = document.createElement('div');
    const resume = document.createElement('p');
    resume.textContent = bilan + (refuses.length ? ', ' + refuses.length + ' fichier' + (refuses.length > 1 ? 's refusés' : ' refusé') : '') + '.';
    contenu.appendChild(resume);
    if (refuses.length) {
      const t = document.createElement('p');
      t.textContent = 'Erreurs (fichiers non importés) :';
      contenu.appendChild(t);
      contenu.appendChild(P.dialogues.liste(refuses.flatMap((r) => r.erreurs), 'erreur-texte'));
    }
    if (avertissements.length) {
      const t = document.createElement('p');
      t.textContent = 'Avertissements (chansons importées quand même) :';
      contenu.appendChild(t);
      contenu.appendChild(P.dialogues.liste(avertissements, 'avertissement-texte'));
    }
    P.dialogues.informer('Import des fichiers .txt', contenu);
  }

  /** Nom de fichier sans caractères interdits par Windows. */
  function nomDeFichier(titre) {
    const propre = String(titre || 'chanson').replace(/[<>:"/\\|?*\u0000-\u001f]/g, ' ').replace(/\s+/g, ' ').trim();
    return (propre || 'chanson').slice(0, 80) + '.txt';
  }

  /**
   * Enregistre un texte dans un fichier choisi par l'opérateur.
   * Chrome et Edge : fenêtre « Enregistrer sous » avec le nom proposé.
   * Une page ouverte par double-clic ne peut pas imposer le nom d'un simple
   * téléchargement (le navigateur l'appellerait « download ») : le
   * téléchargement classique ne sert donc que de solution de repli (Firefox).
   * Doit être appelé directement depuis un clic (exigence du navigateur).
   * @returns {Promise<{ok: boolean, nom?: string, annule?: boolean, telecharge?: boolean}>}
   */
  async function enregistrerFichier(nom, texte, description, extension, typeMime) {
    // Le BOM (\uFEFF) aide les anciennes versions du Bloc-notes à reconnaître l'UTF-8.
    const blob = new Blob(['\uFEFF' + texte], { type: typeMime + ';charset=utf-8' });
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const accept = {};
        accept[typeMime] = [extension];
        const poignee = await window.showSaveFilePicker({ suggestedName: nom, types: [{ description, accept }] });
        const flux = await poignee.createWritable();
        await flux.write(blob);
        await flux.close();
        return { ok: true, nom: poignee.name };
      } catch (erreur) {
        if (erreur && erreur.name === 'AbortError') return { ok: false, annule: true };
        // Autre problème (fonction bloquée...) : on passe au téléchargement classique.
      }
    }
    const lien = document.createElement('a');
    lien.href = URL.createObjectURL(blob);
    lien.download = nom;
    document.body.appendChild(lien);
    lien.click();
    lien.remove();
    setTimeout(() => URL.revokeObjectURL(lien.href), 1000);
    return { ok: true, nom, telecharge: true };
  }

  /** « Exporter la chanson » : crée le .txt de la chanson sélectionnée. */
  async function exporter(app) {
    const P = Paroles;
    const chanson = P.emission.trouver(app.emission, app.selection);
    if (!chanson) return;
    const r = await enregistrerFichier(nomDeFichier(chanson.titre), P.formatTxt.ecrire(chanson), 'Chanson (texte)', '.txt', 'text/plain');
    if (r.ok) P.dialogues.notifier('Exportée : ' + r.nom + (r.telecharge ? ' (dossier Téléchargements).' : '.'));
  }

  /** Branche le bouton « Importer », le glisser-déposer et l'export. */
  function installer(app) {
    const champ = document.getElementById('fichier-import');
    document.getElementById('btn-importer').addEventListener('click', () => champ.click());
    champ.addEventListener('change', () => {
      if (champ.files.length) importer(app, champ.files);
      champ.value = ''; // permet de réimporter le même fichier
    });
    document.getElementById('btn-exporter').addEventListener('click', () => exporter(app));

    // Glisser-déposer sur toute la fenêtre.
    const depot = document.getElementById('depot');
    let compteur = 0; // dragenter/dragleave se déclenchent sur chaque élément survolé
    const contientFichiers = (e) => e.dataTransfer && Array.from(e.dataTransfer.types || []).indexOf('Files') >= 0;
    window.addEventListener('dragenter', (e) => {
      if (!contientFichiers(e)) return;
      e.preventDefault();
      compteur += 1;
      depot.hidden = false;
    });
    window.addEventListener('dragover', (e) => {
      if (contientFichiers(e)) e.preventDefault();
    });
    window.addEventListener('dragleave', () => {
      compteur = Math.max(0, compteur - 1);
      if (!compteur) depot.hidden = true;
    });
    window.addEventListener('drop', (e) => {
      if (!contientFichiers(e)) return;
      e.preventDefault(); // sinon le navigateur ouvrirait le fichier à la place de l'application
      compteur = 0;
      depot.hidden = true;
      importer(app, e.dataTransfer.files);
    });
  }

  Paroles.fichiers = { installer, importer, exporter, nomDeFichier, enregistrerFichier };
})(typeof globalThis !== 'undefined' ? globalThis : window);

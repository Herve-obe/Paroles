/*
 * Module « edition » : boutons « Marquer comme mots à trouver » et
 * « Démarquer » de l'éditeur de chanson (section 4.1).
 *
 * L'opérateur sélectionne des mots à la souris dans la zone « Paroles » ;
 * la sélection est étendue aux mots entiers, puis les crochets sont posés
 * (ou retirés) dans le texte. Le texte de la zone reste au format du
 * fichier .txt : ce que l'on voit est ce qui sera exporté.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /**
   * Marque (valeur = true) ou démarque (valeur = false) les mots touchés par
   * la sélection [debut, fin[ du texte. Sans sélection (debut = fin), c'est
   * le mot sous le curseur qui est concerné.
   * @param {string} texte    contenu de la zone « Paroles »
   * @param {number} debut    début de la sélection
   * @param {number} fin      fin de la sélection
   * @param {boolean} valeur  true pour marquer, false pour démarquer
   * @returns {{texte: string, curseur: number, modifie: boolean} | {erreur: string}}
   */
  function marquer(texte, debut, fin, valeur) {
    const chanson = Paroles.chanson;
    const estMot = Paroles.mots.estMot;
    const lignes = String(texte).split('\n');
    const resultat = [];
    let decalage = 0;            // position du début de la ligne dans le texte d'origine
    let nouveauDecalage = 0;     // même chose dans le nouveau texte
    let curseur = fin;
    let modifie = false;

    for (let n = 0; n < lignes.length; n += 1) {
      const ligne = lignes[n];
      const debutLigne = decalage;
      const finLigne = decalage + ligne.length;
      decalage = finLigne + 1; // + 1 pour le retour à la ligne

      // La sélection touche-t-elle cette ligne ?
      const touchee = debut === fin ? debut >= debutLigne && debut <= finLigne : fin > debutLigne && debut <= finLigne;
      if (!touchee || !ligne.trim()) {
        resultat.push(ligne);
        nouveauDecalage += ligne.length + 1;
        continue;
      }

      const analyse = chanson.analyserLigne(ligne);
      if (analyse.erreur) return { erreur: chanson.formaterMessage('', n + 1, analyse.erreur) };

      // Positions de la sélection relatives à la ligne.
      const a = debut - debutLigne;
      const b = fin - debutLigne;
      let ligneModifiee = false;
      analyse.mots.forEach((mot, i) => {
        const p = analyse.positions[i];
        const dansSelection = a === b ? p.debut <= a && a <= p.fin : p.fin > a && p.debut < b;
        if (dansSelection && estMot(mot.texte) && mot.aTrouver !== valeur) {
          mot.aTrouver = valeur;
          ligneModifiee = true;
        }
      });

      const nouvelleLigne = ligneModifiee ? chanson.ecrireLigne(analyse.mots) : ligne;
      if (ligneModifiee) {
        modifie = true;
        curseur = nouveauDecalage + nouvelleLigne.length;
      }
      resultat.push(nouvelleLigne);
      nouveauDecalage += nouvelleLigne.length + 1;
    }

    return { texte: resultat.join('\n'), curseur, modifie };
  }

  Paroles.edition = { marquer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

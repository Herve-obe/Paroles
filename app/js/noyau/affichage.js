/*
 * Module « affichage » : calcule ce que montrent les écrans de sortie.
 * Référence : cahier des charges, sections 3.2 et 5.
 *
 * L'écran opérateur calcule ce contenu et l'envoie tel quel aux écrans de
 * sortie, qui n'ont plus qu'à le dessiner. Les mots à trouver sont déjà
 * remplacés par leurs « _ » : leur texte n'est jamais envoyé avant la
 * révélation (impossible de le voir, même en fouillant l'écran de sortie).
 *
 * Contenu envoyé :
 *   { noir: bool, type: 'vide' }
 *   { noir: bool, type: 'titre', titre, artiste }
 *   { noir: bool, type: 'paroles', lignes: [ { role: 'courante' | 'suivante',
 *       masquer: bool, mots: [ { texte, masque: bool } ] } ] }
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /** Mots d'une ligne prêts à afficher, masqués si besoin. */
  function motsAffiches(ligne, masquer) {
    const mots = Paroles.mots;
    return ligne.mots.map((m) => {
      const aTrouver = m.aTrouver && mots.estMot(m.texte);
      if (masquer && aTrouver) return { texte: mots.masquer(m.texte), masque: true };
      return { texte: m.texte, masque: false };
    });
  }

  /**
   * @param {object} p
   * @param {object|null} p.chanson   chanson chargée
   * @param {object|null} p.jeu       état du déroulé (module jeu)
   * @param {number} p.nbLignes       1, 2 ou 3
   * @param {boolean} p.noir          bouton « Noir » enfoncé
   * @param {boolean} [p.ligneSuivante] false pour ne pas montrer la ligne suivante
   */
  function calculer(p) {
    const noir = !!p.noir;
    const chanson = p.chanson;
    const jeu = p.jeu;
    if (!chanson || !jeu) return { noir, type: 'vide' };

    if (jeu.phase === 'chargee') {
      return jeu.titre ? { noir, type: 'titre', titre: chanson.titre, artiste: chanson.artiste } : { noir, type: 'vide' };
    }

    const nombre = p.ligneSuivante === false ? 1 : p.nbLignes || 2;
    const trou = Paroles.chanson.passage(chanson);
    const lignes = Paroles.jeu.lignesVisibles(jeu, chanson, nombre).map((index, rang) => {
      const masquer = !!trou && index >= trou.debut && index <= trou.fin && jeu.phase !== 'revele';
      return { role: rang === 0 ? 'courante' : 'suivante', masquer, mots: motsAffiches(chanson.lignes[index], masquer) };
    });
    return { noir, type: 'paroles', lignes };
  }

  Paroles.affichage = { calculer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

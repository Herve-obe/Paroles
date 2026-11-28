/*
 * Module « emission » : l'émission complète et sa conduite.
 * Référence : cahier des charges, sections 3.1, 10 et 12.
 *
 * Une émission est un objet simple, enregistrable en JSON :
 *   {
 *     schema: 1,                 numéro du format de fichier
 *     nom: 'Paroles',            nom de l'émission
 *     candidats: ['Candidat 1', 'Candidat 2'],
 *     chansons: [ ... ],         la conduite, dans l'ordre
 *     suivi: { idChanson: { etat: 'a_venir' | 'en_cours' | 'jouee', resultat: null } }
 *   }
 * Les fonctions modifient l'émission qu'on leur donne.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  const SCHEMA = 1;
  const LIBELLES_ETAT = { a_venir: 'à venir', en_cours: 'en cours', jouee: 'jouée' };

  /** Crée une émission vide. */
  function creer() {
    return { schema: SCHEMA, nom: 'Paroles', candidats: ['Candidat 1', 'Candidat 2'], chansons: [], suivi: {} };
  }

  /** Position d'une chanson dans la conduite (-1 si absente). */
  function index(em, id) {
    return em.chansons.findIndex((c) => c.id === id);
  }

  /** La chanson qui porte cet identifiant, ou null. */
  function trouver(em, id) {
    return em.chansons[index(em, id)] || null;
  }

  /** Ajoute une chanson à la fin de la conduite, à l'état « à venir ». */
  function ajouterChanson(em, chanson) {
    em.chansons.push(chanson);
    em.suivi[chanson.id] = { etat: 'a_venir', resultat: null };
    return chanson;
  }

  /** Remplace une chanson modifiée dans l'éditeur, au même endroit, en gardant son état. */
  function remplacerChanson(em, chanson) {
    const i = index(em, chanson.id);
    if (i < 0) return ajouterChanson(em, chanson);
    em.chansons[i] = chanson;
    return chanson;
  }

  /** Retire une chanson de la conduite. */
  function supprimerChanson(em, id) {
    const i = index(em, id);
    if (i < 0) return false;
    em.chansons.splice(i, 1);
    delete em.suivi[id];
    return true;
  }

  /** Monte (delta = -1) ou descend (delta = +1) une chanson. Renvoie false si impossible. */
  function deplacer(em, id, delta) {
    const i = index(em, id);
    const j = i + delta;
    if (i < 0 || j < 0 || j >= em.chansons.length) return false;
    const [chanson] = em.chansons.splice(i, 1);
    em.chansons.splice(j, 0, chanson);
    return true;
  }

  /**
   * Chanson précédente (delta = -1) ou suivante (delta = +1) dans la conduite.
   * Sans chanson de départ, la suivante est la première.
   */
  function voisine(em, id, delta) {
    if (id == null) return em.chansons.length ? em.chansons[delta > 0 ? 0 : em.chansons.length - 1].id : null;
    const j = index(em, id) + delta;
    return j >= 0 && j < em.chansons.length ? em.chansons[j].id : null;
  }

  /** État d'une chanson : 'a_venir', 'en_cours' ou 'jouee'. */
  function etat(em, id) {
    return em.suivi[id] ? em.suivi[id].etat : 'a_venir';
  }

  function definirEtat(em, id, nouvelEtat) {
    em.suivi[id] = em.suivi[id] || { etat: 'a_venir', resultat: null };
    em.suivi[id].etat = nouvelEtat;
  }

  /** Résultat d'une chanson jouée : 'bonne', 'mauvaise' ou null. */
  function definirResultat(em, id, resultat) {
    em.suivi[id] = em.suivi[id] || { etat: 'a_venir', resultat: null };
    em.suivi[id].resultat = resultat || null;
  }

  function resultat(em, id) {
    return em.suivi[id] ? em.suivi[id].resultat : null;
  }

  /** Nom d'un candidat à partir de son numéro (1 à 4). */
  function nomCandidat(em, numero) {
    return em.candidats[numero - 1] || 'Candidat ' + numero;
  }

  Paroles.emission = {
    SCHEMA,
    LIBELLES_ETAT,
    creer,
    index,
    trouver,
    ajouterChanson,
    remplacerChanson,
    supprimerChanson,
    deplacer,
    voisine,
    etat,
    definirEtat,
    definirResultat,
    resultat,
    nomCandidat
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

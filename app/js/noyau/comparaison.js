/*
 * Module « comparaison » : compare la proposition du candidat aux mots
 * attendus et calcule le statut « Bonne réponse » / « Mauvaise réponse ».
 * Référence : cahier des charges, sections 9.1 et 9.3.
 *
 * Le résultat calculé n'est qu'une suggestion : l'opérateur peut basculer
 * chaque mot de juste à faux (ou l'inverse), et sa bascule l'emporte.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /* Valeurs possibles du réglage « Accents à la comparaison ». */
  const TOLERANT = 'tolerant';
  const STRICT = 'strict';

  /**
   * Met un mot sous une forme comparable.
   * Toujours : minuscules, ponctuation retirée, apostrophe ’ changée en ',
   * espaces en trop retirés.
   * En mode tolérant en plus : accents et ligatures (œ, æ) retirés,
   * apostrophes, traits d'union et espaces intérieurs retirés.
   * @param {string} mot
   * @param {string} [accents] 'tolerant' (par défaut) ou 'strict'
   * @returns {string}
   */
  function normaliser(mot, accents) {
    const mots = Paroles.mots;
    let texte = String(mot == null ? '' : mot)
      .normalize('NFC')
      .toLocaleLowerCase('fr')
      .replace(/[’ʼ]/gu, "'")
      .replace(/[‐‑]/gu, '-');

    // Ponctuation retirée élément par élément, espaces réduits à un seul.
    texte = mots.decouper(texte).map(mots.nettoyer).filter((e) => e.length > 0).join(' ');

    if (accents !== STRICT) {
      texte = texte
        .replace(/œ/gu, 'oe')
        .replace(/æ/gu, 'ae')
        .normalize('NFD')
        .replace(/\p{M}/gu, '') // retire les accents détachés par NFD
        .replace(/['\- ]/gu, '');
    }
    return texte;
  }

  /**
   * Indique si le mot proposé correspond au mot attendu.
   * Une case vide ne correspond jamais.
   * @param {string} propose
   * @param {string} attendu
   * @param {string} [accents] 'tolerant' (par défaut) ou 'strict'
   * @returns {boolean}
   */
  function motsEgaux(propose, attendu, accents) {
    const a = normaliser(propose, accents);
    return a.length > 0 && a === normaliser(attendu, accents);
  }

  /**
   * Évalue toute la proposition, mot par mot.
   * @param {object} p
   * @param {string[]} p.attendus   mots attendus, dans l'ordre
   * @param {string[]} p.proposes   mots saisis (case absente = vide)
   * @param {string}  [p.accents]   'tolerant' ou 'strict'
   * @param {Object<number, boolean>} [p.bascules] bascules manuelles : index → juste (true) ou faux (false)
   * @param {number[]} [p.joker]    index des mots révélés par le joker « 2 mots » (toujours justes)
   * @returns {{mots: Array<{attendu: string, propose: string, calcule: boolean, juste: boolean, bascule: (boolean|null), joker: boolean}>, toutJuste: boolean, statut: string}}
   */
  function evaluer(p) {
    const proposes = p.proposes || [];
    const bascules = p.bascules || {};
    const joker = p.joker || [];

    const mots = p.attendus.map((attendu, index) => {
      const propose = proposes[index] == null ? '' : String(proposes[index]);
      const estJoker = joker.indexOf(index) >= 0;
      const calcule = estJoker || motsEgaux(propose, attendu, p.accents);
      const bascule = Object.prototype.hasOwnProperty.call(bascules, index) ? !!bascules[index] : null;
      // Ordre de priorité : joker, puis bascule de l'opérateur, puis calcul.
      const juste = estJoker ? true : bascule !== null ? bascule : calcule;
      return { attendu, propose, calcule, juste, bascule, joker: estJoker };
    });

    const toutJuste = mots.length > 0 && mots.every((m) => m.juste);
    return { mots, toutJuste, statut: toutJuste ? 'bonne' : 'mauvaise' };
  }

  Paroles.comparaison = { TOLERANT, STRICT, normaliser, motsEgaux, evaluer };
})(typeof globalThis !== 'undefined' ? globalThis : window);

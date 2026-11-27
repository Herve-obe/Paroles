/*
 * Module « mots » : découpage d'une ligne en mots et affichage des « _ ».
 * Référence : cahier des charges, sections 4.3 (découpage) et 5 (« _ »).
 *
 * Ce fichier ne touche pas à l'affichage : il ne fait que des calculs sur
 * du texte, ce qui permet de le tester automatiquement.
 *
 * Il s'enregistre dans l'objet global « Paroles » (Paroles.mots), car une
 * page ouverte par double-clic ne peut pas utiliser les modules JavaScript
 * modernes (import / export) : le navigateur les bloque en local.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /* Caractères qui font partie d'un mot : lettres (accentuées ou non),
     accents isolés, chiffres, apostrophes (droite ' et typographique ’)
     et traits d'union. Tout le reste est de la ponctuation. */
  const CARACTERE_DE_MOT = /[\p{L}\p{M}\p{N}'’ʼ\-‐‑]/u;
  const NON_CARACTERE_DE_MOT = /[^\p{L}\p{M}\p{N}'’ʼ\-‐‑]/gu;

  /* Une lettre ou un chiffre : c'est ce qui reçoit un « _ ». */
  const LETTRE_OU_CHIFFRE = /[\p{L}\p{N}]/u;

  /* Apostrophes et traits d'union en début ou en fin de mot : on les
     considère comme de la ponctuation (tiret de dialogue, guillemet simple). */
  const BORDS = /^['’ʼ\-‐‑]+|['’ʼ\-‐‑]+$/gu;

  /**
   * Découpe une ligne en « éléments » séparés par des espaces.
   * Un élément peut contenir de la ponctuation collée (« toi, »)
   * ou n'être que de la ponctuation (« ? » isolé).
   * @param {string} ligne
   * @returns {string[]}
   */
  function decouper(ligne) {
    return String(ligne == null ? '' : ligne)
      .normalize('NFC')
      .split(/\s+/u)
      .filter((element) => element.length > 0);
  }

  /**
   * Retire la ponctuation d'un élément : « peut-être, » donne « peut-être ».
   * Renvoie une chaîne vide si l'élément n'est que de la ponctuation.
   * @param {string} element
   * @returns {string}
   */
  function nettoyer(element) {
    return String(element == null ? '' : element)
      .normalize('NFC')
      .replace(NON_CARACTERE_DE_MOT, '')
      .replace(BORDS, '');
  }

  /**
   * Indique si un élément est un vrai mot (au moins une lettre ou un chiffre).
   * « ? » ou « « » isolés ne sont pas des mots (section 4.3).
   * @param {string} element
   * @returns {boolean}
   */
  function estMot(element) {
    return LETTRE_OU_CHIFFRE.test(nettoyer(element));
  }

  /**
   * Compte les vrais mots d'un texte (sert aussi aux fausses propositions).
   * @param {string} texte
   * @returns {number}
   */
  function compterMots(texte) {
    return decouper(texte).filter(estMot).length;
  }

  /**
   * Remplace chaque lettre ou chiffre par « _ » ; l'apostrophe et le trait
   * d'union restent visibles ; la ponctuation disparaît (section 5).
   * Exemples : soir → ____ ; j'ai → _'__ ; peut-être, → ____-____
   * @param {string} element
   * @returns {string}
   */
  function masquer(element) {
    let resultat = '';
    for (const caractere of nettoyer(element)) {
      if (LETTRE_OU_CHIFFRE.test(caractere)) resultat += '_';
      else if (/\p{M}/u.test(caractere)) continue; // accent isolé : pas de « _ » en plus
      else resultat += caractere; // apostrophe ou trait d'union
    }
    return resultat;
  }

  Paroles.mots = {
    CARACTERE_DE_MOT,
    LETTRE_OU_CHIFFRE,
    decouper,
    nettoyer,
    estMot,
    compterMots,
    masquer
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

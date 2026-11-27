/*
 * Module « chanson » : modèle de données d'une chanson, lecture des paroles
 * avec crochets, et contrôles faits à l'enregistrement.
 * Référence : cahier des charges, sections 4.1, 4.2 et 4.3.
 *
 * Une chanson est un objet simple (enregistrable tel quel en JSON) :
 *   {
 *     id, titre, artiste, candidat (numéro 1 à 4), categorie ('10'...'50',
 *     'meme', 'finale' ou ''), theme, mode ('ORCHESTRE' ou 'PLAYBACK'),
 *     note, faux1, faux2,
 *     lignes: [ { mots: [ { texte: 'toi,', aTrouver: true }, ... ] }, ... ]
 *   }
 * Chaque « mot » garde sa ponctuation collée (« toi, ») pour l'affichage
 * normal ; la ponctuation est retirée pour le passage à trou et la
 * comparaison. Un signe de ponctuation isolé (« ? ») est gardé comme
 * élément de la ligne, mais n'est jamais un mot à trouver.
 */
(function (racine) {
  'use strict';

  const Paroles = (racine.Paroles = racine.Paroles || {});

  /* Catégories possibles (section 4.1) ; la catégorie donne les points. */
  const CATEGORIES = [
    { code: '10', libelle: '10 points', points: 10 },
    { code: '20', libelle: '20 points', points: 20 },
    { code: '30', libelle: '30 points', points: 30 },
    { code: '40', libelle: '40 points', points: 40 },
    { code: '50', libelle: '50 points', points: 50 },
    { code: 'meme', libelle: 'La même chanson', points: null },
    { code: 'finale', libelle: 'Finale', points: null }
  ];

  const MODES = ['ORCHESTRE', 'PLAYBACK'];
  const CANDIDAT_MAX = 4;

  let compteurId = 0;

  /** Fabrique un identifiant unique pour une chanson. */
  function nouvelId() {
    compteurId += 1;
    return 'ch-' + Date.now().toString(36) + '-' + compteurId + '-' + Math.floor(Math.random() * 1e6).toString(36);
  }

  /** Renvoie la catégorie correspondant à un code, ou null. */
  function categorie(code) {
    return CATEGORIES.find((c) => c.code === code) || null;
  }

  /** Texte sans risque : null et undefined deviennent une chaîne vide. */
  function texte(valeur) {
    return valeur == null ? '' : String(valeur).trim();
  }

  /**
   * Crée une chanson complète à partir de champs (les absents prennent
   * leur valeur par défaut).
   */
  function creer(champs) {
    const c = champs || {};
    const candidat = parseInt(c.candidat, 10);
    return {
      id: c.id || nouvelId(),
      titre: texte(c.titre),
      artiste: texte(c.artiste),
      candidat: candidat >= 1 && candidat <= CANDIDAT_MAX ? candidat : 1,
      categorie: categorie(c.categorie) ? c.categorie : '',
      theme: texte(c.theme),
      mode: c.mode === 'PLAYBACK' ? 'PLAYBACK' : 'ORCHESTRE',
      note: texte(c.note),
      faux1: texte(c.faux1),
      faux2: texte(c.faux2),
      lignes: (c.lignes || []).map((ligne) => ({
        mots: ligne.mots.map((m) => ({ texte: String(m.texte), aTrouver: !!m.aTrouver }))
      }))
    };
  }

  /* ------------------------------------------------------------------ */
  /* Lecture des paroles avec crochets                                   */
  /* ------------------------------------------------------------------ */

  /** Retrouve le « mot » (suite sans espace) autour d'une position, pour les messages. */
  function motAutour(caracteres, position) {
    let debut = position;
    let fin = position;
    while (debut > 0 && !/\s/u.test(caracteres[debut - 1])) debut -= 1;
    while (fin < caracteres.length - 1 && !/\s/u.test(caracteres[fin + 1])) fin += 1;
    return caracteres.slice(debut, fin + 1).join('');
  }

  /**
   * Analyse une ligne de paroles qui peut contenir des [mots à trouver].
   * @param {string} ligne
   * @returns {{mots: Array<{texte: string, aTrouver: boolean}>, erreur: (string|null)}}
   */
  function analyserLigne(ligne) {
    const CARACTERE_DE_MOT = Paroles.mots.CARACTERE_DE_MOT;
    const LETTRE_OU_CHIFFRE = Paroles.mots.LETTRE_OU_CHIFFRE;
    const caracteres = Array.from(String(ligne).normalize('NFC'));
    const mots = [];

    let courant = '';           // élément en cours de lecture
    let lettresDedans = false;  // l'élément a des lettres entre crochets
    let lettresDehors = false;  // l'élément a des lettres hors crochets
    let ouvert = false;         // un crochet « [ » est ouvert
    let groupeAvecMot = false;  // le groupe entre crochets contient une lettre

    const echec = (message) => ({ mots: [], erreur: message });
    const milieu = (position) =>
      'crochet au milieu d\'un mot « ' + motAutour(caracteres, position) + ' » : les crochets doivent entourer des mots entiers';

    /* Termine l'élément en cours ; renvoie un message d'erreur éventuel. */
    function finirElement(position) {
      if (!courant) return null;
      if (lettresDedans && lettresDehors) return milieu(position - 1);
      mots.push({ texte: courant, aTrouver: lettresDedans });
      courant = '';
      lettresDedans = false;
      lettresDehors = false;
      return null;
    }

    for (let i = 0; i < caracteres.length; i += 1) {
      const c = caracteres[i];

      if (c === '[') {
        if (ouvert) return echec('crochet « [ » ouvert deux fois sans être refermé');
        if (i > 0 && CARACTERE_DE_MOT.test(caracteres[i - 1])) return echec(milieu(i));
        ouvert = true;
        groupeAvecMot = false;
        continue;
      }

      if (c === ']') {
        if (!ouvert) return echec('crochet « ] » fermé sans crochet « [ » ouvert avant');
        const suivant = caracteres[i + 1];
        if (suivant !== undefined && (CARACTERE_DE_MOT.test(suivant) || suivant === '[')) return echec(milieu(i));
        if (!groupeAvecMot) return echec('crochets vides : ils doivent contenir au moins un mot');
        ouvert = false;
        continue;
      }

      if (/\s/u.test(c)) {
        const erreur = finirElement(i);
        if (erreur) return echec(erreur);
        continue;
      }

      courant += c;
      if (LETTRE_OU_CHIFFRE.test(c)) {
        if (ouvert) {
          lettresDedans = true;
          groupeAvecMot = true;
        } else {
          lettresDehors = true;
        }
      }
    }

    if (ouvert) return echec('crochet « [ » non fermé sur cette ligne (un crochet doit se fermer sur la même ligne)');
    const erreur = finirElement(caracteres.length);
    if (erreur) return echec(erreur);
    return { mots, erreur: null };
  }

  /**
   * Analyse des lignes de paroles numérotées : les lignes vides sont
   * ignorées, et on vérifie qu'il n'y a qu'un seul passage à trou.
   * @param {Array<{texte: string, numero: number}>} lignesNumerotees
   * @returns {{lignes: Array, erreurs: Array<{ligne: number, message: string}>}}
   */
  function analyserParoles(lignesNumerotees) {
    const lignes = [];
    const erreurs = [];
    let indexDernierTrou = -1;
    let numeroDernierTrou = null;
    let passageEnErreur = false;

    lignesNumerotees.forEach((brute) => {
      const contenu = String(brute.texte).trim();
      if (!contenu) return; // ligne vide : ignorée

      const analyse = analyserLigne(contenu);
      if (analyse.erreur) {
        erreurs.push({ ligne: brute.numero, message: analyse.erreur });
        return;
      }

      const index = lignes.length;
      lignes.push({ mots: analyse.mots });

      if (analyse.mots.some((m) => m.aTrouver)) {
        if (indexDernierTrou >= 0 && indexDernierTrou !== index - 1 && !passageEnErreur) {
          erreurs.push({
            ligne: brute.numero,
            message: 'deuxième passage à trou : il est séparé du précédent (ligne ' + numeroDernierTrou +
              ') par une ligne sans mot à trouver, or il n\'y a qu\'un seul passage à trou par chanson'
          });
          passageEnErreur = true;
        }
        indexDernierTrou = index;
        numeroDernierTrou = brute.numero;
      }
    });

    return { lignes, erreurs };
  }

  /**
   * Met en forme un message : « fichier.txt, ligne 12 : message ».
   * Sans fichier : « Ligne 12 : message ». Sans ligne : « fichier.txt : message ».
   */
  function formaterMessage(fichier, ligne, message) {
    if (fichier && ligne) return fichier + ', ligne ' + ligne + ' : ' + message;
    if (fichier) return fichier + ' : ' + message;
    if (ligne) return 'Ligne ' + ligne + ' : ' + message;
    return message.charAt(0).toUpperCase() + message.slice(1);
  }

  /**
   * Analyse le texte de la zone « Paroles » de l'éditeur (avec crochets).
   * Les numéros de ligne sont ceux de la zone de texte.
   */
  function analyserTexte(texteParoles) {
    const lignesNumerotees = String(texteParoles == null ? '' : texteParoles)
      .split(/\r\n|\r|\n/)
      .map((t, i) => ({ texte: t, numero: i + 1 }));
    const resultat = analyserParoles(lignesNumerotees);
    resultat.erreurs.forEach((e) => { e.texte = formaterMessage('', e.ligne, e.message); });
    return resultat;
  }

  /* ------------------------------------------------------------------ */
  /* Écriture des paroles avec crochets (export et éditeur)             */
  /* ------------------------------------------------------------------ */

  /** Sépare un élément en ponctuation avant, cœur du mot, ponctuation après. */
  function decomposer(element) {
    const CARACTERE_DE_MOT = Paroles.mots.CARACTERE_DE_MOT;
    const c = Array.from(element);
    let debut = 0;
    let fin = c.length - 1;
    while (debut <= fin && !CARACTERE_DE_MOT.test(c[debut])) debut += 1;
    while (fin >= debut && !CARACTERE_DE_MOT.test(c[fin])) fin -= 1;
    return { avant: c.slice(0, debut).join(''), coeur: c.slice(debut, fin + 1).join(''), apres: c.slice(fin + 1).join('') };
  }

  /** Écrit une ligne avec crochets ; les mots à trouver qui se suivent sont regroupés. */
  function ecrireLigne(mots) {
    const estMot = Paroles.mots.estMot;
    const estATrouver = (m) => m.aTrouver && estMot(m.texte);
    const morceaux = [];
    let i = 0;

    while (i < mots.length) {
      if (!estATrouver(mots[i])) {
        morceaux.push(mots[i].texte);
        i += 1;
        continue;
      }
      // Le groupe va jusqu'au dernier mot à trouver qui suit, en traversant
      // la ponctuation isolée (« [toi , moi] »).
      let fin = i;
      let k = i + 1;
      while (k < mots.length) {
        if (estATrouver(mots[k])) { fin = k; k += 1; } else if (!estMot(mots[k].texte)) { k += 1; } else break;
      }
      const groupe = mots.slice(i, fin + 1).map((m) => m.texte);
      const premier = decomposer(groupe[0]);
      if (groupe.length === 1) {
        morceaux.push(premier.avant + '[' + premier.coeur + ']' + premier.apres);
      } else {
        const dernier = decomposer(groupe[groupe.length - 1]);
        const milieu = groupe.slice(1, -1);
        morceaux.push(
          premier.avant + '[' + [premier.coeur + premier.apres].concat(milieu, [dernier.avant + dernier.coeur]).join(' ') + ']' + dernier.apres
        );
      }
      i = fin + 1;
    }
    return morceaux.join(' ');
  }

  /** Texte complet des paroles avec crochets, une ligne par ligne affichée. */
  function texteParoles(chanson) {
    return chanson.lignes.map((ligne) => ecrireLigne(ligne.mots)).join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Passage à trou, jokers et contrôles                                 */
  /* ------------------------------------------------------------------ */

  /**
   * Liste des mots à trouver, dans l'ordre.
   * @returns {Array<{ligne: number, position: number, texte: string, mot: string}>}
   *   ligne et position commencent à 0 ; texte = mot avec ponctuation ; mot = mot nettoyé.
   */
  function motsATrouver(chanson) {
    const mots = Paroles.mots;
    const liste = [];
    chanson.lignes.forEach((ligne, indexLigne) => {
      ligne.mots.forEach((m, position) => {
        if (m.aTrouver && mots.estMot(m.texte)) {
          liste.push({ ligne: indexLigne, position, texte: m.texte, mot: mots.nettoyer(m.texte) });
        }
      });
    });
    return liste;
  }

  /** Index des lignes qui contiennent au moins un mot à trouver. */
  function lignesAvecTrou(chanson) {
    const indices = [];
    motsATrouver(chanson).forEach((m) => {
      if (indices[indices.length - 1] !== m.ligne) indices.push(m.ligne);
    });
    return indices;
  }

  /** Première et dernière ligne du passage à trou (index à partir de 0), ou null. */
  function passage(chanson) {
    const indices = lignesAvecTrou(chanson);
    return indices.length ? { debut: indices[0], fin: indices[indices.length - 1] } : null;
  }

  /**
   * Vérifie qu'une fausse proposition a exactement le nombre de mots attendu
   * (règle de test n° 8).
   */
  function verifierFausseProposition(proposition, nbAttendu) {
    const contenu = texte(proposition);
    if (!contenu) return { valide: false, vide: true, nbMots: 0, message: 'absente' };
    const nbMots = Paroles.mots.compterMots(contenu);
    if (nbMots !== nbAttendu) {
      const pluriel = (n, mot) => n + ' ' + mot + (n > 1 ? 's' : '');
      return {
        valide: false,
        vide: false,
        nbMots,
        message: pluriel(nbAttendu, 'mot') + ' attendu' + (nbAttendu > 1 ? 's' : '') + ', ' + nbMots + ' saisi' + (nbMots > 1 ? 's' : '')
      };
    }
    return { valide: true, vide: false, nbMots, message: '' };
  }

  /** Le joker « 3 propositions » demande deux fausses propositions correctes. */
  function troisPropositionsDisponible(chanson) {
    const nb = motsATrouver(chanson).length;
    return nb > 0 &&
      verifierFausseProposition(chanson.faux1, nb).valide &&
      verifierFausseProposition(chanson.faux2, nb).valide;
  }

  /** Le joker « 2 mots » demande un passage à trou de plus de 2 mots. */
  function deuxMotsDisponible(chanson) {
    return motsATrouver(chanson).length > 2;
  }

  /**
   * Contrôles faits à l'enregistrement d'une chanson (section 4.1).
   * Les erreurs empêchent l'enregistrement ; les avertissements non.
   * @returns {{erreurs: string[], avertissements: string[]}}
   */
  function valider(chanson) {
    const erreurs = [];
    const avertissements = [];
    const nb = motsATrouver(chanson).length;

    if (!texte(chanson.titre)) erreurs.push('Le titre est obligatoire.');

    if (nb === 0) {
      erreurs.push('Aucun mot à trouver : il faut marquer les mots à trouver.');
    } else {
      const indices = lignesAvecTrou(chanson);
      if (indices[indices.length - 1] - indices[0] !== indices.length - 1) {
        erreurs.push('Il y a deux passages à trou séparés : un seul passage par chanson.');
      }

      const indisponible = ' : le joker « 3 propositions » sera indisponible pour cette chanson.';
      const v1 = verifierFausseProposition(chanson.faux1, nb);
      const v2 = verifierFausseProposition(chanson.faux2, nb);
      if (v1.vide && v2.vide) {
        avertissements.push('Fausses propositions absentes' + indisponible);
      } else {
        [v1, v2].forEach((v, i) => {
          if (!v.valide) avertissements.push('Fausse proposition ' + (i + 1) + ' ' + (v.vide ? 'absente' : ': ' + v.message) + indisponible);
        });
      }

      if (nb <= 2) {
        avertissements.push('Le passage à trou compte 2 mots ou moins : le joker « 2 mots » sera indisponible pour cette chanson.');
      }
    }
    return { erreurs, avertissements };
  }

  Paroles.chanson = {
    CATEGORIES,
    MODES,
    CANDIDAT_MAX,
    categorie,
    creer,
    analyserLigne,
    analyserParoles,
    analyserTexte,
    formaterMessage,
    ecrireLigne,
    texteParoles,
    motsATrouver,
    passage,
    verifierFausseProposition,
    troisPropositionsDisponible,
    deuxMotsDisponible,
    valider
  };
})(typeof globalThis !== 'undefined' ? globalThis : window);

/*
 * Tests du contenu des écrans de sortie (sections 3.2 et 5) : ce que
 * l'opérateur envoie au prompteur et à l'incrustation à chaque étape.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;
  const affichage = P.affichage;

  /* 6 lignes : trou sur les lignes d'index 2 et 3, puis 2 lignes après. */
  const chanson = P.chanson.creer({
    titre: 'Essai',
    artiste: 'Groupe',
    lignes: P.chanson.analyserTexte('ligne un\nligne deux\nligne [trois],\n[quatre] ligne\nligne cinq\nligne six').lignes
  });

  function etat(actions) {
    return actions.reduce((e, a) => P.jeu.appliquer(e, chanson, a), P.jeu.creer());
  }
  function calculer(actions, options) {
    return affichage.calculer(Object.assign({ chanson, jeu: etat(actions), nbLignes: 2, noir: false }, options || {}));
  }
  const textes = (ligne) => ligne.mots.map((m) => m.texte);

  groupe('Contenu des écrans de sortie (sections 3.2 et 5)', () => {
    test('sans chanson chargée : écran vide', () => {
      egal(affichage.calculer({ chanson: null, jeu: null, nbLignes: 2, noir: false }).type, 'vide');
    });

    test('chanson chargée sans titre affiché : écran vide', () => {
      egal(calculer([]).type, 'vide');
    });

    test('« Afficher le titre » : titre et artiste seulement (décision 5)', () => {
      const a = calculer(['afficherTitre']);
      egal(a.type, 'titre');
      egal(a.titre, 'Essai');
      egal(a.artiste, 'Groupe');
    });

    test('titre puis « Commencer » : écran sans paroles (intro)', () => {
      egal(calculer(['afficherTitre', 'commencer']).type, 'vide');
    });

    test('« Commencer » : la ligne 1 en cours et la ligne 2 suivante', () => {
      const a = calculer(['commencer']);
      egal(a.type, 'paroles');
      egal(a.lignes.map((l) => l.role), ['courante', 'suivante']);
      egal(a.lignes.map((l) => l.index), [0, 1], 'chaque ligne porte son numéro (pour le défilement)');
      egal(textes(a.lignes[0]), ['ligne', 'un']);
      egal(textes(a.lignes[1]), ['ligne', 'deux']);
    });

    test('réglage à 1 ou 3 lignes', () => {
      egal(calculer(['commencer'], { nbLignes: 1 }).lignes.length, 1);
      egal(calculer(['commencer'], { nbLignes: 3 }).lignes.map((l) => l.role), ['courante', 'suivante', 'suivante']);
    });

    test('une ligne du passage à trou est masquée, même quand elle est la ligne suivante', () => {
      const a = calculer(['commencer', 'ligneSuivante']);
      faux(a.lignes[0].masquer);
      vrai(a.lignes[1].masquer);
    });

    test('dans une ligne masquée, les mots hors crochets restent affichés et la ponctuation du trou disparaît', () => {
      const a = calculer(['commencer', 'ligneSuivante', 'ligneSuivante']);
      const ligne = a.lignes[0];
      vrai(ligne.masquer);
      egal(ligne.mots, [{ texte: 'ligne', masque: false }, { texte: '_____', masque: true }]);
      egal(ligne.index, 2);
    });

    test('le texte des mots à trouver n\'est jamais envoyé aux écrans de sortie avant la révélation', () => {
      const a = calculer(['commencer', 'ligneSuivante', 'ligneSuivante']);
      faux(JSON.stringify(a).indexOf('trois') >= 0, 'le mot « trois » ne doit pas apparaître');
      faux(JSON.stringify(a).indexOf('quatre') >= 0, 'le mot « quatre » ne doit pas apparaître');
    });

    test('sur la dernière ligne du trou, plus de ligne suivante', () => {
      egal(calculer(['commencer', 'ligneSuivante', 'ligneSuivante', 'ligneSuivante']).lignes.length, 1);
    });

    test('« Noir » : l\'indication noir est transmise', () => {
      vrai(calculer(['commencer'], { noir: true }).noir);
      faux(calculer(['commencer']).noir);
    });

    test('une ligne suivante désactivée dans les préférences n\'est pas envoyée', () => {
      egal(calculer(['commencer'], { ligneSuivante: false }).lignes.length, 1);
    });
  });

  groupe('Préférences par défaut (section 11)', () => {
    test('durées des transitions : fondu du titre et défilement des lignes', () => {
      const p = P.preferences.creer();
      egal(p.fonduTitre, 0.6);
      egal(p.defilement, 0.35);
    });

    test('écran 1 prompteur, écran 2 incrustation, 2 lignes, fond noir', () => {
      const p = P.preferences.creer();
      egal(p.ecrans, [{ mode: 'prompteur' }, { mode: 'incrustation' }]);
      egal(p.nbLignes, 2);
      egal(p.fondIncrustation, '#000000');
      vrai(/^#[0-9a-f]{6}$/i.test(p.fondBandeau));
    });

    test('deux préférences créées sont indépendantes', () => {
      const a = P.preferences.creer();
      a.ecrans[0].mode = 'incrustation';
      egal(P.preferences.creer().ecrans[0].mode, 'prompteur');
    });
  });
})();

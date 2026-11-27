/*
 * Tests du modèle de chanson et des contrôles de l'éditeur (section 4.1) :
 * règle de test n° 8 de la section 13 (fausses propositions).
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const chanson = globalThis.Paroles.chanson;

  /** Construit une chanson à partir d'un texte de paroles avec crochets. */
  function creer(paroles, champs) {
    const analyse = chanson.analyserTexte(paroles);
    if (analyse.erreurs.length) throw new Error(analyse.erreurs[0].texte);
    return chanson.creer(Object.assign({ titre: 'Essai', lignes: analyse.lignes }, champs || {}));
  }

  groupe('Fausses propositions (règle 8)', () => {
    test('même nombre de mots que le trou : acceptée', () => {
      const v = chanson.verifierFausseProposition('tous les matins', 3);
      vrai(v.valide);
      egal(v.nbMots, 3);
    });

    test('pas le même nombre de mots : refusée avec le nombre attendu et le nombre saisi', () => {
      const v = chanson.verifierFausseProposition('tous les matins froids', 3);
      faux(v.valide);
      egal(v.nbMots, 4);
      vrai(v.message.indexOf('3 mots attendus') >= 0, v.message);
      vrai(v.message.indexOf('4') >= 0, v.message);
    });

    test('les apostrophes et traits d\'union ne créent pas de mots en plus', () => {
      vrai(chanson.verifierFausseProposition("j'ai peut-être tort", 3).valide);
    });

    test('la ponctuation isolée ne compte pas', () => {
      vrai(chanson.verifierFausseProposition('oui , non !', 2).valide);
    });

    test('vide : refusée et signalée comme absente', () => {
      const v = chanson.verifierFausseProposition('   ', 3);
      faux(v.valide);
      vrai(v.vide);
    });

    test('une chanson dont une fausse proposition est refusée n\'a pas le joker « 3 propositions »', () => {
      const c = creer('Moi [tous les soirs]', { faux1: 'tous les matins', faux2: 'deux mots' });
      faux(chanson.troisPropositionsDisponible(c));
    });

    test('avec ses deux fausses propositions correctes, le joker est disponible', () => {
      const c = creer('Moi [tous les soirs]', { faux1: 'tous les matins', faux2: 'toutes ces nuits' });
      vrai(chanson.troisPropositionsDisponible(c));
    });

    test('à l\'enregistrement, une fausse proposition refusée donne un avertissement, pas une erreur', () => {
      const c = creer('Moi [tous les soirs]', { faux1: 'tous les matins', faux2: 'deux mots' });
      const v = chanson.valider(c);
      egal(v.erreurs, []);
      vrai(v.avertissements.some((a) => a.indexOf('Fausse proposition 2') >= 0 && a.indexOf('3 mots attendus') >= 0), JSON.stringify(v.avertissements));
    });

    test('à l\'enregistrement, des fausses propositions absentes donnent un avertissement', () => {
      const v = chanson.valider(creer('Moi [tous les soirs]'));
      egal(v.erreurs, []);
      vrai(v.avertissements.some((a) => a.indexOf('3 propositions') >= 0));
    });
  });

  groupe('Contrôles à l\'enregistrement (section 4.1)', () => {
    test('titre manquant : erreur', () => {
      const v = chanson.valider(creer('Moi [tous les soirs]', { titre: '  ' }));
      vrai(v.erreurs.some((e) => e.toLowerCase().indexOf('titre') >= 0));
    });

    test('aucun mot à trouver : erreur', () => {
      const v = chanson.valider(creer('Pas de trou ici'));
      vrai(v.erreurs.some((e) => e.toLowerCase().indexOf('aucun mot') >= 0));
    });

    test('deux passages à trou séparés : erreur dans l\'analyse du texte', () => {
      const analyse = chanson.analyserTexte('une [première]\nnormale\nune [autre]');
      egal(analyse.erreurs.length, 1);
      egal(analyse.erreurs[0].ligne, 3);
    });

    test('chanson complète et correcte : ni erreur ni avertissement', () => {
      const c = creer('intro\nMoi [tous les soirs]\n[encore]', { faux1: 'tous les matins toujours', faux2: 'toutes ces nuits aussi' });
      egal(chanson.valider(c), { erreurs: [], avertissements: [] });
    });

    test('un trou de 2 mots ou moins : avertissement, joker « 2 mots » indisponible', () => {
      const c = creer('Moi [tous les]', { faux1: 'a b', faux2: 'c d' });
      faux(chanson.deuxMotsDisponible(c));
      vrai(chanson.valider(c).avertissements.some((a) => a.indexOf('2 mots') >= 0));
    });

    test('un trou de 3 mots : joker « 2 mots » disponible', () => {
      vrai(chanson.deuxMotsDisponible(creer('Moi [tous les soirs]')));
    });
  });

  groupe('Modèle de chanson', () => {
    test('les valeurs par défaut sont posées', () => {
      const c = chanson.creer({ titre: 'A' });
      egal(c.candidat, 1);
      egal(c.mode, 'ORCHESTRE');
      egal(c.lignes, []);
      vrai(typeof c.id === 'string' && c.id.length > 0);
    });

    test('deux chansons créées ont des identifiants différents', () => {
      vrai(chanson.creer({}).id !== chanson.creer({}).id);
    });

    test('les catégories donnent les points', () => {
      egal(chanson.categorie('30').points, 30);
      egal(chanson.categorie('meme').libelle, 'La même chanson');
      egal(chanson.categorie('finale').libelle, 'Finale');
      egal(chanson.categorie('xx'), null);
    });

    test('la liste des mots à trouver donne la ligne et la position de chaque mot', () => {
      const c = creer('intro\nMoi [tous les], et [soirs]');
      egal(chanson.motsATrouver(c), [
        { ligne: 1, position: 1, texte: 'tous', mot: 'tous' },
        { ligne: 1, position: 2, texte: 'les,', mot: 'les' },
        { ligne: 1, position: 4, texte: 'soirs', mot: 'soirs' }
      ]);
    });

    test('pas de passage à trou : passage() vaut null', () => {
      egal(chanson.passage(creer('rien')), null);
    });

    test('texteParoles redonne le texte avec crochets (utilisé par l\'éditeur)', () => {
      egal(chanson.texteParoles(creer('intro\nMoi [tous les soirs]')), 'intro\nMoi [tous les soirs]');
    });
  });
})();

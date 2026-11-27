/*
 * Tests de l'émission et de la conduite (sections 3.1 et 10) : ordre des
 * chansons, état (à venir, en cours, jouée), candidats.
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;
  const emission = P.emission;

  /** Émission avec trois chansons A, B, C. */
  function troisChansons() {
    const em = emission.creer();
    ['A', 'B', 'C'].forEach((titre) => emission.ajouterChanson(em, P.chanson.creer({ id: titre, titre })));
    return em;
  }
  const titres = (em) => em.chansons.map((c) => c.titre);

  groupe('Émission (sections 10 et 12)', () => {
    test('une nouvelle émission a le schéma 1, le nom « Paroles » et 2 candidats', () => {
      const em = emission.creer();
      egal(em.schema, 1);
      egal(em.nom, 'Paroles');
      egal(em.candidats, ['Candidat 1', 'Candidat 2']);
      egal(em.chansons, []);
    });

    test('le nom d\'un candidat se retrouve par son numéro', () => {
      const em = emission.creer();
      egal(emission.nomCandidat(em, 2), 'Candidat 2');
      egal(emission.nomCandidat(em, 4), 'Candidat 4');
    });
  });

  groupe('Conduite (section 3.1)', () => {
    test('les chansons sont ajoutées à la fin, à l\'état « à venir »', () => {
      const em = troisChansons();
      egal(titres(em), ['A', 'B', 'C']);
      egal(emission.etat(em, 'B'), 'a_venir');
    });

    test('« Monter » et « Descendre » déplacent une chanson', () => {
      const em = troisChansons();
      vrai(emission.deplacer(em, 'C', -1));
      egal(titres(em), ['A', 'C', 'B']);
      vrai(emission.deplacer(em, 'A', 1));
      egal(titres(em), ['C', 'A', 'B']);
    });

    test('on ne peut pas monter la première ni descendre la dernière', () => {
      const em = troisChansons();
      faux(emission.deplacer(em, 'A', -1));
      faux(emission.deplacer(em, 'C', 1));
      egal(titres(em), ['A', 'B', 'C']);
    });

    test('« Supprimer » retire la chanson et son état', () => {
      const em = troisChansons();
      vrai(emission.supprimerChanson(em, 'B'));
      egal(titres(em), ['A', 'C']);
      egal(em.suivi.B, undefined);
    });

    test('« Modifier » remplace la chanson au même endroit et garde son état', () => {
      const em = troisChansons();
      emission.definirEtat(em, 'B', 'jouee');
      emission.remplacerChanson(em, P.chanson.creer({ id: 'B', titre: 'B modifiée' }));
      egal(titres(em), ['A', 'B modifiée', 'C']);
      egal(emission.etat(em, 'B'), 'jouee');
    });

    test('chanson précédente et suivante dans la conduite', () => {
      const em = troisChansons();
      egal(emission.voisine(em, 'B', 1), 'C');
      egal(emission.voisine(em, 'B', -1), 'A');
      egal(emission.voisine(em, 'C', 1), null);
      egal(emission.voisine(em, 'A', -1), null);
      egal(emission.voisine(em, null, 1), 'A');
    });

    test('les états possibles sont à venir, en cours, jouée', () => {
      const em = troisChansons();
      emission.definirEtat(em, 'A', 'en_cours');
      egal(emission.etat(em, 'A'), 'en_cours');
      egal(emission.LIBELLES_ETAT.en_cours, 'en cours');
      egal(emission.LIBELLES_ETAT.jouee, 'jouée');
    });
  });
})();

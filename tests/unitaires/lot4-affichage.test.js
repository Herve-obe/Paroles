/*
 * Tests du lot 4 : ce que montrent les écrans de sortie pendant la saisie
 * (jaune), le blocage (bleu), la révélation (vert, rouge puis correction)
 * et le statut (sections 6, 8 et 9).
 */
if (typeof require === 'function') require('../charger-noyau.js');

(function () {
  'use strict';
  const { groupe, test, egal, vrai, faux } = globalThis.Tests;
  const P = globalThis.Paroles;

  const chanson = P.chanson.creer({
    titre: 'Essai',
    lignes: P.chanson.analyserTexte('ligne un\nmoi [tous les soirs],\n[été] ligne\nligne après').lignes
  });

  function etat(actions) {
    return actions.reduce((e, a) => P.jeu.appliquer(e, chanson, a), P.jeu.creer());
  }
  function calculer(actions, maintenant) {
    return P.affichage.calculer({
      chanson, jeu: etat(actions), nbLignes: 2, noir: false, accents: 'tolerant', delaiCorrection: 1.5, maintenant: maintenant || 10000
    });
  }
  const mot = (index, texte) => ({ type: 'modifierMot', index, texte });
  const SAISIE = ['commencer', 'ligneSuivante', 'saisir'];
  const motsDuTrou = (a) => a.lignes.flatMap((l) => l.mots).filter((m) => m.etat !== 'normal');

  groupe('Saisie, blocage et révélation sur les écrans de sortie', () => {
    test('de la saisie à la révélation : toutes les lignes du trou ensemble (décision 4)', () => {
      const a = calculer(SAISIE);
      egal(a.lignes.map((l) => l.index), [1, 2]);
      egal(a.lignes.map((l) => l.role), ['trou', 'trou']);
    });

    test('saisie : mots tapés en jaune, cases vides en « _ »', () => {
      const a = calculer(SAISIE.concat([mot(0, 'tous'), mot(2, 'matins')]));
      egal(motsDuTrou(a), [
        { texte: 'tous', masque: false, etat: 'propose' },
        { texte: '___', masque: true, etat: 'vide' },
        { texte: 'matins', masque: false, etat: 'propose' },
        { texte: '___', masque: true, etat: 'vide' }
      ]);
    });

    test('bloqué : la proposition passe en bleu', () => {
      const a = calculer(SAISIE.concat([mot(0, 'tous'), 'bloquer']));
      egal(motsDuTrou(a)[0], { texte: 'tous', masque: false, etat: 'bloque' });
      egal(motsDuTrou(a)[1].etat, 'vide');
    });

    test('mot juste révélé : le bon mot en vert', () => {
      const a = calculer(SAISIE.concat([mot(0, 'TOUS'), 'bloquer', { type: 'revelerSuivant', maintenant: 9000 }]));
      egal(motsDuTrou(a)[0], { texte: 'tous', masque: false, etat: 'juste' });
    });

    test('mot faux révélé : en rouge, puis remplacé par le bon mot après le délai', () => {
      const actions = SAISIE.concat([mot(0, 'tes'), 'bloquer', { type: 'revelerSuivant', maintenant: 9000 }]);
      egal(motsDuTrou(calculer(actions, 9500))[0], { texte: 'tes', masque: false, etat: 'faux', correction: 'tous', attente: 1000 });
      egal(motsDuTrou(calculer(actions, 12000))[0], { texte: 'tes', masque: false, etat: 'faux', correction: 'tous', attente: 0 });
    });

    test('case vide révélée : ses « _ » en rouge, puis le bon mot', () => {
      const a = calculer(SAISIE.concat(['bloquer', { type: 'revelerSuivant', maintenant: 9000 }]), 9000);
      egal(motsDuTrou(a)[0], { texte: '____', masque: true, etat: 'faux', correction: 'tous', attente: 1500 });
    });

    test('le bon mot d\'un trou n\'est jamais envoyé avant d\'être révélé', () => {
      const a = calculer(SAISIE.concat([mot(0, 'tous'), 'bloquer', { type: 'revelerSuivant', maintenant: 9000 }]));
      const texte = JSON.stringify(a);
      faux(texte.indexOf('soirs') >= 0, 'soirs');
      faux(texte.indexOf('été') >= 0, 'été');
    });

    test('statut « Bonne réponse » quand tout est juste, après le dernier délai de correction', () => {
      const a = calculer(SAISIE.concat([mot(0, 'tous'), mot(1, 'les'), mot(2, 'soirs'), mot(3, 'ete'), 'bloquer', { type: 'toutReveler', maintenant: 9000 }]), 9000);
      egal(a.statut, { type: 'bonne', texte: 'Bonne réponse', attente: 0 });
    });

    test('statut « Mauvaise réponse » affiché après la correction du dernier mot faux', () => {
      const a = calculer(SAISIE.concat([mot(0, 'tous'), 'bloquer', { type: 'toutReveler', maintenant: 9000 }]), 9500);
      egal(a.statut, { type: 'mauvaise', texte: 'Mauvaise réponse', attente: 1000 });
    });

    test('pas de statut avant la fin de la révélation', () => {
      egal(calculer(SAISIE.concat(['bloquer', { type: 'revelerSuivant', maintenant: 9000 }])).statut, undefined);
    });

    test('après la révélation, « Ligne suivante » reprend les paroles normales', () => {
      const a = calculer(SAISIE.concat(['bloquer', { type: 'toutReveler', maintenant: 1 }, 'ligneSuivante']));
      egal(a.lignes.map((l) => l.index), [3]);
      egal(a.lignes[0].role, 'courante');
      egal(a.statut, undefined);
    });
  });

  groupe('Préférences du lot 4', () => {
    test('délai avant correction 1,5 s, accents tolérants, textes du statut', () => {
      const p = P.preferences.creer();
      egal(p.delaiCorrection, 1.5);
      egal(p.accents, 'tolerant');
      egal(p.textesStatut, { bonne: 'Bonne réponse', mauvaise: 'Mauvaise réponse' });
    });
  });
})();

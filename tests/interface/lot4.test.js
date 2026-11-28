/*
 * Tests de l'interface, lot 4 : saisie de la proposition, blocage,
 * révélation, correction, statut.
 *
 * Critère de validation du lot 4 : « Scénarios tout juste, partiellement
 * faux et cases vides conformes ».
 *
 * Nécessite Playwright : npm run test:interface
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const PAGE = 'file://' + path.join(__dirname, '..', '..', 'app', 'index.html');

/* Chanson d'essai (paroles inventées) : trou de 4 mots sur 2 lignes, puis une ligne. */
function fichier(titre) {
  return {
    name: titre + '.txt',
    mimeType: 'text/plain',
    buffer: Buffer.from([
      '# titre: ' + titre,
      '# faux1: tous les matins hiver',
      '# faux2: toutes ces nuits encore',
      'Première ligne du couplet',
      'Et moi [tous les soirs],',
      '[été] comme hiver',
      'La ligne après le trou'
    ].join('\n'))
  };
}

let navigateur;
let operateur;
let prompteur;
let incrustation;
const erreurs = [];

function surveiller(page) {
  page.on('pageerror', (e) => erreurs.push(page.url() + ' : ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(page.url() + ' : ' + m.text()); });
}

async function ouvrirEcran() {
  const [fenetre] = await Promise.all([operateur.waitForEvent('popup'), operateur.click('#btn-ouvrir-ecran')]);
  surveiller(fenetre);
  await fenetre.waitForLoadState();
  await fenetre.setViewportSize({ width: 960, height: 540 });
  return fenetre;
}

/** Mots du trou sur un écran de sortie : texte et état (classe etat-…), dans l'ordre. */
function motsEcran(fenetre) {
  return fenetre.evaluate(() => Array.from(document.querySelectorAll('.ligne-sortie'))
    .sort((a, b) => Number(a.dataset.index) - Number(b.dataset.index))
    .flatMap((l) => Array.from(l.querySelectorAll('.mot')))
    .filter((m) => !m.classList.contains('etat-normal'))
    .map((m) => ({ texte: m.textContent, etat: (m.className.match(/etat-(\w+)/) || [])[1] || '' })));
}

/** Attend que les mots du trou d'un écran correspondent à ce qui est attendu. */
async function attendreMots(fenetre, attendu) {
  const debut = Date.now();
  let dernier;
  while (Date.now() - debut < 6000) {
    dernier = await motsEcran(fenetre);
    if (JSON.stringify(dernier) === JSON.stringify(attendu)) return;
    await fenetre.waitForTimeout(50);
  }
  assert.deepEqual(dernier, attendu);
}

/** Statut affiché sur un écran de sortie (texte), ou '' s'il n'est pas visible. */
function statutEcran(fenetre) {
  return fenetre.evaluate(() => {
    const s = document.querySelector('.statut-sortie.visible');
    return s ? s.textContent : '';
  });
}

const etape = () => operateur.textContent('#titre-etape');

before(async () => {
  navigateur = await chromium.launch({ channel: 'chromium' });
  const contexte = await navigateur.newContext({ viewport: { width: 1920, height: 1080 } });
  operateur = await contexte.newPage();
  surveiller(operateur);
  await operateur.goto(PAGE);
  await operateur.setInputFiles('#fichier-import', [fichier('Essai A'), fichier('Essai B')]);
  await operateur.waitForFunction(() => document.querySelectorAll('#liste-conduite li[data-id]').length === 2);
  prompteur = await ouvrirEcran();
  incrustation = await ouvrirEcran();
});
after(async () => { await navigateur.close(); });

describe('Lot 4, scénario « tout juste » (au clavier)', () => {
  test('passage à trou puis « Saisir la proposition » (Entrée) : une case par mot', async () => {
    await operateur.keyboard.press('ArrowDown');
    await operateur.keyboard.press('Enter'); // Commencer
    await operateur.keyboard.press('Space'); // ligne du trou
    assert.equal(await etape(), 'Étape : Passage à trou');
    await operateur.keyboard.press('Enter'); // Saisir la proposition
    assert.equal(await etape(), 'Étape : Saisie de la proposition');
    assert.equal(await operateur.locator('.case-mot').count(), 4);
    assert.equal(await operateur.evaluate(() => document.activeElement.dataset.index), '0', 'la première case a le curseur');
  });

  test('toutes les lignes du trou ensemble ; dans l\'incrustation, le bandeau s\'agrandit', async () => {
    await attendreMots(prompteur, [
      { texte: '____', etat: 'vide' }, { texte: '___', etat: 'vide' }, { texte: '_____', etat: 'vide' }, { texte: '___', etat: 'vide' }
    ]);
    assert.equal(await prompteur.locator('.ligne-sortie.trou').count(), 2);
    assert.equal(await incrustation.locator('.ligne-sortie.trou').count(), 2);
    const hauteur = await incrustation.evaluate(() => parseFloat(document.querySelector('.bandeau-incrustation').style.height));
    assert.ok(hauteur > 140, 'bandeau agrandi : ' + hauteur);
  });

  test('chaque mot tapé apparaît en jaune ; Espace passe à la case suivante', async () => {
    await operateur.keyboard.type('Tous');
    await attendreMots(prompteur, [
      { texte: 'Tous', etat: 'propose' }, { texte: '___', etat: 'vide' }, { texte: '_____', etat: 'vide' }, { texte: '___', etat: 'vide' }
    ]);
    await operateur.keyboard.press('Space');
    await operateur.keyboard.type('les');
    await operateur.keyboard.press('Tab');
    await operateur.keyboard.type('soirs');
    await operateur.keyboard.press('Enter'); // Entrée : case suivante, ne bloque pas (décision 6)
    await operateur.keyboard.type('ete');
    assert.equal(await etape(), 'Étape : Saisie de la proposition');
    await attendreMots(incrustation, [
      { texte: 'Tous', etat: 'propose' }, { texte: 'les', etat: 'propose' }, { texte: 'soirs', etat: 'propose' }, { texte: 'ete', etat: 'propose' }
    ]);
  });

  test('Ctrl+Entrée bloque : la proposition passe en bleu', async () => {
    await operateur.keyboard.press('Control+Enter');
    assert.equal(await etape(), 'Étape : Proposition bloquée');
    assert.equal(await operateur.isDisabled('.case-mot[data-index="0"]'), true, 'cases non modifiables');
    await attendreMots(prompteur, [
      { texte: 'Tous', etat: 'bloque' }, { texte: 'les', etat: 'bloque' }, { texte: 'soirs', etat: 'bloque' }, { texte: 'ete', etat: 'bloque' }
    ]);
  });

  test('R révèle le mot suivant : le bon mot en vert', async () => {
    await operateur.keyboard.press('r');
    await attendreMots(prompteur, [
      { texte: 'tous', etat: 'juste' }, { texte: 'les', etat: 'bloque' }, { texte: 'soirs', etat: 'bloque' }, { texte: 'ete', etat: 'bloque' }
    ]);
  });

  test('Maj+R révèle tout : tout en vert, puis « Bonne réponse »', async () => {
    await operateur.keyboard.press('Shift+R');
    await attendreMots(incrustation, [
      { texte: 'tous', etat: 'juste' }, { texte: 'les', etat: 'juste' }, { texte: 'soirs', etat: 'juste' }, { texte: 'été', etat: 'juste' }
    ]);
    await prompteur.waitForFunction(() => !!document.querySelector('.statut-sortie.visible'));
    assert.equal(await statutEcran(prompteur), 'Bonne réponse');
    assert.equal(await statutEcran(incrustation), 'Bonne réponse');
    assert.equal(await etape(), 'Étape : Réponse révélée');
  });

  test('le résultat est inscrit dans la conduite', async () => {
    assert.match(await operateur.textContent('#liste-conduite li:nth-child(1)'), /jouée · bonne réponse/);
  });

  test('« Ligne suivante » après la révélation : la ligne qui suit le trou', async () => {
    await operateur.keyboard.press('Space');
    await prompteur.waitForFunction(() => /La ligne après le trou/.test(Paroles.renduSortie.texteVisible(document.getElementById('scene'))));
    assert.equal(await statutEcran(prompteur), '');
  });
});

describe('Lot 4, scénario « partiellement faux, case vide » (à la souris)', () => {
  test('« Chanson suivante » charge la chanson B', async () => {
    await operateur.click('button[data-action="chansonSuivante"]');
    assert.match(await operateur.textContent('#titre-chanson'), /Essai B/);
    await operateur.click('button[data-action="commencer"]');
    await operateur.click('button[data-action="ligneSuivante"]');
    await operateur.click('button[data-action="saisir"]');
  });

  test('saisie avec une case vide, puis « Bloquer »', async () => {
    await operateur.fill('.case-mot[data-index="0"]', 'tous');
    await operateur.fill('.case-mot[data-index="2"]', 'matins');
    await operateur.fill('.case-mot[data-index="3"]', 'été');
    await operateur.click('button[data-action="bloquer"]');
    assert.equal(await etape(), 'Étape : Proposition bloquée');
  });

  test('« Annuler la dernière action » revient à la saisie ; « Débloquer » demande confirmation', async () => {
    await operateur.click('#btn-annuler');
    assert.equal(await etape(), 'Étape : Saisie de la proposition');
    await operateur.click('button[data-action="bloquer"]');
    await operateur.click('button[data-action="debloquer"]');
    await operateur.waitForSelector('#dialogue:not([hidden])');
    await operateur.click('#dialogue button:has-text("Débloquer")');
    assert.equal(await etape(), 'Étape : Saisie de la proposition');
    assert.equal(await operateur.inputValue('.case-mot[data-index="2"]'), 'matins', 'rien n\'est perdu');
    await operateur.click('button[data-action="bloquer"]');
  });

  test('l\'opérateur voit la suggestion juste / faux de chaque mot', async () => {
    const suggestions = await operateur.$$eval('.bascule-mot', (b) => b.map((x) => x.textContent));
    assert.deepEqual(suggestions, ['Juste', 'Faux', 'Faux', 'Juste']);
  });

  test('« Tout révéler » : faux en rouge, puis remplacés par le bon mot après le délai', async () => {
    await operateur.click('button[data-action="toutReveler"]');
    await attendreMots(prompteur, [
      { texte: 'tous', etat: 'juste' }, { texte: '___', etat: 'faux' }, { texte: 'matins', etat: 'faux' }, { texte: 'été', etat: 'juste' }
    ]);
    assert.equal(await statutEcran(prompteur), '', 'pas de statut pendant le délai');
    await attendreMots(prompteur, [
      { texte: 'tous', etat: 'juste' }, { texte: 'les', etat: 'correction' }, { texte: 'soirs', etat: 'correction' }, { texte: 'été', etat: 'juste' }
    ]);
    await prompteur.waitForFunction(() => !!document.querySelector('.statut-sortie.visible'));
    assert.equal(await statutEcran(prompteur), 'Mauvaise réponse');
    assert.equal(await statutEcran(incrustation), 'Mauvaise réponse');
  });

  test('une bascule manuelle (faute de frappe) passe le mot en vert', async () => {
    await operateur.click('.bascule-mot[data-index="2"]');
    await attendreMots(prompteur, [
      { texte: 'tous', etat: 'juste' }, { texte: 'les', etat: 'correction' }, { texte: 'soirs', etat: 'juste' }, { texte: 'été', etat: 'juste' }
    ]);
    assert.equal(await statutEcran(prompteur), 'Mauvaise réponse', 'la case vide reste fausse');
    assert.match(await operateur.textContent('#liste-conduite li:nth-child(2)'), /jouée · mauvaise réponse/);
  });

  test('« Rejouer la chanson » est visible à l\'étape révélée (il arrive au lot 5)', async () => {
    assert.equal(await operateur.isVisible('button[data-action="rejouer"]'), true);
  });

  test('aucune erreur JavaScript', () => {
    assert.deepEqual(erreurs, []);
  });
});

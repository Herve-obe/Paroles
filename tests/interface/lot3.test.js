/*
 * Tests de l'interface, lot 3 : écrans de sortie prompteur et incrustation,
 * plein écran, « Noir », resynchronisation.
 *
 * Critère de validation du lot 3 : « 2 écrans de sortie suivent l'opérateur
 * sans décalage visible ».
 *
 * Nécessite Playwright : npm run test:interface
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..', '..');
const PAGE = 'file://' + path.join(RACINE, 'app', 'index.html');
const EXEMPLE = path.join(RACINE, 'app', 'exemples', 'exemple-1-le-cafe-du-port.txt');

let navigateur;
let contexte;
let operateur;
let ecran1;
let ecran2;
const erreurs = [];
const requetesExternes = [];

/** Surveille les erreurs et le réseau d'une page. */
function surveiller(page) {
  page.on('pageerror', (e) => erreurs.push(page.url() + ' : ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') erreurs.push(page.url() + ' : ' + m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) requetesExternes.push(r.url()); });
}

/** Clique « Ouvrir un écran de sortie » et renvoie la nouvelle fenêtre. */
async function ouvrirEcran() {
  const [fenetre] = await Promise.all([operateur.waitForEvent('popup'), operateur.click('#btn-ouvrir-ecran')]);
  surveiller(fenetre);
  await fenetre.waitForLoadState();
  await fenetre.setViewportSize({ width: 960, height: 540 });
  return fenetre;
}

/** Texte visible d'un écran de sortie (espaces normalisés). */
async function texteEcran(fenetre) {
  return (await fenetre.evaluate(() => document.getElementById('scene').innerText)).replace(/\s+/g, ' ').trim();
}

/** Attend que le texte d'un écran de sortie vérifie une condition. */
async function attendreTexte(fenetre, motif) {
  await fenetre.waitForFunction(
    (source) => new RegExp(source).test(document.getElementById('scene').innerText.replace(/\s+/g, ' ')),
    motif.source,
    { timeout: 5000 }
  );
}

const voyants = () => operateur.textContent('#voyants');

before(async () => {
  navigateur = await chromium.launch({ channel: 'chromium' }) /* moteur complet : plein écran des fenêtres pop-up */;
  contexte = await navigateur.newContext({ viewport: { width: 1920, height: 1080 } });
  operateur = await contexte.newPage();
  surveiller(operateur);
  await operateur.goto(PAGE);
  await operateur.setInputFiles('#fichier-import', EXEMPLE);
  await operateur.waitForSelector('#liste-conduite li[data-id]');
});
after(async () => { await navigateur.close(); });

describe('Lot 3 : deux écrans de sortie suivent l\'opérateur', () => {
  test('« Ouvrir un écran de sortie » ouvre l\'écran 1 (prompteur) puis l\'écran 2 (incrustation)', async () => {
    ecran1 = await ouvrirEcran();
    ecran2 = await ouvrirEcran();
    assert.match(ecran1.url(), /sortie\.html\?ecran=1$/);
    assert.match(ecran2.url(), /sortie\.html\?ecran=2$/);
    assert.equal(await ecran1.getAttribute('#scene', 'data-mode'), 'prompteur');
    assert.equal(await ecran2.getAttribute('#scene', 'data-mode'), 'incrustation');
  });

  test('les voyants du bandeau indiquent les 2 écrans ouverts', async () => {
    await operateur.waitForFunction(() => document.querySelectorAll('#voyants .voyant.ouvert').length === 2, null, { timeout: 5000 });
    assert.match(await voyants(), /Écran 1 : prompteur/);
    assert.match(await voyants(), /Écran 2 : incrustation/);
  });

  test('un troisième écran est refusé : bouton grisé, et message avec la touche F2', async () => {
    assert.equal(await operateur.isDisabled('#btn-ouvrir-ecran'), true);
    await operateur.keyboard.press('F2');
    await operateur.waitForSelector('.notification');
    assert.match(await operateur.textContent('#notifications'), /2 écrans de sortie sont déjà ouverts/);
  });

  test('« Afficher le titre » : titre et artiste sur les deux écrans', async () => {
    await operateur.keyboard.press('ArrowDown');
    await operateur.click('button[data-action="afficherTitre"]');
    await attendreTexte(ecran1, /Le café du port.*Les Marées Basses/);
    await attendreTexte(ecran2, /Le café du port.*Les Marées Basses/);
  });

  test('« Commencer » : ligne 1 et ligne 2 atténuée sur les deux écrans', async () => {
    await operateur.click('button[data-action="commencer"]');
    await attendreTexte(ecran1, /^Sur le quai, les mouettes se disputent le matin Le patron du café/);
    await attendreTexte(ecran2, /^Sur le quai, les mouettes se disputent le matin Le patron du café/);
    assert.equal(await ecran1.locator('.ligne-sortie.suivante').count(), 1);
    assert.equal(await ecran2.locator('.bandeau-incrustation').count(), 1, 'l\'incrustation a son bandeau');
  });

  test('sans décalage visible : moins de 50 ms entre le clic et l\'affichage sur chaque écran', async () => {
    // Chaque écran note l'heure à laquelle son contenu change.
    for (const ecran of [ecran1, ecran2]) {
      await ecran.evaluate(() => {
        window.heureChangement = null;
        new MutationObserver(() => { if (!window.heureChangement) window.heureChangement = Date.now(); })
          .observe(document.getElementById('scene'), { childList: true, subtree: true, characterData: true });
      });
    }
    const heureClic = await operateur.evaluate(() => {
      const t = Date.now();
      document.querySelector('button[data-action="ligneSuivante"]').click();
      return t;
    });
    for (const ecran of [ecran1, ecran2]) {
      await ecran.waitForFunction(() => window.heureChangement !== null);
      const delai = (await ecran.evaluate(() => window.heureChangement)) - heureClic;
      assert.ok(delai < 50, 'délai : ' + delai + ' ms');
    }
  });

  test('les mots à trouver sont remplacés par des « _ » sur les écrans de sortie', async () => {
    await operateur.keyboard.press('Space');
    await operateur.keyboard.press('Space');
    await operateur.keyboard.press('Space');
    await attendreTexte(ecran1, /^Moi j'attends sur le banc/);
    const texte = await texteEcran(ecran1);
    assert.ok(!/tous les soirs/.test(texte), texte);
    assert.equal(await ecran1.locator('.mot.masque').count(), 8, '4 mots masqués sur la ligne en cours, 4 sur la suivante');
    assert.equal(await ecran1.textContent('.ligne-sortie.courante .mot.masque:last-child'), "_'___");
  });

  test('les aperçus de l\'écran opérateur montrent la même chose que les écrans de sortie', async () => {
    const apercu1 = (await operateur.evaluate(() => document.querySelector('[data-apercu-ecran="1"] .scene').innerText)).replace(/\s+/g, ' ').trim();
    assert.equal(apercu1, await texteEcran(ecran1));
    assert.equal(await operateur.getAttribute('[data-apercu-ecran="2"] .scene', 'data-mode'), 'incrustation');
  });

  test('une touche frappée sur un écran de sortie agit sur l\'écran opérateur', async () => {
    await ecran1.keyboard.press('ArrowLeft');
    await operateur.waitForFunction(() => document.querySelector('.ligne-op.antenne').dataset.ligne === '3');
    await attendreTexte(ecran1, /^Et chacun refait le monde/);
  });

  test('« Noir » vide les écrans ; un second clic réaffiche', async () => {
    await operateur.click('#btn-noir');
    await ecran1.waitForFunction(() => document.getElementById('scene').innerText.trim() === '');
    await ecran2.waitForFunction(() => document.querySelectorAll('.bandeau-incrustation').length === 0);
    const fond = await ecran2.evaluate(() => getComputedStyle(document.getElementById('scene')).backgroundColor);
    assert.equal(fond, 'rgb(0, 0, 0)', 'l\'incrustation garde son fond');
    assert.match(await operateur.getAttribute('#btn-noir', 'class'), /actif/);

    await operateur.click('#btn-noir');
    await attendreTexte(ecran1, /^Et chacun refait le monde/);
    await attendreTexte(ecran2, /^Et chacun refait le monde/);
  });

  test('touche F1 : « Noir », puis réaffichage', async () => {
    await operateur.keyboard.press('F1');
    await ecran1.waitForFunction(() => document.getElementById('scene').innerText.trim() === '');
    await operateur.keyboard.press('F1');
    await attendreTexte(ecran1, /^Et chacun refait le monde/);
  });

  test('un écran de sortie rechargé retrouve l\'affichage en cours', async () => {
    await ecran1.reload();
    await attendreTexte(ecran1, /^Et chacun refait le monde/);
    assert.equal(await ecran1.getAttribute('#scene', 'data-mode'), 'prompteur');
  });

  test('un écran de sortie fermé puis rouvert retrouve l\'affichage en cours', async () => {
    await ecran2.close();
    await operateur.waitForFunction(() => document.querySelectorAll('#voyants .voyant.ouvert').length === 1, null, { timeout: 5000 });
    ecran2 = await ouvrirEcran();
    assert.match(ecran2.url(), /ecran=2$/, 'la place libre est réutilisée');
    await attendreTexte(ecran2, /^Et chacun refait le monde/);
  });

  test('double-clic : plein écran, sans curseur ni texte d\'aide', async () => {
    await ecran1.dblclick('#scene');
    await ecran1.waitForFunction(() => !!document.fullscreenElement, null, { timeout: 3000 });
    // L'événement « plein écran » du navigateur arrive juste après le passage en plein écran.
    await ecran1.waitForFunction(() => document.body.classList.contains('plein-ecran'), null, { timeout: 3000 });
    assert.equal(await ecran1.isHidden('#aide-sortie'), true);
    assert.equal(await ecran1.evaluate(() => getComputedStyle(document.body).cursor), 'none');
    await operateur.waitForFunction(() => /plein écran/.test(document.getElementById('voyants').textContent), null, { timeout: 5000 });
    await ecran1.dblclick('#scene');
    await ecran1.waitForFunction(() => !document.fullscreenElement, null, { timeout: 3000 });
  });

  test('l\'écran opérateur rechargé retrouve ses écrans de sortie ouverts', async () => {
    await operateur.reload();
    await operateur.waitForFunction(() => document.querySelectorAll('#voyants .voyant.ouvert').length === 2, null, { timeout: 5000 });
    // Sans sauvegarde (lot 6), plus de chanson chargée : les écrans se vident.
    await ecran1.waitForFunction(() => document.getElementById('scene').innerText.trim() === '');
  });

  test('aucune erreur JavaScript et aucun appel réseau', () => {
    assert.deepEqual(erreurs, []);
    assert.deepEqual(requetesExternes, []);
  });
});

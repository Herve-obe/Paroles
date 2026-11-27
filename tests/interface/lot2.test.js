/*
 * Tests de l'interface, lot 2 : écran opérateur, conduite, éditeur,
 * défilement des lignes. Ils ouvrent app/index.html dans Chromium comme
 * un double-clic (adresse file://), puis cliquent et tapent au clavier.
 *
 * Critère de validation du lot 2 : « Une chanson tapée dans l'éditeur se
 * déroule à l'écran opérateur, à la souris et au clavier ».
 *
 * Nécessite Playwright (installé dans l'environnement de développement) :
 *   npm run test:interface
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require('playwright');

const RACINE = path.join(__dirname, '..', '..');
const PAGE = 'file://' + path.join(RACINE, 'app', 'index.html');
const EXEMPLES = path.join(RACINE, 'app', 'exemples');

let navigateur;

before(async () => { navigateur = await chromium.launch({ channel: 'chromium' }) /* moteur complet : plein écran des fenêtres pop-up */; });
after(async () => { await navigateur.close(); });

/** Ouvre une page neuve ; mémorise les erreurs JavaScript et les requêtes réseau. */
async function ouvrir(taille) {
  const page = await navigateur.newPage({ viewport: taille || { width: 1920, height: 1080 } });
  page.erreurs = [];
  page.requetesExternes = [];
  page.on('pageerror', (e) => page.erreurs.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') page.erreurs.push(m.text()); });
  page.on('request', (r) => { if (!/^(file|data|blob):/.test(r.url())) page.requetesExternes.push(r.url()); });
  await page.goto(PAGE);
  return page;
}

/** Sélectionne un morceau de texte dans la zone « Paroles » de l'éditeur. */
async function selectionner(page, morceau) {
  await page.evaluate((m) => {
    const zone = document.querySelector('textarea[name="paroles"]');
    const debut = zone.value.indexOf(m);
    zone.focus();
    zone.setSelectionRange(debut, debut + m.length);
  }, morceau);
}

/** Index de la ligne à l'antenne dans la zone centrale (null si aucune). */
async function ligneAntenne(page) {
  return page.evaluate(() => {
    const l = document.querySelector('.ligne-op.antenne');
    return l ? Number(l.dataset.ligne) : null;
  });
}

const texteEtape = (page) => page.textContent('#titre-etape');

describe('Lot 2 : une chanson tapée dans l\'éditeur se déroule à l\'écran', () => {
  let page;
  before(async () => { page = await ouvrir(); });

  test('la page s\'ouvre sans erreur et sans aucun appel réseau', async () => {
    assert.equal(await page.title(), 'Paroles : écran opérateur');
    assert.deepEqual(page.erreurs, []);
    assert.deepEqual(page.requetesExternes, []);
    assert.equal(await texteEtape(page), 'Étape : Aucune chanson chargée');
  });

  test('la police embarquée est bien chargée', async () => {
    const chargee = await page.evaluate(async () => {
      await document.fonts.ready;
      return document.fonts.check('16px "Atkinson Hyperlegible"');
    });
    assert.ok(chargee);
  });

  test('« Nouvelle chanson » : saisie, marquage des mots, fausses propositions, enregistrement', async () => {
    await page.click('#btn-nouvelle');
    await page.fill('input[name="titre"]', 'Chanson d\'essai');
    await page.fill('input[name="artiste"]', 'Groupe inventé');
    await page.fill('textarea[name="paroles"]',
      'Première ligne du couplet\nDeuxième ligne, la suite\nEt je chante tous les soirs\nla belle chanson du port\nDernière ligne après le trou');

    // Marquage à la souris : sélection partielle étendue aux mots entiers.
    await selectionner(page, 'ous les soi');
    await page.click('button[data-action="marquer"]');
    await selectionner(page, 'la belle chanson');
    await page.click('button[data-action="marquer"]');
    const texte = await page.inputValue('textarea[name="paroles"]');
    assert.ok(texte.includes('Et je chante [tous les soirs]'), texte);
    assert.ok(texte.includes('[la belle chanson] du port'), texte);
    assert.match(await page.textContent('[data-infos]'), /Mots à trouver : 6/);
    assert.equal(await page.locator('.calque mark').count(), 2, 'les deux groupes sont surlignés');

    // Fausses propositions : refusée si le nombre de mots diffère (règle 8).
    await page.fill('input[name="faux1"]', 'tous les matins');
    assert.match(await page.textContent('[data-etat="faux1"]'), /Refusée : 6 mots attendus, 3 saisis/);
    await page.fill('input[name="faux1"]', 'tous les matins la petite chanson');
    await page.fill('input[name="faux2"]', 'toutes les nuits une vieille chanson');
    assert.match(await page.textContent('[data-etat="faux1"]'), /Correcte/);
    assert.match(await page.textContent('[data-etat="faux2"]'), /Correcte/);

    // Aperçu : les mots à trouver deviennent des « _ ».
    await page.click('button[data-action="apercu"]');
    assert.match(await page.textContent('[data-apercu]'), /____ ___ _____/);

    await page.click('button[data-action="enregistrer"]');
    assert.equal(await page.isHidden('#editeur'), true, 'l\'éditeur est fermé');
    assert.match(await page.textContent('#liste-conduite'), /Chanson d'essai/);
    assert.match(await page.textContent('#liste-conduite'), /à venir/);
  });

  test('« Charger », « Afficher le titre » puis « Commencer » à la souris', async () => {
    await page.click('#btn-charger');
    assert.equal(await texteEtape(page), 'Étape : Chanson chargée');
    assert.match(await page.textContent('#liste-conduite'), /en cours/);

    await page.click('button[data-action="afficherTitre"]');
    assert.match(await page.textContent('.titre-antenne'), /Chanson d'essai : Groupe inventé/);

    // Après le titre, « Commencer » passe par un écran sans paroles (intro).
    await page.click('button[data-action="commencer"]');
    assert.equal(await texteEtape(page), 'Étape : Intro (écran sans paroles)');
    assert.equal(await ligneAntenne(page), null);
    assert.equal(await page.getAttribute('.ligne-op.suivante', 'data-ligne'), '0');
    await page.click('button[data-action="ligneSuivante"]');
    assert.equal(await ligneAntenne(page), 0);
    assert.equal(await texteEtape(page), 'Étape : Défilement');
    assert.equal(await page.getAttribute('.ligne-op.suivante', 'data-ligne'), '1');
  });

  test('défilement à la souris : ligne suivante et précédente, en moins de 50 ms', async () => {
    const duree = await page.evaluate(() => {
      const t = performance.now();
      document.querySelector('button[data-action="ligneSuivante"]').click();
      return performance.now() - t;
    });
    assert.equal(await ligneAntenne(page), 1);
    assert.ok(duree < 50, 'durée : ' + duree.toFixed(1) + ' ms');
    await page.click('button[data-action="lignePrecedente"]');
    assert.equal(await ligneAntenne(page), 0);
  });

  test('défilement au clavier : Espace, flèche droite, flèche gauche', async () => {
    await page.keyboard.press('Space');
    assert.equal(await ligneAntenne(page), 1);
    await page.keyboard.press('ArrowRight');
    assert.equal(await ligneAntenne(page), 2);
    assert.equal(await texteEtape(page), 'Étape : Passage à trou');
    await page.keyboard.press('ArrowLeft');
    assert.equal(await ligneAntenne(page), 1);
  });

  test('le défilement s\'arrête à la dernière ligne du passage à trou', async () => {
    for (let i = 0; i < 5; i += 1) await page.keyboard.press('Space');
    assert.equal(await ligneAntenne(page), 3);
    assert.equal(await page.isDisabled('button[data-action="ligneSuivante"]'), true);
    assert.equal(await page.isDisabled('button[data-action="saisir"]'), true, 'la saisie arrive au lot 4');
    assert.equal(await page.locator('.cadre-trou .ligne-op').count(), 2, 'le passage à trou est encadré');
  });

  test('« Annuler la dernière action » : Ctrl+Z et bouton', async () => {
    await page.keyboard.press('Control+z');
    assert.equal(await ligneAntenne(page), 2);
    await page.click('#btn-annuler');
    assert.equal(await ligneAntenne(page), 1);
  });

  test('après un clic sur un bouton, Espace ne déclenche pas le bouton une seconde fois', async () => {
    await page.click('button[data-action="ligneSuivante"]');
    assert.equal(await ligneAntenne(page), 2);
    await page.keyboard.press('Space');
    assert.equal(await ligneAntenne(page), 3, 'une seule ligne de plus');
  });

  test('aucune erreur JavaScript pendant le scénario', () => {
    assert.deepEqual(page.erreurs, []);
  });
});

describe('Lot 2 : conduite, import et export', () => {
  let page;
  before(async () => { page = await ouvrir(); });

  test('import de 2 fichiers .txt par le bouton « Importer »', async () => {
    await page.setInputFiles('#fichier-import', [
      path.join(EXEMPLES, 'exemple-1-le-cafe-du-port.txt'),
      path.join(EXEMPLES, 'exemple-2-neons-de-minuit.txt')
    ]);
    await page.waitForFunction(() => document.querySelectorAll('#liste-conduite li[data-id]').length === 2);
    assert.match(await page.textContent('#liste-conduite'), /Le café du port/);
    assert.match(await page.textContent('#liste-conduite'), /Néons de minuit/);
    assert.match(await page.textContent('#liste-conduite'), /Candidat 2 · 40 points · PLAYBACK/);
  });

  test('un fichier invalide est refusé avec le nom du fichier et la ligne', async () => {
    await page.setInputFiles('#fichier-import', { name: 'casse.txt', mimeType: 'text/plain', buffer: Buffer.from('# titre: X\nla [suite') });
    await page.waitForSelector('#dialogue:not([hidden])');
    assert.match(await page.textContent('#dialogue'), /casse\.txt, ligne 2 : crochet « \[ » non fermé/);
    await page.click('#dialogue button');
    assert.equal(await page.locator('#liste-conduite li[data-id]').count(), 2);
  });

  test('flèche bas charge la première chanson, puis la suivante', async () => {
    await page.keyboard.press('ArrowDown');
    assert.match(await page.textContent('#titre-chanson'), /Le café du port/);
    await page.keyboard.press('ArrowDown');
    assert.match(await page.textContent('#titre-chanson'), /Néons de minuit/);
    await page.keyboard.press('ArrowUp');
    assert.match(await page.textContent('#titre-chanson'), /Le café du port/);
  });

  test('pendant une chanson, les flèches haut et bas ne changent pas de chanson', async () => {
    await page.keyboard.press('Enter'); // Commencer
    assert.equal(await ligneAntenne(page), 0);
    await page.keyboard.press('ArrowDown');
    assert.match(await page.textContent('#titre-chanson'), /Le café du port/);
  });

  test('charger une autre chanson pendant une chanson demande une confirmation dans la page', async () => {
    await page.dblclick('#liste-conduite li:nth-child(2)');
    await page.waitForSelector('#dialogue:not([hidden])');
    assert.match(await page.textContent('#dialogue'), /Changer de chanson \?/);
    await page.click('#dialogue button:has-text("Annuler")');
    assert.match(await page.textContent('#titre-chanson'), /Le café du port/);

    await page.dblclick('#liste-conduite li:nth-child(2)');
    await page.click('#dialogue button:has-text("Changer de chanson")');
    assert.match(await page.textContent('#titre-chanson'), /Néons de minuit/);
    assert.match(await page.textContent('#liste-conduite li:nth-child(1)'), /à venir/);
  });

  test('« Monter » et « Descendre »', async () => {
    await page.click('#liste-conduite li:nth-child(2)');
    await page.click('#btn-monter');
    assert.match(await page.textContent('#liste-conduite li:nth-child(1)'), /Néons de minuit/);
    assert.equal(await page.isDisabled('#btn-monter'), true);
    await page.click('#btn-descendre');
    assert.match(await page.textContent('#liste-conduite li:nth-child(2)'), /Néons de minuit/);
  });

  test('« Modifier » rouvre la chanson avec ses crochets', async () => {
    await page.click('#liste-conduite li:nth-child(1)');
    await page.click('#btn-modifier');
    assert.match(await page.inputValue('textarea[name="paroles"]'), /\[tous les soirs d'été\]/);
    assert.equal(await page.inputValue('input[name="faux2"]'), 'toutes les nuits d\'automne que le petit navire');
    await page.keyboard.press('Escape'); // pas de modification : fermeture directe
    assert.equal(await page.isHidden('#editeur'), true);
  });

  test('« Exporter la chanson » propose le nom du fichier et écrit le .txt', async () => {
    // La fenêtre « Enregistrer sous » de Chrome ne peut pas être pilotée par
    // un test : on la remplace par une imitation qui garde ce qui est écrit.
    await page.evaluate(() => {
      window.showSaveFilePicker = async (options) => {
        window.exportTest = { nom: options.suggestedName, contenu: '' };
        return {
          name: options.suggestedName,
          createWritable: async () => ({
            write: async (blob) => { window.exportTest.contenu = await blob.text(); },
            close: async () => {}
          })
        };
      };
    });
    await page.click('#btn-exporter');
    await page.waitForFunction(() => window.exportTest && window.exportTest.contenu);
    const exp = await page.evaluate(() => window.exportTest);
    assert.equal(exp.nom, 'Le café du port.txt');
    assert.ok(exp.contenu.includes('# titre: Le café du port'));
    assert.ok(exp.contenu.includes('Moi j\'attends sur le banc [tous les soirs d\'été]'));
  });

  test('sans la fenêtre « Enregistrer sous » (Firefox), repli sur un téléchargement', async () => {
    await page.evaluate(() => { delete window.showSaveFilePicker; window.showSaveFilePicker = undefined; });
    const [telechargement] = await Promise.all([page.waitForEvent('download'), page.click('#btn-exporter')]);
    assert.ok(telechargement);
  });

  test('« Supprimer » demande une confirmation dans la page', async () => {
    await page.click('#btn-supprimer');
    await page.waitForSelector('#dialogue:not([hidden])');
    await page.click('#dialogue button:has-text("Supprimer")');
    assert.equal(await page.locator('#liste-conduite li[data-id]').count(), 1);
  });

  test('aucune erreur JavaScript et aucun appel réseau', () => {
    assert.deepEqual(page.erreurs, []);
    assert.deepEqual(page.requetesExternes, []);
  });
});

describe('Lot 2 : contrôles de l\'éditeur', () => {
  let page;
  before(async () => { page = await ouvrir(); });

  test('un crochet non fermé est signalé et empêche l\'enregistrement', async () => {
    await page.click('#btn-nouvelle');
    await page.fill('input[name="titre"]', 'Erreur');
    await page.fill('textarea[name="paroles"]', 'une ligne\nla [suite');
    assert.match(await page.textContent('[data-infos]'), /Ligne 2 : crochet « \[ » non fermé/);
    await page.click('button[data-action="enregistrer"]');
    assert.match(await page.textContent('#dialogue'), /Impossible d'enregistrer/);
    await page.click('#dialogue button');
  });

  test('sans fausses propositions : avertissement, puis enregistrement possible', async () => {
    await page.fill('textarea[name="paroles"]', 'une ligne\nla [suite du trou]');
    await page.click('button[data-action="enregistrer"]');
    assert.match(await page.textContent('#dialogue'), /Fausses propositions absentes/);
    await page.click('#dialogue button:has-text("Enregistrer")');
    assert.equal(await page.locator('#liste-conduite li[data-id]').count(), 1);
  });

  test('fermer l\'éditeur après une modification demande confirmation', async () => {
    await page.click('#btn-nouvelle');
    await page.fill('input[name="titre"]', 'Brouillon');
    await page.click('button[data-action="fermer"]');
    assert.match(await page.textContent('#dialogue'), /Abandonner les modifications/);
    await page.click('#dialogue button:has-text("Abandonner")');
    assert.equal(await page.isHidden('#editeur'), true);
  });

  test('pendant la saisie dans l\'éditeur, Espace tape un espace et ne fait pas défiler', async () => {
    await page.click('#liste-conduite li:nth-child(1)');
    await page.click('#btn-charger');
    await page.click('button[data-action="commencer"]');
    await page.click('#btn-modifier');
    await page.click('input[name="artiste"]');
    await page.keyboard.type('a b');
    assert.equal(await page.inputValue('input[name="artiste"]'), 'a b');
    await page.keyboard.press('Escape');
    await page.click('#dialogue button:has-text("Abandonner")');
    assert.equal(await ligneAntenne(page), 0);
  });

  test('aucune erreur JavaScript', () => {
    assert.deepEqual(page.erreurs, []);
  });
});

describe('Lot 2 : écran de 1366 × 768 (mise à l\'échelle Windows)', () => {
  test('pas de défilement horizontal et boutons d\'étape visibles', async () => {
    const page = await ouvrir({ width: 1366, height: 768 });
    await page.setInputFiles('#fichier-import', path.join(EXEMPLES, 'exemple-1-le-cafe-du-port.txt'));
    await page.waitForSelector('#liste-conduite li[data-id]');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    const mesures = await page.evaluate(() => ({
      largeur: document.documentElement.scrollWidth,
      fenetre: window.innerWidth,
      bouton: document.querySelector('button[data-action="ligneSuivante"]').getBoundingClientRect().bottom
    }));
    assert.ok(mesures.largeur <= mesures.fenetre, JSON.stringify(mesures));
    assert.ok(mesures.bouton < 768, 'bouton visible sans défiler : ' + mesures.bouton);
    assert.deepEqual(page.erreurs, []);
    await page.close();
  });
});

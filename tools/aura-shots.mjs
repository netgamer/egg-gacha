/**
 * Aura screenshots — the living elemental layer on the reveal card and the
 * baked aura in the dex grid.
 *
 *   node tools/aura-shots.mjs [element ...]
 *
 * The sandbox's software rasteriser dies on large composited canvases now and
 * then, so every shot gets its own browser, a retry, and a lower-DPR fallback.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { startServer } from './server.mjs';

fs.mkdirSync('shots', { recursive: true });
const { server, url } = await startServer('dist', 0);

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };

const DRAGONS = [
  ['fire', 'magma'],
  ['ice', 'frost'],
  ['forest', 'moss'],
  ['thunder', 'storm'],
  ['gold', 'gilded'],
  ['diamond', 'prism'],
  ['white', 'ivory'],
  ['spotted', 'spotted'],
];

const want = process.argv.slice(2);
const list = want.length ? DRAGONS.filter((d) => want.includes(d[0])) : DRAGONS;

async function shot(name, dsf, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: dsf, ...MOBILE });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  try {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
    await fn(page);
    await browser.close().catch(() => {});
    if (errors.length) console.log('  errors:', errors.slice(0, 3));
    return true;
  } catch (e) {
    console.log(`  (${name} dpr${dsf}: ${String(e.message).split('\n')[0]})`);
    await browser.close().catch(() => {});
    return false;
  }
}

async function robust(name, fn) {
  for (const dsf of [2, 1, 1]) {
    if (await shot(name, dsf, fn)) return true;
  }
  return false;
}

const parts = (id) => ({ bg: id, wings: id, body: id, eyes: id, horns: id, acc: id });
const results = [];

for (const [element, theme] of list) {
  const ok = await robust(element, async (page) => {
    await page.evaluate(
      ({ element, slots }) => {
        const G = window.__eggGacha;
        const id = G.seedDragon(element === 'diamond' ? 'diamond' : element === 'gold' ? 'golden' : element, slots);
        G.openRevealById(id);
      },
      { element, slots: parts(theme) }
    );
    await page.waitForSelector('#revealCard canvas.dc-aura', { timeout: 20000 });
    await page
      .waitForFunction(() => !!document.querySelector('#revealCard img.dc-canvas.ready'), null, { timeout: 20000 })
      .catch(() => {});
    await page.waitForTimeout(1300);
    console.log(element, JSON.stringify(await page.evaluate(() => window.__eggGacha.auraStats())));
    await page.screenshot({ path: `shots/aura-${element}.png` });
    console.log(`shots/aura-${element}.png`);
  });
  results.push([element, ok]);
}

/* the dex grid: baked aura on every thumb, no animation loop */
await robust('grid', async (page) => {
  await page.evaluate(() => {
    const G = window.__eggGacha;
    const p = (id) => ({ bg: id, wings: id, body: id, eyes: id, horns: id, acc: id });
    const themes = ['magma', 'frost', 'moss', 'storm', 'gilded', 'prism', 'ivory', 'spotted'];
    for (const t of themes) G.seedDragon('white', p(t));
  });
  await page.click('#dexBtn');
  await page.waitForTimeout(250);
  await page.click('#tabDragons');
  await page
    .waitForFunction(() => document.querySelectorAll('img[data-thumb][data-ready]').length >= 8, null, { timeout: 40000 })
    .catch(() => console.log('  (thumbs slow)'));
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/aura-grid.png' });
  console.log('shots/aura-grid.png', JSON.stringify(await page.evaluate(() => window.__eggGacha.auraStats())));
});

server.close();
console.log('done', JSON.stringify(results));

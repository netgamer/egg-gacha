/**
 * Deliverable screenshots for the realistic dragon build.
 * One browser per shot (this sandbox's software renderer is memory-fragile).
 *
 *   node tools/dragon-shots.mjs
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { startServer } from './server.mjs';

fs.mkdirSync('shots', { recursive: true });
const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };
const SMALL = { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };
const DESKTOP = { viewport: { width: 1280, height: 800 }, locale: 'ko-KR' };

async function withPage(opts, seed, fn, dsf = opts.viewport.width > 900 ? 1 : 2) {
  const ctx = await browser.newContext({ deviceScaleFactor: dsf, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('crash', () => console.log('!! crash'));
  page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  if (seed) {
    await page.addInitScript((e) => {
      localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'shot', egg: e, ts: 1 }]));
    }, seed);
  }
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  try {
    await fn(page);
  } finally {
    if (errors.length) console.log('  errors:', errors.slice(0, 3));
    await ctx.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 250));
  }
}

const pending = (egg) => egg;

async function hatch(page) {
  await page.click('#hatchCue');
  await page.waitForTimeout(300);
  await page.click('#hatchBtn', { noWaitAfter: true });
  await page.waitForSelector('#revealCard .dc', { timeout: 25000 });
  await page
    .waitForFunction(() => !!document.querySelector('#revealCard img.dc-canvas.ready'), null, { timeout: 20000 })
    .catch(() => console.log('  (canvas not ready)'));
  await page.waitForTimeout(700);
  return page.evaluate(() => {
    const dc = document.querySelector('#revealCard .dc');
    const art = dc.querySelector('.dc-art').getBoundingClientRect();
    const box = document.querySelector('.hatch-box').getBoundingClientRect();
    return {
      name: dc.querySelector('.dc-name').textContent,
      rarity: dc.dataset.rarity,
      traits: [...dc.querySelectorAll('.dc-trait')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
      art: [Math.round(art.width), Math.round(art.height)],
      overflow: Math.round(box.bottom - innerHeight),
    };
  });
}

/* 1. mobile reveal — a cross-theme hatch */
await withPage(MOBILE, pending('ice'), async (page) => {
  const info = await hatch(page);
  await page.screenshot({ path: 'shots/real-reveal-mobile.png' });
  console.log('real-reveal-mobile.png', JSON.stringify(info));
});

/* 2. small phone 360x640 — the tallest card must still fit or scroll cleanly */
await withPage(SMALL, pending('diamond'), async (page) => {
  const info = await hatch(page);
  await page.screenshot({ path: 'shots/real-reveal-small.png' });
  console.log('real-reveal-small.png', JSON.stringify(info));
});

/* 3. desktop reveal (element capture: the sandbox's full-page rasteriser drops
   large canvases, an element screenshot composites them correctly) */
await withPage(DESKTOP, pending('fire'), async (page) => {
  const info = await hatch(page);
  // the sandbox rasteriser drops a large card image unless the page repaints
  await page.evaluate(() => document.body.style.setProperty('--repaint', String(Math.random())));
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/real-reveal-desktop.png' });
  console.log('real-reveal-desktop.png', JSON.stringify(info));
});

/* 4. dragon dex grid (12 composed dragons on mobile) */
await withPage(MOBILE, null, async (page) => {
  await page.evaluate(() => window.__eggGacha.seedDragons(12));
  await page.click('#dexBtn');
  await page.waitForTimeout(250);
  await page.click('#tabDragons');
  await page
    .waitForFunction(() => document.querySelectorAll('img[data-thumb][data-ready]').length >= 12, null, { timeout: 30000 })
    .catch(() => console.log('  (thumbs slow)'));
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'shots/real-dex-mobile.png' });
  console.log('real-dex-mobile.png');
}, 1);

/* 5. detail modal on mobile */
await withPage(MOBILE, null, async (page) => {
  await page.evaluate(() => window.__eggGacha.seedDragons(6));
  await page.click('#dexBtn');
  await page.waitForTimeout(250);
  await page.click('#tabDragons');
  await page.waitForFunction(() => document.querySelectorAll('img[data-thumb][data-ready]').length >= 6, null, { timeout: 30000 }).catch(() => {});
  await page.click('#dragonGrid .dg');
  await page.waitForTimeout(1400);
  await page.screenshot({ path: 'shots/real-detail-mobile.png' });
  console.log('real-detail-mobile.png');
}, 1);

await browser.close();
server.close();

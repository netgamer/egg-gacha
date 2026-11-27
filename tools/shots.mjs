import { chromium } from 'playwright';
import { startServer } from './server.mjs';
import { mkdir } from 'node:fs/promises';

/**
 * Captures the screenshots that go with the build report.
 * One fresh browser per shot: the sandbox renderer gets unstable when a single
 * process both plays the game and grabs several full-size bitmaps.
 */

const SHOTS = 'shots';
await mkdir(SHOTS, { recursive: true });
const { server, url } = await startServer('dist', 0);
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };

async function shot(file, ctxOpts, actions, { scale = 'css', dpr = 2 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: dpr, ...ctxOpts });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(e.message));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/INSUFFICIENT/.test(m.text())) errs.push(m.text());
  });
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  if (actions) await actions(page);
  await page.screenshot({ path: `${SHOTS}/${file}`, scale });
  console.log(`saved ${SHOTS}/${file}${errs.length ? `  (errors: ${errs.join(' | ')})` : ''}`);
  await ctx.close();
  await browser.close();
  await new Promise((r) => setTimeout(r, 250));
}

const spinOnce = async (page, id, { waitBanner = false, waitEnd = true } = {}) => {
  await page.evaluate((egg) => window.__eggGacha.queue([egg]), id);
  await page.click('#pull1', { noWaitAfter: true });
  if (waitBanner) {
    await page.waitForFunction(() => window.__eggGacha.state().banner.length > 0 && !window.__eggGacha.state().busy === false, null, { timeout: 3000 }).catch(() => {});
  }
  if (waitEnd) await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 25000 });
};

/* --- mobile --- */
await shot('mobile-ready.png', MOBILE, null);

await shot(
  'mobile-spin.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['thunder']));
    await page.click('#pull1', { noWaitAfter: true });
    await page.waitForTimeout(2100);
    // catch the reel with a card dead centre (slow phase, so the window is wider)
    await page.waitForFunction(() => {
      const p = window.__eggGacha.state().p;
      return Math.abs(p - Math.round(p)) < 0.05;
    }, null, { timeout: 4000 }).catch(() => {});
  },
  { scale: 'css', dpr: 2 }
);

await shot(
  'mobile-reveal-legendary.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['diamond']));
    await page.click('#pull1', { noWaitAfter: true });
    await page.waitForFunction(() => window.__eggGacha.state().banner.includes('무지개'), null, { timeout: 25000 });
    await page.waitForTimeout(150);
  },
  { scale: 'css', dpr: 2 }
);

await shot(
  'mobile-reveal-legendary-fx.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['diamond']));
    await page.click('#pull1', { noWaitAfter: true });
    await page.waitForFunction(() => window.__eggGacha.state().banner.includes('무지개'), null, { timeout: 25000 });
    await page.waitForTimeout(240);
  },
  { scale: 'css', dpr: 2 }
);

await shot(
  'mobile-reveal-epic.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['golden']));
    await page.click('#pull1', { noWaitAfter: true });
    await page.waitForFunction(() => window.__eggGacha.state().banner.includes('황금'), null, { timeout: 25000 });
    await page.waitForTimeout(150);
  },
  { scale: 'css', dpr: 2 }
);

await shot(
  'mobile-results-5.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['white', 'fire', 'thunder', 'golden', 'ice']));
    await page.click('#pull5', { noWaitAfter: true });
    await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 30000 });
    await page.waitForTimeout(400);
  },
  { scale: 'css', dpr: 2 }
);

await shot(
  'mobile-dex.png',
  MOBILE,
  async (page) => {
    await page.evaluate(() =>
      localStorage.setItem(
        'egg-gacha.collection.v1',
        JSON.stringify({ v: 1, pulls: 14, counts: { white: 6, spotted: 3, forest: 2, fire: 2, diamond: 1 } })
      )
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
    await page.waitForTimeout(400);
    await page.click('#dexBtn', { noWaitAfter: true });
    await page.waitForTimeout(700);
  },
  { scale: 'css', dpr: 2 }
);

await shot('mobile-landscape.png', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, null, { scale: 'css', dpr: 2 });

await shot('mobile-small-360.png', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }, null, { scale: 'css', dpr: 2 });

/* --- desktop --- */
await shot('desktop-ready.png', { viewport: { width: 1280, height: 800 } }, null, { scale: 'css', dpr: 1 });

await shot(
  'desktop-reveal-legendary.png',
  { viewport: { width: 1280, height: 800 } },
  async (page) => {
    await page.evaluate(() => window.__eggGacha.queue(['diamond']));
    await page.click('#pull1', { noWaitAfter: true });
    await page.waitForFunction(() => window.__eggGacha.state().banner.includes('무지개'), null, { timeout: 25000 });
    await page.waitForTimeout(150);
  },
  { scale: 'css', dpr: 1 }
);

await shot(
  'desktop-dex.png',
  { viewport: { width: 1280, height: 800 } },
  async (page) => {
    await page.evaluate(() =>
      localStorage.setItem(
        'egg-gacha.collection.v1',
        JSON.stringify({ v: 1, pulls: 9, counts: { white: 3, spotted: 2, forest: 1, fire: 1, ice: 1, thunder: 1 } })
      )
    );
    await page.reload({ waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
    await page.click('#dexBtn', { noWaitAfter: true });
    await page.waitForTimeout(700);
  },
  { scale: 'css', dpr: 1 }
);

server.close();
console.log('done');

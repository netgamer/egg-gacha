/**
 * Rarity frame sheet — one mobile screenshot per tier (일반·희귀·영웅·전설)
 * for the reveal card, the detail card and the dex grid.
 *
 *   node tools/tier-shots.mjs
 *
 * Seeded dragons carry the rarity explicitly, so all four frames can be looked
 * at side by side without waiting for a 0.4% legendary hatch.
 * One browser per shot: this sandbox's software renderer is memory-fragile.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { startServer } from './server.mjs';

fs.mkdirSync('shots', { recursive: true });
const { server, url } = await startServer('dist', 0);

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };
const shots = [];

const TIERS = [
  { rarity: 'common', egg: 'white', part: 'ivory', label: '일반' },
  { rarity: 'rare', egg: 'ice', part: 'frost', label: '희귀' },
  { rarity: 'epic', egg: 'thunder', part: 'storm', label: '영웅' },
  { rarity: 'legendary', egg: 'diamond', part: 'prism', label: '전설' },
];

/** localStorage payload: four dragons, one per tier, in display order. */
function seedDragons(tiers) {
  const list = tiers.map((t, i) => ({
    id: `t-${t.rarity}`,
    serial: i + 1,
    egg: t.egg,
    parts: { bg: t.part, wings: t.part, body: t.part, eyes: t.part, horns: t.part, acc: t.part },
    rarity: t.rarity,
    affinity: 1,
    ts: Date.now() - i * 1000,
  }));
  return { v: 1, nextSerial: list.length + 1, list };
}

const TARGETS = [];

/**
 * Run one shot in a fresh browser. A renderer crash (sandbox memory) is
 * retried once; the screenshot set is written even if one shot is lost.
 */
async function shot(name, fn, opts = {}) {
  const { dsf = 2, reducedMotion } = opts;
  for (let attempt = 1; attempt <= 3; attempt++) {
    const browser = await chromium.launch();
    const ctx = await browser.newContext({ deviceScaleFactor: dsf, reducedMotion, ...MOBILE });
    const page = await ctx.newPage();
    const errors = [];
    let crashed = false;
    page.on('crash', () => {
      crashed = true;
    });
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('response', (r) => {
      if (r.status() >= 400) errors.push(`http ${r.status()} ${r.url()}`);
    });
    await page.addInitScript((payload) => {
      localStorage.setItem('egg-gacha.dragons.v1', JSON.stringify(payload));
    }, seedDragons(TIERS));
    try {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
      await fn(page);
      if (errors.length) console.log(`  ${name} errors:`, errors.slice(0, 3));
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
      return true;
    } catch (e) {
      await ctx.close().catch(() => {});
      await browser.close().catch(() => {});
      const lost = crashed || /crashed|has been closed|Unable to capture/.test(e.message);
      if (lost && attempt < 3) {
        console.log(`  ${name}: renderer crashed, retrying (${attempt}/3)`);
        continue;
      }
      console.log(`  ${name}: FAILED ${e.message.split('\n')[0]}`);
      return false;
    }
  }
  return false;
}

/** Frames actually painted: read back the tokens + the mask rings. */
const frameInfo = (page) =>
  page.evaluate(() => {
    const read = (el) => {
      const cs = getComputedStyle(el);
      const after = getComputedStyle(el, '::after');
      return {
        rarity: el.dataset.rarity,
        rim: cs.getPropertyValue('--rim-w').trim(),
        bw: cs.borderTopWidth,
        bezelAnim: cs.animationName,
        afterAnim: after.animationName,
      };
    };
    return {
      dc: [...document.querySelectorAll('.dc')].map(read),
      dg: [...document.querySelectorAll('.dg')].map(read),
    };
  });

/* 1. dex grid — all four tiers in one frame */
await shot('tier-dex-mobile.png', async (page) => {
  await page.click('#dexBtn');
  await page.click('#tabDragons');
  await page
    .waitForFunction(() => [...document.querySelectorAll('.dg-art img')].every((i) => i.dataset.ready === '1'), null, {
      timeout: 30000,
    })
    .catch(() => console.log('  (thumbs still baking)'));
  await page.waitForTimeout(900);
  await page.screenshot({ path: 'shots/tier-dex-mobile.png' });
  const info = await frameInfo(page);
  for (const g of info.dg) console.log(`  grid ${g.rarity}: rim ${g.rim} · ${g.bezelAnim} / ${g.afterAnim}`);
  shots.push('shots/tier-dex-mobile.png');
});

/* 2. reveal card, one per tier */
for (const tier of TIERS) {
  await shot(`tier-reveal-${tier.rarity}`, async (page) => {
    await page.evaluate((id) => window.__eggGacha.openRevealById(id), `t-${tier.rarity}`);
    await page.waitForSelector('#revealCard .dc');
    await page
      .waitForFunction(() => !!document.querySelector('#revealCard img.dc-canvas.ready'), null, { timeout: 20000 })
      .catch(() => console.log('  (reveal art not ready)'));
    await page.waitForTimeout(800);
    // element first (cheaper raster), then the full screen
    await page.locator('#revealCard .dc').screenshot({ path: `shots/tier-card-${tier.rarity}.png` });
    await page.evaluate(() => document.body.style.setProperty('--repaint', String(Math.random())));
    await page.waitForTimeout(350);
    await page.screenshot({ path: `shots/tier-reveal-${tier.rarity}.png` });
    const info = await frameInfo(page);
    const d = info.dc[0] || {};
    console.log(`  reveal ${tier.rarity}: rim ${d.rim} (border ${d.bw}) · ${d.bezelAnim} / ${d.afterAnim}`);
    shots.push(`shots/tier-reveal-${tier.rarity}.png`, `shots/tier-card-${tier.rarity}.png`);
  });
}

/* 3. detail card, one per tier — opened the way a player does, from the grid.
   Captured at 1x: the detail overlay (sheet + composed card + aura + the
   masked frames) crashes this sandbox's software rasteriser at 2x, and the
   project's existing detail shot uses 1x for the same reason. */
for (const tier of TIERS) {
  const shoot = async (page) => {
    await page.click('#dexBtn');
    await page.waitForTimeout(250);
    await page.click('#tabDragons');
    await page
      .waitForFunction(() => [...document.querySelectorAll('.dg-art img')].every((i) => i.dataset.ready === '1'), null, {
        timeout: 30000,
      })
      .catch(() => {});
    await page.click(`.dg[data-id="t-${tier.rarity}"]`);
    await page.waitForSelector('.detail.open .dc');
    await page
      .waitForFunction(() => !!document.querySelector('.detail .dc-canvas.ready'), null, { timeout: 20000 })
      .catch(() => console.log('  (detail art not ready)'));
    await page.waitForTimeout(1100);
    await page.evaluate(() => document.body.style.setProperty('--repaint', String(Math.random())));
    await page.waitForTimeout(350);
    const clip = await page.evaluate(() => {
      const r = document.querySelector('.detail .dc').getBoundingClientRect();
      return { x: Math.max(0, r.x - 14), y: Math.max(0, r.y - 14), width: r.width + 28, height: r.height + 28 };
    });
    await page.screenshot({ path: `shots/tier-detail-${tier.rarity}.png` });
    await page.screenshot({ path: `shots/tier-detail-card-${tier.rarity}.png`, clip });
    shots.push(`shots/tier-detail-${tier.rarity}.png`, `shots/tier-detail-card-${tier.rarity}.png`);
  };
  await shot(`tier-detail-${tier.rarity}`, shoot, { dsf: 1 });
  await new Promise((r) => setTimeout(r, 350));
}

server.close();
console.log('\nwrote:\n  ' + [...new Set(shots)].join('\n  '));

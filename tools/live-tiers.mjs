/**
 * Live tier frames — seed one dragon per rarity on the deployed site and
 * confirm every frame is painted there (not just in the local build).
 *
 *   node tools/live-tiers.mjs [url]
 *
 * The sandbox's software rasteriser is memory-fragile on this screen, so the
 * whole check is retried, and the screenshot falls back to 1x if 2x crashes.
 */
import { chromium } from 'playwright';
import fs from 'node:fs';

const SITE = process.argv[2] || 'https://netgamer.github.io/egg-gacha/';
fs.mkdirSync('shots', { recursive: true });

const payload = {
  v: 1,
  nextSerial: 5,
  list: [
    ['common', 'white', 'ivory'],
    ['rare', 'ice', 'frost'],
    ['epic', 'thunder', 'storm'],
    ['legendary', 'diamond', 'prism'],
  ].map(([r, e, p], i) => ({
    id: `t-${r}`,
    serial: i + 1,
    egg: e,
    parts: { bg: p, wings: p, body: p, eyes: p, horns: p, acc: p },
    rarity: r,
    affinity: 1,
    ts: Date.now() - i * 1000,
  })),
};

async function run(dsf, shoot) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    deviceScaleFactor: dsf,
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  const page = await ctx.newPage();
  const errors = [];
  let crashed = false;
  page.on('crash', () => (crashed = true));
  page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
  page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));
  try {
    await page.addInitScript((p) => localStorage.setItem('egg-gacha.dragons.v1', JSON.stringify(p)), payload);
    await page.goto(SITE, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 30000 });
    await page.click('#dexBtn');
    await page.waitForTimeout(300);
    await page.click('#tabDragons');
    await page
      .waitForFunction(() => [...document.querySelectorAll('.dg-art img')].every((i) => i.dataset.ready === '1'), null, {
        timeout: 30000,
      })
      .catch(() => console.log('  (thumbs still baking)'));
    await page.waitForTimeout(900);

    const frames = await page.evaluate(() =>
      [...document.querySelectorAll('#dragonGrid .dg')].map((el) => {
        const cs = getComputedStyle(el);
        return {
          rarity: el.dataset.rarity,
          rim: cs.borderTopWidth,
          ring: cs.backgroundImage.slice(0, 26),
          clip: cs.backgroundClip,
          anim: cs.animationName,
        };
      })
    );

    if (shoot) await page.screenshot({ path: 'shots/live-tiers.png' });

    /* legendary reveal: the ring must be the conic one and still turning */
    await page.evaluate(() => window.__eggGacha.openRevealById('t-legendary'));
    await page.waitForTimeout(1100);
    const a1 = await page.evaluate(() => {
      const el = document.querySelector('#revealCard .dc');
      const cs = getComputedStyle(el);
      return {
        rarity: el.dataset.rarity,
        conic: /conic-gradient/.test(cs.backgroundImage),
        anim: cs.animationName,
        angle: cs.getPropertyValue('--tier-angle').trim(),
      };
    });
    await page.waitForTimeout(900);
    const angle2 = await page.evaluate(() =>
      getComputedStyle(document.querySelector('#revealCard .dc')).getPropertyValue('--tier-angle').trim()
    );

    console.log(JSON.stringify({ url: page.url(), frames, reveal: { ...a1, angle2, turning: a1.angle !== angle2 }, errors }, null, 1));
    return true;
  } catch (e) {
    console.log(`  ${dsf}x ${shoot ? 'with' : 'without'} shot failed${crashed ? ' (renderer crash)' : ''}: ${e.message.split('\n')[0]}`);
    return false;
  } finally {
    await ctx.close().catch(() => {});
    await browser.close().catch(() => {});
  }
}

if (!(await run(2, true)) && !(await run(1, true))) await run(1, false);

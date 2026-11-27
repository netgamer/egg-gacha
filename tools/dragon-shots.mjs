/**
 * Deliverable screenshots for the dragon update.
 * Fresh browser per shot (the sandbox renderer dislikes long sessions).
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { startServer } from './server.mjs';

fs.mkdirSync('shots', { recursive: true });
const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };
const DESKTOP = { viewport: { width: 1280, height: 800 }, locale: 'ko-KR' };

async function withPage(opts, fn) {
  const ctx = await browser.newContext({ deviceScaleFactor: 2, ...opts });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('crash', () => console.log('!! crash'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  try {
    await fn(page);
  } finally {
    if (errors.length) console.log('errors:', errors.slice(0, 3));
    await ctx.close().catch(() => {});
    await new Promise((r) => setTimeout(r, 300));
  }
}

/** Hatch one egg and stop on the reveal card; returns the dragon info. */
async function hatchOne(page, egg) {
  await page.addInitScript(
    ([e]) => localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'shot', egg: e, ts: 1 }])),
    [egg]
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  await page.click('#hatchCue');
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'shots/dragon-hatch-egg.png' });
  await page.click('#hatchBtn', { noWaitAfter: true });
  await page.waitForFunction(() => !!document.querySelector('#revealCard .dc'), null, { timeout: 25000 });
  await page.waitForTimeout(1400);
  return page.evaluate(() => {
    const dc = document.querySelector('#revealCard .dc');
    const st = window.__eggGacha.state();
    return {
      rarity: dc.dataset.rarity,
      name: dc.querySelector('.dc-name').textContent,
      affinity: st.dragonList[0]?.affinity,
      body: st.dragonList[0]?.parts.body,
      traits: [...dc.querySelectorAll('.dc-trait')].map((t) => t.textContent.replace(/\s+/g, ' ').trim()),
    };
  });
}

/* 1. ice reveal + diamond reveal (retry until the body fits the egg element) */
const BODY_OK = {
  ice: ['frost', 'permafrost'],
  diamond: ['faceted-diamond', 'obsidian-neon', 'aurora-prism'],
};
for (const [egg, file] of [
  ['ice', 'shots/dragon-reveal-ice.png'],
  ['diamond', 'shots/dragon-reveal-diamond.png'],
]) {
  let done = false;
  for (let attempt = 0; attempt < 10 && !done; attempt++) {
    try {
      await withPage(MOBILE, async (page) => {
        const info = await hatchOne(page, egg);
        const good = BODY_OK[egg].includes(info.body) && info.affinity >= 0.66;
        if (!good && attempt < 9) {
          console.log(`  retry ${egg} (${info.body}, ${info.affinity})`);
          return;
        }
        await page.screenshot({ path: file });
        console.log(file, JSON.stringify(info));
        done = true;
      });
    } catch (e) {
      console.log('  attempt crashed:', e.message.split('\n')[0]);
    }
  }
}

/* 2. desktop reveal */
try {
  await withPage({ ...DESKTOP, deviceScaleFactor: 1 }, async (page) => {
    const info = await hatchOne(page, 'thunder');
    await page.screenshot({ path: 'shots/desktop-dragon-reveal.png' });
    console.log('desktop reveal', info.name, info.rarity);
  });
} catch (e) {
  console.log('desktop reveal failed:', e.message.split('\n')[0]);
}

/* 3. 4x3 collection grid (element shot + full screen) */
try {
await withPage({ ...DESKTOP, deviceScaleFactor: 1 }, async (page) => {
  await page.evaluate(() => window.__eggGacha.seedDragons(12));
  await page.waitForFunction(
    () => [...document.querySelectorAll('#dragonGrid .dg-art img')].every((i) => i.dataset.ready === '1'),
    null,
    { timeout: 20000 }
  );
  await page.click('#dexBtn');
  await page.waitForTimeout(300);
  await page.click('#tabDragons');
  await page.waitForTimeout(900);
  const box = await page.locator('#dragonGrid').boundingBox();
  await page.screenshot({ path: 'shots/dragon-gallery-desktop.png' });
  if (box) {
    await page.screenshot({
      path: 'shots/dragon-gallery-grid.png',
      clip: {
        x: Math.max(0, box.x),
        y: Math.max(0, box.y),
        width: Math.min(box.width, 1280 - box.x),
        height: Math.min(box.height, 800 - box.y),
      },
    });
  }
  console.log('grid 4x3 saved');
});
} catch (e) {
  console.log('grid failed:', e.message.split('\n')[0]);
}

/* 4. mobile collection */
try {
await withPage({ ...MOBILE, deviceScaleFactor: 1.5 }, async (page) => {
  await page.evaluate(() => window.__eggGacha.seedDragons(4));
  await page.waitForFunction(
    () => [...document.querySelectorAll('#dragonGrid .dg-art img')].every((i) => i.dataset.ready === '1'),
    null,
    { timeout: 20000 }
  );
  await page.click('#dexBtn');
  await page.waitForTimeout(300);
  await page.click('#tabDragons');
  await page.waitForTimeout(800);
  await page.screenshot({ path: 'shots/dragon-gallery-mobile.png' });
  await page.click('#dragonGrid .dg');
  await page.waitForTimeout(700);
  await page.screenshot({ path: 'shots/dragon-detail-mobile.png' });
  console.log('mobile gallery saved');
});
} catch (e) {
  console.log('mobile gallery failed:', e.message.split('\n')[0]);
}

/* 5. hatch cue on the main screen after a pull */
try {
await withPage(MOBILE, async (page) => {
  await page.evaluate(() => window.__eggGacha.queue(['fire']));
  await page.click('#pull1', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 30000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/mobile-hatch-cue.png' });
  console.log('hatch cue saved');
});
} catch (e) {
  console.log('cue failed:', e.message.split('\n')[0]);
}

await browser.close();
server.close();

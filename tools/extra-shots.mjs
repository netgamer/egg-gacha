/** Tall grid + hatch cue screenshots (kept separate so a crash cannot lose the other shots). */
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();

// 1) full 4x3 collection grid on a tall desktop viewport
{
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 1640 }, deviceScaleFactor: 1, locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('crash', () => console.log('crash (grid)'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
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
  if (box) {
    await page.screenshot({
      path: 'shots/dragon-gallery-grid.png',
      clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(box.width, 1280 - box.x), height: Math.min(box.height, 1640 - box.y) },
    });
    console.log('grid', Math.round(box.width), Math.round(box.height));
  }
  await page.screenshot({ path: 'shots/dragon-gallery-desktop.png' });
  await ctx.close();
}

// 2) hatch cue after a pull
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('crash', () => console.log('crash (cue)'));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  await page.evaluate(() =>
    localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'cue', egg: 'fire', ts: 1 }]))
  );
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  await page.waitForTimeout(600);
  await page.screenshot({ path: 'shots/mobile-hatch-cue.png' });
  console.log('cue saved');
  await ctx.close();
}

await browser.close();
server.close();

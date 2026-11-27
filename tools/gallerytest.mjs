import { chromium } from 'playwright';
import { startServer } from './server.mjs';
const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();
for (const [name, vp] of [['mobile', { width: 390, height: 844 }], ['desktop', { width: 1280, height: 800 }]]) {
  const ctx = await browser.newContext({ viewport: vp, isMobile: name === 'mobile', hasTouch: name === 'mobile', locale: 'ko-KR' });
  const page = await ctx.newPage();
  page.on('crash', () => console.log('CRASH', name));
  page.on('pageerror', (e) => console.log('ERR', e.message));
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
  await page.evaluate(() => window.__eggGacha.seedDragons(12));
  await page.click('#dexBtn');
  await page.waitForTimeout(300);
  await page.click('#tabDragons');
  await page.waitForTimeout(900);
  await page.screenshot({ path: `shots/dev/g-${name}.png` });
  console.log(name, await page.evaluate(() => document.querySelectorAll('#dragonGrid .dg').length));
  if (name === 'mobile') {
    await page.click('#dragonGrid .dg');
    await page.waitForTimeout(600);
    await page.screenshot({ path: 'shots/dev/g-detail.png' });
  }
  await ctx.close();
}
await browser.close(); server.close();

import { chromium } from 'playwright';
import { startServer } from './server.mjs';
const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
const page = await ctx.newPage();
page.on('crash', () => console.log('CRASH'));
const step = async (label, fn) => { const t = Date.now(); try { await fn(); console.log('ok', label, Date.now() - t, 'ms'); } catch (e) { console.log('FAIL', label, e.message.split('\n').slice(0, 6).join(' | ')); throw e; } };
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__eggGacha?.ready === true);
await page.evaluate(() => window.__eggGacha.queue(['fire', 'diamond', 'white', 'thunder', 'gold']));
await page.click('#pull5');
await page.waitForFunction(() => window.__eggGacha.state().pending.length === 5, null, { timeout: 45000 });
await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 45000 });
await page.waitForTimeout(300);
console.log('cue visible', await page.isVisible('#hatchCue'), await page.textContent('#hatchCue'));
await step('cue', () => page.click('#hatchCue', { noWaitAfter: true }));
await page.waitForTimeout(350);
for (let i = 0; i < 5; i++) {
  if (i > 0) {
    console.log('nextHatch visible', await page.isVisible('#nextHatch'));
    await step('nextHatch', () => page.click('#nextHatch', { noWaitAfter: true }));
    await page.waitForTimeout(260);
    console.log('hatchBtn visible', await page.isVisible('#hatchBtn'), 'stage hidden', await page.evaluate(() => document.getElementById('hatchStage').hidden));
  }
  await step('hatchBtn' + i, () => page.click('#hatchBtn', { noWaitAfter: true }));
  await page.waitForSelector('#revealCard .dc', { timeout: 25000 });
  await page.evaluate(() => window.__eggGacha.fx.clear());
  await page.waitForTimeout(250);
  console.log('--- dragon', i, await page.evaluate(() => window.__eggGacha.state().dragons));
}
await browser.close(); server.close();

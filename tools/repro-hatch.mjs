import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const { server, url } = await startServer('dist', 0);
const CSS = process.argv[2] || '';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
const page = await ctx.newPage();
page.on('crash', () => console.log('CRASH'));
page.on('pageerror', (e) => console.log('ERR', e.message));
await page.addInitScript(() => {
  localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'p1', egg: 'ice', ts: Date.now() }]));
});
await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
if (CSS) await page.addStyleTag({ content: CSS });
await page.waitForTimeout(300);
const cue = await page.evaluate(() => !document.getElementById('hatchCue').hidden);
console.log('cue visible', cue);
await page.click('#hatchCue');
await page.waitForTimeout(800);
const alive = await page.evaluate(() => ({ open: document.getElementById('hatch').className, title: document.getElementById('hatchTitle').textContent })).catch((e) => 'dead: ' + e.message);
console.log('after open', JSON.stringify(alive));
if (typeof alive === 'object') {
  await page.screenshot({ path: process.argv[3] || 'shots/dev/egg-test.png' });
  console.log('shot ok');
}
await browser.close();
server.close();

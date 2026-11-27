/** Quick visual check of the hatch flow (dev). */
import { chromium } from 'playwright';
import fs from 'node:fs';
import { startServer } from './server.mjs';

const { server, url } = await startServer('dist', 0);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, locale: 'ko-KR' });
const page = await ctx.newPage();
const errors = [];
page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
page.on('pageerror', (e) => errors.push(e.message));
page.on('crash', () => console.log('!! PAGE CRASH'));
page.on('response', (r) => r.status() >= 400 && errors.push(`http ${r.status()} ${r.url()}`));

await page.goto(url, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
fs.mkdirSync('shots/dev', { recursive: true });
await page.screenshot({ path: 'shots/dev/1-ready.png' });

await page.evaluate(() => window.__eggGacha.queue(['ice', 'fire', 'diamond', 'white', 'gold']));
await page.click('#pull5', { noWaitAfter: true });
await page.waitForFunction(() => window.__eggGacha.state().pending.length === 5, null, { timeout: 40000 });
await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 40000 });
await page.waitForTimeout(500);
await page.screenshot({ path: 'shots/dev/2-pulled.png' });

await page.click('#hatchCue', { noWaitAfter: true });
await page.waitForTimeout(450);
await page.screenshot({ path: 'shots/dev/3-egg.png' });

await page.click('#hatchBtn', { noWaitAfter: true });
await page.waitForTimeout(950);
await page.screenshot({ path: 'shots/dev/4-cracking.png' });
await page.waitForSelector('#revealCard .dc', { timeout: 20000 });
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/dev/5-reveal.png' });

await page.click('#revealClose', { noWaitAfter: true });
await page.click('#dexBtn', { noWaitAfter: true });
await page.waitForTimeout(500);
await page.click('#tabDragons', { noWaitAfter: true });
await page.waitForTimeout(600);
await page.screenshot({ path: 'shots/dev/6-gallery.png' });

const st = await page.evaluate(() => window.__eggGacha.state());
console.log('state', JSON.stringify({ pending: st.pending, dragons: st.dragons, d0: st.dragonList[0] }, null, 1));
console.log('errors', errors.slice(0, 8));
await page.setViewportSize({ width: 1280, height: 800 });
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/dev/7-desktop-gallery.png' });
await ctx.close();
await browser.close();
server.close();

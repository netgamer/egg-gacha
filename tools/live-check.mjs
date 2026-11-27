import { chromium } from 'playwright';

const SITE = process.argv[2] || 'https://netgamer.github.io/egg-gacha/';
const browser = await chromium.launch();
const ctx = await browser.newContext({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
  deviceScaleFactor: 2,
  locale: 'ko-KR',
});
const page = await ctx.newPage();
const errors = [];
page.on('pageerror', (e) => errors.push('pageerror ' + e.message));
page.on('console', (m) => m.type() === 'error' && errors.push('console ' + m.text()));
page.on('response', (r) => {
  if (r.status() >= 400) errors.push('http ' + r.status() + ' ' + r.url());
});
await page.addInitScript(() =>
  localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'live', egg: 'ice', ts: 1 }]))
);
await page.goto(SITE, { waitUntil: 'networkidle' });
await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 30000 });

const info = await page.evaluate(async () => {
  const G = window.__eggGacha;
  const body = G.parts.find((x) => x.layer === 'body');
  const r = await fetch(G.partBase + body.img);
  const buf = await r.arrayBuffer();
  const bmp = await createImageBitmap(new Blob([buf], { type: 'image/webp' }));
  return {
    url: location.href,
    partBase: G.partBase,
    count: G.parts.length,
    layers: G.layers,
    sample: body.id,
    status: r.status,
    type: r.headers.get('content-type'),
    dim: [bmp.width, bmp.height],
  };
});
console.log(JSON.stringify(info));

await page.click('#hatchCue');
await page.waitForTimeout(400);
await page.screenshot({ path: 'shots/live-hatch.png' });
await page.click('#hatchBtn', { noWaitAfter: true });
await page.waitForFunction(() => !!document.querySelector('#revealCard .dc'), null, { timeout: 30000 });
await page
  .waitForFunction(() => !!document.querySelector('#revealCard img.dc-canvas.ready'), null, { timeout: 20000 })
  .catch(() => console.log('(card image not ready)'));
await page.waitForTimeout(900);
await page.screenshot({ path: 'shots/live-reveal.png' });
console.log(
  'dragon',
  await page.evaluate(() => {
    const dc = document.querySelector('#revealCard .dc');
    const img = dc.querySelector('img.dc-canvas');
    return {
      name: dc.querySelector('.dc-name').textContent,
      rarity: dc.dataset.rarity,
      traits: dc.querySelectorAll('.dc-trait').length,
      art: img ? [img.naturalWidth, img.naturalHeight] : null,
    };
  })
);
console.log('errors', errors.slice(0, 5));
await browser.close();

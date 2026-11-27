/**
 * Dev preview: render chosen parts at 2x into build/preview/ (no public/ writes).
 *
 *   node tools/dev-preview.mjs --layer body --ids magma,mossy,ivory
 *   node tools/dev-preview.mjs --layer body --ids magma --combo bg:magma,wings:solar,eyes:ember-glow,head:angel-halo,acc:moon-pendant
 */
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { ALL_PARTS, renderSvg } from './art/index.mjs';

const arg = (k, d = null) => (process.argv.includes('--' + k) ? process.argv[process.argv.indexOf('--' + k) + 1] : d);
const layer = arg('layer', 'body');
const ids = arg('ids', '').split(',').filter(Boolean);
const combo = arg('combo', '')
  .split(',')
  .filter(Boolean)
  .map((s) => s.split(':'));
const out = arg('out', 'build/preview');
const scale = Number(arg('scale', '2'));

const parts = ALL_PARTS.filter((p) => p.layer === layer && (!ids.length || ids.includes(p.id)));
fs.mkdirSync(out, { recursive: true });

const svgEl = (svg) =>
  svg.replace(
    '<svg xmlns="http://www.w3.org/2000/svg"',
    '<svg style="position:absolute;inset:0" xmlns="http://www.w3.org/2000/svg"'
  );

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 512, height: 512 }, deviceScaleFactor: scale });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));

for (const part of parts) {
  const under = combo
    .map(([l, id]) => ALL_PARTS.find((p) => p.layer === l && p.id === id))
    .filter(Boolean)
    .map((p) => svgEl(renderSvg(p)))
    .join('');
  await page.setContent(
    `<!doctype html><html><body style="margin:0;background:#0a0616;overflow:hidden">` +
      `<div style="width:512px;height:512px;position:relative;background:#0a0616">${under}${svgEl(renderSvg(part))}</div>` +
      `</body></html>`,
    { waitUntil: 'load' }
  );
  await page.screenshot({ path: path.join(out, `${layer}__${part.id}.png`), clip: { x: 0, y: 0, width: 512, height: 512 } });
}
await browser.close();
if (errors.length) console.log('page errors:', errors);
console.log(`rendered ${parts.length} → ${out} @${scale}x`);

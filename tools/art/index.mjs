/**
 * Part catalog for the dragon compositor.
 *
 * Layer order, back to front: bg → wings → body → eyes → head → acc.
 * Each part draws into the shared 512x512 canonical template so any random
 * combination aligns exactly.
 */
import { PAL } from './base.mjs';
import { bgParts } from './layers/bg.mjs';
import { wingParts } from './layers/wings.mjs';
import { bodyParts } from './layers/body.mjs';
import { eyeParts } from './layers/eyes.mjs';
import { headParts } from './layers/head.mjs';
import { accParts } from './layers/acc.mjs';

export const LAYER_ORDER = ['bg', 'wings', 'body', 'eyes', 'head', 'acc'];

export const LAYER_META = {
  bg: { ko: '배경' },
  wings: { ko: '날개' },
  body: { ko: '몸' },
  eyes: { ko: '눈' },
  head: { ko: '머리' },
  acc: { ko: '장식' },
};

const RAW = { bg: bgParts, wings: wingParts, body: bodyParts, eyes: eyeParts, head: headParts, acc: accParts };

export const LAYERS = LAYER_ORDER.map((layer) => ({
  id: layer,
  ko: LAYER_META[layer].ko,
  parts: RAW[layer].map((p) => ({ layer, ...p })),
}));

export const ALL_PARTS = LAYERS.flatMap((l) => l.parts);

export function renderSvg(part) {
  const uid = `${part.layer}-${part.id}`;
  const pal = PAL[part.element];
  const ctx = { uid, pal, id: part.id, layer: part.layer };
  const out = part.draw(ctx) || {};
  const defs = [out.defs || ''];
  if (part.defs) defs.push(part.defs(uid));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512" shape-rendering="geometricPrecision">
<defs>${defs.join('')}</defs>
${out.body || ''}
</svg>`;
}

export const COUNTS = Object.fromEntries(LAYERS.map((l) => [l.id, l.parts.length]));

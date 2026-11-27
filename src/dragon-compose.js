/**
 * Runtime dragon compositor.
 *
 * The parts are matted paintings that each carry their own contact shadow, but a
 * random cross-theme hatch only reads as one painting when every layer is lit by
 * the same environment.  This module ports the prototype's finishing passes
 * (tools/proto-art/pipeline.py `compose()`) to Canvas 2D:
 *
 *   1. environment rim light + light wrap taken from the background plate
 *   2. one environment tone pass over the whole bust
 *   3. bloom, bust contact shadow, canvas grain, vignette, final grade
 *
 * Everything is drawn at the canvas' own size, so the same code serves the
 * reveal card (640x800), the detail modal and the 192x240 gallery bake.
 */
import { dragonLayers } from './dragon.js';

// Six 768x960 layers per dragon is ~17MB decoded, and a 5-hatch run reveals one
// dragon after another: keep a small LRU so a phone never holds every bitmap.
const CACHE_MAX = 18;
const imgCache = new Map();
const FILTER_OK = (() => {
  try {
    const c = document.createElement('canvas').getContext('2d');
    c.filter = 'blur(1px)';
    return String(c.filter).indexOf('blur') === 0;
  } catch (_) {
    return false;
  }
})();

export { FILTER_OK };

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

// A card needs eight intermediate canvases. Allocating them per hatch churns
// tens of MB on a phone, so they are pooled by size and role and only cleared.
const scratch = new Map();
function scratchCanvas(role, w, h) {
  const key = `${role}@${Math.round(w)}x${Math.round(h)}`;
  let c = scratch.get(key);
  if (!c || c.width !== Math.round(w) || c.height !== Math.round(h)) {
    c = cv(w, h);
    scratch.set(key, c);
    while (scratch.size > 16) scratch.delete(scratch.keys().next().value);
  } else {
    c.getContext('2d').clearRect(0, 0, c.width, c.height);
  }
  return c;
}

function loadImage(url) {
  if (imgCache.has(url)) {
    const hit = imgCache.get(url);
    imgCache.delete(url);
    imgCache.set(url, hit);
    return hit;
  }
  const p = new Promise((resolve) => {
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = url;
  });
  imgCache.set(url, p);
  while (imgCache.size > CACHE_MAX) {
    const oldest = imgCache.keys().next().value;
    imgCache.delete(oldest);
  }
  return p;
}

/** Load the six layer bitmaps for a dragon (thumb URLs when `small`). */
export async function loadDragonArt(dragon, base, { small = false } = {}) {
  const layers = dragonLayers(dragon, base);
  const out = [];
  for (const l of layers) {
    const url = small && l.part.thumb ? l.part.thumb : l.part.img;
    const img = await loadImage(base + url);
    if (!img) return null;
    out.push({ slot: l.layer, img });
  }
  return out;
}

export function preloadDragonArt(dragon, base) {
  return loadDragonArt(dragon, base).then(() => true);
}

/* ------------------------------------------------------------------ passes */

function blurred(src, w, h, px, role = 'blur') {
  const c = scratchCanvas(role, w, h);
  const x = c.getContext('2d');
  if (FILTER_OK) x.filter = `blur(${px}px)`;
  x.imageSmoothingQuality = 'high';
  x.drawImage(src, 0, 0, w, h);
  return c;
}

/** The layer's own alpha as a white mask (optionally blurred). */
function alphaMask(img, w, h, blurPx = 0, role = 'alpha') {
  const c = scratchCanvas(role, w, h);
  const x = c.getContext('2d');
  if (blurPx && FILTER_OK) x.filter = `blur(${blurPx}px)`;
  x.drawImage(img, 0, 0, w, h);
  x.filter = 'none';
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = '#fff';
  x.fillRect(0, 0, w, h);
  x.globalCompositeOperation = 'source-over';
  return c;
}

function masked(src, mask, role = 'masked') {
  const c = scratchCanvas(role, src.width, src.height);
  const x = c.getContext('2d');
  x.drawImage(src, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(mask, 0, 0);
  return c;
}

function subtract(a, b, role = 'sub') {
  const c = scratchCanvas(role, a.width, a.height);
  const x = c.getContext('2d');
  x.drawImage(a, 0, 0);
  x.globalCompositeOperation = 'destination-out';
  x.drawImage(b, 0, 0);
  return c;
}

function intersect(a, b) {
  const c = cv(a.width, a.height);
  const x = c.getContext('2d');
  x.drawImage(a, 0, 0);
  x.globalCompositeOperation = 'destination-in';
  x.drawImage(b, 0, 0);
  return c;
}

function averageLum(canvas) {
  const s = cv(12, 15);
  const x = s.getContext('2d', { willReadFrequently: true });
  x.drawImage(canvas, 0, 0, 12, 15);
  const d = x.getImageData(0, 0, 12, 15).data;
  let sum = 0;
  for (let i = 0; i < d.length; i += 4) sum += (d[i] * 0.3 + d[i + 1] * 0.59 + d[i + 2] * 0.11) / 255;
  return sum / (d.length / 4);
}

let grainTile = null;
function grain(w, h) {
  if (!grainTile) {
    const t = cv(128, 128);
    const x = t.getContext('2d');
    const img = x.createImageData(128, 128);
    for (let i = 0; i < img.data.length; i += 4) {
      const v = 118 + Math.random() * 20;
      img.data[i] = img.data[i + 1] = img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    grainTile = t;
  }
  const c = scratchCanvas('grain', w, h);
  const x = c.getContext('2d');
  const pat = x.createPattern(grainTile, 'repeat');
  x.fillStyle = pat;
  x.fillRect(0, 0, w, h);
  return c;
}

function drawPass(ctx, canvas, op, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = op;
  ctx.globalAlpha = alpha;
  ctx.drawImage(canvas, 0, 0);
  ctx.restore();
}

/**
 * Compose one dragon into a target canvas.
 * layers: [{slot, img}] from loadDragonArt().
 */
export function composeInto(target, layers, { finish = true, grain: useGrain = true } = {}) {
  const w = target.width;
  const h = target.height;
  const ctx = target.getContext('2d');
  const bySlot = {};
  for (const l of layers) bySlot[l.slot] = l.img;

  ctx.clearRect(0, 0, w, h);
  ctx.imageSmoothingQuality = 'high';
  if (!bySlot.bg) return false;
  ctx.drawImage(bySlot.bg, 0, 0, w, h);
  for (const slot of ['wings', 'body', 'eyes', 'horns', 'acc']) {
    const img = bySlot[slot];
    if (img) ctx.drawImage(img, 0, 0, w, h);
  }
  if (!finish || !FILTER_OK || !bySlot.body) return true;

  // ---- environment light taken from the plate ------------------------------
  const env = blurred(bySlot.bg, w, h, Math.max(2, w * 0.03), 'env');
  const bodyCrisp = alphaMask(bySlot.body, w, h, 0, 'bodyCrisp');
  const bodySoft = alphaMask(bySlot.body, w, h, Math.max(1.5, w * 0.006), 'bodySoft');

  const band = subtract(bodySoft, bodyCrisp, 'band');    // halo outside the body
  const rim = masked(env, band, 'rim');
  drawPass(ctx, rim, 'screen', 0.42);

  const wrapMask = (() => {
    const c = scratchCanvas('wrapMask', w, h);
    const x = c.getContext('2d');
    x.fillStyle = '#fff';
    x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out';
    x.drawImage(blurred(alphaMask(bySlot.body, w, h, 0, 'bodyCrisp2'), w, h, Math.max(2, w * 0.012), 'bodyBlur'), 0, 0);
    x.globalCompositeOperation = 'destination-in';
    x.drawImage(bodyCrisp, 0, 0);
    return c;
  })();
  drawPass(ctx, masked(env, wrapMask, 'wrap'), 'lighter', 0.34);

  // ---- one colour of light over the whole bust -----------------------------
  const mean = averageLum(env);
  const tone = scratchCanvas('tone', w, h);
  const tc = tone.getContext('2d');
  tc.filter = `brightness(${Math.min(2.4, 1 / Math.max(0.2, mean))})`;
  tc.drawImage(env, 0, 0);
  drawPass(ctx, tone, 'multiply', 0.30);

  // ---- bloom ---------------------------------------------------------------
  const bloom = scratchCanvas('bloom', w, h);
  const bc = bloom.getContext('2d');
  bc.filter = `brightness(1.55) contrast(1.85) blur(${Math.max(2, w * 0.018)}px)`;
  bc.drawImage(target, 0, 0);
  drawPass(ctx, bloom, 'screen', 0.28);

  // ---- bust contact shadow -------------------------------------------------
  const grad = ctx.createLinearGradient(0, h * 0.80, 0, h);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(1, 'rgba(96,96,104,1)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = grad;
  ctx.fillRect(0, h * 0.80, w, h * 0.20);
  ctx.restore();

  // ---- grain + vignette + grade -------------------------------------------
  if (useGrain) drawPass(ctx, grain(w, h), 'overlay', 0.055);

  const vig = ctx.createRadialGradient(w * 0.5, h * 0.44, Math.min(w, h) * 0.18, w * 0.5, h * 0.44, Math.max(w, h) * 0.78);
  vig.addColorStop(0, 'rgba(255,255,255,1)');
  vig.addColorStop(0.55, 'rgba(238,238,238,1)');
  vig.addColorStop(1, 'rgba(150,150,154,1)');
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();

  return true;
}

/** Compose to an offscreen canvas at w×h and hand back a data URL. */
export function composeUrl(layers, w, h, opts = {}) {
  // grade pass: compose into a working canvas, then draw once with the final
  // contrast/saturation so the filter hits every layer equally
  const work = scratchCanvas('work', w, h);
  const ok = composeInto(work, layers, opts);
  if (!ok) return '';
  const out = scratchCanvas('out', w, h);
  const x = out.getContext('2d');
  if (FILTER_OK) x.filter = 'contrast(1.03) saturate(1.04)';
  x.drawImage(work, 0, 0);
  try {
    const url = out.toDataURL('image/webp', 0.9);
    return url && url.length > 64 ? url : out.toDataURL('image/png');
  } catch (_) {
    return '';
  }
}

/** Test hook: compose an explicit slot->part map and return a PNG data URL. */
export async function debugCompose(slots, base, w, h, opts = {}) {
  const layers = [];
  for (const slot of ['bg', 'wings', 'body', 'eyes', 'horns', 'acc']) {
    const img = await loadImage(base + `parts/${slot}/${slots[slot]}.webp`);
    if (!img) return '';
    layers.push({ slot, img });
  }
  const c = cv(w, h);
  composeInto(c, layers, opts);
  return c.toDataURL('image/png');
}

const cardCache = new Map();

/**
 * Compose a dragon card and hand it back as an image URL.
 *
 * The reveal shows the result through an <img> rather than a live <canvas>: a
 * canvas whose texture is never re-uploaded (nothing else on screen animating)
 * can stay blank on some compositors, while an image always paints.
 */
export async function composeCardUrl(dragon, base, width = 480) {
  const key = `${dragon.id}@${width}`;
  if (cardCache.has(key)) return cardCache.get(key);
  const layers = await loadDragonArt(dragon, base);
  if (!layers) return '';
  const w = Math.round(Math.min(640, Math.max(320, width)));
  const url = composeUrl(layers, w, Math.round((w * 5) / 4), { grain: true });
  // the six source bitmaps are pure input: once the card exists, drop all but
  // the dragon just drawn so a 5-hatch run never holds five dragons' layers
  pruneArtCache(6);
  if (url) {
    cardCache.set(key, url);
    while (cardCache.size > 6) cardCache.delete(cardCache.keys().next().value);
  }
  return url;
}

export function clearCardCache() {
  cardCache.clear();
}

export function clearArtCache() {
  imgCache.clear();
}

/** Drop all but the newest `keep` layer bitmaps (called when a hatch closes). */
export function pruneArtCache(keep = 6) {
  while (imgCache.size > keep) {
    imgCache.delete(imgCache.keys().next().value);
  }
}

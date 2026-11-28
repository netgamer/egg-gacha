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
import { dragonLayers, dragonElement } from './dragon.js';
import { PART_BY_ID } from './dragon-parts.js';
import { AURA_META, auraSeed, auraSprite, silhouetteProfile, alphaCentroid } from './dragon-aura.js';

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
    while (scratch.size > 24) scratch.delete(scratch.keys().next().value);
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

function colorize(mask, rgb, role) {
  const c = scratchCanvas(role, mask.width, mask.height);
  const x = c.getContext('2d');
  x.drawImage(mask, 0, 0);
  x.globalCompositeOperation = 'source-in';
  x.fillStyle = `rgb(${rgb})`;
  x.fillRect(0, 0, c.width, c.height);
  x.globalCompositeOperation = 'source-over';
  return c;
}

function rng(seed) {
  let a = seed >>> 0 || 1;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* ------------------------------------------------------------ baked aura -- */

/**
 * The painted half of the elemental aura.
 *
 * It is baked into the card so the dex grid (240px thumbs, dozens of cards at
 * once) carries the element without a single animation frame: a light band that
 * hugs the dragon's own silhouette, plus a handful of element marks.  The live
 * layer on the reveal/detail card (dragon-aura.js) is what moves.
 */
function bakedAura(ctx, w, h, imgs, element, seed, canBlur) {
  const M = AURA_META[element] || AURA_META.white;
  const rand = rng(seed);
  const unit = Math.min(w, h) / 100;

  // 1. silhouette-hugging band ---------------------------------------------
  const mask = alphaMask(imgs.body, w, h, 0, 'auraMask');
  let band = null;
  if (canBlur) {
    const soft = blurred(mask, w, h, Math.max(2, w * 0.022), 'auraSoft');
    band = subtract(soft, mask, 'auraBand');
    drawPass(ctx, colorize(band, M.rgb, 'auraTint'), 'screen', element === 'fire' ? 0.5 : 0.36);
  }

  // 2. the dragon's outline, for marks that follow the crest/back -----------
  const prof = (() => {
    const c = scratchCanvas('auraProf', 80, 100);
    const x = c.getContext('2d', { willReadFrequently: true });
    x.clearRect(0, 0, 80, 100);
    for (const slot of ['body', 'horns', 'acc']) if (imgs[slot]) x.drawImage(imgs[slot], 0, 0, 80, 100);
    return silhouetteProfile(c);
  })();

  // 3. where the face is — the eye layer's centroid is the reliable answer, so
  //    the gentle elements can keep their light and big snow off it ---------
  const face = (() => {
    if (imgs.eyes) {
      const c = scratchCanvas('auraFace', 80, 100);
      const x = c.getContext('2d', { willReadFrequently: true });
      x.clearRect(0, 0, 80, 100);
      x.drawImage(imgs.eyes, 0, 0, 80, 100);
      const cen = alphaCentroid(c);
      if (cen) return { x: cen.x, y: cen.y, rx: 0.3, ry: 0.24 };
    }
    if (prof && prof.head) return { x: prof.head.x + 0.03, y: Math.min(0.92, prof.head.y + 0.14), rx: 0.3, ry: 0.24 };
    return null;
  })();
  const faceFade = (x, y, strength) => {
    if (!face) return 1;
    const nx = (x - face.x * w) / (face.rx * w);
    const ny = (y - face.y * h) / (face.ry * h);
    const d = Math.min(1, Math.sqrt(nx * nx + ny * ny));
    return 1 - strength * 0.5 * (1 + Math.cos(Math.PI * d));
  };

  ctx.save();
  ctx.globalCompositeOperation = 'lighter';

  if (element === 'fire') {
    const glow = auraSprite('glow', M.rgb);
    const hot = auraSprite('glow', M.hot);
    if (prof) {
      const step = Math.max(1, Math.floor(prof.crest.length / 14));
      for (let i = 0; i < prof.crest.length; i += step) {
        const p = prof.crest[i];
        if (p.y > 0.86) continue;
        const bw = 13 * unit * (0.7 + rand() * 0.7);
        const bh = 30 * unit * (0.7 + rand() * 0.8);
        ctx.globalAlpha = 0.34 + rand() * 0.16;
        ctx.drawImage(glow, p.x * w - bw / 2, p.y * h - bh * 0.72, bw, bh);
      }
      // a few solid tongues so it reads as fire even at 240px
      for (let i = 0; i < 9; i++) {
        const p = prof.crest[Math.floor(rand() * prof.crest.length)];
        if (!p || p.y > 0.88) continue;
        const bx = p.x * w;
        const by = p.y * h + 2 * unit;
        const fw = (2.5 + rand() * 4) * unit;
        const fh = (6 + rand() * 10) * unit;
        const sway = (rand() - 0.5) * fw * 0.8;
        ctx.globalAlpha = 0.4 + rand() * 0.25;
        ctx.fillStyle = `rgba(255,124,34,1)`;
        ctx.beginPath();
        ctx.moveTo(bx - fw * 0.5, by);
        ctx.bezierCurveTo(bx - fw * 0.42, by - fh * 0.45, bx - fw * 0.1 + sway, by - fh * 0.8, bx + sway, by - fh);
        ctx.bezierCurveTo(bx + fw * 0.2 + sway, by - fh * 0.66, bx + fw * 0.44, by - fh * 0.3, bx + fw * 0.5, by);
        ctx.closePath();
        ctx.fill();
        ctx.globalAlpha = 0.5 + rand() * 0.3;
        ctx.drawImage(hot, bx - fw * 0.22, by - fh * 0.62, fw * 0.44, fh * 0.58);
      }
    }
    // warm light spilling onto the crest
    const wash = ctx.createLinearGradient(0, 0, w * 0.75, h * 0.7);
    wash.addColorStop(0, 'rgba(255,150,60,0.16)');
    wash.addColorStop(0.55, 'rgba(255,110,40,0.05)');
    wash.addColorStop(1, 'rgba(255,90,30,0)');
    ctx.globalAlpha = 1;
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, w, h);
  } else if (element === 'ice') {
    // a real blizzard, painted: soft snow in three sizes and freezing haze —
    // never a straight streak (those read as rain, not snow)
    const dot = auraSprite('dot', M.rgb);
    const snow = auraSprite('snow', M.rgb);
    const mist = auraSprite('mist', M.rgb);
    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 5; i++) {
      const rw = (60 + rand() * 80) * unit;
      const rh = rw * (0.2 + rand() * 0.16);
      ctx.globalAlpha = 0.05 + rand() * 0.05;
      ctx.drawImage(mist, rand() * w - rw * 0.5, h * (0.45 + rand() * 0.6) - rh * 0.5, rw, rh);
    }
    for (let i = 0; i < 90; i++) {
      const t = rand();
      const puff = t > 0.93;
      const flake = t > 0.55 && !puff;
      const r = puff ? (6 + rand() * 8) * unit : flake ? (2.2 + rand() * 2.4) * unit : (1 + rand() * 1.6) * unit;
      const x = rand() * w;
      const y = rand() * h;
      let a = puff ? 0.07 + rand() * 0.06 : flake ? 0.34 + rand() * 0.34 : 0.26 + rand() * 0.3;
      if (puff || flake) a *= faceFade(x, y, puff ? 0.72 : 0.4);
      ctx.globalAlpha = a;
      const rr = r * (puff ? 2.6 : 3.1);
      ctx.drawImage(snow, x - rr * 0.5, y - rr * 0.5, rr, rr);
    }
    // a little icy sparkle where the flakes catch the light
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < 16; i++) {
      const r = (1.4 + rand() * 2) * unit;
      const x = rand() * w;
      const y = rand() * h;
      ctx.globalAlpha = (0.2 + rand() * 0.25) * faceFade(x, y, 0.5);
      ctx.drawImage(dot, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    }
  } else if (element === 'forest') {
    // soft afternoon light from the top-back corner: radial falloff only, and
    // feathered away from the face so the eyes stay readable
    const dot = auraSprite('dot', M.rgb);
    const mist = auraSprite('mist', '255,236,182');
    const light = scratchCanvas('auraLight', w, h);
    const lc = light.getContext('2d');
    lc.clearRect(0, 0, w, h);
    const sunX = w * 0.93;
    const sunY = -h * 0.06;
    const R = Math.max(w, h) * 0.95;
    const g1 = lc.createRadialGradient(sunX, sunY, 0, sunX, sunY, R);
    g1.addColorStop(0, 'rgba(255,242,196,0.34)');
    g1.addColorStop(0.28, 'rgba(255,234,172,0.16)');
    g1.addColorStop(0.6, 'rgba(255,226,150,0.055)');
    g1.addColorStop(1, 'rgba(255,216,132,0)');
    lc.fillStyle = g1;
    lc.fillRect(0, 0, w, h);
    const g2 = lc.createRadialGradient(w * 0.74, h * 0.05, 0, w * 0.74, h * 0.05, R * 0.55);
    g2.addColorStop(0, 'rgba(255,238,178,0.1)');
    g2.addColorStop(0.55, 'rgba(255,228,150,0.04)');
    g2.addColorStop(1, 'rgba(255,220,140,0)');
    lc.fillStyle = g2;
    lc.fillRect(0, 0, w, h);
    if (face) {
      lc.save();
      lc.globalCompositeOperation = 'destination-out';
      lc.translate(face.x * w, face.y * h);
      lc.scale(face.rx * w * 1.1, face.ry * h * 1.15);
      const m = lc.createRadialGradient(0, 0, 0, 0, 0, 1);
      m.addColorStop(0, 'rgba(0,0,0,0.82)');
      m.addColorStop(0.55, 'rgba(0,0,0,0.5)');
      m.addColorStop(1, 'rgba(0,0,0,0)');
      lc.fillStyle = m;
      lc.fillRect(-1, -1, 2, 2);
      lc.restore();
    }
    ctx.globalAlpha = 1;
    ctx.drawImage(light, 0, 0);
    for (let i = 0; i < 26; i++) {
      const r = (1.2 + rand() * 2.2) * unit;
      const x = rand() * w;
      const y = rand() * h;
      ctx.globalAlpha = (0.18 + rand() * 0.3) * faceFade(x, y, 0.6);
      ctx.drawImage(dot, x - r * 1.6, y - r * 1.6, r * 3.2, r * 3.2);
    }
    for (let i = 0; i < 3; i++) {
      const rw = (26 + rand() * 34) * unit;
      const rh = rw * (0.5 + rand() * 0.3);
      ctx.globalAlpha = 0.045 + rand() * 0.035;
      ctx.drawImage(mist, rand() * w - rw * 0.5, h * (0.3 + rand() * 0.55) - rh * 0.5, rw, rh);
    }
  } else if (element === 'thunder') {
    // Baked sparks and an ionised rim: the live layer supplies the actual
    // bolts, so the still card never shows a frozen “cable” of lightning.
    const hot = auraSprite('glow', M.hot);
    const halo = auraSprite('glow', M.rgb);
    if (prof) {
      const step = Math.max(1, Math.floor(prof.crest.length / 10));
      for (let i = 0; i < prof.crest.length; i += step) {
        const p = prof.crest[i];
        const r = (16 + rand() * 12) * unit;
        ctx.globalAlpha = 0.16 + rand() * 0.12;
        ctx.drawImage(halo, p.x * w - r, p.y * h - r, r * 2, r * 2);
      }
    }
    for (let i = 0; i < 14; i++) {
      const r = (1.4 + rand() * 2.6) * unit;
      ctx.globalAlpha = 0.4 + rand() * 0.5;
      ctx.drawImage(hot, rand() * w - r, rand() * h - r, r * 2, r * 2);
    }
  } else if (element === 'gold') {
    const glow = auraSprite('glow', M.rgb);
    const star = auraSprite('star', '255,216,120');
    const c = prof ? prof.head : { x: 0.35, y: 0.22 };
    const r = 96 * unit;
    ctx.globalAlpha = 0.22;
    ctx.drawImage(glow, c.x * w - r, c.y * h - r, r * 2, r * 2);
    for (let i = 0; i < 7; i++) {
      const s = (2.5 + rand() * 6) * unit;
      const x = rand() * w;
      const y = rand() * h * 0.9;
      ctx.globalAlpha = 0.45 + rand() * 0.45;
      ctx.drawImage(star, x - s, y - s, s * 2, s * 2);
    }
    const dot = auraSprite('dot', M.rgb);
    for (let i = 0; i < 20; i++) {
      const rr = (1.6 + rand() * 3.6) * unit;
      ctx.globalAlpha = 0.35 + rand() * 0.45;
      ctx.drawImage(dot, rand() * w - rr, rand() * h - rr, rr * 2, rr * 2);
    }
  } else if (element === 'diamond') {
    const star = auraSprite('star', '210,245,255');
    const dot = auraSprite('dot', M.rgb);
    for (let i = 0; i < 6; i++) {
      const s = (1.1 + rand() * 2) * unit;
      ctx.globalAlpha = 0.3 + rand() * 0.2;
      ctx.drawImage(star, rand() * w - s, rand() * h * 0.9 - s, s * 2, s * 2);
    }
    for (let i = 0; i < 10; i++) {
      const rr = (1.2 + rand() * 2.6) * unit;
      ctx.globalAlpha = 0.25 + rand() * 0.3;
      ctx.drawImage(dot, rand() * w - rr, rand() * h * 0.92 - rr, rr * 2, rr * 2);
    }
  } else {
    // white / spotted: quiet light
    const mist = auraSprite('mist', M.rgb);
    for (let i = 0; i < 3; i++) {
      const rr = (50 + rand() * 60) * unit;
      ctx.globalAlpha = 0.1 + rand() * 0.08;
      ctx.drawImage(mist, rand() * w - rr, h * (0.55 + rand() * 0.35) - rr, rr * 2, rr * 2);
    }
    const dot = auraSprite('dot', M.rgb);
    for (let i = 0; i < 14; i++) {
      const rr2 = (1.6 + rand() * 3.2) * unit;
      ctx.globalAlpha = 0.25 + rand() * 0.35;
      ctx.drawImage(dot, rand() * w - rr2, rand() * h * 0.92 - rr2, rr2 * 2, rr2 * 2);
    }
  }
  ctx.restore();
  return band;
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
 * `element` turns on the baked elemental aura (see bakedAura).
 */
export function composeInto(target, layers, { finish = true, grain: useGrain = true, element = null, seed = 0 } = {}) {
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

  // the aura sits under the lighting passes so the bloom lifts it into the plate
  if (element && element !== 'none' && bySlot.body) bakedAura(ctx, w, h, bySlot, element, seed, FILTER_OK);

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
  const element = opts.element || (PART_BY_ID[`body:${slots.body}`] || {}).element || null;
  composeInto(c, layers, { ...opts, element, seed: auraSeed(`${slots.body}|${slots.horns}|${slots.acc}`) });
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
  const element = dragonElement(dragon);
  const url = composeUrl(layers, w, Math.round((w * 5) / 4), {
    grain: true,
    element,
    seed: auraSeed(`${dragon.parts.body}|${dragon.parts.horns}|${dragon.parts.acc}`),
  });
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
  silhouetteCache.clear();
}

/* ------------------------------------------------------- live aura data -- */

// The animated overlay needs the dragon's outline.  It is read once per part
// combination from an 80x100 alpha bake, then reused by every card.
const silhouetteCache = new Map();

export async function dragonSilhouette(dragon, base) {
  const key = `${dragon.parts.body}|${dragon.parts.horns}|${dragon.parts.acc}`;
  if (silhouetteCache.has(key)) return silhouetteCache.get(key);
  const c = cv(80, 100);
  const x = c.getContext('2d', { willReadFrequently: true });
  let any = false;
  for (const slot of ['body', 'horns', 'acc']) {
    const p = PART_BY_ID[`${slot}:${dragon.parts[slot]}`];
    if (!p) continue;
    const img = await loadImage(base + p.img);
    if (img) {
      x.drawImage(img, 0, 0, 80, 100);
      any = true;
    }
  }
  const prof = any ? silhouetteProfile(c) : null;
  if (prof) {
    // the eye's alpha centroid tells the live layer where the face is
    const eyePart = PART_BY_ID[`eyes:${dragon.parts.eyes}`];
    if (eyePart) {
      const img = await loadImage(base + eyePart.img);
      if (img) {
        const ec = cv(80, 100);
        const ex = ec.getContext('2d', { willReadFrequently: true });
        ex.drawImage(img, 0, 0, 80, 100);
        const cen = alphaCentroid(ec);
        if (cen) prof.face = cen;
      }
    }
    silhouetteCache.set(key, prof);
    while (silhouetteCache.size > 24) silhouetteCache.delete(silhouetteCache.keys().next().value);
  }
  return prof;
}

/** Drop all but the newest `keep` layer bitmaps (called when a hatch closes). */
export function pruneArtCache(keep = 6) {
  while (imgCache.size > keep) {
    imgCache.delete(imgCache.keys().next().value);
  }
}

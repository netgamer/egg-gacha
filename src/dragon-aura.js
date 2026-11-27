/**
 * Elemental aura — the *living* half of a dragon card.
 *
 * The baked composite (dragon-compose.js) carries a painted aura so a dragon
 * still reads as "fire" in the fast dex grid; this module adds the part that
 * moves: flame tongues that lick up from the dragon's own silhouette, wind
 * driven snow, sunbeams, crackling arcs, dust.  It runs as one Canvas2D layer
 * over the portrait on the reveal card and the detail modal, drawn with
 * additive blending so it sits *in* the painting instead of on top of it.
 *
 * Two rules keep it safe on a phone:
 *   · every card gets exactly one requestAnimationFrame loop, and the loop is
 *     cancelled when the card is closed or replaced (a 5-hatch run replaces the
 *     reveal card five times);
 *   · all shapes are pre-rendered sprites or plain paths, so a frame is a few
 *     dozen drawImage calls and never allocates gradients per particle.
 */

const TAU = Math.PI * 2;

/* --------------------------------------------------------------- palette -- */

export const AURA_META = {
  fire: { ko: '불꽃', accent: '#ff7a2e', rgb: '255,132,52', hot: '255,236,176' },
  ice: { ko: '얼음', accent: '#8fe6ff', rgb: '150,228,255', hot: '245,253,255' },
  forest: { ko: '숲', accent: '#ffd85e', rgb: '255,214,112', hot: '255,248,208', leaf: '150,227,106' },
  thunder: { ko: '번개', accent: '#b48cff', rgb: '180,140,255', hot: '246,238,255' },
  gold: { ko: '황금', accent: '#ffcf4d', rgb: '255,206,80', hot: '255,247,206' },
  diamond: { ko: '다이아', accent: '#a9ecff', rgb: '172,236,255', hot: '255,255,255' },
  white: { ko: '하양', accent: '#ffe6c2', rgb: '255,232,198', hot: '255,255,255' },
  spotted: { ko: '점박이', accent: '#9ff5dc', rgb: '160,245,222', hot: '255,255,255' },
};

export function auraMeta(element) {
  return AURA_META[element] || AURA_META[element === 'golden' ? 'gold' : 'white'];
}

/* --------------------------------------------------------------- helpers -- */

function cv(w, h) {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(w));
  c.height = Math.max(1, Math.round(h));
  return c;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable 32-bit seed from a string (dragon id + element). */
export function auraSeed(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);

/* ------------------------------------------------------- silhouette data -- */
/**
 * Read the alpha of a small canvas holding the dragon (body ∪ horns ∪ accents)
 * and describe its outline: the top and right contour, in 0..1 card space.
 * Flames and arcs are emitted from these points, which is what makes the aura
 * follow the dragon's own crest instead of a generic rectangle.
 */
export function silhouetteProfile(canvas) {
  const cw = canvas.width;
  const ch = canvas.height;
  let data;
  try {
    data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, cw, ch).data;
  } catch (_) {
    return null;
  }
  const top = new Float32Array(cw).fill(1);
  const bot = new Float32Array(cw).fill(0);
  const right = new Float32Array(ch).fill(0);
  const left = new Float32Array(ch).fill(1);
  let n = 0;
  let headX = 0.5;
  let headY = 1;
  for (let py = 0; py < ch; py++) {
    const ny = py / ch;
    for (let px = 0; px < cw; px++) {
      const a = data[(py * cw + px) * 4 + 3];
      if (a < 26) continue;
      n++;
      const nx = px / cw;
      if (ny < top[px]) top[px] = ny;
      if (ny > bot[px]) bot[px] = ny;
      if (nx > right[py]) right[py] = nx;
      if (nx < left[py]) left[py] = nx;
      if (ny < headY) {
        headY = ny;
        headX = nx;
      }
    }
  }
  if (!n) return null;

  // Top contour: columns that actually hold the dragon, sampled every other one.
  const crest = [];
  for (let px = 0; px < cw; px += 2) {
    if (top[px] < 0.94 && bot[px] > 0) crest.push({ x: px / cw, y: top[px] });
  }
  // Back contour: the right edge of the neck/shoulder, top → bottom.
  const back = [];
  for (let py = 0; py < ch; py += 2) {
    if (right[py] > 0.03) back.push({ x: right[py], y: py / ch });
  }
  return { crest, back, head: { x: headX, y: headY } };
}

/* --------------------------------------------------------------- sprites -- */

const sprites = new Map();
function sprite(key, build) {
  let s = sprites.get(key);
  if (!s) {
    s = build();
    sprites.set(key, s);
    while (sprites.size > 24) sprites.delete(sprites.keys().next().value);
  }
  return s;
}

/** Round additive glow: white core → colour → transparent. */
function glowSprite(rgb) {
  return sprite(`glow:${rgb}`, () => {
    const s = 96;
    const c = cv(s, s);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.16, `rgba(${rgb},0.92)`);
    g.addColorStop(0.48, `rgba(${rgb},0.34)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return c;
  });
}

/** Very soft dot for snow flakes / motes (no hard core). */
function dotSprite(rgb) {
  return sprite(`dot:${rgb}`, () => {
    const s = 64;
    const c = cv(s, s);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${rgb},0.95)`);
    g.addColorStop(0.4, `rgba(${rgb},0.55)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return c;
  });
}

/** Four point sparkle: concave star, soft halo. */
function starSprite(rgb) {
  return sprite(`star:${rgb}`, () => {
    const s = 96;
    const c = cv(s, s);
    const x = c.getContext('2d');
    const h = s / 2;
    const g = x.createRadialGradient(h, h, 0, h, h, h);
    g.addColorStop(0, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.22, `rgba(${rgb},0.32)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    x.globalCompositeOperation = 'lighter';
    x.fillStyle = `rgba(${rgb},0.95)`;
    x.beginPath();
    for (let i = 0; i < 8; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 4;
      const rad = i % 2 === 0 ? h * 0.96 : h * 0.16;
      const px = h + Math.cos(ang) * rad;
      const py = h + Math.sin(ang) * rad;
      if (i === 0) x.moveTo(px, py);
      else x.lineTo(px, py);
    }
    x.closePath();
    x.fill();
    return c;
  });
}

/** Soft sunbeam: bright at the top, feathered on both sides. */
function beamSprite(rgb) {
  return sprite(`beam:${rgb}`, () => {
    const w = 128;
    const h = 320;
    const c = cv(w, h);
    const x = c.getContext('2d');
    const v = x.createLinearGradient(0, 0, 0, h);
    v.addColorStop(0, `rgba(${rgb},0.9)`);
    v.addColorStop(0.55, `rgba(${rgb},0.4)`);
    v.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = v;
    x.fillRect(0, 0, w, h);
    const hg = x.createLinearGradient(0, 0, w, 0);
    hg.addColorStop(0, 'rgba(0,0,0,0)');
    hg.addColorStop(0.34, 'rgba(0,0,0,0.45)');
    hg.addColorStop(0.5, 'rgba(0,0,0,1)');
    hg.addColorStop(0.66, 'rgba(0,0,0,0.45)');
    hg.addColorStop(1, 'rgba(0,0,0,0)');
    x.globalCompositeOperation = 'destination-in';
    x.fillStyle = hg;
    x.fillRect(0, 0, w, h);
    return c;
  });
}

/** Large soft cloud for mist. */
function mistSprite(rgb) {
  return sprite(`mist:${rgb}`, () => {
    const s = 256;
    const c = cv(s, s);
    const x = c.getContext('2d');
    const g = x.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, `rgba(${rgb},0.55)`);
    g.addColorStop(0.45, `rgba(${rgb},0.26)`);
    g.addColorStop(1, `rgba(${rgb},0)`);
    x.fillStyle = g;
    x.fillRect(0, 0, s, s);
    return c;
  });
}

/* ------------------------------------------------------------- the field -- */

/** Shared sprite access for the baked (painted) aura in dragon-compose.js. */
export function auraSprite(kind, rgb) {
  if (kind === 'dot') return dotSprite(rgb);
  if (kind === 'star') return starSprite(rgb);
  if (kind === 'beam') return beamSprite(rgb);
  if (kind === 'mist') return mistSprite(rgb);
  return glowSprite(rgb);
}

const LIVE = new Set();
const MAX_LIVE = 3;
let probe = null;

function checksum(canvas) {
  if (!probe) probe = cv(16, 20);
  const x = probe.getContext('2d', { willReadFrequently: true });
  x.clearRect(0, 0, 16, 20);
  try {
    x.drawImage(canvas, 0, 0, 16, 20);
  } catch (_) {
    return 0;
  }
  const d = x.getImageData(0, 0, 16, 20).data;
  let s = 0;
  for (let i = 0; i < d.length; i += 4) s += d[i + 3] * (1 + (i % 11)) + d[i];
  return s;
}

export class AuraField {
  constructor(canvas, { element = 'white', profile = null, seed = 1 } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.element = AURA_META[element] || AURA_META[element === 'golden' ? 'gold' : 'white'];
    this.key = AURA_META[element] ? element : 'white';
    this.profile = profile;
    this.rand = mulberry32(seed || 1);
    this.reduce = false;
    try {
      this.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (_) {
      /* no matchMedia */
    }
    this.frames = 0;
    this.t = 0;
    this.running = false;
    this.raf = 0;
    this.last = 0;
    this.W = 0;
    this.H = 0;
    this.k = 1;
    this.parts = [];
    this.sparks = [];
    this.embers = [];
    this.streaks = [];
    this.motes = [];
    this.arcs = [];
    this.beams = [];
    this.mist = [];
    this.spawnAcc = 0;
    this.nextBolt = 0.4;
    this._fit();
    this._init();
  }

  /* --------------------------------------------------------------- setup -- */

  _fit() {
    const rect = this.canvas.getBoundingClientRect();
    const cssW = rect.width || this.canvas.clientWidth || 320;
    const cssH = rect.height || cssW * 1.25;
    let dpr = 1;
    try {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
    } catch (_) {
      dpr = 1;
    }
    // never let one card own a 3-megapixel canvas on a phone
    const scale = Math.min(dpr, 520 / Math.max(1, cssW));
    const W = Math.round(cssW * scale);
    const H = Math.round(cssH * scale);
    if (W === this.W && H === this.H) return false;
    let changed = false;
    if (this.W && Math.abs(W / H - this.W / this.H) > 0.02) changed = true;
    this.W = W;
    this.H = H;
    this.canvas.width = W;
    this.canvas.height = H;
    this.k = Math.max(0.55, W / 360);
    return changed;
  }

  _r() {
    return this.rand();
  }

  /** Edge points the aura is emitted from (normalised 0..1). */
  _edge() {
    const p = this.profile;
    if (!p || !p.crest.length) return null;
    return p;
  }

  _edgePick(preferTop = 0.5) {
    const p = this._edge();
    if (!p) return { x: 0.5, y: 0.4 };
    const useTop = this._r() < preferTop || !p.back.length;
    let list = useTop ? p.crest : p.back;
    // flames hug the crest and the top of the back — never the bottom edge
    if (this.key === 'fire' || this.key === 'thunder' || this.key === 'gold') {
      const clipped = list.filter((q) => q.y < 0.82);
      if (clipped.length) list = clipped;
    }
    return list[Math.floor(this._r() * list.length) % list.length];
  }

  _init() {
    const W = this.W;
    const H = this.H;
    const k = this.k;
    const r = () => this._r();
    this.parts = [];
    this.sparks = [];
    this.embers = [];
    this.arcs = [];
    this.spawnAcc = 0;
    this.nextBolt = 0.3 + r() * 0.5;

    /* ice — wind blown streaks + flakes + mist */
    this.streaks = [];
    const streakN = Math.round(32 + (W * H) / 14000);
    for (let i = 0; i < streakN; i++) {
      this.streaks.push({
        x: r() * (W + 80) - 40,
        y: r() * (H + 60) - 30,
        len: (10 + r() * 46) * k,
        sp: (150 + r() * 260) * k,
        a: 0.12 + r() * 0.4,
        w: (0.9 + r() * 1.5) * k,
        ph: r() * TAU,
      });
    }
    this.motes = [];
    const moteN = this.key === 'white' || this.key === 'spotted' ? 20 : 26;
    for (let i = 0; i < moteN; i++) {
      this.motes.push(this._newMote(true));
    }
    this.beams = [];
    if (this.key === 'forest') {
      for (let i = 0; i < 6; i++) {
        this.beams.push({
          x: W * (0.26 + r() * 0.74),
          y: -H * (0.02 + r() * 0.06),
          w: (18 + r() * 34) * k,
          len: H * (1.0 + r() * 0.5),
          a: 0.15 + r() * 0.12,
          ang: 0.52 + (r() - 0.5) * 0.18,
          ph: r() * TAU,
        });
      }
    }
    this.mist = [];
    for (let i = 0; i < 3; i++) {
      this.mist.push({
        x: r() * W,
        y: H * (0.45 + r() * 0.5),
        r: (110 + r() * 120) * k,
        a: 0.03 + r() * 0.05,
        sp: (6 + r() * 14) * k,
        ph: r() * TAU,
      });
    }
  }

  _newMote(spread = false) {
    const W = this.W;
    const H = this.H;
    const k = this.k;
    const up = this.key !== 'ice';
    const p = this._edgePick(0.6);
    return {
      x: spread ? this._r() * W : (p.x + (this._r() - 0.5) * 0.1) * W,
      y: spread ? this._r() * H : p.y * H + (this._r() - 0.5) * H * 0.1,
      vx: (this._r() - 0.5) * 10 * k,
      vy: (up ? -1 : 1) * (8 + this._r() * 22) * k,
      r: (1.6 + this._r() * 3.4) * k,
      ph: this._r() * TAU,
      tw: 0.6 + this._r() * 1.8,
    };
  }

  /* ---------------------------------------------------------------- loop -- */

  start() {
    if (this.running) return this;
    if (!this.W || !this.H) this._fit();
    if (this.reduce) {
      // honour the OS setting: show one still frame, no loop, no motion
      this._prewarm();
      this.draw(1 / 60);
      this.frames = 1;
      return this;
    }
    this.running = true;
    this.last = 0;
    this.raf = requestAnimationFrame(this._loop);
    return this;
  }

  _loop = (ts) => {
    if (!this.running) return;
    if (!this.canvas.isConnected) {
      this.stop();
      return;
    }
    if (!this.last) this.last = ts;
    let dt = (ts - this.last) / 1000;
    this.last = ts;
    if (!(dt > 0)) dt = 0;
    dt = Math.min(0.05, dt);
    this.t += dt;
    if (this.frames % 30 === 29 && this._fit()) this._init();
    this.draw(dt);
    this.frames++;
    this.raf = requestAnimationFrame(this._loop);
  };

  stop() {
    this.running = false;
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = 0;
    LIVE.delete(this);
    return this;
  }

  /** Run the simulation for a moment without drawing, so a still frame looks full. */
  _prewarm() {
    for (let i = 0; i < 60; i++) {
      this.t += 1 / 30;
      this._step(1 / 30);
    }
  }

  /* -------------------------------------------------------------- update -- */

  _step(dt) {
    const W = this.W;
    const H = this.H;
    const k = this.k;
    const r = () => this._r();

    if (this.key === 'fire') {
      this.spawnAcc += dt * (70 + 90 * k);
      while (this.spawnAcc >= 1) {
        this.spawnAcc -= 1;
        const p = this._edgePick(0.62);
        this.parts.push({
          x: p.x * W + (r() - 0.5) * 6 * k,
          y: p.y * H + (r() - 0.5) * 4 * k,
          vx: (r() - 0.5) * 26 * k,
          vy: -(38 + r() * 62) * k,
          life: 0,
          ttl: 0.34 + r() * 0.5,
          w: (10 + r() * 15) * k,
          h: (20 + r() * 30) * k,
          ph: r() * TAU,
        });
      }
      for (let i = this.parts.length - 1; i >= 0; i--) {
        const p = this.parts[i];
        p.life += dt;
        if (p.life >= p.ttl) {
          this.parts.splice(i, 1);
          continue;
        }
        p.x += (p.vx + Math.sin(this.t * 7 + p.ph) * 20 * k) * dt;
        p.y += p.vy * dt;
        p.vy *= 1 - 1.1 * dt;
      }
      // embers rise further and live longer
      if (r() < dt * 16) {
        const p = this._edgePick(0.6);
        if (p.y < 0.86) {
          this.embers.push({
          x: p.x * W,
          y: p.y * H,
          vx: (r() - 0.5) * 16 * k,
          vy: -(26 + r() * 46) * k,
          life: 0,
          ttl: 1.4 + r() * 1.6,
          r: (1.3 + r() * 2.2) * k,
          ph: r() * TAU,
        });
        }
      }
      for (let i = this.embers.length - 1; i >= 0; i--) {
        const e = this.embers[i];
        e.life += dt;
        if (e.life >= e.ttl) {
          this.embers.splice(i, 1);
          continue;
        }
        e.x += (e.vx + Math.sin(this.t * 2.4 + e.ph) * 12 * k) * dt;
        e.y += e.vy * dt;
      }
    }

    if (this.key === 'ice') {
      for (const s of this.streaks) {
        s.y += s.sp * dt;
        s.x -= s.sp * 0.44 * dt;
        if (s.y > H + 40 * k || s.x < -60 * k) {
          s.x = r() * (W + 280 * k) - 40 * k;
          s.y = -r() * 120 * k;
          s.len = (10 + r() * 46) * k;
          s.sp = (150 + r() * 260) * k;
          s.a = 0.12 + r() * 0.4;
        }
      }
    }

    if (this.key === 'thunder') {
      this.nextBolt -= dt;
      if (this.nextBolt <= 0) {
        this.nextBolt = 0.24 + r() * 0.85;
        for (let burst = 0; burst < (r() < 0.35 ? 2 : 1); burst++) {
          const p = this._edgePick(0.5);
          const start = { x: p.x * W, y: p.y * H };
          const dir = -1.1 + r() * 2.2;
          const pts = [start];
          let { x, y } = start;
          const seg = 6 + Math.floor(r() * 5);
          for (let i = 0; i < seg; i++) {
            const step = (5 + r() * 9) * k;
            const ang = dir + (r() - 0.5) * 1.9;
            x += Math.cos(ang) * step;
            y += Math.sin(ang) * step * 0.85 + step * 0.25;
            pts.push({ x, y });
          }
          this.arcs.push({ pts, life: 0, ttl: 0.16 + r() * 0.2, flick: r() * TAU });
          for (let i = 0; i < 6; i++) {
            const a = r() * TAU;
            const sp = (50 + r() * 150) * k;
            this.sparks.push({
              x,
              y,
              vx: Math.cos(a) * sp,
              vy: Math.sin(a) * sp,
              life: 0,
              ttl: 0.24 + r() * 0.36,
              r: (0.8 + r() * 1.6) * k,
            });
          }
        }
      }
      for (let i = this.arcs.length - 1; i >= 0; i--) {
        this.arcs[i].life += dt;
        if (this.arcs[i].life >= this.arcs[i].ttl) this.arcs.splice(i, 1);
      }
      for (let i = this.sparks.length - 1; i >= 0; i--) {
        const s = this.sparks[i];
        s.life += dt;
        if (s.life >= s.ttl) {
          this.sparks.splice(i, 1);
          continue;
        }
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        s.vx *= 1 - 2.4 * dt;
        s.vy *= 1 - 2.4 * dt;
      }
    }

    if (this.key === 'diamond') {
      if (r() < dt * 5.2) {
        const p = this._edgePick(0.55);
        this.arcs.push({
          x: p.x * W + (r() - 0.5) * 26 * k,
          y: p.y * H + (r() - 0.5) * 26 * k,
          s: (3 + r() * 7) * k,
          life: 0,
          ttl: 0.34 + r() * 0.42,
          hue: r() * 360,
          rot: r() * 0.5,
        });
      }
      for (let i = this.arcs.length - 1; i >= 0; i--) {
        this.arcs[i].life += dt;
        if (this.arcs[i].life >= this.arcs[i].ttl) this.arcs.splice(i, 1);
      }
    }

    if (this.key === 'gold') {
      if (r() < dt * 3.2) {
        const p = this._edgePick(0.6);
        this.arcs.push({
          x: p.x * W + (r() - 0.5) * 40 * k,
          y: p.y * H + (r() - 0.5) * 30 * k,
          s: (6 + r() * 16) * k,
          life: 0,
          ttl: 0.5 + r() * 0.7,
        });
      }
      for (let i = this.arcs.length - 1; i >= 0; i--) {
        this.arcs[i].life += dt;
        if (this.arcs[i].life >= this.arcs[i].ttl) this.arcs.splice(i, 1);
      }
    }

    // motes drift for every element
    for (const m of this.motes) {
      m.x += (m.vx + Math.sin(this.t * 0.9 + m.ph) * 7 * k) * dt;
      m.y += m.vy * dt;
      if (m.y < -20 * k || m.y > H + 20 * k || m.x < -20 * k || m.x > W + 20 * k) {
        const n = this._newMote(false);
        m.x = n.x;
        m.y = this.key === 'ice' ? -8 * k : n.y;
        m.vx = n.vx;
        m.vy = n.vy;
        m.r = n.r;
        m.ph = n.ph;
        m.tw = n.tw;
      }
    }

    for (const m of this.mist) {
      m.x += m.sp * dt;
      if (m.x - m.r > W) m.x = -m.r;
    }
  }

  /* --------------------------------------------------------------- paint -- */

  draw(dt) {
    this._step(dt);
    const ctx = this.ctx;
    const W = this.W;
    const H = this.H;
    const k = this.k;
    const M = this.element;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, W, H);
    ctx.imageSmoothingQuality = 'high';

    const glow = glowSprite(M.rgb);
    const dot = dotSprite(M.rgb);
    const hot = glowSprite(M.hot);
    const edge = this._edge();

    /* -- ambient silhouette glow that breathes with the effect ------------ */
    if (edge) {
      const step = Math.max(1, Math.floor(edge.crest.length / 16));
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < edge.crest.length; i += step) {
        const p = edge.crest[i];
        const ph = i * 0.7;
        const a =
          (this.key === 'fire' ? 0.16 : 0.1) +
          (this.key === 'fire' ? 0.09 : 0.05) * Math.sin(this.t * 3.4 + ph) +
          0.03 * Math.sin(this.t * 8.1 + ph * 1.7);
        ctx.globalAlpha = Math.max(0, a);
        const r = (this.key === 'fire' ? 34 : 26) * k;
        ctx.drawImage(glow, p.x * W - r, p.y * H - r, r * 2, r * 2);
      }
    }

    if (this.key === 'fire') this._paintFire(ctx, glow, hot, k);
    else if (this.key === 'ice') this._paintIce(ctx, dot, k);
    else if (this.key === 'forest') this._paintForest(ctx, dot, k);
    else if (this.key === 'thunder') this._paintThunder(ctx, glow, hot, k);
    else if (this.key === 'gold') this._paintGold(ctx, glow, dot, k);
    else if (this.key === 'diamond') this._paintDiamond(ctx, glow, k);
    else this._paintMist(ctx, dot, k);

    /* -- drifting mist is shared by the cold / gentle elements ------------ */
    if (this.key !== 'fire' && this.key !== 'forest') {
      ctx.globalCompositeOperation = 'source-over';
      const mist = mistSprite(M.rgb);
      for (const m of this.mist) {
        ctx.globalAlpha = m.a;
        ctx.drawImage(mist, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintFire(ctx, glow, hot, k) {
    ctx.globalAlpha = 1;
    const W = this.W;
    for (const p of this.parts) {
      const t = p.life / p.ttl;
      const fade = Math.sin(Math.PI * Math.min(1, t)) ** 0.7;
      const h = p.h * (0.55 + 0.6 * (1 - t));
      const w = p.w * (0.75 + 0.4 * (1 - t));
      const sway = Math.sin(this.t * 6.4 + p.ph) * w * 0.34;
      const bx = p.x;
      const by = p.y + h;

      // soft body of the tongue
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * fade;
      ctx.drawImage(glow, bx - w * 0.95, by - h * 1.05, w * 1.9, h * 1.4);

      // saturated core so the fire keeps its colour over a bright plate
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(255,116,28,${0.42 * fade})`;
      ctx.beginPath();
      ctx.moveTo(bx - w * 0.5, by);
      ctx.bezierCurveTo(bx - w * 0.46, by - h * 0.45, bx - w * 0.16 + sway * 0.5, by - h * 0.78, bx + sway * 0.7, by - h);
      ctx.bezierCurveTo(bx + w * 0.24 + sway * 0.5, by - h * 0.7, bx + w * 0.48, by - h * 0.34, bx + w * 0.5, by);
      ctx.closePath();
      ctx.fill();

      // white-hot wick
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.5 * fade;
      const ww = w * 0.42;
      ctx.drawImage(hot, bx - ww * 0.5, by - h * 0.62, ww, h * 0.62);
    }

    // embers
    ctx.globalCompositeOperation = 'lighter';
    for (const e of this.embers) {
      const t = e.life / e.ttl;
      const a = Math.sin(Math.PI * Math.min(1, t)) * (0.55 + 0.45 * Math.sin(this.t * 9 + e.ph));
      ctx.globalAlpha = clamp(a, 0, 1) * 0.85;
      const r = e.r * 3.2;
      ctx.drawImage(glow, e.x - r, e.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintIce(ctx, dot, k) {
    ctx.globalAlpha = 1;
    const W = this.W;
    const H = this.H;
    ctx.lineCap = 'round';
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.streaks) {
      const dx = -0.42 * s.len;
      const dy = s.len;
      ctx.strokeStyle = `rgba(214,244,255,${s.a * 0.28})`;
      ctx.lineWidth = s.w * 3.2;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + dx, s.y + dy);
      ctx.stroke();
      ctx.strokeStyle = `rgba(255,255,255,${s.a})`;
      ctx.lineWidth = s.w;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + dx, s.y + dy);
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
    for (const m of this.motes) {
      const tw = 0.45 + 0.55 * Math.abs(Math.sin(this.t * 1.4 + m.ph));
      ctx.globalAlpha = 0.55 * tw;
      const r = m.r * 2.4;
      ctx.drawImage(dot, m.x - r, m.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }

  _paintForest(ctx, dot, k) {
    ctx.globalAlpha = 1;
    const W = this.W;
    const H = this.H;
    ctx.globalCompositeOperation = 'lighter';
    // the sun itself, just off the top-right corner
    const sun = glowSprite('255,228,150');
    const sr = 118 * k;
    ctx.globalAlpha = 0.34 + 0.08 * Math.sin(this.t * 0.9);
    ctx.drawImage(sun, W - sr * 0.55, -sr * 0.75, sr * 2, sr * 2);
    ctx.globalAlpha = 1;

    // god rays: tapered shafts from the corner, each breathing on its own phase
    for (const b of this.beams) {
      const a = b.a * 2.2 * (0.72 + 0.36 * Math.sin(this.t * 0.8 + b.ph));
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.ang + Math.sin(this.t * 0.5 + b.ph) * 0.03);
      const g = ctx.createLinearGradient(0, 0, 0, b.len);
      g.addColorStop(0, `rgba(255,244,206,${a})`);
      g.addColorStop(0.32, `rgba(255,232,168,${a * 0.6})`);
      g.addColorStop(1, 'rgba(255,226,150,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(-b.w * 0.34, 0);
      ctx.lineTo(b.w * 0.34, 0);
      ctx.lineTo(b.w * 0.92, b.len);
      ctx.lineTo(-b.w * 0.92, b.len);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';
    for (const m of this.motes) {
      const tw = 0.35 + 0.65 * Math.abs(Math.sin(this.t * 1.1 + m.ph));
      ctx.globalAlpha = 0.6 * tw;
      const rr = m.r * 2.2;
      ctx.drawImage(dot, m.x - rr, m.y - rr, rr * 2, rr * 2);
    }
    ctx.globalAlpha = 1;
  }

  _paintThunder(ctx, glow, hot, k) {
    ctx.globalAlpha = 1;
    for (const a of this.arcs) {
      const t = a.life / a.ttl;
      const crackle = 0.62 + 0.38 * Math.abs(Math.sin(this.t * 26 + a.flick));
      const fade = (1 - t) ** 1.5 * crackle;
      const p = a.pts;
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.globalAlpha = fade * 0.45;
      ctx.strokeStyle = 'rgba(150,102,255,0.9)';
      ctx.lineWidth = 5.5 * k;
      ctx.beginPath();
      ctx.moveTo(p[0].x, p[0].y);
      for (let i = 1; i < p.length; i++) ctx.lineTo(p[i].x, p[i].y);
      ctx.stroke();
      ctx.globalAlpha = fade;
      ctx.strokeStyle = 'rgba(250,246,255,0.95)';
      ctx.lineWidth = 1.15 * k;
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of this.sparks) {
      const t = s.life / s.ttl;
      ctx.globalAlpha = (1 - t) * 0.85;
      const r = s.r * 3;
      ctx.drawImage(hot, s.x - r, s.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintGold(ctx, glow, dot, k) {
    ctx.globalAlpha = 1;
    const W = this.W;
    const H = this.H;
    // rising shimmer
    ctx.globalCompositeOperation = 'lighter';
    for (const m of this.motes) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 1.6 + m.ph));
      ctx.globalAlpha = 0.5 * tw;
      const r = m.r * 2.6;
      ctx.drawImage(dot, m.x - r, m.y - r, r * 2, r * 2);
    }
    const star = starSprite('255,214,120');
    for (const a of this.arcs) {
      const t = a.life / a.ttl;
      const f = Math.sin(Math.PI * Math.min(1, t));
      ctx.globalAlpha = f * 0.9;
      ctx.drawImage(star, a.x - a.s, a.y - a.s, a.s * 2, a.s * 2);
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintDiamond(ctx, glow, k) {
    ctx.globalAlpha = 1;
    const star = starSprite('205,245,255');
    ctx.globalCompositeOperation = 'lighter';
    for (const a of this.arcs) {
      const t = a.life / a.ttl;
      const f = Math.sin(Math.PI * Math.min(1, t));
      // iridescent: each flare walks the hue wheel while it lives
      ctx.save();
      ctx.translate(a.x, a.y);
      ctx.rotate(a.rot + t * 1.1);
      const s = a.s * (0.55 + 0.6 * f);
      ctx.globalAlpha = f * 0.7;
      ctx.drawImage(star, -s, -s, s * 2, s * 2);
      ctx.restore();
      const hue = (a.hue + t * 140) % 360;
      ctx.globalAlpha = f * 0.3;
      ctx.strokeStyle = `hsla(${hue}, 100%, 86%, 0.9)`;
      ctx.lineWidth = 0.6 * k;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y - a.s * 0.6);
      ctx.lineTo(a.x + a.s * 0.6, a.y);
      ctx.lineTo(a.x, a.y + a.s * 0.6);
      ctx.lineTo(a.x - a.s * 0.6, a.y);
      ctx.closePath();
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _paintMist(ctx, dot, k) {
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    for (const m of this.motes) {
      const tw = 0.3 + 0.7 * Math.abs(Math.sin(this.t * 0.9 + m.ph));
      ctx.globalAlpha = 0.4 * tw;
      const r = m.r * 2.6;
      ctx.drawImage(dot, m.x - r, m.y - r, r * 2, r * 2);
    }
    ctx.globalAlpha = 1;
  }
}

/* ------------------------------------------------------------ lifecycle -- */

/** Start the aura on `canvas`; returns the field (or null when nothing to draw). */
export function mountAura(canvas, opts = {}) {
  if (!canvas || !canvas.getContext) return null;
  if (LIVE.size >= MAX_LIVE) {
    const oldest = LIVE.values().next().value;
    if (oldest) {
      oldest.stop();
      LIVE.delete(oldest);
    }
  }
  const field = new AuraField(canvas, opts);
  LIVE.add(field);
  field.start();
  return field;
}

/** Stop every aura whose canvas lives inside `root` (or all of them). */
export function stopAuras(root) {
  for (const f of [...LIVE]) {
    if (!root || root.contains(f.canvas)) {
      f.stop();
      LIVE.delete(f);
    }
  }
}

export function stopAllAuras() {
  stopAuras(null);
}

/** Diagnostics for the automated checks. */
export function auraStats() {
  return [...LIVE].map((f) => ({
    element: f.key,
    running: f.running,
    frames: f.frames,
    reduced: f.reduce,
    size: [f.W, f.H],
    checksum: checksum(f.canvas),
  }));
}

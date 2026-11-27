import { EGG_BY_ID, randomEggId } from './data.js';

const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const easeOut = (t) => 1 - Math.pow(1 - t, 3.2);

/**
 * Horizontal 3D card reel. `p` is the reel position in cards:
 * the card at index round(p) sits in the center slot.
 */
export class Roulette {
  constructor({ el, track, frame, onTick }) {
    this.el = el;
    this.track = track;
    this.frame = frame;
    this.onTick = onTick || (() => {});
    this.items = [];
    this.cards = new Map();
    this.p = 0;
    this.cardW = 220;
    this.cardH = 272;
    this.pitch = 202;
    this.spinning = false;
    this.winIndex = -1;

    while (this.items.length < 60) this.items.push(randomEggId());

    this.render(this.p);
    this._measure();
    this.render(this.p);

    window.addEventListener('resize', () => {
      this._measure();
      this.render(this.p);
    });
  }

  _measure() {
    const probe = this.cards.get(Math.round(this.p)) || this.cards.values().next().value;
    if (!probe) return;
    const w = probe.offsetWidth;
    const h = probe.offsetHeight;
    if (w > 0) {
      this.cardW = w;
      this.cardH = h;
      this.pitch = w * 0.8;
    }
  }

  _fill(upTo) {
    while (this.items.length <= upTo) this.items.push(randomEggId());
  }

  _makeCard(index) {
    const el = document.createElement('div');
    el.className = 'card';
    el.dataset.index = String(index);
    el.innerHTML =
      '<div class="card-art"><img alt="" draggable="false" decoding="async" /></div>' +
      '<div class="card-veil"></div>' +
      '<div class="card-name"></div>';
    this.track.appendChild(el);
    this._paintCard(el, this.items[index]);
    return el;
  }

  _paintCard(el, id) {
    const egg = EGG_BY_ID[id] || EGG_BY_ID.white;
    el.dataset.egg = id;
    el.dataset.rarity = egg.rarity;
    el.dataset.rank = String(
      { common: 0, rare: 1, epic: 2, legendary: 3 }[egg.rarity] ?? 0
    );
    const img = el.querySelector('img');
    if (img.getAttribute('src') !== egg.img) {
      img.src = egg.img;
      img.alt = egg.name;
    }
    el.querySelector('.card-name').textContent = egg.name;
  }

  render(p) {
    const lo = Math.floor(p) - 5;
    const hi = Math.ceil(p) + 5;
    for (const [i, el] of this.cards) {
      if (i < lo - 1 || i > hi + 1) {
        el.remove();
        this.cards.delete(i);
      }
    }
    for (let i = lo; i <= hi; i++) {
      let el = this.cards.get(i);
      if (!el) {
        el = this._makeCard(i);
        this.cards.set(i, el);
      } else if (el.dataset.egg !== this.items[i]) {
        this._paintCard(el, this.items[i]);
      }
      const o = i - p;
      const ao = clamp(o, -5, 5);
      const ang = clamp(-ao * 30, -66, 66);
      const x = o * this.pitch;
      const z = -Math.abs(ao) * this.cardW * 0.72;
      const scale = 1 / (1 + Math.abs(ao) * 0.05);
      const opacity = clamp(1 - Math.abs(ao) * 0.24, 0.05, 1);
      el.style.transform =
        `translate3d(${x.toFixed(1)}px, 0, ${z.toFixed(1)}px) ` +
        `rotateY(${ang.toFixed(1)}deg) scale(${scale.toFixed(3)})`;
      el.style.opacity = opacity.toFixed(3);
      el.style.zIndex = String(400 - Math.round(Math.abs(ao) * 10));
      el.classList.toggle('is-center', Math.abs(o) < 0.5);
      el.classList.toggle('is-win', i === this.winIndex && Math.abs(o) < 0.5);
      el.querySelector('.card-veil').style.opacity = clamp(Math.abs(ao) * 0.38, 0, 0.86).toFixed(3);
    }
  }

  /** Spin to a predetermined egg. Resolves with the winning egg id. */
  spinTo(eggId, { duration = 4200, distance = 38 } = {}) {
    if (this.spinning) return Promise.resolve(null);
    this.spinning = true;
    this.el.classList.add('spinning');
    const start = this.p;
    const target = Math.round(start + distance);
    this._fill(target + 12);
    this.items[target] = eggId;
    this.winIndex = -1;

    return new Promise((resolve) => {
      const t0 = performance.now();
      let lastCenter = Math.round(start);
      const tick = (now) => {
        const raw = clamp((now - t0) / duration, 0, 1);
        let pos = start + (target - start) * easeOut(raw);
        if (raw > 0.8) {
          const k = (raw - 0.8) / 0.2;
          pos += Math.sin(k * Math.PI * 2.6) * (1 - k) * (1 - k) * 0.45;
        }
        this.p = pos;
        this.render(pos);
        const center = Math.round(pos);
        if (center !== lastCenter) {
          lastCenter = center;
          const speed = clamp((target - pos) / 10, 0, 1);
          this.onTick(speed, Math.max(0, target - pos));
        }
        if (raw < 1) {
          requestAnimationFrame(tick);
        } else {
          this.p = target;
          this.winIndex = target;
          this.render(target);
          this.spinning = false;
          this.el.classList.remove('spinning');
          resolve(this.items[target]);
        }
      };
      requestAnimationFrame(tick);
    });
  }

  setFrameColor(color, glow) {
    // set on the reel so the frame, markers and center card all inherit it
    this.el.style.setProperty('--rar', color);
    this.el.style.setProperty('--rar-glow', glow || color);
  }

  centerRect() {
    return this.frame.getBoundingClientRect();
  }
}

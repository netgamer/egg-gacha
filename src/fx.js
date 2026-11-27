/** Canvas2D layer: sunburst rays, crackling lightning, sparks. */
const TAU = Math.PI * 2;
const rnd = (a, b) => a + Math.random() * (b - a);

export class Fx {
  constructor(canvas, { onShake } = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.onShake = onShake || (() => {});
    this.particles = [];
    this.bolts = [];
    this.rings = [];
    this.flashA = 0;
    this.flashColor = '#ffffff';
    this.shakeAmp = 0;
    this.shaking = false;
    this.accent = '#8b5cff';
    this.time = 0;
    this.dustTimer = 0;
    this.last = 0;
    this.raf = 0;

    // sunburst behind the stage — a pre-rendered wheel blitted each frame
    // (cheaper and far more stable than a huge masked, rotating DOM element)
    this.rays = document.createElement('canvas');
    this.rays.className = 'rays-canvas';
    this.rays.setAttribute('aria-hidden', 'true');
    canvas.parentElement.insertBefore(this.rays, canvas.nextSibling);
    this.raysCtx = this.rays.getContext('2d');
    this.raysImg = document.createElement('canvas');
    this.raysImgSize = 512;
    this._buildRays(this.accent);

    this.resize();
    window.addEventListener('resize', () => this.resize());
    this._loop = this._loop.bind(this);
    this.raf = requestAnimationFrame(this._loop);
  }

  resize() {
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    // Cap the backing store: these are soft glows, and a huge GPU buffer is
    // what makes low-end devices (and software renderers) stumble.
    const maxPx = 360000;
    const dpr = Math.min(
      window.devicePixelRatio || 1,
      1.2,
      Math.sqrt(maxPx / Math.max(1, this.w * this.h))
    );
    this.dpr = Math.max(0.7, dpr);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = `${this.w}px`;
    this.canvas.style.height = `${this.h}px`;

    // the sunburst is soft, so it keeps a small fixed backing store and is
    // stretched by CSS — cheap to rotate and light on memory
    this.rays.style.width = `${this.w}px`;
    this.rays.style.height = `${this.h}px`;
    this.rays.width = 360;
    this.rays.height = Math.round((360 * this.h) / this.w);
  }

  _buildRays(color) {
    const size = this.raysImgSize;
    const c = this.raysImg;
    c.width = size;
    c.height = size;
    const x = c.getContext('2d');
    x.clearRect(0, 0, size, size);
    x.translate(size / 2, size / 2);
    const wedges = 44;
    for (let i = 0; i < wedges; i++) {
      const a0 = (i / wedges) * TAU;
      const a1 = a0 + (TAU / wedges) * 0.38;
      const g = x.createRadialGradient(0, 0, size * 0.02, 0, 0, size * 0.5);
      g.addColorStop(0, color);
      g.addColorStop(0.35, color);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      x.globalAlpha = 0.2;
      x.fillStyle = g;
      x.beginPath();
      x.moveTo(0, 0);
      x.arc(0, 0, size * 0.5, a0, a1);
      x.closePath();
      x.fill();
    }
  }

  _drawRays() {
    const rc = this.raysCtx;
    const rw = this.rays.width;
    const rh = this.rays.height;
    rc.setTransform(1, 0, 0, 1, 0, 0);
    rc.clearRect(0, 0, rw, rh);
    const size = this.raysImgSize;
    const scale = (Math.max(rw, rh) * 1.4) / size;
    rc.save();
    rc.translate(rw / 2, rh * 0.46);
    rc.rotate(this.time * 0.16);
    rc.globalAlpha = 0.8;
    rc.drawImage(this.raysImg, (-size / 2) * scale, (-size / 2) * scale, size * scale, size * scale);
    rc.restore();
  }

  setAccent(color) {
    if (color === this.accent) return;
    this.accent = color;
    this._buildRays(color);
  }

  burst(x, y, { count = 24, color = this.accent, speed = 260, spread = [0, TAU], size = [1.4, 3.4], life = [0.5, 1.1], gravity = 320, drag = 1.4 } = {}) {
    for (let i = 0; i < count; i++) {
      const a = rnd(spread[0], spread[1]);
      const v = speed * rnd(0.35, 1);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: gravity,
        drag,
        size: rnd(size[0], size[1]),
        life: rnd(life[0], life[1]),
        max: 1,
        color,
        type: 'spark',
      });
      const p = this.particles[this.particles.length - 1];
      p.max = p.life;
    }
    this._cap();
  }

  confetti(x, y, count = 40) {
    for (let i = 0; i < count; i++) {
      const a = rnd(-Math.PI * 0.95, -Math.PI * 0.05);
      const v = rnd(240, 620);
      this.particles.push({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        g: 520,
        drag: 1.1,
        size: rnd(2.6, 5.2),
        life: rnd(0.9, 1.8),
        max: 1.8,
        color: `hsl(${Math.floor(rnd(0, 360))} 100% 66%)`,
        type: 'confetti',
        rot: rnd(0, TAU),
        vr: rnd(-9, 9),
      });
    }
    this._cap();
  }

  bolt(x1, y1, x2, y2, { color = this.accent, width = 2.4, life = rnd(0.28, 0.55), rainbow = false } = {}) {
    this.bolts.push({ x1, y1, x2, y2, color, width, life, max: life, rainbow, hue: rnd(0, 360) });
  }

  ring(x, y, { color = this.accent, maxR = 220, width = 3, life = 0.6 } = {}) {
    this.rings.push({ x, y, r: 12, maxR, width, color, life, max: life });
  }

  flash(color = '#ffffff', alpha = 0.25, x = null, y = null) {
    this.flashColor = color;
    this.flashX = x;
    this.flashY = y;
    this.flashA = Math.max(this.flashA, alpha);
  }

  shake(amp = 10) {
    this.shakeAmp = Math.max(this.shakeAmp, amp);
  }

  dust(x, y, count = 14) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: x + rnd(-90, 90),
        y: y + rnd(-40, 80),
        vx: rnd(-16, 16),
        vy: rnd(-46, -14),
        g: -6,
        drag: 0.4,
        size: rnd(0.9, 2.2),
        life: rnd(0.8, 1.8),
        max: 1.8,
        color: this.accent,
        type: 'dust',
      });
    }
  }

  /** Full reveal package scaled to rarity rank (0..3). */
  celebrate(rank, x, y, { rainbow = false, color = this.accent } = {}) {
    this.setAccent(color);
    if (rank <= 0) {
      this.ring(x, y, { color: '#cfd8ff', maxR: 130, width: 2, life: 0.5 });
      this.burst(x, y, { count: 20, color: '#dfe7ff', speed: 200, life: [0.4, 0.9] });
      this.flash('#cbd6ff', 0.12, x, y);
      this.shake(2.5);
      return;
    }
    if (rank === 1) {
      this.ring(x, y, { color, maxR: 220, width: 3, life: 0.65 });
      this.burst(x, y, { count: 46, color, speed: 340, life: [0.5, 1.2], size: [1.2, 3] });
      this._radialBolts(x, y, 3, { color, width: 2, radius: 120 });
      this.flash(color, 0.14, x, y);
      this.shake(5);
      return;
    }
    if (rank === 2) {
      this.flash('#e8d7ff', 0.24, x, y);
      this.shake(11);
      this.ring(x, y, { color, maxR: 300, width: 4, life: 0.75 });
      this.burst(x, y, { count: 64, color, speed: 460, life: [0.6, 1.5], size: [1.4, 3.4] });
      this._radialBolts(x, y, 6, { color, width: 2.6, radius: 130 });
      this.dust(x, y, 22);
      return;
    }
    // legendary
    this.flash('#ffffff', 0.34, x, y);
    this.shake(16);
    this.ring(x, y, { color: '#ffd24d', maxR: 380, width: 5, life: 0.9 });
    setTimeout(() => this.ring(x, y, { color: '#7bdcff', maxR: 300, width: 4, life: 0.8 }), 90);
    this.burst(x, y, { count: 96, color: '#ffe9a8', speed: 560, life: [0.7, 1.8], size: [1.4, 3.6] });
    this.confetti(x, y, 36);
    this._radialBolts(x, y, 9, { color, width: 3, radius: 140, rainbow, from: 0.7 });
    this.dust(x, y, 40);
  }

  /** Lightning that starts behind the card edge and shoots outward. */
  _radialBolts(x, y, n, { color, width = 2.5, radius = 130, rainbow = false, from = 0.62 } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU + rnd(-0.22, 0.22);
      const r0 = radius * rnd(from, 0.98);
      const r1 = r0 + rnd(170, 420);
      this.bolt(x + Math.cos(a) * r0, y + Math.sin(a) * r0, x + Math.cos(a) * r1, y + Math.sin(a) * r1, {
        color,
        width,
        life: rnd(0.34, 0.7),
        rainbow,
      });
    }
  }

  clear() {
    this.particles.length = 0;
    this.bolts.length = 0;
    this.rings.length = 0;
  }

  _cap() {
    if (this.particles.length > 520) this.particles.splice(0, this.particles.length - 520);
  }

  _loop(now) {
    this.raf = requestAnimationFrame(this._loop);
    // glow layer runs at ~30fps; nobody can tell, and it halves compositing
    if (now - this.last < 30) return;
    const dt = Math.min(0.06, this.last ? (now - this.last) / 1000 : 0.016);
    this.last = now;
    this.time += dt;
    this._update(dt);
    this._drawRays();
    this._draw();
  }

  _update(dt) {
    // ambient dust drifts up behind the roulette
    this.dustTimer -= dt;
    if (this.dustTimer <= 0 && this.particles.length < 90) {
      this.dustTimer = rnd(0.35, 0.9);
      this.particles.push({
        x: rnd(this.w * 0.12, this.w * 0.88),
        y: this.h * rnd(0.32, 0.72),
        vx: rnd(-8, 8),
        vy: rnd(-26, -8),
        g: 0,
        drag: 0.2,
        size: rnd(0.8, 2.1),
        life: rnd(2.4, 4.6),
        max: 4.6,
        color: this.accent,
        type: 'dust',
      });
    }

    const ps = this.particles;
    for (let i = ps.length - 1; i >= 0; i--) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) {
        ps.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.vx -= p.vx * Math.min(1, p.drag * dt);
      p.vy -= p.vy * Math.min(1, p.drag * dt * 0.6);
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.type === 'confetti') p.rot += p.vr * dt;
    }

    for (let i = this.bolts.length - 1; i >= 0; i--) {
      this.bolts[i].life -= dt;
      if (this.bolts[i].life <= 0) this.bolts.splice(i, 1);
    }
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const r = this.rings[i];
      r.life -= dt;
      r.r += (r.maxR - r.r) * Math.min(1, dt * 7);
      if (r.life <= 0) this.rings.splice(i, 1);
    }
    if (this.flashA > 0) this.flashA = Math.max(0, this.flashA - dt * 1.9);

    if (this.shakeAmp > 0.12) {
      const a = this.shakeAmp;
      this.onShake(rnd(-a, a), rnd(-a, a) * 0.7, a * 0.4);
      this.shakeAmp *= Math.pow(0.0025, dt);
      this.shaking = true;
    } else if (this.shaking) {
      this.shakeAmp = 0;
      this.shaking = false;
      this.onShake(0, 0, 0);
    }
  }

  _draw() {
    const { ctx, dpr } = this;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, this.w, this.h);

    if (this.flashA > 0) {
      ctx.globalCompositeOperation = 'lighter';
      if (this.flashX != null) {
        // radial flash that stays on the card so the banner and buttons
        // stay readable right through the burst
        const a = this.flashA;
        const r = Math.hypot(this.w, this.h) * 0.55;
        const g = ctx.createRadialGradient(this.flashX, this.flashY, 0, this.flashX, this.flashY, r);
        g.addColorStop(0, this._rgba(this.flashColor, a));
        g.addColorStop(0.24, this._rgba(this.flashColor, a * 0.5));
        g.addColorStop(0.55, this._rgba(this.flashColor, a * 0.08));
        g.addColorStop(1, this._rgba(this.flashColor, 0));
        ctx.fillStyle = g;
      } else {
        ctx.globalAlpha = this.flashA;
        ctx.fillStyle = this.flashColor;
      }
      ctx.fillRect(0, 0, this.w, this.h);
      ctx.globalAlpha = 1;
    }

    // rings
    for (const r of this.rings) {
      const a = Math.max(0, r.life / r.max);
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = r.color;
      ctx.globalAlpha = a * 0.85;
      ctx.lineWidth = r.width * (0.4 + a * 0.8);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }

    // lightning
    if (this.bolts.length) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      for (const b of this.bolts) {
        const a = Math.max(0, b.life / b.max);
        const col = b.rainbow ? `hsl(${(this.time * 320 + b.hue) % 360} 100% 68%)` : b.color;
        const pts = this._jagged(b);
        // glow pass
        ctx.globalAlpha = 0.28 * a;
        ctx.strokeStyle = col;
        ctx.lineWidth = b.width * 4.5;
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        // core pass
        ctx.globalAlpha = 0.95 * a;
        ctx.strokeStyle = b.rainbow ? '#ffffff' : '#ffffff';
        ctx.lineWidth = Math.max(1, b.width * 0.55);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
        // colored mid pass
        ctx.globalAlpha = 0.8 * a;
        ctx.strokeStyle = col;
        ctx.lineWidth = Math.max(1, b.width * 1.2);
        ctx.beginPath();
        ctx.moveTo(pts[0][0], pts[0][1]);
        for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
        ctx.stroke();
      }
    }

    // particles
    if (this.particles.length) {
      ctx.globalCompositeOperation = 'lighter';
      for (const p of this.particles) {
        const a = Math.max(0, Math.min(1, p.life / (p.type === 'confetti' ? p.max : Math.min(p.max, 0.9))));
        ctx.globalAlpha = a;
        ctx.fillStyle = p.color;
        if (p.type === 'confetti') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
          ctx.restore();
        } else {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (0.5 + a * 0.6), 0, TAU);
          ctx.fill();
        }
      }
    }

    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  _rgba(hex, a) {
    const h = hex.replace('#', '');
    const n = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const num = parseInt(n, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r},${g},${b},${a})`;
  }

  _jagged(b) {
    const segs = 10;
    const dx = b.x2 - b.x1;
    const dy = b.y2 - b.y1;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const pts = [[b.x1, b.y1]];
    for (let i = 1; i < segs; i++) {
      const t = i / segs;
      const amp = Math.sin(t * Math.PI) * Math.min(52, len * 0.17);
      const off = (Math.random() * 2 - 1) * amp;
      pts.push([b.x1 + dx * t + nx * off, b.y1 + dy * t + ny * off]);
    }
    pts.push([b.x2, b.y2]);
    return pts;
  }
}

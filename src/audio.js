/** Tiny Web Audio synth: roulette ticks, click, and rarity fanfares. No assets. */
const SOUND_KEY = 'egg-gacha.sound';

export class Sfx {
  constructor() {
    this.enabled = true;
    this.ctx = null;
    this.master = null;
    this.noiseBuf = null;
    this.lastTick = 0;
    try {
      if (localStorage.getItem(SOUND_KEY) === 'off') this.enabled = false;
    } catch (_) {
      /* storage may be blocked */
    }
  }

  /** Must be called from a user gesture (click/touch). */
  unlock() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.enabled ? 0.9 : 0;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this._noiseBuffer();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return true;
  }

  setEnabled(on) {
    this.enabled = !!on;
    if (this.master) {
      this.master.gain.cancelScheduledValues(this.ctx.currentTime);
      this.master.gain.setTargetAtTime(this.enabled ? 0.9 : 0, this.ctx.currentTime, 0.02);
    }
    try {
      localStorage.setItem(SOUND_KEY, this.enabled ? 'on' : 'off');
    } catch (_) {
      /* ignore */
    }
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  get ready() {
    return !!this.ctx && this.ctx.state === 'running' && this.enabled;
  }

  _noiseBuffer() {
    const len = Math.floor(this.ctx.sampleRate * 1.2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  _tone({ freq, to, dur = 0.18, type = 'sine', vol = 0.18, at = 0, attack = 0.006 }) {
    if (!this.ready) return;
    const t = this.ctx.currentTime + at;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(this.master);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  _noise({ dur = 0.5, vol = 0.25, at = 0, from = 6000, to = 200, type = 'lowpass', q = 1 }) {
    if (!this.ready || !this.noiseBuf) return;
    const t = this.ctx.currentTime + at;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = this.ctx.createBiquadFilter();
    filt.type = type;
    filt.Q.value = q;
    filt.frequency.setValueAtTime(from, t);
    filt.frequency.exponentialRampToValueAtTime(Math.max(60, to), t + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(filt).connect(g).connect(this.master);
    src.start(t);
    src.stop(t + dur + 0.02);
  }

  /** Tick when a card crosses the center marker. `speed` 0..1 (fast → bright). */
  tick(speed = 1) {
    if (!this.ready) return;
    const now = this.ctx.currentTime;
    if (now - this.lastTick < 0.022) return; // never machine-gun
    this.lastTick = now;
    const s = Math.max(0, Math.min(1, speed));
    this._tone({ freq: 620 + 520 * s, to: 430 + 260 * s, dur: 0.055, type: 'triangle', vol: 0.055 });
    this._tone({ freq: 1800 + 900 * s, dur: 0.02, type: 'square', vol: 0.012 });
  }

  click() {
    if (!this.ready) return;
    this._tone({ freq: 660, to: 990, dur: 0.07, type: 'triangle', vol: 0.06 });
  }

  /** Rarity fanfare. rank: 0 common, 1 rare, 2 epic, 3 legendary. */
  reveal(rank = 0) {
    if (!this.ready) return;
    if (rank <= 0) {
      this._tone({ freq: 523.25, dur: 0.22, type: 'sine', vol: 0.16 });
      this._tone({ freq: 783.99, dur: 0.34, type: 'sine', vol: 0.13, at: 0.09 });
      return;
    }
    if (rank === 1) {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this._tone({ freq: f, dur: 0.26, type: 'triangle', vol: 0.14, at: i * 0.065 })
      );
      this._noise({ dur: 0.3, vol: 0.05, at: 0.05, from: 9000, to: 3000, type: 'highpass' });
      return;
    }
    if (rank === 2) {
      this._noise({ dur: 0.55, vol: 0.2, at: 0, from: 7000, to: 300 });
      this._tone({ freq: 90, to: 42, dur: 0.5, type: 'sine', vol: 0.3 });
      [659.25, 830.61, 987.77, 1318.5].forEach((f, i) =>
        this._tone({ freq: f, dur: 0.3, type: 'sawtooth', vol: 0.075, at: 0.05 + i * 0.07 })
      );
      this._tone({ freq: 1567.98, dur: 0.6, type: 'sine', vol: 0.1, at: 0.36 });
      return;
    }
    // legendary
    this._noise({ dur: 0.9, vol: 0.28, at: 0, from: 9000, to: 200 });
    this._tone({ freq: 70, to: 30, dur: 0.9, type: 'sine', vol: 0.4 });
    const run = [523.25, 659.25, 783.99, 1046.5, 1318.5, 1567.98, 2093];
    run.forEach((f, i) => this._tone({ freq: f, dur: 0.42, type: 'triangle', vol: 0.12, at: 0.06 + i * 0.062 }));
    run.forEach((f, i) =>
      this._tone({ freq: f * 2, dur: 0.5, type: 'sine', vol: 0.05, at: 0.2 + i * 0.062 })
    );
    this._tone({ freq: 2093, dur: 1.1, type: 'sine', vol: 0.1, at: 0.55 });
    this._tone({ freq: 2637, dur: 1.1, type: 'sine', vol: 0.07, at: 0.66 });
    this._noise({ dur: 1.2, vol: 0.07, at: 0.5, from: 12000, to: 6000, type: 'highpass' });
  }
}

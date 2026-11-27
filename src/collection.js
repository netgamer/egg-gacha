const KEY = 'egg-gacha.collection.v1';

export class Collection {
  constructor(eggs) {
    this.eggs = eggs;
    this.counts = {};
    this.pulls = 0;
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        this.pulls = Number(data.pulls) || 0;
        const ids = new Set(this.eggs.map((e) => e.id));
        for (const [id, n] of Object.entries(data.counts || {})) {
          if (ids.has(id) && Number(n) > 0) this.counts[id] = Math.floor(Number(n));
        }
      }
    } catch (_) {
      /* corrupted or blocked storage → start fresh */
    }
  }

  save() {
    try {
      localStorage.setItem(KEY, JSON.stringify({ v: 1, pulls: this.pulls, counts: this.counts }));
    } catch (_) {
      /* ignore quota/privacy errors */
    }
  }

  add(id) {
    this.counts[id] = (this.counts[id] || 0) + 1;
    this.pulls += 1;
    this.save();
  }

  count(id) {
    return this.counts[id] || 0;
  }

  get found() {
    return this.eggs.reduce((n, e) => n + (this.count(e.id) > 0 ? 1 : 0), 0);
  }

  get total() {
    return this.eggs.length;
  }

  reset() {
    this.counts = {};
    this.pulls = 0;
    try {
      localStorage.removeItem(KEY);
    } catch (_) {
      /* ignore */
    }
  }

  snapshot() {
    return { pulls: this.pulls, found: this.found, total: this.total, counts: { ...this.counts } };
  }
}

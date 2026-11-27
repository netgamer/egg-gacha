/**
 * Persistence for hatched dragons + eggs waiting to be hatched.
 * One small localStorage record each so the game survives reloads.
 */
const KEY = 'egg-gacha.dragons.v1';
const PENDING_KEY = 'egg-gacha.pending.v1';
const MAX = 240;

export class DragonCollection {
  constructor() {
    this.list = [];
    this.nextSerial = 1;
    this.pending = [];
    this.load();
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const data = JSON.parse(raw);
        if (data && Array.isArray(data.list)) {
          this.list = data.list.filter((d) => d && d.parts && d.egg).slice(0, MAX);
          this.nextSerial = Number(data.nextSerial) || this.list.length + 1;
        }
      }
    } catch (_) {
      /* corrupted / blocked storage → start empty */
    }
    try {
      const rawP = localStorage.getItem(PENDING_KEY);
      if (rawP) {
        const arr = JSON.parse(rawP);
        if (Array.isArray(arr)) {
          this.pending = arr
            .map((x) => (typeof x === 'string' ? { uid: `p${this.pending.length}${x}`, egg: x } : x))
            .filter((x) => x && x.egg && x.uid);
        }
      }
    } catch (_) {
      /* ignore */
    }
  }

  save() {
    try {
      localStorage.setItem(
        KEY,
        JSON.stringify({ v: 1, nextSerial: this.nextSerial, list: this.list.slice(0, MAX) })
      );
    } catch (_) {
      /* quota / privacy mode */
    }
  }

  savePending() {
    try {
      localStorage.setItem(PENDING_KEY, JSON.stringify(this.pending));
    } catch (_) {
      /* ignore */
    }
  }

  /** Persist a fresh hatch result and return the stored record. */
  add(hatch) {
    const serial = this.nextSerial++;
    const dragon = {
      id: `d${serial.toString(36)}${Date.now().toString(36)}`,
      serial,
      egg: hatch.egg,
      parts: { ...hatch.parts },
      rarity: hatch.rarity,
      affinity: hatch.affinity,
      ts: Date.now(),
    };
    this.list.unshift(dragon);
    if (this.list.length > MAX) this.list.length = MAX;
    this.save();
    return dragon;
  }

  get count() {
    return this.list.length;
  }

  /** Most recent dragon first; `serial` desc fallback. */
  all() {
    return this.list;
  }

  find(id) {
    return this.list.find((d) => d.id === id) || null;
  }

  /* ------------------------------------------------------------- pending -- */

  addPending(eggId) {
    const uid = `p${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
    this.pending.push({ uid, egg: eggId, ts: Date.now() });
    this.savePending();
    return uid;
  }

  /** Remove and return the pending egg at `index` (defaults to the first). */
  takePending(index = 0) {
    if (!this.pending.length) return null;
    const [entry] = this.pending.splice(index, 1);
    this.savePending();
    return entry && entry.egg ? entry : null;
  }

  takePendingUid(uid) {
    const i = this.pending.findIndex((p) => p.uid === uid);
    if (i < 0) return null;
    return this.takePending(i);
  }

  clearPending() {
    this.pending = [];
    this.savePending();
  }

  reset() {
    this.list = [];
    this.nextSerial = 1;
    this.pending = [];
    try {
      localStorage.removeItem(KEY);
      localStorage.removeItem(PENDING_KEY);
    } catch (_) {
      /* ignore */
    }
  }
}

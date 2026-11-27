import './style.css';
import { EGGS, EGG_BY_ID, RARITY, pickEgg, oddsText } from './data.js';
import { Sfx } from './audio.js';
import { Fx } from './fx.js';
import { Roulette } from './roulette.js';
import { Collection } from './collection.js';

const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);

const el = {
  app: $('#app'),
  stage: $('#stage'),
  banner: $('#banner'),
  bannerText: $('#bannerText'),
  results: $('#results'),
  pull1: $('#pull1'),
  pull5: $('#pull5'),
  soundBtn: $('#soundBtn'),
  dexBtn: $('#dexBtn'),
  dex: $('#dex'),
  dexGrid: $('#dexGrid'),
  dexSummary: $('#dexSummary'),
  dexCount: $('#dexCount'),
  dexClose: $('#dexClose'),
  sheetBackdrop: $('#sheetBackdrop'),
  foundCount: $('#foundCount'),
  pullCount: $('#pullCount'),
  odds: $('#odds'),
  miniOdds: $('#miniOdds'),
  resetBtn: $('#resetBtn'),
  hint: $('#hint'),
  aura: $('#aura'),
  rays: $('#rays'),
};

const sfx = new Sfx();
const fx = new Fx($('#fx'), {
  onShake: (x, y) => {
    el.stage.style.transform = x || y ? `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` : '';
  },
});
const collection = new Collection(EGGS);
const roulette = new Roulette({
  el: $('#roulette'),
  track: $('#track'),
  frame: $('#centerFrame'),
  onTick: (speed) => sfx.tick(speed),
});

let busy = false;
let forced = [];

/* ---------------------------------------------------------------- banner -- */

function showBanner(text, rarity = null, { dim = false } = {}) {
  el.banner.classList.remove('show', 'r-common', 'r-rare', 'r-epic', 'r-legendary', 'dim', 'spin');
  // restart the pop animation
  void el.banner.offsetWidth;
  el.bannerText.textContent = text;
  if (rarity) el.banner.classList.add('r-' + rarity.key);
  if (dim) el.banner.classList.add('dim');
  el.banner.classList.add('show');
}

function setIdleBanner() {
  el.banner.classList.remove('r-common', 'r-rare', 'r-epic', 'r-legendary', 'spin');
  showBanner('행운을 빌어요!', null, { dim: true });
}

/* ------------------------------------------------------------------- hud -- */

function updateHud() {
  const found = collection.found;
  el.dexCount.textContent = String(found);
  el.foundCount.textContent = String(found);
  el.pullCount.textContent = String(collection.pulls);
  el.dexSummary.textContent = `발견 ${found} / ${collection.total} · 총 ${collection.pulls}회 뽑기`;
  for (const item of el.dexGrid.children) {
    const id = item.dataset.id;
    const n = collection.count(id);
    const img = item.querySelector('img');
    const name = item.querySelector('.dex-name');
    const count = item.querySelector('.dex-count');
    item.classList.toggle('locked', n === 0);
    img.classList.toggle('silhouette', n === 0);
    name.textContent = EGG_BY_ID[id].name;
    count.textContent = n > 0 ? `×${n}` : '미발견';
  }
}

/* --------------------------------------------------------------- results -- */

function renderSlots() {
  el.results.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    const slot = document.createElement('div');
    slot.className = 'slot';
    slot.textContent = '·';
    el.results.appendChild(slot);
  }
  el.results.classList.remove('has');
  el.miniOdds.classList.remove('hide');
}

function clearResults() {
  renderSlots();
}

function addResultChip(egg) {
  const rar = RARITY[egg.rarity];
  const chip = document.createElement('div');
  chip.className = 'chip';
  chip.dataset.rarity = egg.rarity;
  chip.style.setProperty('--rar', rar.color);
  chip.innerHTML = `<span class="chip-art"><img src="${egg.img}" alt="${egg.name}" /></span>
    <span class="chip-name">${egg.name}</span>`;
  el.results.classList.add('has');
  el.miniOdds.classList.add('hide');
  el.results.appendChild(chip);
  const chips = el.results.querySelectorAll('.chip');
  if (chips.length > 5) chips[0].remove();
}

/* ---------------------------------------------------------------- reveal -- */

function reveal(egg, { withChips = false } = {}) {
  const rar = RARITY[egg.rarity];
  roulette.setFrameColor(rar.color, rar.glow);
  el.app.style.setProperty('--rar', rar.color);
  el.app.style.setProperty('--rar-glow', rar.glow);
  el.aura.style.setProperty('--aura', rar.color);

  const rect = roulette.centerRect();
  fx.setAccent(rar.color);
  fx.celebrate(rar.rank, rect.left + rect.width / 2, rect.top + rect.height / 2, {
    rainbow: !!rar.rainbow,
    color: rar.color,
  });
  sfx.reveal(rar.rank);

  showBanner(egg.banner, rar);
  collection.add(egg.id);
  updateHud();
  if (withChips) addResultChip(egg);
  if (egg.rarity !== 'common') el.hint.textContent = `${RARITY[egg.rarity].label} 알을 발견했어요!`;

  if (navigator.vibrate) {
    try {
      navigator.vibrate(rar.rank >= 2 ? [18, 40, 26] : 12);
    } catch (_) {
      /* not supported */
    }
  }
}

/* ------------------------------------------------------------------ pull -- */

function nextEgg() {
  if (forced.length) {
    const id = forced.shift();
    if (EGG_BY_ID[id]) return EGG_BY_ID[id];
  }
  return pickEgg();
}

function setBusy(on) {
  busy = on;
  el.pull1.disabled = on;
  el.pull5.disabled = on;
  el.app.classList.toggle('busy', on);
}

async function pull(n = 1) {
  if (busy) return null;
  sfx.unlock();
  setBusy(true);
  clearResults();
  el.hint.textContent = '알이 굴러가는 중…';

  const winners = [];
  for (let i = 0; i < n; i++) winners.push(nextEgg());

  roulette.setFrameColor('#37e2ff', 'rgba(55,226,255,.75)');
  el.aura.style.setProperty('--aura', '#6a4bff');
  showBanner('두근두근…', null, { dim: true });

  const pulled = [];
  for (let i = 0; i < n; i++) {
    const duration = n === 1 ? 4300 : i === 0 ? 2500 : 900;
    const distance = n === 1 ? rand(36, 40) : i === 0 ? rand(29, 32) : rand(6, 8);
    await roulette.spinTo(winners[i].id, { duration, distance });
    await wait(n === 1 ? 90 : 140);
    reveal(winners[i], { withChips: n > 1 });
    pulled.push(winners[i].id);
    if (i < n - 1) await wait(n === 1 ? 0 : 420);
  }

  if (n > 1) el.hint.textContent = '도감에서 모은 알을 확인해 보세요';
  setBusy(false);
  return pulled;
}

/* ------------------------------------------------------------------- dex -- */

function buildDex() {
  el.dexGrid.innerHTML = '';
  for (const egg of EGGS) {
    const rar = RARITY[egg.rarity];
    const item = document.createElement('div');
    item.className = 'dex-item';
    item.dataset.id = egg.id;
    item.dataset.rarity = egg.rarity;
    item.style.setProperty('--rar', rar.color);
    item.innerHTML = `
      <span class="dex-art"><img src="${egg.img}" alt="${egg.name}" /></span>
      <span class="dex-info">
        <span class="dex-rar">${rar.label}</span>
        <strong class="dex-name">${egg.name}</strong>
        <span class="dex-count">미발견</span>
      </span>`;
    el.dexGrid.appendChild(item);
  }
  el.odds.textContent = `확률 — ${oddsText()}`;
}

function openDex() {
  updateHud();
  el.dex.classList.add('open');
  el.dex.setAttribute('aria-hidden', 'false');
  el.sheetBackdrop.classList.add('show');
  sfx.click();
}

function closeDex() {
  el.dex.classList.remove('open');
  el.dex.setAttribute('aria-hidden', 'true');
  el.sheetBackdrop.classList.remove('show');
}

/* ---------------------------------------------------------------- events -- */

el.pull1.addEventListener('click', () => pull(1));
el.pull5.addEventListener('click', () => pull(5));

el.soundBtn.addEventListener('click', () => {
  sfx.unlock();
  const on = sfx.toggle();
  el.soundBtn.setAttribute('aria-pressed', String(on));
  el.soundBtn.setAttribute('aria-label', on ? '소리 끄기' : '소리 켜기');
  el.app.classList.toggle('muted', !on);
  if (on) sfx.click();
});

el.dexBtn.addEventListener('click', openDex);
el.dexClose.addEventListener('click', closeDex);
el.sheetBackdrop.addEventListener('click', closeDex);
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeDex();
});

let resetArm = 0;
el.resetBtn.addEventListener('click', () => {
  if (Date.now() < resetArm) {
    collection.reset();
    updateHud();
    el.resetBtn.textContent = '기록 초기화';
    el.resetBtn.classList.remove('armed');
    resetArm = 0;
    setIdleBanner();
    el.hint.textContent = '알을 뽑으면 도감에 기록돼요';
    sfx.click();
  } else {
    resetArm = Date.now() + 3000;
    el.resetBtn.textContent = '한 번 더 누르면 초기화';
    el.resetBtn.classList.add('armed');
    setTimeout(() => {
      if (Date.now() >= resetArm) {
        el.resetBtn.textContent = '기록 초기화';
        el.resetBtn.classList.remove('armed');
      }
    }, 3100);
  }
});

// unlock audio on the first touch anywhere
const unlock = () => {
  try {
    sfx.unlock();
  } catch (_) {
    /* audio unavailable (headless / blocked) */
  }
  window.removeEventListener('pointerdown', unlock);
};
window.addEventListener('pointerdown', unlock, { once: true });

/* ------------------------------------------------------------------ boot -- */

buildDex();
updateHud();
el.miniOdds.textContent = `8종의 알 · 전설 0.4%`;
renderSlots();
el.soundBtn.setAttribute('aria-pressed', String(sfx.enabled));
el.app.classList.toggle('muted', !sfx.enabled);
setIdleBanner();
roulette.setFrameColor('#ff4dd2', 'rgba(255,77,210,.7)');

const preload = Promise.all(
  EGGS.map(
    (egg) =>
      new Promise((resolve) => {
        const img = new Image();
        img.onload = resolve;
        img.onerror = resolve;
        img.src = egg.img;
      })
  )
);

// small hook so automated tests can drive the game deterministically
window.__eggGacha = {
  ready: false,
  pull,
  queue: (ids) => {
    forced = [...ids];
  },
  state: () => ({
    spinning: roulette.spinning,
    busy,
    p: roulette.p,
    banner: el.bannerText.textContent,
    found: collection.found,
    pulls: collection.pulls,
    counts: { ...collection.counts },
    dexOpen: el.dex.classList.contains('open'),
  }),
  eggIds: EGGS.map((e) => e.id),
  fx,
  roulette,
};

preload.then(() => {
  window.__eggGacha.ready = true;
  el.app.classList.add('ready');
});

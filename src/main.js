import './style.css';
import { EGGS, EGG_BY_ID, RARITY, pickEgg, oddsText } from './data.js';
import { Sfx } from './audio.js';
import { Fx } from './fx.js';
import { Roulette } from './roulette.js';
import { Collection } from './collection.js';
import { DragonCollection } from './dragon-collection.js';
import { dragonThumb, clearThumbs, BLANK } from './dragon-thumb.js';
import { composeCardUrl, preloadDragonArt as preloadArt, clearArtCache, clearCardCache, pruneArtCache, debugCompose, dragonSilhouette } from './dragon-compose.js';
import { mountAura, stopAuras, auraStats, auraSeed } from './dragon-aura.js';
import {
  DRAGON_LAYERS,
  ELEMENT_META,
  ELEMENT_FAMILY,
  PART_WEIGHT,
  RANK,
  hatchDragon,
  dragonLayers,
  dragonName,
  dragonRarity,
  dragonElement,
} from './dragon.js';

const PARTS_BASE = import.meta.env.BASE_URL;
const $ = (sel) => document.querySelector(sel);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const rand = (a, b) => a + Math.random() * (b - a);
const pad3 = (n) => String(n).padStart(3, '0');
const esc = (s) =>
  String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
  // dragons
  dragonCount: $('#dragonCount'),
  tabEggCount: $('#tabEggCount'),
  tabDragonCount: $('#tabDragonCount'),
  tabEggs: $('#tabEggs'),
  tabDragons: $('#tabDragons'),
  eggPanel: $('#eggPanel'),
  dragonPanel: $('#dragonPanel'),
  dragonGrid: $('#dragonGrid'),
  dragonEmpty: $('#dragonEmpty'),
  detail: $('#detail'),
  detailBox: $('#detailBox'),
  hatch: $('#hatch'),
  hatchClose: $('#hatchClose'),
  hatchStage: $('#hatchStage'),
  hatchStep: $('#hatchStep'),
  hatchTitle: $('#hatchTitle'),
  hatchSub: $('#hatchSub'),
  hatchBtn: $('#hatchBtn'),
  eggWrap: $('#eggWrap'),
  hatchEggImg: $('#hatchEggImg'),
  hatchCue: $('#hatchCue'),
  revealWrap: $('#revealWrap'),
  revealCard: $('#revealCard'),
  nextHatch: $('#nextHatch'),
  nextHatchSub: $('#nextHatchSub'),
  revealClose: $('#revealClose'),
};

const sfx = new Sfx();
const fx = new Fx($('#fx'), {
  onShake: (x, y) => {
    el.stage.style.transform = x || y ? `translate3d(${x.toFixed(2)}px, ${y.toFixed(2)}px, 0)` : '';
  },
});
const collection = new Collection(EGGS);
const dragons = new DragonCollection();
const roulette = new Roulette({
  el: $('#roulette'),
  track: $('#track'),
  frame: $('#centerFrame'),
  onTick: (speed) => sfx.tick(speed),
});

let busy = false;
let forced = [];
let dexTab = 'eggs';

/* ---------------------------------------------------------------- banner -- */

function showBanner(text, rarity = null, { dim = false } = {}) {
  el.banner.classList.remove('show', 'r-common', 'r-rare', 'r-epic', 'r-legendary', 'dim', 'spin');
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
  el.dragonCount.textContent = String(dragons.count);
  el.tabEggCount.textContent = String(found);
  el.tabDragonCount.textContent = String(dragons.count);
  el.dexSummary.textContent =
    dexTab === 'eggs'
      ? `발견 ${found} / ${collection.total} · 총 ${collection.pulls}회 뽑기`
      : `부화 ${dragons.count}마리 · 6파츠 조합`;
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
  updateCue();
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

function addResultChip(egg, pendingUid) {
  const rar = RARITY[egg.rarity];
  const chip = document.createElement('div');
  chip.className = 'chip pending';
  chip.dataset.rarity = egg.rarity;
  chip.dataset.pending = pendingUid || '';
  chip.setAttribute('role', 'button');
  chip.setAttribute('tabindex', '0');
  chip.setAttribute('aria-label', `${egg.name} 부화시키기`);
  chip.style.setProperty('--rar', rar.color);
  chip.innerHTML = `<span class="chip-art"><img src="${egg.img}" alt="${egg.name}" /></span>
    <span class="chip-name">${egg.name}</span>`;
  const open = () => {
    if (chip.dataset.pending) openHatch(chip.dataset.pending);
  };
  chip.addEventListener('click', open);
  chip.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
    }
  });
  el.results.classList.add('has');
  el.miniOdds.classList.add('hide');
  el.results.appendChild(chip);
  const chips = el.results.querySelectorAll('.chip');
  if (chips.length > 5) chips[0].remove();
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
    revealEgg(winners[i], n);
    pulled.push(winners[i].id);
    if (i < n - 1) await wait(n === 1 ? 0 : 420);
  }

  el.hint.textContent =
    dragons.pending.length > 1
      ? `알 ${dragons.pending.length}개가 부화를 기다려요 — 탭해서 깨 보세요!`
      : '알을 탭하거나 [알 깨기]를 눌러 부화시켜 보세요';
  setBusy(false);
  updateCue();
  updateHud();
  return pulled;
}

/* ---------------------------------------------------------------- reveal -- */

function revealEgg(egg, n = 1) {
  const rar = RARITY[egg.rarity];
  fx.clear();
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
  const uid = dragons.addPending(egg.id);
  addResultChip(egg, uid);
  updateHud();
  if (egg.rarity !== 'common') el.hint.textContent = `${rar.label} 알을 발견했어요!`;

  if (navigator.vibrate) {
    try {
      navigator.vibrate(rar.rank >= 2 ? [18, 40, 26] : 12);
    } catch (_) {
      /* not supported */
    }
  }
}

/* ----------------------------------------------------------- dragon card -- */

function artMarkup(dragon) {
  // One canvas rather than six <img> layers: the compositor lights the six
  // paintings with the same environment, which is what makes a cross-theme
  // hatch look like one painting instead of six stickers.
  // The <canvas> on top is the live elemental aura (dragon-aura.js).
  return `<img class="dc-canvas" data-dragon="${dragon.id}" alt="" draggable="false" decoding="async" />
    <canvas class="dc-aura" data-aura="${dragonElement(dragon)}" aria-hidden="true"></canvas>`;
}

/** Mount the animated aura on a card's canvas once its outline is known. */
async function mountCardAura(canvas, dragon) {
  if (!canvas || !canvas.getContext) return;
  const element = dragonElement(dragon);
  let profile = null;
  try {
    profile = await dragonSilhouette(dragon, PARTS_BASE);
  } catch (_) {
    profile = null;
  }
  // the card may have been closed or swapped while the outline loaded
  if (!canvas.isConnected) return;
  mountAura(canvas, { element, profile, seed: auraSeed(`${dragon.id}:${element}`) });
}

/** Paint every dragon card inside `root` (reveal card, detail modal). */
function paintCards(root) {
  for (const img of root.querySelectorAll('img.dc-canvas[data-dragon]')) {
    const d = dragons.find(img.dataset.dragon);
    if (!d) continue;
    const canvas = img.parentElement ? img.parentElement.querySelector('canvas.dc-aura') : null;
    mountCardAura(canvas, d);
    const box = img.parentElement ? img.parentElement.clientWidth : 320;
    composeCardUrl(d, PARTS_BASE, Math.min(560, Math.max(320, box * Math.min(2, window.devicePixelRatio || 1))))
      .then((url) => {
        if (!url || !img.isConnected) return;
        img.onload = () => img.classList.add('ready');
        img.onerror = () => img.classList.add('ready');
        img.src = url;
        if (img.complete && img.naturalWidth) img.classList.add('ready');
      })
      .catch(() => {});
  }
}

function traitsMarkup(dragon) {
  return dragonLayers(dragon, PARTS_BASE)
    .map((l) => {
      const c = RARITY[l.rarity].color;
      return `<li class="dc-trait" title="${esc(l.layerKo)} · ${esc(l.part.name)} (${RARITY[l.rarity].label})">
        <span class="k">${esc(l.layerKo)}</span>
        <span class="v">${esc(l.part.name)}</span>
        <span class="dot" style="--c:${c}"></span>
      </li>`;
    })
    .join('');
}

function dragonCard(dragon, { isNew = false } = {}) {
  const rar = dragonRarity(dragon);
  const egg = EGG_BY_ID[dragon.egg];
  const element = ELEMENT_META[dragonElement(dragon)] || ELEMENT_META[dragon.egg];
  const eggElement = ELEMENT_META[dragon.egg];
  return `<article class="dc" data-rarity="${dragon.rarity}" style="--rar:${rar.color}">
    <div class="dc-art">
      ${artMarkup(dragon)}
      ${isNew ? '<span class="dc-ribbon">NEW</span>' : ''}
      <div class="dc-badges">
        <span class="dc-badge">${rar.label}</span>
        <span class="dc-badge ghost">${element.icon} ${element.ko}</span>
      </div>
      <div class="dc-shine"></div>
    </div>
    <div class="dc-meta">
      <div>
        <h3 class="dc-name">${esc(dragonName(dragon))}</h3>
        <p class="dc-origin">🥚 ${esc(egg.name)}에서 부화 · ${eggElement.ko} 친화 ${Math.round(
          dragon.affinity * 100
        )}%</p>
      </div>
      <span class="dc-serial">#${pad3(dragon.serial)}</span>
    </div>
    <ul class="dc-traits">${traitsMarkup(dragon)}</ul>
  </article>`;
}

function preloadDragonArt(dragon) {
  return preloadArt(dragon, PARTS_BASE).catch(() => {});
}

/* ------------------------------------------------------------ hatch flow -- */

const hatch = { busy: false, uid: null };

function eggsWaiting() {
  return dragons.pending.length;
}

function updateCue() {
  const n = eggsWaiting();
  if (n > 0) {
    el.hatchCue.hidden = false;
    el.hatchCue.querySelector('.hc-text').textContent = n > 1 ? `${n}개 부화하기` : '알 깨기!';
  } else {
    el.hatchCue.hidden = true;
  }
}

function pendingIndex(uid) {
  if (!uid) return 0;
  const i = dragons.pending.findIndex((p) => p.uid === uid);
  return i < 0 ? 0 : i;
}

function resetEggStage() {
  stopAuras(el.revealCard);
  el.hatchStage.hidden = false;
  el.revealWrap.hidden = true;
  el.revealCard.innerHTML = '';
  el.eggWrap.classList.remove('shake', 'cracking', 'bursting');
  el.eggWrap.style.opacity = '';
  el.hatchBtn.hidden = false;
  el.hatchBtn.disabled = false;
  el.hatchTitle.textContent = '알이 흔들리고 있어요…';
  el.hatchSub.textContent = '톡톡 두드리면 곧 부화해요';
}

function updateHatchStep() {
  const total = eggsWaiting();
  el.hatchStep.textContent = total > 1 ? `부화 대기 ${total}개` : total === 1 ? '부화 대기 1개' : '';
  const next = el.nextHatch;
  if (total > 0 && el.revealWrap.hidden === false) {
    next.hidden = false;
    el.nextHatchSub.textContent = `${total}개 남음`;
  } else {
    next.hidden = true;
  }
}

function openHatch(uid) {
  if (!dragons.pending.length) return;
  hatch.uid = dragons.pending[pendingIndex(uid)]?.uid || dragons.pending[0].uid;
  const entry = dragons.pending[pendingIndex(uid)] || dragons.pending[0];
  const egg = EGG_BY_ID[entry.egg];
  el.hatchEggImg.src = egg.img;
  el.hatchEggImg.alt = egg.name;
  el.hatch.classList.add('open');
  el.hatch.setAttribute('aria-hidden', 'false');
  el.app.classList.add('hatching');
  resetEggStage();
  updateHatchStep();
  sfx.click();
}

function closeHatch() {
  stopAuras(el.revealCard);
  pruneArtCache(6);
  el.hatch.classList.remove('open');
  el.hatch.setAttribute('aria-hidden', 'true');
  el.app.classList.remove('fx-top', 'hatching');
  resetEggStage();
  updateCue();
  updateHud();
}

async function hatchCurrent() {
  if (hatch.busy) return null;
  const entry = dragons.pending[hatch.uid ? pendingIndex(hatch.uid) : 0];
  if (!entry) return null;
  const egg = EGG_BY_ID[entry.egg];
  hatch.busy = true;
  el.hatchBtn.disabled = true;
  el.hatchTitle.textContent = '흔들… 흔들…';
  el.hatchSub.textContent = '금이 가고 있어요!';

  el.eggWrap.classList.remove('cracking', 'bursting');
  el.eggWrap.classList.add('shake');
  sfx.crack(0.35);
  await wait(190);
  sfx.crack(0.5);
  await wait(200);
  el.eggWrap.classList.remove('shake');
  el.eggWrap.classList.add('cracking');
  sfx.crack(1);
  if (navigator.vibrate) {
    try {
      navigator.vibrate([10, 30, 14]);
    } catch (_) {
      /* ignore */
    }
  }
  await wait(440);
  el.eggWrap.classList.add('bursting');
  el.hatchTitle.textContent = '쩍—!';

  const result = hatchDragon(egg.id);
  const dragon = dragons.add(result);
  dragons.takePending(0);

  await preloadDragonArt(dragon);
  sfx.burst(RANK[dragon.rarity]);
  await wait(240);
  showDragonReveal(dragon);
  hatch.busy = false;
  el.hatchBtn.disabled = false;
  updateHud();
  return dragon;
}

function showDragonReveal(dragon) {
  const rar = dragonRarity(dragon);
  fx.clear();
  stopAuras(el.revealCard);
  el.hatchStage.hidden = true;
  el.revealWrap.hidden = false;
  el.revealCard.innerHTML = dragonCard(dragon, { isNew: true });
  paintCards(el.revealCard);
  const card = el.revealCard.querySelector('.dc');
  requestAnimationFrame(() => card && card.classList.add('pop'));

  el.app.classList.add('fx-top');
  fx.setAccent(rar.color);
  fx.celebrate(Math.max(1, rar.rank), window.innerWidth / 2, Math.min(window.innerHeight * 0.36, 300), {
    rainbow: !!rar.rainbow,
    color: rar.color,
  });
  setTimeout(() => el.app.classList.remove('fx-top'), 2200);
  sfx.reveal(Math.max(1, rar.rank));

  if (navigator.vibrate) {
    try {
      navigator.vibrate(rar.rank >= 2 ? [20, 45, 30] : 14);
    } catch (_) {
      /* ignore */
    }
  }
  updateHatchStep();
}

async function hatchNext() {
  if (!dragons.pending.length) return closeHatch();
  hatch.uid = dragons.pending[0].uid;
  const egg = EGG_BY_ID[dragons.pending[0].egg];
  el.hatchEggImg.src = egg.img;
  el.hatchEggImg.alt = egg.name;
  resetEggStage();
  updateHatchStep();
  await wait(60);
  hatchCurrent();
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

function renderDragons() {
  const list = dragons.all();
  el.dragonEmpty.hidden = list.length > 0;
  el.dragonGrid.innerHTML = list
    .slice(0, 60)
    .map((d) => {
      const rar = RARITY[d.rarity];
      return `<button class="dg" type="button" data-id="${d.id}" data-rarity="${d.rarity}" style="--rar:${rar.color}" aria-label="${esc(
        dragonName(d)
      )} #${d.serial} 상세 보기">
        <span class="dg-art"><img alt="" draggable="false" data-thumb="${d.id}" src="${BLANK}" /></span>
        <span class="dg-name">${esc(dragonName(d))}</span>
        <span class="dg-sub"><i>#${pad3(d.serial)}</i><span>${rar.label}</span></span>
      </button>`;
    })
    .join('');

  // Bake the gallery thumbnails one at a time: each one runs the full light
  // pass and a phone (or a software renderer) should never hold a dozen
  // compositing canvases at once.
  const byId = new Map(list.map((d) => [d.id, d]));
  const imgs = [...el.dragonGrid.querySelectorAll('img[data-thumb]')];
  let chain = Promise.resolve();
  for (const img of imgs) {
    const d = byId.get(img.dataset.thumb);
    if (!d) continue;
    chain = chain
      .then(() => dragonThumb(d, PARTS_BASE, 240))
      .then((url) => {
        if (url && img.isConnected) {
          img.src = url;
          img.dataset.ready = '1';
        }
      })
      .catch(() => {});
  }
}

function setTab(tab) {
  dexTab = tab;
  const on = tab === 'dragons';
  el.tabEggs.classList.toggle('is-on', !on);
  el.tabDragons.classList.toggle('is-on', on);
  el.tabEggs.setAttribute('aria-selected', String(!on));
  el.tabDragons.setAttribute('aria-selected', String(on));
  el.eggPanel.hidden = on;
  el.dragonPanel.hidden = !on;
  if (on) renderDragons();
  updateHud();
}

function openDex() {
  updateHud();
  renderDragons();
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

function openDetail(dragon) {
  if (!dragon) return;
  stopAuras(el.detailBox);
  el.detailBox.innerHTML = `${dragonCard(dragon)}<button class="btn btn-secondary detail-close" type="button" id="detailClose"><span class="btn-label">닫기</span></button>`;
  paintCards(el.detailBox);
  el.detail.classList.add('open');
  el.detail.setAttribute('aria-hidden', 'false');
  el.detailBox.querySelector('#detailClose').addEventListener('click', closeDetail);
  sfx.click();
}

function closeDetail() {
  stopAuras(el.detailBox);
  el.detail.classList.remove('open');
  el.detail.setAttribute('aria-hidden', 'true');
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
el.tabEggs.addEventListener('click', () => setTab('eggs'));
el.tabDragons.addEventListener('click', () => setTab('dragons'));

el.dragonGrid.addEventListener('click', (e) => {
  const btn = e.target.closest('.dg');
  if (!btn) return;
  openDetail(dragons.find(btn.dataset.id));
});

el.detail.addEventListener('click', (e) => {
  if (e.target === el.detail) closeDetail();
});

el.hatchCue.addEventListener('click', () => openHatch());
el.hatchClose.addEventListener('click', closeHatch);
el.hatchBtn.addEventListener('click', hatchCurrent);
el.eggWrap.addEventListener('click', hatchCurrent);
el.eggWrap.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    hatchCurrent();
  }
});
el.nextHatch.addEventListener('click', hatchNext);
el.revealClose.addEventListener('click', closeHatch);

// tapping the landed egg card in the roulette hatches it too
$('#roulette').addEventListener('click', (e) => {
  if (busy || !dragons.pending.length) return;
  const card = e.target.closest('.card.is-center');
  if (card) openHatch();
});

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (el.detail.classList.contains('open')) return closeDetail();
  if (el.hatch.classList.contains('open')) return closeHatch();
  closeDex();
});

let resetArm = 0;
el.resetBtn.addEventListener('click', () => {
  if (Date.now() < resetArm) {
    collection.reset();
    dragons.reset();
    clearThumbs();
    clearArtCache();
    clearCardCache();
    renderDragons();
    updateHud();
    el.resetBtn.textContent = '기록 초기화';
    el.resetBtn.classList.remove('armed');
    resetArm = 0;
    setIdleBanner();
    closeHatch();
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
renderDragons();
el.miniOdds.textContent = '8종의 알 · 전설 0.4%';
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

/* small hook so automated tests can drive the game deterministically */
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
    hatchOpen: el.hatch.classList.contains('open'),
    pending: dragons.pending.map((p) => p.egg),
    dragons: dragons.count,
    dragonList: dragons.all().map((d) => ({
      id: d.id,
      serial: d.serial,
      egg: d.egg,
      rarity: d.rarity,
      parts: { ...d.parts },
      affinity: d.affinity,
    })),
  }),
  eggIds: EGGS.map((e) => e.id),
  fx,
  roulette,
  // dragon hooks
  hatchDragon,
  hatchCurrent,
  hatchNext,
  seedDragons: (n = 12) => {
    const ids = EGGS.map((e) => e.id);
    for (let i = 0; i < n; i++) dragons.add(hatchDragon(ids[i % ids.length]));
    updateHud();
    renderDragons();
    return dragons.count;
  },
  openHatch,
  closeHatch,
  auraStats,
  seedDragon: (egg, parts, rarity = 'rare') => {
    const d = dragons.add({ egg: egg || 'white', parts: { ...parts }, rarity, affinity: 1 });
    updateHud();
    return d.id;
  },
  openDetailById: (id) => openDetail(dragons.find(id)),
  // open the hatch modal on an already-known dragon (deterministic screenshots)
  openRevealById: (id) => {
    const d = dragons.find(id);
    if (!d) return false;
    el.hatch.classList.add('open');
    el.hatch.setAttribute('aria-hidden', 'false');
    el.app.classList.add('hatching');
    showDragonReveal(d);
    return true;
  },
  partCount: DRAGON_LAYERS.reduce((s, l) => s + l.parts.length, 0),
  layers: DRAGON_LAYERS.map((l) => ({ id: l.id, ko: l.ko, count: l.parts.length })),
  partWeight: PART_WEIGHT,
  elementFamily: ELEMENT_FAMILY,
  parts: DRAGON_LAYERS.flatMap((l) => l.parts.map((p) => ({ layer: l.id, ...p }))),
  partBase: PARTS_BASE,
  debugCompose: (slots, w = 384, h = 480, opts = {}) => debugCompose(slots, PARTS_BASE, w, h, opts),
};

preload.then(() => {
  window.__eggGacha.ready = true;
  el.app.classList.add('ready');
});

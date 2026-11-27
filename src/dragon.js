/**
 * Dragon hatching logic — 6 slot composite with 80% elemental affinity.
 *
 * Every hatch rolls each of the six layers independently: with 80% probability
 * from the egg element's family, otherwise from every other element. Parts are
 * weighted by rarity inside the chosen pool (common > rare > epic > legendary).
 */
import { DRAGON_LAYERS, LAYER_KO, PART_BY_ID } from './dragon-parts.js';
import { RARITY } from './data.js';

export const AFFINITY = 0.8;

/** Egg element → elements that count as "same affinity". */
export const ELEMENT_FAMILY = {
  // keyed by egg id — note the golden egg's id is `golden`, while the golden
  // *part* element is `gold`
  white: ['white', 'spotted'],
  spotted: ['spotted', 'white', 'forest'],
  forest: ['forest', 'spotted'],
  fire: ['fire', 'gold'],
  ice: ['ice', 'white'],
  thunder: ['thunder', 'gold'],
  golden: ['gold', 'fire'],
  gold: ['gold', 'fire'],
  diamond: ['diamond', 'thunder'],
};

export const ELEMENT_META = {
  white: { ko: '하양', adj: '상아빛', color: '#FFF0D2', glow: 'rgba(255,232,184,.6)', icon: '🤍' },
  spotted: { ko: '점박이', adj: '점무늬', color: '#A8EFDA', glow: 'rgba(140,255,224,.55)', icon: '🩵' },
  forest: { ko: '숲', adj: '이끼빛', color: '#A6D37E', glow: 'rgba(155,255,122,.55)', icon: '🌿' },
  fire: { ko: '불꽃', adj: '화염', color: '#FF9251', glow: 'rgba(255,122,49,.65)', icon: '🔥' },
  ice: { ko: '얼음', adj: '서리', color: '#A6E4FF', glow: 'rgba(122,230,255,.6)', icon: '❄️' },
  thunder: { ko: '번개', adj: '뇌광', color: '#BB8CFF', glow: 'rgba(196,155,255,.6)', icon: '⚡' },
  gold: { ko: '황금', adj: '황금', color: '#FFD35C', glow: 'rgba(255,198,58,.6)', icon: '👑' },
  golden: { ko: '황금', adj: '황금', color: '#FFD35C', glow: 'rgba(255,198,58,.6)', icon: '👑' },
  diamond: { ko: '다이아', adj: '다이아', color: '#DFF3FF', glow: 'rgba(198,245,255,.7)', icon: '💎' },
};

export const PART_WEIGHT = { common: 50, rare: 30, epic: 15, legendary: 5 };
export const RANK = { common: 0, rare: 1, epic: 2, legendary: 3 };
export const RANK_KEY = ['common', 'rare', 'epic', 'legendary'];

const LAYER_PARTS = Object.fromEntries(DRAGON_LAYERS.map((l) => [l.id, l.parts]));

export function inFamily(element, eggElement) {
  const fam = ELEMENT_FAMILY[eggElement] || [eggElement];
  return fam.includes(element);
}

function weightedPick(pool, rand) {
  const total = pool.reduce((s, p) => s + PART_WEIGHT[p.rarity], 0);
  let r = rand() * total;
  for (const p of pool) {
    r -= PART_WEIGHT[p.rarity];
    if (r < 0) return p;
  }
  return pool[pool.length - 1];
}

/** Roll one layer for an egg element. */
export function rollPart(layerId, eggElement, rand = Math.random) {
  const all = LAYER_PARTS[layerId];
  const wantKin = rand() < AFFINITY;
  let pool = all.filter((p) => inFamily(p.element, eggElement) === wantKin);
  if (!pool.length) pool = all;
  return weightedPick(pool, rand);
}

/**
 * Build a dragon for an egg. Deterministic when `rand` is seeded.
 * Returns { egg, parts:{layer:partId}, rarity, affinity }.
 */
export function hatchDragon(eggId, rand = Math.random) {
  const parts = {};
  let rank = 0;
  let kin = 0;
  for (const layer of DRAGON_LAYERS) {
    const p = rollPart(layer.id, eggId, rand);
    parts[layer.id] = p.id;
    rank = Math.max(rank, RANK[p.rarity]);
    if (inFamily(p.element, eggId)) kin++;
  }
  return {
    egg: eggId,
    parts,
    rarity: RANK_KEY[rank],
    affinity: kin / DRAGON_LAYERS.length,
  };
}

/** Resolve stored part ids into catalog entries with resolved image URLs. */
export function dragonLayers(dragon, baseUrl) {
  return DRAGON_LAYERS.map((l) => {
    const p = PART_BY_ID[`${l.id}:${dragon.parts[l.id]}`];
    return { layer: l.id, layerKo: l.ko, part: p, url: baseUrl + p.img, rarity: p.rarity };
  });
}

export function dragonRarity(dragon) {
  return RARITY[dragon.rarity] || RARITY.common;
}

/** The dragon's own element comes from its body part (the dominant visual). */
export function dragonElement(dragon) {
  const body = PART_BY_ID[`body:${dragon.parts.body}`];
  return (body && body.element) || dragon.egg;
}

export function dragonName(dragon) {
  const meta = ELEMENT_META[dragonElement(dragon)] || ELEMENT_META[dragon.egg] || ELEMENT_META.white;
  return `${meta.adj} 드래곤`;
}

export function dragonTitle(dragon) {
  return `${dragonName(dragon)} #${String(dragon.serial).padStart(3, '0')}`;
}

/** Highest-rarity layer, used as the card's "signature" trait. */
export function signatureTrait(dragon) {
  const layers = dragonLayers(dragon, '');
  return layers.reduce((best, cur) => (RANK[cur.rarity] > RANK[best.rarity] ? cur : best), layers[0]);
}

export { DRAGON_LAYERS, LAYER_KO };

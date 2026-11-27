import whiteEgg from './assets/eggs/white-egg.webp';
import spottedEgg from './assets/eggs/spotted-egg.webp';
import forestEgg from './assets/eggs/forest-egg.webp';
import fireEgg from './assets/eggs/fire-egg.webp';
import iceEgg from './assets/eggs/ice-egg.webp';
import thunderEgg from './assets/eggs/thunder-egg.webp';
import goldenEgg from './assets/eggs/golden-egg.webp';
import diamondEgg from './assets/eggs/diamond-egg.webp';

export const RARITY = {
  common: { key: 'common', label: '일반', color: '#a9b8cf', glow: 'rgba(170,186,210,0.55)', rank: 0 },
  rare: { key: 'rare', label: '희귀', color: '#3fc8ff', glow: 'rgba(63,200,255,0.65)', rank: 1 },
  epic: { key: 'epic', label: '영웅', color: '#b673ff', glow: 'rgba(182,115,255,0.7)', rank: 2 },
  legendary: { key: 'legendary', label: '전설', color: '#ffd24d', glow: 'rgba(255,210,77,0.75)', rank: 3, rainbow: true },
};

/** 8 eggs. `weight` is out of 100 → exact odds shown in the 도감. */
export const EGGS = [
  {
    id: 'white',
    name: '하얀 알',
    rarity: 'common',
    weight: 30,
    img: whiteEgg,
    banner: '🥚 하얀 알 획득!',
    desc: '어디서나 만날 수 있는 평범한 알. 그래도 첫 알은 언제나 두근거린다.',
  },
  {
    id: 'spotted',
    name: '점박이 알',
    rarity: 'common',
    weight: 26,
    img: spottedEgg,
    banner: '🔵 점박이 알 획득!',
    desc: '민트빛 껍질에 동그란 점이 옹기종기. 톡톡 두드리면 웃음이 난다.',
  },
  {
    id: 'forest',
    name: '숲의 알',
    rarity: 'common',
    weight: 20,
    img: forestEgg,
    banner: '🌿 숲의 알 획득!',
    desc: '이끼와 작은 잎사귀가 감싼 알. 귀를 대면 숲의 숨소리가 들린다.',
  },
  {
    id: 'fire',
    name: '불꽃 알',
    rarity: 'rare',
    weight: 11,
    img: fireEgg,
    banner: '🔥 불꽃 알 획득!',
    desc: '흑요석 껍질 사이로 마그마가 흐른다. 만지면 따끈따끈.',
  },
  {
    id: 'ice',
    name: '얼음 알',
    rarity: 'rare',
    weight: 8,
    img: iceEgg,
    banner: '❄️ 얼음 알 획득!',
    desc: '사파이어빛 얼음 결정으로 빚은 알. 주위에 서리가 내린다.',
  },
  {
    id: 'thunder',
    name: '번개 알',
    rarity: 'epic',
    weight: 3.2,
    img: thunderEgg,
    banner: '⚡ 번개 알 강림!!',
    desc: '보랏빛 플라스마가 감돈다. 손끝이 찌릿, 하늘이 노려보는 기분.',
  },
  {
    id: 'golden',
    name: '황금알',
    rarity: 'epic',
    weight: 1.4,
    img: goldenEgg,
    banner: '⚡ 황금 번개!!',
    desc: '24K 순금에 용의 비늘이 새겨진 알. 만지는 순간 부자가 된 기분.',
  },
  {
    id: 'diamond',
    name: '다이아몬드알',
    rarity: 'legendary',
    weight: 0.4,
    img: diamondEgg,
    banner: '🌈 무지개 번개!!!',
    desc: '무지개 빛을 갈라 품은 전설의 알. 세상에 단 하나뿐인 빛.',
  },
];

export const EGG_BY_ID = Object.fromEntries(EGGS.map((e) => [e.id, e]));

export const TOTAL_WEIGHT = EGGS.reduce((s, e) => s + e.weight, 0);

export function pickEgg(rand = Math.random) {
  let r = rand() * TOTAL_WEIGHT;
  for (const egg of EGGS) {
    r -= egg.weight;
    if (r < 0) return egg;
  }
  return EGGS[EGGS.length - 1];
}

/** Random egg for the visual reel (same odds as real draws). */
export function randomEggId(rand = Math.random) {
  return pickEgg(rand).id;
}

export function rarityOf(id) {
  return RARITY[EGG_BY_ID[id].rarity];
}

/** "일반 76% · 희귀 19% · 영웅 4.6% · 전설 0.4%" */
export function oddsText() {
  const byRarity = {};
  for (const e of EGGS) byRarity[e.rarity] = (byRarity[e.rarity] || 0) + e.weight;
  const fmt = (n) => {
    const v = Math.round((n / TOTAL_WEIGHT) * 1000) / 10;
    return Number.isInteger(v) ? `${v}%` : `${v.toFixed(1)}%`;
  };
  return ['common', 'rare', 'epic', 'legendary']
    .filter((k) => byRarity[k])
    .map((k) => `${RARITY[k].label} ${fmt(byRarity[k])}`)
    .join(' · ');
}

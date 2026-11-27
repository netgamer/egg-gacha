/**
 * body layer — torso, head, muzzle, scale/metal/crystal materials.
 * All variants share the exact canonical silhouette from base.mjs.
 */
import { PAL, renderBody, rngFor, f2, glowDef, lin, rad } from '../base.mjs';

const p = (el, over) => ({ ...PAL[el], ...over });

function spots(uid, color, n, { rmin = 9, rmax = 22, op = 0.5 } = {}) {
  const rnd = rngFor(uid + 'spots');
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 120 + rnd() * 280;
    const y = 130 + rnd() * 330;
    const r = rmin + rnd() * (rmax - rmin);
    out.push(
      `<ellipse cx="${f2(x)}" cy="${f2(y)}" rx="${f2(r)}" ry="${f2(r * (0.7 + rnd() * 0.5))}" fill="${color}" opacity="${f2(
        op * (0.6 + rnd() * 0.6)
      )}" transform="rotate(${f2(rnd() * 60 - 30)} ${f2(x)} ${f2(y)})"/>`
    );
  }
  return out.join('');
}

function crackWalk(uid, n, color, glow, { width = 2.4, seed = 'c', y0 = 200 } = {}) {
  const rnd = rngFor(uid + seed);
  const paths = [];
  for (let i = 0; i < n; i++) {
    let x = 150 + rnd() * 210;
    let y = y0 + rnd() * 120;
    let d = `M${f2(x)} ${f2(y)}`;
    const len = 3 + Math.floor(rnd() * 3);
    for (let k = 0; k < len; k++) {
      x += rnd() * 44 - 22;
      y += 18 + rnd() * 26;
      d += ` L${f2(x)} ${f2(y)}`;
      if (rnd() > 0.55) d += ` m0 0 l${f2(rnd() * 26 - 13)} ${f2(rnd() * 20 - 4)}`;
    }
    paths.push(d);
  }
  return `<g fill="none" stroke-linecap="round" stroke-linejoin="round">
    <g stroke="${glow}" stroke-width="${width * 4}" opacity="0.35" filter="url(#${uid}-crackGlow)">${paths
      .map((d) => `<path d="${d}"/>`)
      .join('')}</g>
    <g stroke="${color}" stroke-width="${width}">${paths.map((d) => `<path d="${d}"/>`).join('')}</g>
    <g stroke="#fff" stroke-width="${width * 0.45}" opacity="0.85">${paths
      .map((d) => `<path d="${d}"/>`)
      .join('')}</g>
  </g>`;
}

function sparkles(uid, color, n, area = [110, 120, 400, 400], size = 11) {
  const rnd = rngFor(uid + 'sp');
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = area[0] + rnd() * (area[2] - area[0]);
    const y = area[1] + rnd() * (area[3] - area[1]);
    const s = size * (0.5 + rnd() * 0.9);
    out.push(
      `<path d="M${f2(x)} ${f2(y - s)} L${f2(x + s * 0.22)} ${f2(y - s * 0.22)} L${f2(x + s)} ${f2(
        y
      )} L${f2(x + s * 0.22)} ${f2(y + s * 0.22)} L${f2(x)} ${f2(y + s)} L${f2(x - s * 0.22)} ${f2(
        y + s * 0.22
      )} L${f2(x - s)} ${f2(y)} L${f2(x - s * 0.22)} ${f2(y - s * 0.22)} Z" fill="${color}" opacity="${f2(
        0.55 + rnd() * 0.45
      )}"/>`
    );
  }
  return out.join('');
}

function facets(uid, cols, n = 26) {
  const rnd = rngFor(uid + 'fac');
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = 120 + rnd() * 280;
    const y = 120 + rnd() * 340;
    const s = 18 + rnd() * 46;
    const a = rnd() * Math.PI;
    const pts = [];
    const k = 3 + Math.floor(rnd() * 2);
    for (let j = 0; j < k; j++) {
      const t = a + (j / k) * Math.PI * 2 + rnd() * 0.4;
      const rr = s * (0.55 + rnd() * 0.6);
      pts.push(`${f2(x + Math.cos(t) * rr)} ${f2(y + Math.sin(t) * rr * 0.85)}`);
    }
    out.push(
      `<polygon points="${pts.join(' ')}" fill="${cols[i % cols.length]}" opacity="${f2(
        0.12 + rnd() * 0.2
      )}" stroke="#fff" stroke-width="0.8" stroke-opacity="0.3"/>`
    );
  }
  return out.join('');
}

const bodyDefs = (uid) => glowDef(`${uid}-crackGlow`, 7) + glowDef(`${uid}-neon`, 4);

export const bodyParts = [
  {
    id: 'ivory', name: '상아빛 비늘', element: 'white', rarity: 'common',
    draw: ({ uid }) => {
      const pal = p('white', { main: '#F8E4C6', light: '#FFFCF3', dark: '#DFC398', deep: '#B08A5E' });
      return renderBody({
        uid, pal,
        texture: () => spots(uid, '#EAD3AE', 14, { rmin: 16, rmax: 34, op: 0.35 }),
      });
    },
  },
  {
    id: 'spotted', name: '점박이 가죽', element: 'spotted', rarity: 'common',
    draw: ({ uid }) => {
      const pal = p('spotted', {});
      return renderBody({
        uid, pal, sheen: 'matte',
        texture: (u) => spots(u, '#3F917C', 22, { rmin: 10, rmax: 23, op: 0.55 }),
        overlay: () => spots(uid, '#2F7A68', 7, { rmin: 6, rmax: 12, op: 0.4 }),
      });
    },
  },
  {
    id: 'mossy', name: '이끼 비늘', element: 'forest', rarity: 'common',
    draw: ({ uid }) => {
      const pal = p('forest', { main: '#A8CF7C', light: '#E8F9C9', dark: '#6E984C', deep: '#3E5C28' });
      return renderBody({
        uid, pal, sheen: 'matte',
        texture: (u) => spots(u, '#5E8C3C', 18, { rmin: 8, rmax: 20, op: 0.5 }) +
          spots(u, '#C9E89A', 12, { rmin: 5, rmax: 11, op: 0.45 }),
        overlay: () => sparkles(uid, '#D8F7A8', 6, [140, 150, 380, 460], 9),
      });
    },
  },
  {
    id: 'emerald', name: '에메랄드 결정', element: 'forest', rarity: 'rare',
    draw: ({ uid }) => {
      const pal = p('forest', { main: '#63D8A0', light: '#D9FFEC', dark: '#2C9066', deep: '#0F5138', belly: '#B8F5D6', glow: '#7CFFC4' });
      return renderBody({
        uid, pal, sheen: 'crystal',
        scaleColor: '#0F5138',
        texture: (u) => facets(u, ['#B9FFE0', '#6CF3B4', '#2E9E72'], 20),
        overlay: () => sparkles(uid, '#EAFFF6', 9, [130, 140, 390, 460], 12),
      });
    },
  },
  {
    id: 'magma', name: '마그마 균열', element: 'fire', rarity: 'rare',
    draw: ({ uid }) => {
      const pal = p('fire', { main: '#5B3A34', light: '#8A6153', dark: '#2C1A16', deep: '#150A08', belly: '#6E4638', line: '#1B0D09', muzzle: '#7C5142', glow: '#FF7A31', eye: '#FFC24A' });
      return renderBody({
        uid, pal, sheen: 'matte', scales: false,
        texture: () => `<g>${facets(uid, ['#3A2320', '#6B463C'], 16)}</g>`,
        overlay: () => crackWalk(uid, 7, '#FFB347', '#FF5A18', { width: 2.6, y0: 180 }),
      });
    },
  },
  {
    id: 'furnace', name: '용광로 심장', element: 'fire', rarity: 'epic',
    draw: ({ uid }) => {
      const pal = p('fire', { main: '#C24A1F', light: '#FFC07A', dark: '#7A240E', deep: '#3D0F06', belly: '#FFB067', glow: '#FF8A2B' });
      return renderBody({
        uid, pal, sheen: 'gloss',
        texture: (u) => `<rect width="512" height="512" fill="url(#${u}-hot)" opacity="0.5"/>`,
        overlay: () => crackWalk(uid, 5, '#FFE08A', '#FF7A1F', { width: 2.2, y0: 240 }) +
          sparkles(uid, '#FFD27A', 8, [140, 170, 380, 450], 9),
      });
    },
    defs: (uid) => lin(`${uid}-hot`, [[0, '#FFB347', 0.35], [0.6, '#C24A1F', 0], [1, '#FF5A18', 0.4]], { x1: 0, y1: 0, x2: 0, y2: 1 }),
  },
  {
    id: 'frost', name: '서리 비늘', element: 'ice', rarity: 'rare',
    draw: ({ uid }) => {
      const pal = p('ice', { main: '#A6DDF7', light: '#F2FDFF', dark: '#5E9FC4', deep: '#2E607E', belly: '#E2F7FF' });
      return renderBody({
        uid, pal, sheen: 'crystal',
        texture: (u) => sparkles(u, '#FFFFFF', 14, [120, 130, 400, 470], 10) +
          facets(u, ['#EAF9FF', '#9FD8F5'], 14),
        overlay: () => `<g fill="none" stroke="#FFFFFF" stroke-width="1.6" opacity="0.6">
          <path d="M186 150 l14 22 l-14 22 l-14 -22 z"/>
          <path d="M300 132 l11 18 l-11 18 l-11 -18 z"/>
          <path d="M258 360 l12 20 l-12 20 l-12 -20 z"/>
        </g>`,
      });
    },
  },
  {
    id: 'permafrost', name: '빙하 결정', element: 'ice', rarity: 'epic',
    draw: ({ uid }) => {
      const pal = p('ice', { main: '#8FD9F5', light: '#EAFEFF', dark: '#4A9EC9', deep: '#20556F', belly: '#D6F6FF', glow: '#7FE8FF' });
      return renderBody({
        uid, pal, sheen: 'crystal',
        texture: (u) => facets(u, ['#FFFFFF', '#B6F0FF', '#5CB7DD'], 26) + sparkles(u, '#FFFFFF', 10, [120, 130, 400, 470], 12),
        overlay: () => `<g stroke="#EAFEFF" stroke-width="3" opacity="0.75" fill="none" stroke-linecap="round">
          <path d="M170 380 l18 -34 l16 30"/> <path d="M330 350 l16 -30 l16 32"/>
          <path d="M256 150 l14 -26 l16 28"/>
        </g>`,
      });
    },
  },
  {
    id: 'storm-slate', name: '폭풍 석판', element: 'thunder', rarity: 'rare',
    draw: ({ uid }) => {
      const pal = p('thunder', { main: '#9C93C9', light: '#DCD6FF', dark: '#615887', deep: '#332B52', belly: '#CFC7F0', glow: '#B49CFF' });
      return renderBody({
        uid, pal, sheen: 'matte',
        texture: (u) => facets(u, ['#BDB3E8', '#6E649A', '#453B6B'], 22),
        overlay: () => `<g stroke="#E7DEFF" stroke-width="2" fill="none" opacity="0.7" filter="url(#${uid}-neon)">
          <path d="M190 260 l-10 22 l16 4 l-12 24"/>
          <path d="M318 300 l10 20 l-14 5 l10 22"/>
        </g>`,
      });
    },
  },
  {
    id: 'violet-plasma', name: '보랏빛 플라스마', element: 'thunder', rarity: 'epic',
    draw: ({ uid }) => {
      const pal = p('thunder', {});
      return renderBody({
        uid, pal, sheen: 'gloss',
        texture: (u) => `<rect width="512" height="512" fill="url(#${u}-plasma)" opacity="0.55"/>`,
        overlay: () => `<g fill="none" stroke="#E9DBFF" stroke-width="2" opacity="0.7" filter="url(#${uid}-neon)">
          <path d="M160 210 q34 -26 62 4 t60 0 q26 -22 52 6"/>
          <path d="M150 350 q30 24 58 -4 t64 2 q28 24 56 -6"/>
          <path d="M180 440 q40 -20 76 6 t74 -8"/>
        </g>${sparkles(uid, '#E4D0FF', 8, [130, 140, 390, 460], 10)}`,
      });
    },
    defs: (uid) => rad(`${uid}-plasma`, [[0, '#F0E4FF', 0.6], [0.55, '#B366FF', 0.1], [1, '#4B1E90', 0.6]], { cx: 0.45, cy: 0.3, r: 0.8 }),
  },
  {
    id: 'gold24', name: '24K 황금 비늘', element: 'gold', rarity: 'epic',
    draw: ({ uid }) => {
      const pal = p('gold', {});
      return renderBody({
        uid, pal, sheen: 'gloss',
        texture: (u) => `<rect width="512" height="512" fill="url(#${u}-shine)" opacity="0.85"/>` + sparkles(u, '#FFF6CE', 10, [130, 140, 390, 450], 11),
        overlay: () => `<g fill="none" stroke="#FFF3C0" stroke-width="2.2" opacity="0.75" filter="url(#${uid}-neon)">
          <path d="M188 300 q68 -30 136 0"/><path d="M182 372 q74 -30 148 0"/>
        </g>`,
      });
    },
    defs: (uid) => lin(`${uid}-shine`, [[0, '#FFF7D0', 0.65], [0.4, '#FFD35C', 0.1], [0.62, '#8A5C0C', 0.35], [0.8, '#FFE68C', 0.55], [1, '#C08A1C', 0.2]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
  },
  {
    id: 'faceted-diamond', name: '면절정 다이아', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => {
      const pal = p('diamond', { main: '#DCF1FF', light: '#FFFFFF', dark: '#A9CDE9', deep: '#6E97B8' });
      return renderBody({
        uid, pal, sheen: 'crystal',
        texture: (u) => facets(u, ['#FFFFFF', '#CFEFFF', '#9AD3F5', '#FFD7F2', '#C9FFE4'], 34) + sparkles(u, '#FFFFFF', 12, [120, 130, 400, 470], 13),
        overlay: () => `<g stroke="#FFFFFF" stroke-width="1.4" opacity="0.8" fill="none">
          <path d="M188 150 l24 26 l-20 24"/><path d="M310 190 l20 22 l-16 26"/>
        </g>`,
      });
    },
  },
  {
    id: 'obsidian-neon', name: '흑요석 네온', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => {
      const pal = p('diamond', { main: '#2A2036', light: '#584468', dark: '#150F1E', deep: '#08050C', belly: '#33263F', line: '#0A0610', muzzle: '#3A2B4A', glow: '#FF5BE0', eye: '#7DF9FF' });
      return renderBody({
        uid, pal, sheen: 'crystal', scales: false,
        texture: (u) => facets(u, ['#4B3760', '#2B2038', '#6A4C86'], 18),
        overlay: () => `<g fill="none" stroke-linecap="round" filter="url(#${uid}-neon)">
          <path d="M196 150 q60 -26 120 0" stroke="#FF5BE0" stroke-width="3" opacity="0.9"/>
          <path d="M170 330 q86 -26 172 0" stroke="#5BF6FF" stroke-width="2.6" opacity="0.85"/>
          <path d="M206 460 q50 -20 100 0" stroke="#FF5BE0" stroke-width="2.2" opacity="0.7"/>
        </g>${sparkles(uid, '#FF9CF0', 6, [150, 160, 370, 450], 10)}`,
      });
    },
  },
  {
    id: 'aurora-prism', name: '오로라 프리즘', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => {
      const pal = p('diamond', { main: '#D8F0FF', light: '#FFFFFF', dark: '#A9CBE6', deep: '#7093B2' });
      return renderBody({
        uid, pal, sheen: 'crystal',
        texture: (u) => `<rect width="512" height="512" fill="url(#${u}-aur)" opacity="0.8"/>`,
        overlay: () => `<g fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.55">
          <path d="M170 240 q40 -44 92 -16 t88 -18"/>
          <path d="M164 330 q52 34 96 0 t84 8"/>
        </g>${sparkles(uid, '#FFFFFF', 10, [120, 130, 400, 470], 12)}`,
      });
    },
    defs: (uid) => lin(`${uid}-aur`, [[0, '#B7FFE0', 0.55], [0.28, '#9AD8FF', 0.4], [0.52, '#D6B4FF', 0.5], [0.75, '#FFC7E8', 0.4], [1, '#B7FFE0', 0.55]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
  },
];

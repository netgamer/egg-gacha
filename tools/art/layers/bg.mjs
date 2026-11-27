/**
 * bg layer — 512x512 scene behind the dragon (always opaque and full-bleed).
 */
import { lin, rad, glowDef, f2, rngFor } from '../base.mjs';

const vignette = (uid, color = '#05030B') =>
  rad(`${uid}-vig`, [[0.45, color, 0], [0.78, color, 0.35], [1, color, 0.8]], { cx: 0.5, cy: 0.46, r: 0.75 });

const rays = (uid, color, n = 14, op = 0.14, len = 380) => {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 360;
    out.push(
      `<rect x="252" y="${256 - len}" width="8" height="${len}" fill="${color}" opacity="${op}" transform="rotate(${f2(
        a
      )} 256 256)"/>`
    );
  }
  return `<g style="mix-blend-mode:screen">${out.join('')}</g>`;
};

const starField = (uid, n, area = [0, 0, 512, 512], color = '#FFFFFF') => {
  const rnd = rngFor(uid + 'stars');
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = area[0] + rnd() * (area[2] - area[0]);
    const y = area[1] + rnd() * (area[3] - area[1]);
    const r = 0.7 + rnd() * 2.1;
    out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${color}" opacity="${f2(0.25 + rnd() * 0.75)}"/>`);
  }
  return out.join('');
};

const bokeh = (uid, n, color, area = [0, 0, 512, 512], rmax = 60) => {
  const rnd = rngFor(uid + 'bok');
  const out = [];
  for (let i = 0; i < n; i++) {
    const x = area[0] + rnd() * (area[2] - area[0]);
    const y = area[1] + rnd() * (area[3] - area[1]);
    const r = 12 + rnd() * rmax;
    out.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(r)}" fill="${color}" opacity="${f2(0.04 + rnd() * 0.1)}"/>`);
  }
  return out.join('');
};

const petal = (x, y, s, rot, color, op = 0.85) =>
  `<path d="M0 -${s} C${s * 0.9} -${s * 0.5} ${s * 0.7} ${s * 0.6} 0 ${s} C-${s * 0.7} ${s * 0.6} -${s * 0.9} -${s * 0.5} 0 -${s} Z" fill="${color}" opacity="${op}" transform="translate(${f2(
    x
  )} ${f2(y)}) rotate(${f2(rot)})"/>`;

const snowflake = (x, y, s, color = '#FFFFFF', op = 0.8) => {
  const arms = [];
  for (let i = 0; i < 6; i++) {
    arms.push(`<line x1="0" y1="0" x2="0" y2="${-s}" transform="rotate(${i * 60})"/>`);
    arms.push(`<line x1="0" y1="${-s * 0.55}" x2="${s * 0.32}" y2="${-s * 0.8}" transform="rotate(${i * 60})"/>`);
    arms.push(`<line x1="0" y1="${-s * 0.55}" x2="${-s * 0.32}" y2="${-s * 0.8}" transform="rotate(${i * 60})"/>`);
  }
  return `<g transform="translate(${f2(x)} ${f2(y)})" stroke="${color}" stroke-width="${f2(
    Math.max(1, s * 0.08)
  )}" opacity="${op}" stroke-linecap="round">${arms.join('')}</g>`;
};

const hexGrid = (uid, color, op = 0.16) => {
  const out = [];
  const r = 30;
  for (let row = -1; row < 9; row++) {
    for (let col = -1; col < 8; col++) {
      const x = col * r * 1.74 + (row % 2 ? r * 0.87 : 0);
      const y = row * r * 1.5;
      const pts = [];
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i - Math.PI / 6;
        pts.push(`${f2(x + Math.cos(a) * r)} ${f2(y + Math.sin(a) * r)}`);
      }
      out.push(`<polygon points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.4" opacity="${op}"/>`);
    }
  }
  return out.join('');
};

export const bgParts = [
  {
    id: 'ivory', name: '상아빛 방', element: 'white', rarity: 'common',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#FFFDF4'], [0.45, '#F6E6C8'], [1, '#C9A87C']], { cx: 0.46, cy: 0.38, r: 0.78 }) +
        vignette(uid, '#8A6A44'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        ${bokeh(uid, 12, '#FFFFFF', [0, 0, 512, 512], 70)}
        <g fill="none" stroke="#FFFDF4" stroke-width="2" opacity="0.35">
          <circle cx="256" cy="232" r="150"/><circle cx="256" cy="232" r="190"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'mint', name: '민트 점판', element: 'spotted', rarity: 'common',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#EBFFF9'], [0.45, '#A8E8D8'], [1, '#4E9C8A']], { cx: 0.45, cy: 0.36, r: 0.8 }) +
        vignette(uid, '#1F5348'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        <g fill="#FFFFFF" opacity="0.25">
          <circle cx="88" cy="96" r="26"/><circle cx="430" cy="140" r="18"/><circle cx="60" cy="380" r="34"/>
          <circle cx="450" cy="410" r="28"/><circle cx="120" cy="470" r="16"/>
        </g>
        <g fill="#2E8A76" opacity="0.2">
          <circle cx="150" cy="80" r="10"/><circle cx="400" cy="60" r="8"/><circle cx="470" cy="300" r="12"/>
          <circle cx="40" cy="260" r="9"/><circle cx="380" cy="470" r="11"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'forest', name: '고요한 숲', element: 'forest', rarity: 'common',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#B7E08A'], [0.4, '#5E9E4E'], [0.75, '#2E5A2C'], [1, '#12240F']], { cx: 0.5, cy: 0.34, r: 0.82 }) +
        vignette(uid, '#08160A') + glowDef(`${uid}-fg`, 10),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        ${bokeh(uid, 16, '#E9FFC0', [0, 0, 512, 512], 46)}
        <g opacity="0.85" fill="#1F3F1C">
          <path d="M0 512 L0 300 C40 320 60 360 66 400 L70 512 Z"/>
          <path d="M512 512 L512 280 C470 300 450 344 444 390 L440 512 Z"/>
        </g>
        <g fill="#6BA84F" opacity="0.5">
          <path d="M96 470 C120 420 160 400 200 396 C170 430 140 460 96 470 Z"/>
          <path d="M420 480 C396 428 356 406 316 402 C346 436 376 468 420 480 Z"/>
        </g>
        <g fill="#D9FFA0" opacity="0.85" filter="url(#${uid}-fg)">
          <circle cx="120" cy="330" r="4"/><circle cx="390" cy="300" r="3"/><circle cx="180" cy="440" r="3.4"/><circle cx="330" cy="420" r="2.6"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'sakura', name: '벚꽃 하늘', element: 'white', rarity: 'rare',
    draw: ({ uid }) => {
      const rnd = rngFor(uid + 'pk');
      const petals = [];
      for (let i = 0; i < 18; i++) {
        petals.push(petal(rnd() * 512, rnd() * 512, 8 + rnd() * 10, rnd() * 360, i % 3 ? '#FFD3E6' : '#FFB6D5', 0.55 + rnd() * 0.4));
      }
      return {
        defs: rad(`${uid}-bg`, [[0, '#FFF3F8'], [0.45, '#FFC9DE'], [1, '#C77BA0']], { cx: 0.48, cy: 0.36, r: 0.8 }) +
          vignette(uid, '#7A3A56'),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          ${bokeh(uid, 10, '#FFFFFF', [0, 0, 512, 512], 54)}
          ${petals.join('')}
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'snowfall', name: '눈 내리는 밤', element: 'ice', rarity: 'common',
    draw: ({ uid }) => {
      const rnd = rngFor(uid + 'sn');
      const flakes = [];
      for (let i = 0; i < 14; i++) {
        flakes.push(snowflake(rnd() * 512, rnd() * 512, 6 + rnd() * 12, '#FFFFFF', 0.4 + rnd() * 0.5));
      }
      return {
        defs: rad(`${uid}-bg`, [[0, '#E8FAFF'], [0.4, '#8FC6E6'], [1, '#31567A']], { cx: 0.5, cy: 0.32, r: 0.84 }) +
          vignette(uid, '#102438'),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          ${bokeh(uid, 14, '#FFFFFF', [0, 0, 512, 512], 40)}
          ${flakes.join('')}
          <g fill="#FFFFFF" opacity="0.35"><circle cx="60" cy="470" r="70"/><circle cx="460" cy="480" r="80"/></g>
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'ember', name: '불씨 연기', element: 'fire', rarity: 'rare',
    draw: ({ uid }) => {
      const rnd = rngFor(uid + 'em');
      const sparks = [];
      for (let i = 0; i < 26; i++) {
        sparks.push(`<circle cx="${f2(rnd() * 512)}" cy="${f2(rnd() * 512)}" r="${f2(1 + rnd() * 3)}" fill="${rnd() > 0.5 ? '#FFC46A' : '#FF6A2A'}" opacity="${f2(0.3 + rnd() * 0.6)}"/>`);
      }
      return {
        defs: rad(`${uid}-bg`, [[0, '#7A2A16'], [0.4, '#4A1208'], [1, '#140604']], { cx: 0.5, cy: 0.68, r: 0.85 }) +
          lin(`${uid}-fl`, [[0, '#FFD27A', 0.55], [0.6, '#FF5A18', 0.25], [1, '#7A1404', 0]]) +
          vignette(uid, '#0A0302') + glowDef(`${uid}-fg`, 12),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          <g filter="url(#${uid}-fg)" opacity="0.9">
            <path d="M0 512 C10 420 40 380 70 340 C60 400 90 430 110 512 Z" fill="url(#${uid}-fl)"/>
            <path d="M512 512 C500 410 470 366 440 330 C452 398 420 430 400 512 Z" fill="url(#${uid}-fl)"/>
            <path d="M150 512 C160 460 190 432 210 396 C206 452 230 470 240 512 Z" fill="url(#${uid}-fl)" opacity="0.7"/>
            <path d="M360 512 C350 456 320 430 300 392 C306 450 282 468 272 512 Z" fill="url(#${uid}-fl)" opacity="0.6"/>
          </g>
          ${sparks.join('')}
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'magma', name: '용암 지대', element: 'fire', rarity: 'epic',
    draw: ({ uid }) => {
      const rnd = rngFor(uid + 'mg');
      const veins = [];
      for (let i = 0; i < 6; i++) {
        let x = rnd() * 512;
        let y = 512;
        let d = `M${f2(x)} ${y}`;
        for (let k = 0; k < 5; k++) {
          x += rnd() * 90 - 45;
          y -= 40 + rnd() * 60;
          d += ` L${f2(x)} ${f2(y)}`;
        }
        veins.push(d);
      }
      return {
        defs: rad(`${uid}-bg`, [[0, '#3A1008'], [0.45, '#1E0806'], [1, '#080202']], { cx: 0.5, cy: 0.4, r: 0.8 }) +
          glowDef(`${uid}-vg`, 10) + vignette(uid, '#050101'),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          <g fill="none" stroke-linecap="round" filter="url(#${uid}-vg)">
            <g stroke="#FF5A18" stroke-width="9" opacity="0.55">${veins.map((d) => `<path d="${d}"/>`).join('')}</g>
            <g stroke="#FFC46A" stroke-width="3.4">${veins.map((d) => `<path d="${d}"/>`).join('')}</g>
          </g>
          <g fill="#FF7A2A" opacity="0.6">
            <circle cx="90" cy="120" r="5"/><circle cx="420" cy="90" r="4"/><circle cx="380" cy="380" r="6"/><circle cx="140" cy="430" r="4"/>
          </g>
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'glacier', name: '빙하 동굴', element: 'ice', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#E9FBFF'], [0.38, '#9FD8F0'], [0.7, '#4F86AD'], [1, '#1C3A55']], { cx: 0.5, cy: 0.36, r: 0.82 }) +
        lin(`${uid}-ic`, [[0, '#FFFFFF', 0.9], [1, '#8FD0EE', 0.35]]) + vignette(uid, '#0E2135'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        <g stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.5" fill="url(#${uid}-ic)">
          <path d="M0 512 L0 330 L60 360 L84 300 L130 380 L150 512 Z"/>
          <path d="M512 512 L512 300 L460 340 L430 286 L384 372 L366 512 Z"/>
          <path d="M70 0 L120 0 L96 78 L66 60 Z" opacity="0.7"/>
          <path d="M400 0 L452 0 L430 90 L396 66 Z" opacity="0.7"/>
        </g>
        <g fill="#FFFFFF" opacity="0.3"><circle cx="256" cy="210" r="90"/></g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'emerald-grove', name: '에메랄드 숲', element: 'forest', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#D9FFE9'], [0.35, '#5FCF92'], [0.72, '#1F6E4C'], [1, '#08251A']], { cx: 0.5, cy: 0.4, r: 0.82 }) +
        glowDef(`${uid}-fg`, 10) + vignette(uid, '#04140E'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        ${bokeh(uid, 18, '#B7FFD8', [0, 0, 512, 512], 40)}
        <g fill="none" stroke="#0E3B26" stroke-width="10" opacity="0.6">
          <path d="M40 512 C40 380 70 300 120 240"/><path d="M472 512 C472 380 442 300 392 240"/>
        </g>
        <g fill="#9BFFC9" opacity="0.9" filter="url(#${uid}-fg)">
          <circle cx="110" cy="300" r="4"/><circle cx="400" cy="270" r="3.2"/><circle cx="180" cy="420" r="3"/><circle cx="330" cy="380" r="2.6"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'storm', name: '뇌운 폭풍', element: 'thunder', rarity: 'epic',
    draw: ({ uid }) => {
      const rnd = rngFor(uid + 'st');
      const bolts = [];
      for (let i = 0; i < 3; i++) {
        let x = i === 0 ? 120 : i === 1 ? 400 : 300;
        let y = 0;
        let d = `M${x} ${y}`;
        for (let k = 0; k < 5; k++) {
          x += rnd() * 60 - 30;
          y += 40 + rnd() * 30;
          d += ` L${f2(x)} ${f2(y)}`;
        }
        bolts.push(d);
      }
      return {
        defs: rad(`${uid}-bg`, [[0, '#6B4BB8'], [0.4, '#3A2470'], [1, '#100726']], { cx: 0.5, cy: 0.32, r: 0.82 }) +
          glowDef(`${uid}-fg`, 10) + vignette(uid, '#07031A'),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          ${bokeh(uid, 16, '#B98CFF', [0, 0, 512, 512], 60)}
          <g fill="none" stroke-linecap="round" filter="url(#${uid}-fg)">
            <g stroke="#C9A5FF" stroke-width="8" opacity="0.45">${bolts.map((d) => `<path d="${d}"/>`).join('')}</g>
            <g stroke="#F0E4FF" stroke-width="2.6">${bolts.map((d) => `<path d="${d}"/>`).join('')}</g>
          </g>
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'temple', name: '황금 신전', element: 'gold', rarity: 'epic',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#FFF3C0'], [0.4, '#E0A93A'], [0.72, '#8A5C10'], [1, '#3A2404']], { cx: 0.5, cy: 0.4, r: 0.8 }) +
        lin(`${uid}-ar`, [[0, '#FFE68C', 0.65], [1, '#A9760F', 0]]) + vignette(uid, '#241502'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        ${rays(uid, '#FFF3C0', 16, 0.12, 420)}
        <g fill="none" stroke="url(#${uid}-ar)" stroke-width="8">
          <path d="M40 512 L40 260 A216 216 0 0 1 472 260 L472 512"/>
          <path d="M86 512 L86 270 A170 170 0 0 1 426 270 L426 512"/>
        </g>
        <g fill="#8A5C10" opacity="0.5">
          <rect x="130" y="420" width="30" height="92" rx="6"/><rect x="352" y="420" width="30" height="92" rx="6"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'prism', name: '프리즘 광선', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => {
      const cols = ['#FF6B8A', '#FFB03A', '#FFE74C', '#6DFF9B', '#4CD8FF', '#B06BFF'];
      const beams = cols.map(
        (c, i) => `<path d="M256 256 L${256 + Math.cos((-70 + i * 28) * Math.PI / 180) * 420} ${256 + Math.sin((-70 + i * 28) * Math.PI / 180) * 420} L${256 + Math.cos((-58 + i * 28) * Math.PI / 180) * 420} ${256 + Math.sin((-58 + i * 28) * Math.PI / 180) * 420} Z" fill="${c}" opacity="0.2"/>`
      );
      return {
        defs: rad(`${uid}-bg`, [[0, '#FFFFFF'], [0.4, '#EAF6FF'], [0.75, '#A9CDE9'], [1, '#5E86AB']], { cx: 0.5, cy: 0.36, r: 0.82 }) +
          vignette(uid, '#2E4A63'),
        body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
          <g style="mix-blend-mode:multiply">${beams.join('')}</g>
          <g fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.5">
            <circle cx="256" cy="248" r="150"/><circle cx="256" cy="248" r="196"/>
          </g>
          ${starField(uid, 22, [0, 0, 512, 512], '#FFFFFF')}
          <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
      };
    },
  },
  {
    id: 'nebula', name: '성운 심연', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#2A1155'], [0.45, '#160A33'], [1, '#05020E']], { cx: 0.5, cy: 0.4, r: 0.85 }) +
        rad(`${uid}-n1`, [[0, '#C9A5FF', 0.55], [1, '#C9A5FF', 0]]) +
        rad(`${uid}-n2`, [[0, '#7CF9FF', 0.35], [1, '#7CF9FF', 0]]) +
        rad(`${uid}-n3`, [[0, '#FF9BE0', 0.4], [1, '#FF9BE0', 0]]) +
        vignette(uid, '#030109'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        <ellipse cx="170" cy="180" rx="190" ry="120" fill="url(#${uid}-n1)" transform="rotate(-24 170 180)"/>
        <ellipse cx="380" cy="330" rx="150" ry="96" fill="url(#${uid}-n2)" transform="rotate(28 380 330)"/>
        <ellipse cx="300" cy="120" rx="120" ry="70" fill="url(#${uid}-n3)" transform="rotate(-10 300 120)"/>
        ${starField(uid, 90)}
        <g fill="#FFFFFF">
          <path d="M120 90 l2.4 8 l8 2.4 l-8 2.4 l-2.4 8 l-2.4 -8 l-8 -2.4 l8 -2.4 z"/>
          <path d="M400 200 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 l7 -2 z"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
  {
    id: 'hexgrid', name: '육각 회로', element: 'spotted', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: rad(`${uid}-bg`, [[0, '#2C6F8A'], [0.45, '#143C52'], [1, '#071A26']], { cx: 0.5, cy: 0.4, r: 0.82 }) +
        glowDef(`${uid}-fg`, 8) + vignette(uid, '#03101A'),
      body: `<rect width="512" height="512" fill="url(#${uid}-bg)"/>
        ${hexGrid(uid, '#7FFFE0', 0.14)}
        <g filter="url(#${uid}-fg)" fill="#7FFFE0" opacity="0.75">
          <circle cx="86" cy="120" r="4"/><circle cx="430" cy="180" r="3"/><circle cx="120" cy="410" r="3.4"/><circle cx="400" cy="440" r="4"/>
        </g>
        <rect width="512" height="512" fill="url(#${uid}-vig)"/>`,
    }),
  },
];

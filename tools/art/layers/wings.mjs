/**
 * wings layer — sits behind the body, anchored at both shoulder blades.
 * The left wing is authored once and mirrored, so both sides always agree.
 */
import { glowDef, lin, rad, f2, rngFor } from '../base.mjs';

const MIRROR = 'translate(512,0) scale(-1,1)';
/** Mirror the left wing to the right and grow both around the shoulder anchor. */
const mirror = (svg, s = 1.28) => {
  const inner = `<g transform="translate(206 348) scale(${s}) translate(-206 -348)">${svg}</g>`;
  return `<g>${inner}<g transform="${MIRROR}">${inner}</g></g>`;
};

const aura = (uid, color, op = 0.5) =>
  `<ellipse cx="256" cy="248" rx="238" ry="196" fill="url(#${uid}-aura)" opacity="${op}"/>`;

/** Generic membrane wing: outer silhouette + struts. */
function membraneWing({ uid, d, struts, fill, stroke, line, glow, op = 1 }) {
  return `
  <g opacity="${op}">
    ${glow ? `<path d="${d}" fill="none" stroke="${glow}" stroke-width="10" opacity="0.35" filter="url(#${uid}-wGlow)"/>` : ''}
    <path d="${d}" fill="${fill}" stroke="${stroke}" stroke-width="3" stroke-linejoin="round"/>
    <g fill="none" stroke="${line}" stroke-width="2.6" opacity="0.45" stroke-linecap="round">
      ${struts.map((s) => `<path d="${s}"/>`).join('')}
    </g>
  </g>`;
}

export const wingParts = [
  {
    id: 'stubby', name: '몽실 날개', element: 'white', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 8) +
        rad(`${uid}-wf`, [[0, '#FFFFFF'], [0.6, '#F6E4C8'], [1, '#D9BC92']]) +
        rad(`${uid}-aura`, [[0, '#FFE9C0', 0.55], [0.55, '#FFC98A', 0.18], [1, '#FFC98A', 0]]),
      body: aura(uid, 'white', 0.35) + mirror(`
        <g>
          <path d="M208 400 C176 396 142 372 126 336 C114 306 120 282 138 276 C158 270 176 288 188 314 C198 336 206 372 208 400 Z"
            fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.8" opacity="0.97"/>
          <path d="M196 388 C170 378 148 350 138 316" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.5" stroke-linecap="round"/>
          <path d="M156 290 C152 316 158 348 172 374" fill="none" stroke="${pal.line}" stroke-width="2" opacity="0.3" stroke-linecap="round"/>
          <path d="M184 340 C172 348 160 362 152 380" fill="none" stroke="${pal.line}" stroke-width="1.8" opacity="0.25"/>
        </g>`),
    }),
  },
  {
    id: 'bat', name: '박쥐 날개', element: 'spotted', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 8) +
        lin(`${uid}-wf`, [[0, '#2F6F62'], [0.5, '#4E9E8C'], [1, '#B7E7DA']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }),
      body: mirror(membraneWing({
        uid,
        d: 'M216 330 C176 310 140 272 120 226 C108 198 102 170 104 146 C128 162 150 180 168 202 C160 174 158 146 162 122 C186 146 202 178 210 210 C210 180 216 154 228 134 C242 160 248 192 248 226 C256 264 260 298 256 332 Z',
        struts: ['M214 326 C182 300 150 258 128 212', 'M212 326 C196 280 190 226 168 128', 'M214 326 C222 280 226 210 232 140'],
        fill: `url(#${uid}-wf)`, stroke: pal.line, line: pal.deep,
        glow: '#7FFFE0',
      })),
    }),
  },
  {
    id: 'leaf', name: '이파리 날개', element: 'forest', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 8) +
        lin(`${uid}-wf`, [[0, '#3E6B2C'], [0.55, '#79B353'], [1, '#CDEFA6']], { x1: 0, y1: 1, x2: 0.5, y2: 0 }),
      body: mirror(`
        <g>
          <path d="M214 330 C168 322 124 286 108 236 C96 198 104 164 128 146 C160 162 186 196 198 234 C206 268 214 300 214 330 Z"
            fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.8"/>
          <path d="M214 328 C190 292 166 250 140 202" fill="none" stroke="#E9FFCF" stroke-width="3" opacity="0.7"/>
          <g fill="none" stroke="#2C4A20" stroke-width="2" opacity="0.4">
            <path d="M196 300 l-22 -10"/><path d="M184 272 l-24 -8"/><path d="M170 244 l-24 -6"/><path d="M156 216 l-20 -4"/>
          </g>
          <path d="M170 302 C160 320 148 330 136 334 C142 318 152 306 170 302 Z" fill="#8FC968" stroke="${pal.line}" stroke-width="2"/>
        </g>`),
    }),
  },
  {
    id: 'petal', name: '꽃잎 날개', element: 'forest', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 10) +
        rad(`${uid}-wf`, [[0, '#FFEDF7'], [0.55, '#F5A9CE'], [1, '#C9558F']], { cx: 0.4, cy: 0.7, r: 0.9 }) +
        rad(`${uid}-aura`, [[0, '#FFC7E4', 0.5], [0.6, '#FF9CCF', 0.16], [1, '#FF9CCF', 0]]),
      body: aura(uid, 'pink', 0.4) + mirror(`
        <g>
          <g transform="translate(206 320) rotate(-24)">
            <ellipse cx="-26" cy="-96" rx="34" ry="66" fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.6" opacity="0.95"/>
            <path d="M-26 -30 C-40 -70 -34 -110 -20 -150" fill="none" stroke="#FFF0F8" stroke-width="2.4" opacity="0.6"/>
          </g>
          <g transform="translate(208 330) rotate(-58)">
            <ellipse cx="-22" cy="-84" rx="30" ry="58" fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.6" opacity="0.9"/>
            <path d="M-22 -28 C-34 -62 -30 -96 -18 -132" fill="none" stroke="#FFF0F8" stroke-width="2.2" opacity="0.55"/>
          </g>
          <g transform="translate(206 336) rotate(-88)">
            <ellipse cx="-18" cy="-66" rx="24" ry="46" fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.6" opacity="0.85"/>
          </g>
        </g>`),
    }),
  },
  {
    id: 'bubble', name: '거품 날개', element: 'spotted', rarity: 'rare',
    draw: ({ uid, pal }) => {
      const rnd = rngFor(uid + 'bub');
      const bubbles = [];
      const spots = [[188, 300, 46], [160, 262, 40], [136, 224, 34], [120, 190, 26], [176, 226, 30], [148, 178, 24], [108, 158, 18], [196, 258, 26]];
      for (const [x, y, r] of spots) {
        bubbles.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${uid}-bub)" stroke="#EAFFFF" stroke-width="2" opacity="${f2(0.55 + rnd() * 0.35)}"/>
          <circle cx="${x - r * 0.3}" cy="${y - r * 0.35}" r="${f2(r * 0.2)}" fill="#fff" opacity="0.85"/>`);
      }
      return {
        defs: glowDef(`${uid}-wGlow`, 8) +
          rad(`${uid}-bub`, [[0, '#FFFFFF', 0.1], [0.62, '#9FF3E2', 0.28], [1, '#4FC9C0', 0.8]]) +
          rad(`${uid}-aura`, [[0, '#B6FFF2', 0.45], [1, '#B6FFF2', 0]]),
        body: aura(uid, 'teal', 0.3) + mirror(`<g>${bubbles.join('')}</g>`),
      };
    },
  },
  {
    id: 'ember', name: '불꽃 날개', element: 'fire', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 12) +
        lin(`${uid}-wf`, [[0, '#6B1204'], [0.45, '#FF5A18'], [0.78, '#FFB347'], [1, '#FFE9A8']], { x1: 0, y1: 1, x2: 0.3, y2: 0 }),
      body: mirror(`
        <g>
          <path d="M214 334 C176 316 138 280 118 232 C104 198 102 166 112 138 C136 154 158 178 172 202 C170 168 176 138 190 116 C206 144 214 178 216 212 C224 180 240 154 262 138 C266 172 262 208 250 244 C256 280 258 312 254 336 Z"
            fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.8" opacity="0.97"/>
          <g fill="none" stroke="#7A1806" stroke-width="2.4" opacity="0.35">
            <path d="M212 330 C186 300 160 254 140 206"/>
            <path d="M212 330 C204 282 200 220 194 150"/>
            <path d="M212 330 C224 286 232 226 246 168"/>
          </g>
          <g fill="none" stroke="#FFE9A8" stroke-width="2.6" opacity="0.55">
            <path d="M206 300 C180 274 158 236 148 196"/>
            <path d="M196 260 C192 214 200 170 214 142"/>
          </g>
          <path d="M212 326 C196 292 190 244 194 186 C200 238 208 286 218 322 Z" fill="#FFC46A" opacity="0.35"/>
        </g>`),
    }),
  },
  {
    id: 'solar', name: '태양 날개', element: 'gold', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 12) +
        lin(`${uid}-wf`, [[0, '#C08A1C'], [0.5, '#FFD35C'], [1, '#FFF6CE']], { x1: 0, y1: 1, x2: 0.2, y2: 0 }) +
        rad(`${uid}-aura`, [[0, '#FFE08A', 0.6], [1, '#FFE08A', 0]]),
      body: aura(uid, 'gold', 0.4) + mirror(`
        <g stroke="${pal.line}" stroke-width="2.6">
          <path d="M208 328 L104 158 L136 214 L112 132 L166 198 L160 116 L198 194 L206 260 Z" fill="url(#${uid}-wf)" stroke-linejoin="round"/>
          <path d="M206 330 L150 262 L186 276 L166 236 L206 268 Z" fill="url(#${uid}-wf)" opacity="0.85"/>
        </g>`),
    }),
  },
  {
    id: 'ice-crystal', name: '빙정 날개', element: 'ice', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 10) +
        lin(`${uid}-wf`, [[0, '#2E6C93'], [0.5, '#8FD8F5'], [1, '#EAFDFF']], { x1: 0.2, y1: 1, x2: 0.6, y2: 0 }) +
        rad(`${uid}-aura`, [[0, '#BFF3FF', 0.5], [1, '#BFF3FF', 0]]),
      body: aura(uid, 'ice', 0.35) + mirror(`
        <g>
          <path d="M210 330 L112 214 L96 140 L152 178 L148 108 L196 168 L206 240 Z" fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.8" stroke-linejoin="round"/>
          <path d="M206 332 L150 268 L134 208 L176 246 L180 196 L204 254 Z" fill="#DFF8FF" opacity="0.55" stroke="${pal.line}" stroke-width="2"/>
          <g stroke="#FFFFFF" stroke-width="1.8" opacity="0.8" fill="none">
            <path d="M118 152 l30 44"/><path d="M104 132 l44 60"/>
          </g>
        </g>`),
    }),
  },
  {
    id: 'thunder-arc', name: '뇌전 날개', element: 'thunder', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 10) +
        lin(`${uid}-wf`, [[0, '#3B1470'], [0.5, '#8B4BFF'], [1, '#D9C2FF']], { x1: 0.1, y1: 1, x2: 0.5, y2: 0 }) +
        rad(`${uid}-aura`, [[0, '#C79BFF', 0.5], [1, '#C79BFF', 0]]),
      body: aura(uid, 'violet', 0.4) + mirror(`
        <g stroke-linejoin="round">
          <path d="M212 330 L152 246 L160 268 L96 196 L118 214 L74 128 L142 190 L138 168 L196 246 Z"
            fill="url(#${uid}-wf)" stroke="${pal.line}" stroke-width="2.6"/>
          <path d="M206 334 L168 276 L178 288 L146 240 L172 268 L160 226 L196 282 Z" fill="#E9DBFF" opacity="0.35"/>
          <g stroke="#E7DEFF" stroke-width="2.2" fill="none" opacity="0.9" filter="url(#${uid}-wGlow)">
            <path d="M104 210 l26 12 l-14 14 l26 16"/><path d="M150 258 l22 10 l-12 12"/>
          </g>
        </g>`),
    }),
  },
  {
    id: 'aurora-veil', name: '오로라 장막', element: 'ice', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 14) +
        lin(`${uid}-wf`, [[0, '#5BF0C8', 0.75], [0.35, '#6BD0FF', 0.6], [0.7, '#B98CFF', 0.55], [1, '#FF9CE8', 0.2]]) +
        lin(`${uid}-wf2`, [[0, '#8FFFE0', 0.7], [1, '#B98CFF', 0.15]]) +
        rad(`${uid}-aura`, [[0, '#9FFFE8', 0.45], [0.6, '#B98CFF', 0.2], [1, '#B98CFF', 0]]),
      body: aura(uid, 'aurora', 0.45) + mirror(`
        <g opacity="0.92">
          <path d="M214 330 C158 306 118 258 102 200 C96 172 100 148 110 130 C150 158 182 200 198 246 C204 274 212 304 214 330 Z"
            fill="url(#${uid}-wf)" stroke="#EAFBFF" stroke-width="1.6" stroke-opacity="0.5"/>
          <path d="M210 330 C168 296 140 246 132 190 C128 162 134 140 144 124 C172 152 192 194 202 238 C208 268 212 302 210 330 Z"
            fill="url(#${uid}-wf2)" opacity="0.75"/>
          <g stroke="#FFFFFF" stroke-width="1.6" opacity="0.5" fill="none">
            <path d="M120 180 C150 210 176 250 196 300"/><path d="M136 150 C162 186 182 226 198 280"/>
          </g>
        </g>`),
    }),
  },
  {
    id: 'angelic-gold', name: '천사 날개', element: 'gold', rarity: 'epic',
    draw: ({ uid, pal }) => {
      const feathers = [];
      for (let i = 0; i < 6; i++) {
        const ang = -18 - i * 13;
        const len = 104 - i * 7;
        feathers.push(
          `<g transform="translate(206 322) rotate(${ang})">
            <path d="M-9 6 C-22 -${len * 0.55} -14 -${len} 0 -${len + 12} C14 -${len} 22 -${len * 0.55} 9 6 Z"
              fill="url(#${uid}-ff)" stroke="${pal.line}" stroke-width="1.8" opacity="${f2(0.98 - i * 0.04)}"/>
            <path d="M0 4 L0 -${len + 4}" stroke="#FFF7D8" stroke-width="2" opacity="0.55"/>
          </g>`
        );
      }
      return {
        defs: glowDef(`${uid}-wGlow`, 12) +
          lin(`${uid}-ff`, [[0, '#FFFDF2'], [0.55, '#FFE9A8'], [1, '#D8A63A']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }) +
          rad(`${uid}-aura`, [[0, '#FFF0B8', 0.6], [1, '#FFF0B8', 0]]),
        body: aura(uid, 'gold', 0.45) + mirror(`<g>${feathers.join('')}</g>`),
      };
    },
  },
  {
    id: 'mecha', name: '메카 날개', element: 'thunder', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 10) +
        lin(`${uid}-wf`, [[0, '#1D1830'], [0.5, '#4A4066'], [1, '#8A7FB8']], { x1: 0, y1: 1, x2: 0.3, y2: 0 }) +
        lin(`${uid}-neon`, [[0, '#7CF9FF'], [1, '#B673FF']], { x1: 0, y1: 0, x2: 1, y2: 1 }) +
        rad(`${uid}-aura`, [[0, '#7CF9FF', 0.4], [1, '#7CF9FF', 0]]),
      body: aura(uid, 'cyan', 0.4) + mirror(`
        <g stroke-linejoin="round">
          <path d="M212 330 L128 268 L92 168 L148 200 L142 128 L186 190 L212 250 Z" fill="url(#${uid}-wf)" stroke="#0C0A16" stroke-width="3"/>
          <path d="M204 320 L150 272 L128 208 L168 244 Z" fill="#6E6499" opacity="0.55"/>
          <g stroke="url(#${uid}-neon)" stroke-width="3" fill="none" opacity="0.95" filter="url(#${uid}-wGlow)">
            <path d="M100 186 L146 214 L140 262"/><path d="M150 142 L182 196 L206 244"/>
          </g>
          <circle cx="150" cy="212" r="6" fill="#7CF9FF" opacity="0.9" filter="url(#${uid}-wGlow)"/>
        </g>`),
    }),
  },
  {
    id: 'diamond-prism', name: '다이아 프리즘 날개', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-wGlow`, 12) +
        lin(`${uid}-wf`, [[0, '#FFFFFF', 0.9], [0.45, '#CFEEFF', 0.8], [1, '#8FC9F0', 0.85]]) +
        lin(`${uid}-rb`, [[0, '#FF9BE0', 0.5], [0.33, '#9BFFF0', 0.45], [0.66, '#9BC8FF', 0.5], [1, '#D9B6FF', 0.45]]) +
        rad(`${uid}-aura`, [[0, '#DFF8FF', 0.5], [1, '#DFF8FF', 0]]),
      body: aura(uid, 'diamond', 0.45) + mirror(`
        <g stroke="#FFFFFF" stroke-width="2" stroke-opacity="0.7" stroke-linejoin="round">
          <path d="M210 332 L120 244 L96 150 L162 190 L152 112 L204 182 Z" fill="url(#${uid}-wf)"/>
          <path d="M210 332 L136 262 L124 190 L182 236 Z" fill="url(#${uid}-rb)"/>
          <path d="M204 320 L166 200 L206 246 Z" fill="#FFFFFF" opacity="0.45"/>
          <g stroke="#FFFFFF" stroke-width="1.6" opacity="0.85" fill="none">
            <path d="M112 176 L162 200 L152 118"/><path d="M162 200 L204 182"/>
          </g>
        </g>`),
    }),
  },
  {
    id: 'cosmic-galaxy', name: '은하 날개', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => {
      const rnd = rngFor(uid + 'star');
      const stars = [];
      for (let i = 0; i < 26; i++) {
        const x = 84 + rnd() * 130;
        const y = 120 + rnd() * 200;
        stars.push(`<circle cx="${f2(x)}" cy="${f2(y)}" r="${f2(0.9 + rnd() * 2)}" fill="#fff" opacity="${f2(0.4 + rnd() * 0.6)}"/>`);
      }
      return {
        defs: glowDef(`${uid}-wGlow`, 12) +
          rad(`${uid}-wf`, [[0, '#C9A5FF', 0.85], [0.45, '#4B2B9E', 0.9], [1, '#0B0520', 0.95]], { cx: 0.6, cy: 0.7, r: 0.95 }) +
          rad(`${uid}-aura`, [[0, '#B98CFF', 0.5], [0.5, '#5B6BFF', 0.2], [1, '#5B6BFF', 0]]),
        body: aura(uid, 'cosmic', 0.5) + mirror(`
          <g>
            <path d="M212 332 C168 314 132 278 112 230 C100 200 98 170 104 146 C130 164 152 186 168 214 C162 180 164 150 174 126 C196 152 206 186 210 220 C214 186 226 158 244 138 C252 172 250 208 240 246 C250 282 254 310 250 334 Z"
              fill="url(#${uid}-wf)" stroke="#C9A5FF" stroke-width="2" stroke-opacity="0.6"/>
            ${stars.join('')}
            <ellipse cx="168" cy="238" rx="56" ry="30" fill="#FFB6F0" opacity="0.18" transform="rotate(-38 168 238)"/>
            <ellipse cx="150" cy="190" rx="40" ry="18" fill="#8FF6FF" opacity="0.14" transform="rotate(-52 150 190)"/>
          </g>`),
      };
    },
  },
];

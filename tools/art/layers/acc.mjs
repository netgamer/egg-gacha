/**
 * acc layer — neck & chest accessories on the chest anchor.
 */
import { glowDef, lin, rad, f2 } from '../base.mjs';

const glow = (uid, s = 6) => glowDef(`${uid}-aGlow`, s);

export const accParts = [
  {
    id: 'silk-ribbon', name: '비단 리본', element: 'white', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) + lin(`${uid}-rb`, [[0, '#FFF3F9'], [0.5, '#FFC0DA'], [1, '#E0729F']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M256 330 C226 306 194 312 196 330 C198 350 230 348 256 336 Z" fill="url(#${uid}-rb)"/>
          <path d="M256 330 C286 306 318 312 316 330 C314 350 282 348 256 336 Z" fill="url(#${uid}-rb)"/>
          <path d="M256 330 C248 356 236 386 214 410 L242 404 C250 380 256 358 256 340 Z" fill="url(#${uid}-rb)"/>
          <path d="M258 330 C268 356 282 384 306 404 L278 400 C268 378 260 356 258 342 Z" fill="url(#${uid}-rb)"/>
          <circle cx="256" cy="333" r="7" fill="#FFE3F0" stroke="${pal.line}" stroke-width="2"/>
        </g>
        <path d="M202 326 C216 320 234 322 246 328" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.7"/>`,
    }),
  },
  {
    id: 'leather-collar', name: '가죽 목걸이', element: 'spotted', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) + lin(`${uid}-le`, [[0, '#8A6A44'], [0.5, '#5E4028'], [1, '#3A2517']], { x1: 0, y1: 0, x2: 0, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M206 306 Q256 344 306 306 L310 328 Q256 370 202 328 Z" fill="url(#${uid}-le)"/>
          <g fill="#E8D3A8" stroke="#3A2517" stroke-width="1.4">
            <circle cx="216" cy="316" r="4"/><circle cx="238" cy="330" r="4"/><circle cx="274" cy="330" r="4"/><circle cx="296" cy="316" r="4"/>
          </g>
          <circle cx="256" cy="352" r="15" fill="#D9C08E" stroke="#3A2517" stroke-width="2.4"/>
        </g>
        <circle cx="256" cy="352" r="7" fill="#6B4A2A" opacity="0.55"/>
        <path d="M218 312 Q256 340 292 310" fill="none" stroke="#C9A876" stroke-width="2" opacity="0.5"/>`,
    }),
  },
  {
    id: 'leaf-scarf', name: '이파리 목도리', element: 'forest', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) + lin(`${uid}-sc`, [[0, '#CDEA9E'], [0.5, '#8DC45C'], [1, '#4F7F30']], { x1: 0, y1: 0, x2: 0.3, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M198 312 Q256 356 314 310 L318 342 Q256 388 194 344 Z" fill="url(#${uid}-sc)"/>
          <path d="M300 336 C316 360 318 392 308 420 L286 414 C296 386 294 360 282 342 Z" fill="url(#${uid}-sc)"/>
          <path d="M300 336 Q298 356 292 374" fill="none" stroke="#3F6B24" stroke-width="1.8" opacity="0.45"/>
        </g>
        <g stroke="#EFFFCD" stroke-width="2" opacity="0.6" fill="none">
          <path d="M212 328 Q238 344 266 342"/><path d="M206 318 Q234 336 262 334"/>
        </g>`,
    }),
  },
  {
    id: 'acorn-charm', name: '도토리 부적', element: 'forest', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) +
        lin(`${uid}-ac`, [[0, '#C9945C'], [0.55, '#8A5A2E'], [1, '#4E3018']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }) +
        lin(`${uid}-cap`, [[0, '#9BC46A'], [1, '#4F7F30']]),
      body: `
        <path d="M226 310 Q256 352 286 310" fill="none" stroke="#6B4A2A" stroke-width="4" stroke-linecap="round"/>
        <g transform="translate(256 372)" stroke="${pal.line}" stroke-width="2.2" stroke-linejoin="round">
          <path d="M-20 -4 Q0 -22 20 -4 Q0 30 -20 -4 Z" fill="url(#${uid}-ac)"/>
          <path d="M-22 -6 Q0 -26 22 -6 Q0 -14 -22 -6 Z" fill="url(#${uid}-cap)"/>
          <path d="M0 -24 L0 -34" stroke="#4F3A22" stroke-width="3"/>
        </g>
        <path d="M244 372 Q256 386 268 370" fill="none" stroke="#F0D9B0" stroke-width="2" opacity="0.45"/>`,
    }),
  },
  {
    id: 'polka-scarf', name: '물방울 목도리', element: 'spotted', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) + lin(`${uid}-sc`, [[0, '#FFF0F6'], [0.5, '#FFB3D6'], [1, '#E2649E']], { x1: 0, y1: 0, x2: 0.2, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M196 312 Q256 358 316 310 L318 344 Q256 392 192 346 Z" fill="url(#${uid}-sc)"/>
          <path d="M302 340 C320 366 322 400 312 428 L288 420 C300 392 298 366 284 346 Z" fill="url(#${uid}-sc)"/>
        </g>
        <g fill="#FFFFFF" opacity="0.75">
          <circle cx="216" cy="330" r="6"/><circle cx="246" cy="348" r="5"/><circle cx="280" cy="340" r="6"/>
          <circle cx="306" cy="372" r="5"/><circle cx="302" cy="404" r="4.5"/>
        </g>`,
    }),
  },
  {
    id: 'ember-pendant', name: '잉걸불 펜던트', element: 'fire', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glow(uid, 8) +
        rad(`${uid}-em`, [[0, '#FFF3C4'], [0.35, '#FFA53A'], [1, '#B32B05']]) +
        glowDef(`${uid}-fire`, 9),
      body: `
        <path d="M222 308 Q256 350 290 308" fill="none" stroke="#7A4A22" stroke-width="3.6" stroke-linecap="round"/>
        <g transform="translate(256 366)" filter="url(#${uid}-fire)">
          <path d="M0 -26 C18 -12 22 6 10 18 C4 24 -6 24 -12 16 C-20 6 -16 -8 0 -26 Z" fill="url(#${uid}-em)"/>
          <path d="M0 -10 C8 -2 8 8 2 14 C-2 18 -8 14 -8 8 C-8 2 -4 4 0 -10 Z" fill="#FFF3C4" opacity="0.9"/>
        </g>
        <circle cx="256" cy="336" r="4.5" fill="#FFD27A" stroke="#5E2A0A" stroke-width="1.6"/>
        <g fill="#FFB347" opacity="0.9"><circle cx="222" cy="330" r="2.6"/><circle cx="292" cy="328" r="2.2"/></g>`,
    }),
  },
  {
    id: 'ice-necklace', name: '서리 목걸이', element: 'ice', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) +
        lin(`${uid}-ch`, [[0, '#FFFFFF'], [0.5, '#CFEFFF'], [1, '#8FBFDA']], { x1: 0, y1: 0, x2: 1, y2: 1 }) +
        lin(`${uid}-gem`, [[0, '#FFFFFF'], [0.4, '#B6F0FF'], [1, '#3B87B8']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }),
      body: `
        <path d="M220 308 Q256 356 292 308" fill="none" stroke="url(#${uid}-ch)" stroke-width="3.2" stroke-dasharray="7 5" stroke-linecap="round"/>
        <g stroke="${pal.line}" stroke-width="2" stroke-linejoin="round" transform="translate(256 360)">
          <path d="M0 -24 L14 -2 L0 26 L-14 -2 Z" fill="url(#${uid}-gem)"/>
          <path d="M0 -24 L0 26 M-14 -2 L14 -2" stroke="#FFFFFF" stroke-opacity="0.55" stroke-width="1.4"/>
        </g>
        <g fill="#EAFBFF" opacity="0.9"><circle cx="226" cy="316" r="2.4"/><circle cx="286" cy="316" r="2.4"/></g>`,
    }),
  },
  {
    id: 'moon-pendant', name: '달빛 펜던트', element: 'ice', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: glow(uid, 8) +
        lin(`${uid}-mn`, [[0, '#FFFFFF'], [0.5, '#DFF2FF'], [1, '#8FB8DA']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }) +
        glowDef(`${uid}-moonG`, 8),
      body: `
        <path d="M222 308 Q256 350 290 308" fill="none" stroke="#B9CFE0" stroke-width="3" stroke-linecap="round"/>
        <g transform="translate(256 364)" filter="url(#${uid}-moonG)">
          <path d="M10 -22 A24 24 0 1 0 10 22 A19 19 0 1 1 10 -22 Z" fill="url(#${uid}-mn)" stroke="${pal.line}" stroke-width="1.8"/>
        </g>
        <circle cx="256" cy="340" r="4" fill="#EAF6FF" stroke="#5E7A90" stroke-width="1.4"/>
        <g fill="#FFFFFF" opacity="0.9">
          <path d="M300 344 l1.6 5 l5 1.6 l-5 1.6 l-1.6 5 l-1.6 -5 l-5 -1.6 l5 -1.6 z"/>
        </g>`,
    }),
  },
  {
    id: 'thunder-chain', name: '뇌전 사슬', element: 'thunder', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) + glowDef(`${uid}-boltG`, 6) +
        lin(`${uid}-mt`, [[0, '#D9CCFF'], [0.5, '#8C7AB8'], [1, '#4A3A70']], { x1: 0, y1: 0, x2: 1, y2: 1 }),
      body: `
        <g fill="none" stroke="url(#${uid}-mt)" stroke-width="7" stroke-linecap="round">
          <path d="M214 310 Q256 352 298 310" stroke-dasharray="12 4"/>
        </g>
        <g fill="none" stroke="#E9DBFF" stroke-width="2" opacity="0.6">
          <path d="M214 310 Q256 352 298 310" stroke-dasharray="12 4"/>
        </g>
        <g transform="translate(256 372)" stroke="${pal.line}" stroke-width="2.2" stroke-linejoin="round" filter="url(#${uid}-boltG)">
          <path d="M-8 -26 L12 -26 L0 -6 L14 -6 L-12 26 L-2 2 L-16 2 Z" fill="#C6A2FF"/>
        </g>
        <g fill="#8DF6FF"><circle cx="212" cy="312" r="3.4"/><circle cx="300" cy="312" r="3.4"/></g>`,
    }),
  },
  {
    id: 'hologram-crest', name: '홀로그램 문장', element: 'thunder', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-hG`, 8),
      body: `
        <g opacity="0.9">
          <circle cx="256" cy="372" r="44" fill="none" stroke="#7CF9FF" stroke-width="2.4" opacity="0.5" filter="url(#${uid}-hG)"/>
          <circle cx="256" cy="372" r="34" fill="#7CF9FF" opacity="0.08"/>
          <g fill="none" stroke="#B7FFE8" stroke-width="2.4" filter="url(#${uid}-hG)" opacity="0.95">
            <path d="M256 344 L282 358 L276 388 L256 400 L236 388 L230 358 Z"/>
            <path d="M256 352 L270 362 L266 382 L256 388 L246 382 L242 362 Z"/>
            <path d="M256 360 L256 380"/>
          </g>
          <g stroke="#7CF9FF" stroke-width="1.6" opacity="0.6">
            <path d="M256 316 L256 336"/><path d="M226 322 L236 340"/><path d="M286 322 L276 340"/>
          </g>
        </g>`,
    }),
  },
  {
    id: 'gold-medallion', name: '황금 메달', element: 'gold', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: glow(uid) +
        lin(`${uid}-ch`, [[0, '#FFF3C0'], [0.5, '#FFD35C'], [1, '#A9760F']], { x1: 0, y1: 0, x2: 1, y2: 1 }) +
        rad(`${uid}-md`, [[0, '#FFF8D8'], [0.5, '#FFD24A'], [1, '#B37B12']], { cx: 0.4, cy: 0.32, r: 0.8 }),
      body: `
        <path d="M210 306 Q256 362 302 306" fill="none" stroke="url(#${uid}-ch)" stroke-width="6" stroke-dasharray="14 3"/>
        <g transform="translate(256 372)" stroke="${pal.line}" stroke-width="2.4">
          <circle r="32" fill="url(#${uid}-md)"/>
          <circle r="24" fill="none" stroke="#8A5C0C" stroke-width="2" opacity="0.6"/>
          <path d="M0 -16 L12 -4 L8 12 L-8 12 L-12 -4 Z" fill="#FFF3C0" stroke="#8A5C0C" stroke-width="1.6"/>
          <path d="M-30 0 A30 30 0 0 1 30 0" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="3"/>
        </g>
        <g fill="#FFF6CE" opacity="0.9"><circle cx="212" cy="312" r="3"/><circle cx="300" cy="312" r="3"/></g>`,
    }),
  },
  {
    id: 'royal-cape', name: '왕실 망토', element: 'gold', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: glow(uid, 8) +
        lin(`${uid}-cp`, [[0, '#8E1E3E'], [0.45, '#6A0F2A'], [1, '#38051A']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }) +
        lin(`${uid}-fur`, [[0, '#FFFFFF'], [0.6, '#F2E6D2'], [1, '#D6C3A8']], { x1: 0, y1: 0, x2: 0, y2: 1 }) +
        lin(`${uid}-gd`, [[0, '#FFF3C0'], [0.5, '#FFD35C'], [1, '#A9760F']], { x1: 0, y1: 0, x2: 1, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.6" stroke-linejoin="round">
          <path d="M166 306 C126 350 104 420 96 512 L416 512 C408 420 386 350 346 306 C320 336 292 350 256 350 C220 350 192 336 166 306 Z"
            fill="url(#${uid}-cp)"/>
          <path d="M170 310 C204 338 226 348 256 348 C286 348 308 338 342 310 C332 330 300 356 256 356 C212 356 180 330 170 310 Z"
            fill="url(#${uid}-fur)"/>
          <path d="M236 348 L256 384 L276 348" fill="url(#${uid}-fur)"/>
        </g>
        <g stroke="#FFD35C" stroke-width="2.4" opacity="0.75" fill="none">
          <path d="M132 400 C176 372 336 372 380 400"/><path d="M120 452 C176 420 336 420 392 452"/>
        </g>
        <g transform="translate(256 372)">
          <circle r="13" fill="url(#${uid}-gd)" stroke="${pal.line}" stroke-width="2"/>
          <path d="M0 -7 L6 0 L0 7 L-6 0 Z" fill="#E0359E" stroke="#5E0A3C" stroke-width="1.4"/>
        </g>`,
    }),
  },
  {
    id: 'diamond-core', name: '다이아 코어', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-dG`, 9) +
        lin(`${uid}-dm`, [[0, '#FFFFFF'], [0.35, '#D6F6FF'], [0.7, '#8FD0F0'], [1, '#4E8FBF']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }) +
        lin(`${uid}-rb`, [[0, '#FFB3EC', 0.8], [0.5, '#B6FFF0', 0.7], [1, '#B8C6FF', 0.8]], { x1: 0, y1: 0, x2: 1, y2: 1 }),
      body: `
        <g filter="url(#${uid}-dG)">
          <g transform="translate(256 374)" stroke="${pal.line}" stroke-width="2" stroke-linejoin="round">
            <path d="M0 -38 L30 -10 L0 34 L-30 -10 Z" fill="url(#${uid}-dm)"/>
            <path d="M0 -38 L0 34 M-30 -10 L30 -10" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.6"/>
            <path d="M0 -38 L-14 -8 L0 34 L14 -8 Z" fill="url(#${uid}-rb)" opacity="0.5"/>
          </g>
          <ellipse cx="256" cy="374" rx="62" ry="16" fill="none" stroke="#CFF4FF" stroke-width="2.4" opacity="0.75" transform="rotate(-18 256 374)"/>
          <ellipse cx="256" cy="374" rx="68" ry="20" fill="none" stroke="#FFD9FB" stroke-width="1.6" opacity="0.5" transform="rotate(22 256 374)"/>
        </g>
        <path d="M216 304 Q256 344 296 304" fill="none" stroke="#DFF8FF" stroke-width="2.6" stroke-linecap="round" opacity="0.8"/>
        <g fill="#FFFFFF" opacity="0.95">
          <path d="M308 320 l2 6 l6 2 l-6 2 l-2 6 l-2 -6 l-6 -2 l6 -2 z"/>
          <path d="M204 340 l1.6 5 l5 1.6 l-5 1.6 l-1.6 5 l-1.6 -5 l-5 -1.6 l5 -1.6 z"/>
        </g>`,
    }),
  },
  {
    id: 'aurora-sash', name: '오로라 띠', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: glowDef(`${uid}-sG`, 8) +
        lin(`${uid}-sash`, [[0, '#8FFFE0', 0.9], [0.3, '#6BD0FF', 0.85], [0.6, '#C9A5FF', 0.8], [1, '#FF9CE8', 0.7]]),
      body: `
        <g filter="url(#${uid}-sG)">
          <path d="M186 316 C222 352 292 352 330 314 L336 348 C292 392 218 392 180 350 Z"
            fill="url(#${uid}-sash)" stroke="#FFFFFF" stroke-width="1.8" stroke-opacity="0.6"/>
          <path d="M306 352 C322 386 320 428 306 458 L282 448 C296 418 296 384 284 358 Z"
            fill="url(#${uid}-sash)" opacity="0.85" stroke="#FFFFFF" stroke-width="1.4" stroke-opacity="0.4"/>
        </g>
        <g stroke="#FFFFFF" stroke-width="1.6" opacity="0.65" fill="none">
          <path d="M198 330 C228 358 286 358 318 330"/><path d="M292 372 C300 396 300 422 292 442"/>
        </g>
        <g fill="#FFFFFF" opacity="0.9"><circle cx="256" cy="338" r="4"/><circle cx="256" cy="338" r="9" fill="none" stroke="#FFFFFF" stroke-width="1" opacity="0.5"/></g>`,
    }),
  },
];

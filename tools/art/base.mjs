/**
 * Canonical chibi-dragon bust template + drawing helpers.
 *
 * Every part of every layer is drawn into the same 512x512 coordinate space
 * with the anchors below. Because each layer is rasterised from this one
 * template, any 6-part combination lands pixel-exactly: wings attach behind
 * the shoulders, eyes sit in the eye sockets, horns sit on the crown ridge,
 * and accessories hang from the chest anchor.
 */

export const SIZE = 512;

/** Anchors shared by every layer. */
export const A = {
  head: { cx: 256, cy: 198, rx: 106, ry: 96 },
  eyeL: { cx: 223, cy: 202, rx: 19.5, ry: 23 },
  eyeR: { cx: 291, cy: 200, rx: 19.5, ry: 23 },
  muzzle: { cx: 253, cy: 255, rx: 47, ry: 35 },
  crown: { cx: 256, y: 104 },
  chest: { cx: 256, y: 344 },
  neck: { cx: 256, y: 306 },
  wingL: { x: 196, y: 312 },
  wingR: { x: 316, y: 310 },
};

/** Element palettes — shared by art and UI. */
export const PAL = {
  white: {
    main: '#FBE9CE', light: '#FFFDF6', dark: '#DCC09A', deep: '#B48E63',
    glow: '#FFE6B8', line: '#8A6A47', belly: '#FFF8E8', eye: '#7B5B3A',
  },
  spotted: {
    main: '#BDECDC', light: '#EBFFF7', dark: '#79B9A6', deep: '#4B8375',
    glow: '#8CFFE0', line: '#2E6657', belly: '#DDFBF0', eye: '#2F6B5C',
  },
  forest: {
    main: '#A6D37E', light: '#E4F8C6', dark: '#6B9B4F', deep: '#3F6330',
    glow: '#B6FF7E', line: '#2E4A22', belly: '#D8F2B4', eye: '#3D6A2A',
  },
  fire: {
    main: '#FF9251', light: '#FFE2B4', dark: '#C2451C', deep: '#7A1F0B',
    glow: '#FF7A31', line: '#5E1507', belly: '#FFD9A8', eye: '#FFB347',
  },
  ice: {
    main: '#A6E4FF', light: '#F0FDFF', dark: '#5EA6D6', deep: '#2F6E9E',
    glow: '#8AEDFF', line: '#1E4C6E', belly: '#E4F8FF', eye: '#2D7FB0',
  },
  thunder: {
    main: '#BB8CFF', light: '#EEDFFF', dark: '#7343BD', deep: '#3E1C74',
    glow: '#C79BFF', line: '#2E1157', belly: '#E2CCFF', eye: '#8B4BFF',
  },
  gold: {
    main: '#FFD35C', light: '#FFF6CE', dark: '#C08A1C', deep: '#7B520D',
    glow: '#FFC63A', line: '#5E3F08', belly: '#FFE9A6', eye: '#B37B12',
  },
  diamond: {
    main: '#DDF3FF', light: '#FFFFFF', dark: '#9CC4E4', deep: '#5E86AB',
    glow: '#C6F5FF', line: '#3E6280', belly: '#F6FEFF', eye: '#3F86B5',
  },
};

export const ELEMENT_KO = {
  white: '하양', spotted: '점박이', forest: '숲', fire: '불꽃',
  ice: '얼음', thunder: '번개', gold: '황금', diamond: '다이아',
};

/* ------------------------------------------------------------------ paths -- */

export const P = {
  torso:
    'M158 512 C148 454 154 376 186 334 C208 306 232 298 256 298 ' +
    'C280 298 304 306 326 334 C358 376 364 454 354 512 Z',
  head:
    'M256 94 C317 94 357 136 360 188 C362 228 347 262 321 284 ' +
    'C298 303 274 311 255 311 C230 311 199 300 178 280 C155 258 145 226 148 188 ' +
    'C151 136 197 94 256 94 Z',
  earL: 'M164 192 C146 174 136 148 140 122 C158 138 174 160 180 184 Z',
  earR: 'M348 192 C366 174 376 148 372 122 C354 138 338 160 332 184 Z',
  belly:
    'M206 330 C236 312 276 312 306 330 C320 398 318 464 306 512 ' +
    'L206 512 C194 464 192 398 206 330 Z',
};

/* ------------------------------------------------------------------ utils -- */

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function rngFor(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return mulberry32(h >>> 0);
}

export const f2 = (n) => Math.round(n * 100) / 100;

/** One stop-list → linear or radial gradient def. */
export function lin(id, stops, { x1 = 0, y1 = 0, x2 = 0, y2 = 1 } = {}) {
  return `<linearGradient id="${id}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</linearGradient>`;
}

export function rad(id, stops, { cx = 0.5, cy = 0.5, r = 0.5, fx, fy } = {}) {
  return `<radialGradient id="${id}" cx="${cx}" cy="${cy}" r="${r}"${
    fx != null ? ` fx="${fx}" fy="${fy}"` : ''
  }>${stops
    .map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`)
    .join('')}</radialGradient>`;
}

export const blurDef = (id, std, pad = 60) =>
  `<filter id="${id}" x="-${pad}%" y="-${pad}%" width="${100 + pad * 2}%" height="${
    100 + pad * 2
  }%"><feGaussianBlur stdDeviation="${std}"/></filter>`;

/** Soft glow filter (blur + merge of source). */
export const glowDef = (id, std = 6) =>
  `<filter id="${id}" x="-70%" y="-70%" width="240%" height="240%">` +
  `<feGaussianBlur stdDeviation="${std}" result="b"/>` +
  `<feMerge><feMergeNode in="b"/><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>` +
  `</filter>`;

/* ------------------------------------------------------------- silhouette -- */

export const bodyShapes = (attrs = '') =>
  `<path d="${P.torso}" ${attrs}/>` +
  `<path d="${P.earL}" ${attrs}/><path d="${P.earR}" ${attrs}/>` +
  `<path d="${P.head}" ${attrs}/>`;

/* ------------------------------------------------------------ body render -- */

/**
 * Draws the shared dragon anatomy in a material palette.
 *  cfg.texture(uid)  – tiled pattern painted above the skin, clipped to body
 *  cfg.overlay(uid)  – extra effects painted above the belly (cracks, glow…)
 *  cfg.sheen         – 'gloss' | 'matte' | 'crystal'
 *  cfg.belly         – tint the belly
 *  cfg.muzzle        – muzzle fill colour
 */
export function renderBody(cfg) {
  const { uid, pal } = cfg;
  const sheen = cfg.sheen || 'gloss';
  const muzzle = cfg.muzzle || pal.belly;
  const clip = `${uid}-bc`;
  const defs = [
    rad(`${uid}-skin`, [
      [0, pal.light],
      [0.26, pal.main],
      [0.72, pal.dark],
      [1, pal.deep],
    ], { cx: 0.38, cy: 0.22, r: 0.92 }),
    rad(`${uid}-bellyG`, [
      [0, pal.belly || pal.light],
      [0.7, pal.belly || pal.main],
      [1, pal.dark, 0.85],
    ], { cx: 0.5, cy: 0.2, r: 0.9 }),
    lin(`${uid}-rim`, [
      [0, pal.light, 0.95],
      [0.55, pal.glow, 0.35],
      [1, pal.glow, 0],
    ], { x1: 0.1, y1: 0, x2: 0.9, y2: 1 }),
    blurDef(`${uid}-soft`, 14),
    blurDef(`${uid}-soft2`, 5),
    blurDef(`${uid}-rimBlur`, 5),
    blurDef(`${uid}-drop`, 16, 30),
    `<clipPath id="${clip}">${bodyShapes()}</clipPath>`,
  ].join('');

  const texture = cfg.texture ? cfg.texture(uid) : '';
  const overlay = cfg.overlay ? cfg.overlay(uid) : '';

  const scales = (() => {
    if (cfg.scales === false) return '';
    const rows = [];
    const rnd = rngFor(uid + 'scales');
    for (let row = 0; row < 3; row++) {
      const y = 250 + row * 18;
      for (let col = 0; col < 9; col++) {
        const x = 158 + col * 26 + (row % 2 ? 13 : 0);
        if (x > 196 && x < 310) continue;
        const r = 8 + rnd() * 2;
        rows.push(
          `<path d="M${f2(x - r)} ${y} a${f2(r)} ${f2(r * 0.8)} 0 0 0 ${f2(r * 2)} 0" fill="none" stroke="${
            pal.deep
          }" stroke-width="1.6" opacity="0.13"/>`
        );
      }
    }
    return rows.join('');
  })();

  const body = `
  <g opacity="0.4" filter="url(#${uid}-drop)">
    <g transform="translate(6 10)" fill="#07030F">${bodyShapes()}</g>
  </g>
  <g clip-path="url(#${clip})">
    <rect width="512" height="512" fill="url(#${uid}-skin)"/>
    <ellipse cx="242" cy="126" rx="112" ry="72" fill="${pal.light}" opacity="${sheen === 'matte' ? 0.32 : 0.5}" filter="url(#${uid}-soft)"/>
    <ellipse cx="300" cy="470" rx="190" ry="120" fill="${pal.deep}" opacity="0.5" filter="url(#${uid}-soft)"/>
    <ellipse cx="140" cy="330" rx="56" ry="120" fill="${pal.dark}" opacity="0.35" filter="url(#${uid}-soft)"/>
    ${scales}
    ${texture}
    ${cfg.belly === false ? '' : `
    <path d="${P.belly}" fill="url(#${uid}-bellyG)" opacity="0.94"/>
    <path d="${P.belly}" fill="none" stroke="${pal.dark}" stroke-width="2" opacity="0.35"/>
    <g stroke="${pal.deep}" stroke-width="2.4" opacity="0.28" fill="none" stroke-linecap="round">
      <path d="M212 358 Q256 346 300 358"/>
      <path d="M208 396 Q256 384 304 396"/>
      <path d="M208 434 Q256 422 304 434"/>
      <path d="M212 470 Q256 458 300 470"/>
    </g>`}
    ${overlay}
    <ellipse cx="256" cy="302" rx="92" ry="30" fill="${pal.deep}" opacity="0.5" filter="url(#${uid}-soft2)"/>
    <path d="M166 184 C154 168 148 150 150 134 C162 148 172 164 176 180 Z" fill="${pal.dark}" opacity="0.35"/>
    <path d="M346 184 C358 168 364 150 362 134 C350 148 340 164 336 180 Z" fill="${pal.deep}" opacity="0.3"/>
    <path d="${P.torso}" fill="url(#${uid}-rim)" opacity="0.5" style="mix-blend-mode:screen"/>
    <path d="${P.torso}" fill="none" stroke="${pal.light}" stroke-width="5" opacity="0.32" filter="url(#${uid}-rimBlur)"/>
    <path d="${P.head}" fill="none" stroke="${pal.light}" stroke-width="4.5" opacity="0.3" filter="url(#${uid}-rimBlur)"/>
    <ellipse cx="200" cy="146" rx="46" ry="26" fill="${pal.light}" opacity="0.3" filter="url(#${uid}-soft2)"/>
    <!-- head / torso separation -->
    <path d="${P.torso}" fill="${pal.deep}" opacity="0.1"/>
    <path d="${P.head}" fill="${pal.light}" opacity="0.12"/>
    <path d="M174 314 Q256 350 338 310" fill="none" stroke="${pal.deep}" stroke-width="18" opacity="0.34" filter="url(#${uid}-soft2)" stroke-linecap="round"/>
    <!-- snout -->
    <path d="M253 206 L253 252" stroke="${pal.light}" stroke-width="13" opacity="0.45" stroke-linecap="round" filter="url(#${uid}-soft2)"/>
    <ellipse cx="253" cy="255" rx="51" ry="38" fill="${pal.deep}" opacity="0.28" filter="url(#${uid}-soft2)"/>
    <path d="M208 248 C208 226 228 218 253 218 C278 218 298 226 298 248 C298 274 280 291 253 291 C226 291 208 274 208 248 Z" fill="${muzzle}"/>
    <path d="M212 240 C218 224 234 218 253 218 C272 218 288 224 294 240 C280 233 268 231 253 231 C238 231 226 233 212 240 Z" fill="${pal.light}" opacity="0.45"/>
    <path d="M224 280 C234 288 272 288 282 279" fill="none" stroke="${pal.deep}" stroke-width="3" opacity="0.18" stroke-linecap="round"/>
    <ellipse cx="240" cy="246" rx="4.6" ry="3.4" fill="${pal.deep}" opacity="0.8"/>
    <ellipse cx="266" cy="245" rx="4.6" ry="3.4" fill="${pal.deep}" opacity="0.8"/>
    <path d="M230 271 Q253 285 276 269" fill="none" stroke="${pal.line}" stroke-width="3.4"
      stroke-linecap="round" opacity="0.9"/>
    <path d="M234 269 l5 9 l5 -9 z" fill="${pal.line}" opacity="0.75"/>
    <path d="M267 268 l5 9 l5 -9 z" fill="${pal.line}" opacity="0.7"/>
    <path d="M243 279 Q253 283 263 278" fill="none" stroke="${pal.light}" stroke-width="2.6" opacity="0.45" stroke-linecap="round"/>
    <ellipse cx="184" cy="240" rx="17" ry="9" fill="${pal.glow}" opacity="0.4"/>
    <ellipse cx="330" cy="242" rx="17" ry="9" fill="${pal.glow}" opacity="0.34"/>
    <ellipse cx="200" cy="150" rx="30" ry="12" fill="#fff" opacity="${sheen === 'matte' ? 0.2 : sheen === 'crystal' ? 0.42 : 0.28}" transform="rotate(-16 200 150)"/>
    <ellipse cx="188" cy="132" rx="9" ry="5" fill="#fff" opacity="0.5" transform="rotate(-18 188 132)"/>
  </g>
  <g fill="none" stroke="#0B0616" stroke-width="9" opacity="0.28" stroke-linejoin="round" filter="url(#${uid}-rimBlur)">
    ${bodyShapes()}
  </g>
  <g fill="none" stroke="${pal.line}" stroke-width="4" opacity="0.9" stroke-linejoin="round">
    ${bodyShapes()}
  </g>
  <g fill="none" stroke="#0B0616" stroke-width="1.8" opacity="0.4" stroke-linejoin="round">
    ${bodyShapes()}
  </g>
  <g fill="none" stroke="${pal.line}" stroke-width="1.6" opacity="0.32">
    <path d="M206 322 C232 308 280 308 306 322"/>
    <path d="M212 470 C236 484 276 484 300 470"/>
  </g>`;
  return { defs, body };
}

/* -------------------------------------------------------------- eye utils -- */

export function eyeWhite(cx, cy, rx, ry, color = '#FFFFFF', op = 1) {
  return `<ellipse cx="${cx}" cy="${cy}" rx="${rx + 5.5}" ry="${ry + 5.5}" fill="${color}" opacity="${op * 0.96}"/>`;
}

export function iris(cx, cy, r, inner, outer, uid, { pupil = 10, pupilColor = '#150B22' } = {}) {
  return `
  <ellipse cx="${cx}" cy="${cy}" rx="${r}" ry="${r * 1.16}" fill="url(#${uid}-iris)"/>
  <ellipse cx="${cx}" cy="${cy}" rx="${r * 0.52}" ry="${r * 0.78}" fill="${pupilColor}" opacity="0.92"/>
  <ellipse cx="${cx - r * 0.34}" cy="${cy - r * 0.44}" rx="${r * 0.36}" ry="${r * 0.34}" fill="#fff" opacity="0.95"/>
  <ellipse cx="${cx + r * 0.3}" cy="${cy + r * 0.42}" rx="${r * 0.16}" ry="${r * 0.16}" fill="#fff" opacity="0.6"/>`;
}

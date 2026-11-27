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

/**
 * Silhouette design notes
 * ----------------------
 * The head is a broad, soft jaw (not a pointy chin) so it can cover the whole
 * torso neck: at every height where both shapes exist the head is wider than
 * the torso, which is what keeps the torso outline from cutting across the
 * chin. The torso neck is narrow (≈66px) and the shoulders fall away steeply
 * from behind the jaw, so the only visible seam is a single chin line.
 *
 * Ears are drawn before the head (so the head's opaque fill hides their roots)
 * and their outline is left untouched, while the head's outline is masked out
 * wherever an ear sits — the two strokes meet exactly on the ear edge instead
 * of crossing.
 */
export const P = {
  torso:
    'M158 512 C148 454 152 382 176 346 C192 324 212 310 224 300 ' +
    'L288 300 C300 310 320 324 336 346 C360 382 364 454 354 512 Z',
  head:
    'M256 94 C317 94 357 136 360 188 C362 230 350 262 330 284 ' +
    'C316 302 300 311 284 313 C276 314 268 314 256 314 ' +
    'C244 314 236 314 228 313 C212 311 196 302 182 284 ' +
    'C162 262 150 230 148 188 C151 136 197 94 256 94 Z',
  earL: 'M170 201 C150 181 138 150 136 116 C156 134 176 152 196 172 C200 186 190 199 170 201 Z',
  earR: 'M342 201 C362 181 374 150 376 116 C356 134 336 152 316 172 C312 186 322 199 342 201 Z',
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

/** Outline pass: soft dark halo + silhouette line + inner line, for one shape. */
const outlineOf = (uid, pal, d, mask = '') =>
  `<g${mask ? ` mask="url(#${mask})"` : ''} fill="none" stroke-linejoin="round">` +
  `<g stroke="#0B0616" stroke-width="9" opacity="0.28" filter="url(#${uid}-rimBlur)"><path d="${d}"/></g>` +
  `<g stroke="${pal.line}" stroke-width="4" opacity="0.9"><path d="${d}"/></g>` +
  `<g stroke="#0B0616" stroke-width="1.8" opacity="0.4"><path d="${d}"/></g>` +
  `</g>`;

/* ------------------------------------------------------------ body render -- */

/**
 * Draws the shared dragon anatomy in a material palette.
 *  cfg.texture(uid)  – tiled pattern painted above the skin, clipped to the shape
 *  cfg.overlay(uid)  – extra effects painted above the belly (cracks, glow…)
 *  cfg.sheen         – 'gloss' | 'matte' | 'crystal'
 *  cfg.belly         – tint the belly
 *  cfg.muzzle        – muzzle fill colour
 *
 * Paint order is torso → ears → head, each as its own opaque, clipped base.
 * The head therefore covers the torso's top edge (no torso stroke under the
 * chin) and the ear roots (no head stroke across the ears).
 */
export function renderBody(cfg) {
  const { uid, pal } = cfg;
  const sheen = cfg.sheen || 'gloss';
  const muzzle = cfg.muzzle || pal.belly;
  const tClip = `${uid}-tc`;
  const hClip = `${uid}-hc`;
  const eClip = `${uid}-ec`;
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
    `<clipPath id="${tClip}"><path d="${P.torso}"/></clipPath>`,
    `<clipPath id="${hClip}"><path d="${P.head}"/></clipPath>`,
    `<clipPath id="${eClip}"><path d="${P.earL}"/><path d="${P.earR}"/></clipPath>`,
    // ears sit on top of the head, so their outline is clipped to everything
    // outside the head silhouette: the two outlines meet instead of crossing
    `<mask id="${uid}-earM" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<rect width="512" height="512" fill="#fff"/>` +
      `<path d="${P.head}" fill="#000" stroke="#000" stroke-width="1.8"/></mask>`,
    lin(`${uid}-rimFade`, [[0, '#FFF', 1], [0.52, '#FFF', 1], [0.78, '#FFF', 0]]),
    `<mask id="${uid}-headRim" maskUnits="userSpaceOnUse" x="0" y="0" width="512" height="512">` +
      `<rect width="512" height="512" fill="url(#${uid}-rimFade)"/></mask>`,
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
  <!-- torso (opaque, first: the head silhouette covers its top edge) -->
  <g clip-path="url(#${tClip})">
    <rect width="512" height="512" fill="url(#${uid}-skin)"/>
    <ellipse cx="300" cy="470" rx="190" ry="120" fill="${pal.deep}" opacity="0.5" filter="url(#${uid}-soft)"/>
    <ellipse cx="140" cy="330" rx="56" ry="120" fill="${pal.dark}" opacity="0.35" filter="url(#${uid}-soft)"/>
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
    <ellipse cx="256" cy="324" rx="96" ry="26" fill="${pal.deep}" opacity="0.4" filter="url(#${uid}-soft2)"/>
    <path d="${P.torso}" fill="${pal.deep}" opacity="0.1"/>
    <path d="${P.torso}" fill="url(#${uid}-rim)" opacity="0.5" style="mix-blend-mode:screen"/>
    <path d="${P.torso}" fill="none" stroke="${pal.light}" stroke-width="5" opacity="0.32" filter="url(#${uid}-rimBlur)"/>
    <g fill="none" stroke="${pal.line}" stroke-width="1.6" opacity="0.32">
      <path d="M208 326 C232 314 280 314 304 326"/>
      <path d="M212 470 C236 484 276 484 300 470"/>
    </g>
  </g>
  ${outlineOf(uid, pal, P.torso)}
  <!-- head (opaque over the torso; outline stops at the ear roots) -->
  <g clip-path="url(#${hClip})">
    <rect width="512" height="512" fill="url(#${uid}-skin)"/>
    <ellipse cx="242" cy="126" rx="112" ry="72" fill="${pal.light}" opacity="${sheen === 'matte' ? 0.32 : 0.5}" filter="url(#${uid}-soft)"/>
    ${scales}
    ${texture}
    ${overlay}
    <path d="${P.head}" fill="${pal.light}" opacity="0.12"/>
    <g mask="url(#${uid}-earM)"><g mask="url(#${uid}-headRim)"><path d="${P.head}" fill="none" stroke="${pal.light}" stroke-width="4.5" opacity="0.3" filter="url(#${uid}-rimBlur)"/></g></g>
    <ellipse cx="200" cy="146" rx="46" ry="26" fill="${pal.light}" opacity="0.3" filter="url(#${uid}-soft2)"/>
    <ellipse cx="256" cy="304" rx="86" ry="22" fill="${pal.deep}" opacity="0.22" filter="url(#${uid}-soft2)"/>
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
  ${outlineOf(uid, pal, P.head)}  <!-- ears (on top of the head so their roots cover the head outline) -->
  <g clip-path="url(#${eClip})">
    <rect width="512" height="512" fill="url(#${uid}-skin)"/>
    <ellipse cx="242" cy="126" rx="112" ry="72" fill="${pal.light}" opacity="${sheen === 'matte' ? 0.32 : 0.5}" filter="url(#${uid}-soft)"/>
    ${texture}
    ${overlay}
    <path d="${P.head}" fill="${pal.light}" opacity="0.12"/>
    <path d="${P.head}" fill="none" stroke="#0B0616" stroke-width="9" opacity="0.28" filter="url(#${uid}-rimBlur)"/>
    <path d="M168 192 C152 172 142 148 142 124 C154 140 168 158 182 176 C186 186 178 194 168 192 Z" fill="${pal.dark}" opacity="0.30"/>
    <path d="M344 192 C360 172 370 148 370 124 C358 140 344 158 330 176 C326 186 334 194 344 192 Z" fill="${pal.deep}" opacity="0.28"/>
    <path d="M146 186 C138 160 136 140 138 120" fill="none" stroke="${pal.light}" stroke-width="2.2" opacity="0.34" filter="url(#${uid}-rimBlur)" stroke-linecap="round"/>
    <path d="M366 186 C374 160 376 140 374 120" fill="none" stroke="${pal.light}" stroke-width="2" opacity="0.26" filter="url(#${uid}-rimBlur)" stroke-linecap="round"/>
  </g>
  ${outlineOf(uid, pal, `${P.earL}${P.earR}`, `${uid}-earM`)}
`;
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

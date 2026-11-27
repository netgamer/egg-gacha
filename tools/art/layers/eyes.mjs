/**
 * eyes layer — expression + eye material, aligned to the eye anchors.
 */
import { A, glowDef, rad, lin, f2 } from '../base.mjs';

const { eyeL, eyeR } = A;
const RX = 20.5;
const RY = 24;

function eyeClip(uid, key, cx, cy, rx, ry) {
  return `<clipPath id="${uid}-cl-${key}"><ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}"/></clipPath>`;
}

/**
 * One eye.
 * o: { sclera, rim, iris:[l,m,d], pupil:'round'|'slit'|'star', pupilColor,
 *      closed, half, lash, glow, extra, brows }
 */
function eye(uid, key, cx, cy, o) {
  const w = RX;
  const h = RY;
  const lash = o.lash || '#2B1626';
  const id = `i-${key}`;
  if (o.closed) {
    return `<g>
      <path d="M${f2(cx - w)} ${f2(cy - 2)} Q${f2(cx)} ${f2(cy + h * 0.62)} ${f2(cx + w)} ${f2(
      cy - 6
    )}" fill="none" stroke="${lash}" stroke-width="5.5" stroke-linecap="round"/>
      <path d="M${f2(cx - w + 3)} ${f2(cy + 1)} Q${f2(cx)} ${f2(cy + h * 0.5)} ${f2(cx + w)} ${f2(
      cy - 1
    )}" fill="none" stroke="#fff" stroke-width="1.6" opacity="0.35" stroke-linecap="round"/>
      <path d="M${f2(cx + w - 2)} ${f2(cy - 8)} l7 -6" stroke="${lash}" stroke-width="3" stroke-linecap="round"/>
    </g>`;
  }
  const body = `
    <ellipse cx="${cx}" cy="${cy}" rx="${w + 6.5}" ry="${h + 6.5}" fill="${o.rim}" opacity="0.5"/>
    <ellipse cx="${cx}" cy="${cy}" rx="${w + 4}" ry="${h + 4}" fill="${o.sclera}"/>
    <g clip-path="url(#${uid}-cl-${key})">
      <ellipse cx="${cx}" cy="${cy}" rx="${w + 4}" ry="${h + 4}" fill="${o.sclera}"/>
      <ellipse cx="${cx}" cy="${cy}" rx="${w * 0.95}" ry="${h * 0.95}" fill="url(#${uid}-${id})"/>
      ${
        o.pupil === 'slit'
          ? `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.17}" ry="${h * 0.72}" fill="${o.pupilColor || '#1B0B16'}"/>`
          : o.pupil === 'star'
          ? `<path d="M${cx} ${cy - h * 0.5} l${w * 0.2} ${h * 0.22} l${w * 0.34} 0 l-${w * 0.27} ${h * 0.2} l${w * 0.12} ${h * 0.32} l-${w * 0.24} -${h * 0.18} l-${w * 0.24} ${h * 0.18} l${w * 0.12} -${h * 0.32} l-${w * 0.27} -${h * 0.2} l${w * 0.34} 0 z" fill="${o.pupilColor || '#1B0B16'}"/>`
          : `<ellipse cx="${cx}" cy="${cy}" rx="${w * 0.5}" ry="${h * 0.56}" fill="${o.pupilColor || '#1B0B16'}"/>`
      }
      <ellipse cx="${cx - w * 0.34}" cy="${cy - h * 0.36}" rx="${w * 0.34}" ry="${h * 0.3}" fill="#fff" opacity="0.95"/>
      <ellipse cx="${cx + w * 0.3}" cy="${cy + h * 0.36}" rx="${w * 0.15}" ry="${h * 0.14}" fill="#fff" opacity="0.7"/>
      ${o.extra || ''}
    </g>
    ${o.glow ? `<ellipse cx="${cx}" cy="${cy}" rx="${w}" ry="${h}" fill="${o.glow}" opacity="0.35" filter="url(#${uid}-eyeGlow)"/>` : ''}
    <path d="M${f2(cx - w - 3)} ${f2(cy - h * 0.62)} Q${f2(cx)} ${f2(cy - h * 1.16)} ${f2(cx + w + 3)} ${f2(
    cy - h * 0.6
  )}" fill="none" stroke="${lash}" stroke-width="5" stroke-linecap="round"/>
    ${o.half ? `<path d="M${f2(cx - w - 5)} ${f2(cy - h * 0.15)} Q${f2(cx)} ${f2(cy + h * 0.28)} ${f2(cx + w + 5)} ${f2(cy - h * 0.2)} L${f2(cx + w + 5)} ${f2(cy - h)} L${f2(cx - w - 5)} ${f2(cy - h)} Z" fill="${lash}" opacity="0.92"/>` : ''}
    <path d="M${f2(cx - w * 0.75)} ${f2(cy + h * 0.82)} Q${f2(cx)} ${f2(cy + h * 1.02)} ${f2(cx + w * 0.7)} ${f2(
    cy + h * 0.78
  )}" fill="none" stroke="${lash}" stroke-width="2.2" opacity="0.35" stroke-linecap="round"/>`;
  return `<g>${body}</g>`;
}

function brows(uid, color, dL, dR, width = 5) {
  return `<g stroke="${color}" stroke-width="${width}" stroke-linecap="round" fill="none" opacity="0.9">
    <path d="${dL}"/><path d="${dR}"/></g>`;
}

const iris = (uid, key, stops) =>
  rad(`${uid}-i-${key}`, stops, { cx: 0.42, cy: 0.3, r: 0.78 });

export const eyeParts = [
  {
    id: 'gentle', name: '다정한 눈', element: 'white', rarity: 'common',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 6) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#F2C98A'], [0.55, '#C98A46'], [1, '#6E3C1C']]) +
        iris(uid, 'r', [[0, '#F2C98A'], [0.55, '#C98A46'], [1, '#6E3C1C']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFFDF8', rim: '#4A2418', lash: '#4A2418' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFFDF8', rim: '#4A2418', lash: '#4A2418' }),
    }),
  },
  {
    id: 'fierce', name: '사나운 눈', element: 'spotted', rarity: 'common',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 6) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFE08A'], [0.5, '#FF9A2E'], [1, '#8A2A05']]) +
        iris(uid, 'r', [[0, '#FFE08A'], [0.5, '#FF9A2E'], [1, '#8A2A05']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFF6E4', rim: '#3A1508', lash: '#3A1508', pupil: 'slit', pupilColor: '#2A0A04' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFF6E4', rim: '#3A1508', lash: '#3A1508', pupil: 'slit', pupilColor: '#2A0A04' }) +
        brows(uid, '#3A1508', `M198 168 Q216 158 240 168`, `M276 166 Q300 156 318 166`, 6),
    }),
  },
  {
    id: 'wink', name: '윙크', element: 'forest', rarity: 'common',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 6) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'r', [[0, '#D8F7A0'], [0.5, '#7FBF3E'], [1, '#2F5E14']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { closed: true, lash: '#2C3A16' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FBFFF2', rim: '#2C3A16', lash: '#2C3A16' }) +
        `<path d="M300 170 q10 -8 22 -2" stroke="#2C3A16" stroke-width="4" fill="none" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'ember-glow', name: '잉걸불 눈', element: 'fire', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 8) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFF3C4'], [0.45, '#FFB13D'], [1, '#B32B05']]) +
        iris(uid, 'r', [[0, '#FFF3C4'], [0.45, '#FFB13D'], [1, '#B32B05']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#2A0B04', rim: '#FF7A1F', lash: '#1A0603', glow: '#FF8A2B', pupil: 'slit' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#2A0B04', rim: '#FF7A1F', lash: '#1A0603', glow: '#FF8A2B', pupil: 'slit' }) +
        `<g fill="#FFC46A" opacity="0.9"><circle cx="196" cy="176" r="3"/><circle cx="318" cy="180" r="2.4"/><circle cx="256" cy="160" r="2"/></g>`,
    }),
  },
  {
    id: 'icy-blue', name: '서리 눈', element: 'ice', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 6) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFFFFF'], [0.4, '#A8ECFF'], [1, '#2E7BB0']]) +
        iris(uid, 'r', [[0, '#FFFFFF'], [0.4, '#A8ECFF'], [1, '#2E7BB0']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#F6FEFF', rim: '#1C4A66', lash: '#1C4A66', glow: '#8AEDFF' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#F6FEFF', rim: '#1C4A66', lash: '#1C4A66', glow: '#8AEDFF' }) +
        `<g stroke="#EAFBFF" stroke-width="2.4" stroke-linecap="round" opacity="0.95">
          <path d="M174 176 l14 -12"/><path d="M338 174 l-14 -12"/></g>`,
    }),
  },
  {
    id: 'sunglasses', name: '선글라스', element: 'spotted', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: lin(`${uid}-lens`, [[0, '#2C3B52'], [0.45, '#101726'], [1, '#070A10']], { x1: 0, y1: 0, x2: 0.6, y2: 1 }) +
        glowDef(`${uid}-eyeGlow`, 5),
      body: `
        <g>
          <path d="M186 186 q10 -8 42 -6 q16 1 16 14 l0 18 q0 18 -20 20 q-22 2 -34 -8 q-8 -8 -8 -22 z" fill="url(#${uid}-lens)" stroke="#0A0E16" stroke-width="4"/>
          <path d="M338 186 q-10 -8 -42 -6 q-16 1 -16 14 l0 18 q0 18 20 20 q22 2 34 -8 q8 -8 8 -22 z" transform="translate(-30 0)" fill="url(#${uid}-lens)" stroke="#0A0E16" stroke-width="4"/>
          <path d="M252 194 q8 -6 16 0" stroke="#0A0E16" stroke-width="5" fill="none"/>
          <path d="M152 190 q-8 -6 -16 -2" stroke="#0A0E16" stroke-width="5" fill="none"/>
          <path d="M364 188 q8 -6 16 -2" stroke="#0A0E16" stroke-width="5" fill="none"/>
          <path d="M196 196 q14 -8 34 -4" stroke="#8FD8FF" stroke-width="4" opacity="0.55" fill="none" stroke-linecap="round"/>
          <path d="M286 194 q14 -8 30 -4" stroke="#FFC7F0" stroke-width="4" opacity="0.45" fill="none" stroke-linecap="round"/>
          <path d="M206 208 q10 8 24 6" stroke="#FFFFFF" stroke-width="2" opacity="0.3" fill="none"/>
        </g>`,
    }),
  },
  {
    id: 'dragon-slits', name: '용의 눈', element: 'forest', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 7) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFF6C0'], [0.42, '#FFD23A'], [1, '#8A4A00']]) +
        iris(uid, 'r', [[0, '#FFF6C0'], [0.42, '#FFD23A'], [1, '#8A4A00']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFF3C8', rim: '#3A1A00', lash: '#3A1A00', pupil: 'slit', pupilColor: '#150700' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFF3C8', rim: '#3A1A00', lash: '#3A1A00', pupil: 'slit', pupilColor: '#150700' }) +
        brows(uid, '#3A1A00', 'M198 166 Q218 154 242 166', 'M276 164 Q300 152 318 164', 5.5),
    }),
  },
  {
    id: 'sleepy', name: '졸린 눈', element: 'white', rarity: 'rare',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 5) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFE6BE'], [0.5, '#C99A62'], [1, '#6B4522']]) +
        iris(uid, 'r', [[0, '#FFE6BE'], [0.5, '#C99A62'], [1, '#6B4522']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFFCF4', rim: '#4A3020', lash: '#4A3020', half: true }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFFCF4', rim: '#4A3020', lash: '#4A3020', half: true }),
    }),
  },
  {
    id: 'electric-spark', name: '번개 눈', element: 'thunder', rarity: 'epic',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 9) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#F3E7FF'], [0.4, '#B46BFF'], [1, '#3A1170']]) +
        iris(uid, 'r', [[0, '#F3E7FF'], [0.4, '#B46BFF'], [1, '#3A1170']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, {
          sclera: '#1C0C38', rim: '#B985FF', lash: '#180A32', glow: '#B66BFF', pupilColor: '#0E0520',
          extra: `<path d="M214 190 l8 14 l-6 2 l8 14" stroke="#8DF6FF" stroke-width="2.6" fill="none" stroke-linejoin="round" opacity="0.95"/>` +
            `<circle cx="230" cy="214" r="2.2" fill="#FFFFFF"/>`,
        }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, {
          sclera: '#1C0C38', rim: '#B985FF', lash: '#180A32', glow: '#B66BFF', pupilColor: '#0E0520',
          extra: `<path d="M304 188 l-8 14 l6 2 l-8 14" stroke="#8DF6FF" stroke-width="2.6" fill="none" stroke-linejoin="round" opacity="0.95"/>`,
        }),
    }),
  },
  {
    id: 'golden-laser', name: '황금 레이저', element: 'gold', rarity: 'epic',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 9) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFFBE0'], [0.45, '#FFD24A'], [1, '#A85E00']]) +
        iris(uid, 'r', [[0, '#FFFBE0'], [0.45, '#FFD24A'], [1, '#A85E00']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, {
          sclera: '#FFF8DC', rim: '#7A4A00', lash: '#5A3400', glow: '#FFD24A', pupil: 'slit', pupilColor: '#4A2600',
          extra: `<rect x="200" y="200" width="44" height="5" rx="2.5" fill="#FFFDF0" opacity="0.95"/>`,
        }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, {
          sclera: '#FFF8DC', rim: '#7A4A00', lash: '#5A3400', glow: '#FFD24A', pupil: 'slit', pupilColor: '#4A2600',
          extra: `<rect x="271" y="198" width="44" height="5" rx="2.5" fill="#FFFDF0" opacity="0.95"/>`,
        }) +
        `<g stroke="#FFE9A0" stroke-width="2.4" opacity="0.8"><path d="M170 178 l-14 -10"/><path d="M344 176 l14 -10"/></g>`,
    }),
  },
  {
    id: 'star-struck', name: '별빛 눈', element: 'ice', rarity: 'epic',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 8) + eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY) +
        iris(uid, 'l', [[0, '#FFFFFF'], [0.42, '#A9E7FF'], [1, '#3B6E9E']]) +
        iris(uid, 'r', [[0, '#FFFFFF'], [0.42, '#A9E7FF'], [1, '#3B6E9E']]),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFFFFF', rim: '#2C5470', lash: '#2C5470', pupil: 'star', pupilColor: '#2C4A66', glow: '#CFF4BD' }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFFFFF', rim: '#2C5470', lash: '#2C5470', pupil: 'star', pupilColor: '#2C4A66', glow: '#CFF4BD' }),
    }),
  },
  {
    id: 'void-eyes', name: '공허의 눈', element: 'thunder', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 12) +
        rad(`${uid}-i-l`, [[0, '#FFFFFF'], [0.5, '#DCEFFF'], [1, '#7FA8FF']], { cx: 0.5, cy: 0.45, r: 0.6 }) +
        rad(`${uid}-i-r`, [[0, '#FFFFFF'], [0.5, '#DCEFFF'], [1, '#7FA8FF']], { cx: 0.5, cy: 0.45, r: 0.6 }) +
        eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY),
      body: `
        <ellipse cx="222" cy="204" rx="${RX}" ry="${RY}" fill="#0A0614" opacity="0.9"/>
        <ellipse cx="293" cy="202" rx="${RX}" ry="${RY}" fill="#0A0614" opacity="0.9"/>
        <ellipse cx="222" cy="204" rx="${RX + 8}" ry="${RY + 8}" fill="#8FB4FF" opacity="0.22" filter="url(#${uid}-eyeGlow)"/>
        <ellipse cx="293" cy="202" rx="${RX + 8}" ry="${RY + 8}" fill="#8FB4FF" opacity="0.22" filter="url(#${uid}-eyeGlow)"/>
        <g clip-path="url(#${uid}-cl-l)">
          <ellipse cx="222" cy="204" rx="${RX}" ry="${RY}" fill="url(#${uid}-i-l)"/>
          <ellipse cx="222" cy="204" rx="6" ry="17" fill="#0A0614"/>
        </g>
        <g clip-path="url(#${uid}-cl-r)">
          <ellipse cx="293" cy="202" rx="${RX}" ry="${RY}" fill="url(#${uid}-i-r)"/>
          <ellipse cx="293" cy="202" rx="6" ry="17" fill="#0A0614"/>
        </g>
        <path d="M202 172 Q222 160 242 172" fill="none" stroke="#0A0614" stroke-width="5" stroke-linecap="round"/>
        <path d="M273 170 Q293 158 313 170" fill="none" stroke="#0A0614" stroke-width="5" stroke-linecap="round"/>`,
    }),
  },
  {
    id: 'galaxy', name: '은하 눈', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 10) +
        rad(`${uid}-i-l`, [[0, '#FFFFFF'], [0.3, '#C9A5FF'], [0.62, '#6B4CE6'], [1, '#150A38']], { cx: 0.4, cy: 0.35, r: 0.8 }) +
        rad(`${uid}-i-r`, [[0, '#FFFFFF'], [0.3, '#C9A5FF'], [0.62, '#6B4CE6'], [1, '#150A38']], { cx: 0.4, cy: 0.35, r: 0.8 }) +
        eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#0C0620', rim: '#B79BFF', lash: '#0C0620', glow: '#8E6BFF', pupilColor: '#0A0418',
          extra: `<g fill="#fff"><circle cx="211" cy="196" r="2.4"/><circle cx="233" cy="212" r="1.6"/><circle cx="228" cy="190" r="1.2"/><circle cx="206" cy="214" r="1.3"/></g>` }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#0C0620', rim: '#B79BFF', lash: '#0C0620', glow: '#8E6BFF', pupilColor: '#0A0418',
          extra: `<g fill="#fff"><circle cx="287" cy="194" r="2.2"/><circle cx="305" cy="214" r="1.7"/><circle cx="280" cy="214" r="1.2"/></g>` }),
    }),
  },
  {
    id: 'rainbow-awakened', name: '무지개 각성', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-eyeGlow`, 11) +
        lin(`${uid}-i-l`, [[0, '#FF6B8A'], [0.3, '#FFD24A'], [0.55, '#6BFFA1'], [0.8, '#4CD8FF'], [1, '#B06BFF']], { x1: 0, y1: 0, x2: 1, y2: 1 }) +
        lin(`${uid}-i-r`, [[0, '#FF6B8A'], [0.3, '#FFD24A'], [0.55, '#6BFFA1'], [0.8, '#4CD8FF'], [1, '#B06BFF']], { x1: 0, y1: 1, x2: 1, y2: 0 }) +
        eyeClip(uid, 'l', eyeL.cx, eyeL.cy, RX, RY) + eyeClip(uid, 'r', eyeR.cx, eyeR.cy, RX, RY),
      body:
        eye(uid, 'l', eyeL.cx, eyeL.cy, { sclera: '#FFFFFF', rim: '#7A4FBF', lash: '#3D1F6B', pupilColor: '#2A1048', glow: '#FFD9FB',
          extra: `<circle cx="216" cy="196" r="4" fill="#fff" opacity="0.9"/><circle cx="230" cy="214" r="2" fill="#fff" opacity="0.8"/>` }) +
        eye(uid, 'r', eyeR.cx, eyeR.cy, { sclera: '#FFFFFF', rim: '#7A4FBF', lash: '#3D1F6B', pupilColor: '#2A1048', glow: '#FFD9FB',
          extra: `<circle cx="288" cy="194" r="4" fill="#fff" opacity="0.9"/><circle cx="304" cy="212" r="2" fill="#fff" opacity="0.8"/>` }) +
        `<g stroke="#FFE3FF" stroke-width="2.6" stroke-linecap="round" opacity="0.9">
          <path d="M168 172 l-12 -14"/><path d="M346 170 l12 -14"/><path d="M186 156 l-6 -16"/><path d="M330 154 l6 -16"/></g>`,
    }),
  },
];

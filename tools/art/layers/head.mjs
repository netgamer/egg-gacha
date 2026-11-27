/**
 * head layer — horns, crowns, halos, worn on the crown ridge.
 */
import { glowDef, lin, rad, f2, rngFor } from '../base.mjs';

const shine = (uid) => glowDef(`${uid}-hGlow`, 7);

export const headParts = [
  {
    id: 'small-horns', name: '작은 뿔', element: 'white', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) + lin(`${uid}-hf`, [[0, '#FFF6E2'], [0.5, '#F0D6AE'], [1, '#B98F63']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.6" stroke-linejoin="round">
          <path d="M212 120 C198 98 200 70 214 50 C216 78 220 100 232 118 Z" fill="url(#${uid}-hf)"/>
          <path d="M298 118 C312 96 310 68 296 48 C294 76 290 98 278 116 Z" fill="url(#${uid}-hf)"/>
          <path d="M252 112 C250 100 252 92 256 86 C260 92 262 100 260 112 Z" fill="url(#${uid}-hf)"/>
        </g>
        <path d="M216 112 C208 94 208 72 214 56" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>
        <path d="M294 110 C302 92 302 70 296 54" fill="none" stroke="#FFFFFF" stroke-width="2" opacity="0.6"/>`,
    }),
  },
  {
    id: 'leaf-sprout', name: '새싹', element: 'forest', rarity: 'common',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) + lin(`${uid}-lf`, [[0, '#E4F9C0'], [0.55, '#8CCB58'], [1, '#3F7024']], { x1: 0.2, y1: 0, x2: 0.7, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M256 112 C254 96 254 84 256 74" fill="none" stroke="#5B8F35" stroke-width="5" stroke-linecap="round"/>
          <path d="M256 84 C230 84 214 70 212 50 C238 48 254 60 256 84 Z" fill="url(#${uid}-lf)"/>
          <path d="M256 78 C282 78 298 64 300 44 C274 42 258 54 256 78 Z" fill="url(#${uid}-lf)"/>
          <path d="M256 92 C244 92 234 82 232 68 C248 68 256 76 256 92 Z" fill="#B7E48A"/>
        </g>
        <path d="M254 84 C240 76 228 64 220 54" fill="none" stroke="#F0FFD8" stroke-width="2" opacity="0.7"/>
        <path d="M258 78 C270 70 282 60 292 50" fill="none" stroke="#F0FFD8" stroke-width="2" opacity="0.7"/>`,
    }),
  },
  {
    id: 'beanie', name: '니트 비니', element: 'spotted', rarity: 'common',
    draw: ({ uid, pal }) => {
      const knit = [];
      for (let i = 0; i < 9; i++) {
        const x = 172 + i * 21;
        knit.push(`<path d="M${x} 118 L${x - 4} 150" stroke="#2F6B5C" stroke-width="2" opacity="0.28"/>`);
        knit.push(`<path d="M${x - 4} 150 L${x + 2} 182" stroke="#2F6B5C" stroke-width="2" opacity="0.22"/>`);
      }
      return {
        defs: shine(uid) +
          lin(`${uid}-cap`, [[0, '#D6FFF2'], [0.5, '#8FD9C6'], [1, '#4E9E8C']], { x1: 0.2, y1: 0, x2: 0.6, y2: 1 }),
        body: `
        <g>
          <path d="M158 152 C158 106 200 78 256 78 C312 78 354 106 354 152 Z" fill="url(#${uid}-cap)" stroke="${pal.line}" stroke-width="2.8"/>
          ${knit.join('')}
          <path d="M152 150 C152 138 168 132 256 132 C344 132 360 138 360 150 C360 164 344 170 256 170 C168 170 152 164 152 150 Z"
            fill="#BFF0E2" stroke="${pal.line}" stroke-width="2.6"/>
          <path d="M236 72 C236 56 276 56 276 72 C276 88 236 88 236 72 Z" fill="#EBFFF7" stroke="${pal.line}" stroke-width="2.4"/>
          <g stroke="#FFFFFF" stroke-width="2" opacity="0.6" fill="none">
            <path d="M180 108 C196 92 214 84 236 82"/><path d="M164 142 C176 126 202 112 230 108"/>
          </g>
        </g>`,
      };
    },
  },
  {
    id: 'flower-crown', name: '꽃 화관', element: 'forest', rarity: 'rare',
    draw: ({ uid, pal }) => {
      const rnd = rngFor(uid + 'fl');
      const flowers = [];
      const cols = ['#FFC7E4', '#FFF3B0', '#FFD6A0', '#E5C8FF', '#FFFFFF'];
      for (let i = 0; i < 7; i++) {
        const t = i / 6;
        const x = 176 + t * 160;
        const y = 158 - Math.sin(t * Math.PI) * 26;
        const c = cols[i % cols.length];
        const petals = [];
        for (let k = 0; k < 5; k++) {
          const a = (k / 5) * Math.PI * 2 + rnd();
          petals.push(`<ellipse cx="${f2(x + Math.cos(a) * 7)}" cy="${f2(y + Math.sin(a) * 7)}" rx="6" ry="5" fill="${c}" stroke="#8C6B7A" stroke-width="0.9" opacity="0.96"/>`);
        }
        flowers.push(`<g>${petals.join('')}<circle cx="${x}" cy="${y}" r="3.2" fill="#FFE066" stroke="#B58A2A" stroke-width="0.8"/></g>`);
      }
      return {
        defs: shine(uid) + lin(`${uid}-vine`, [[0, '#7FBF55'], [1, '#3F7024']]),
        body: `
          <path d="M170 162 Q212 128 256 126 Q300 128 342 162" fill="none" stroke="url(#${uid}-vine)" stroke-width="5" stroke-linecap="round"/>
          <g>${flowers.join('')}</g>`,
      };
    },
  },
  {
    id: 'ember-horns', name: '잉걸불 뿔', element: 'fire', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-hf`, [[0, '#2A0C06'], [0.55, '#6B2513'], [1, '#B0451E']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }) +
        glowDef(`${uid}-fire`, 8),
      body: `
        <g stroke="${pal.line}" stroke-width="2.6" stroke-linejoin="round">
          <path d="M208 128 C182 108 168 74 176 44 C196 66 214 92 226 122 Z" fill="url(#${uid}-hf)"/>
          <path d="M302 126 C328 106 342 72 334 42 C314 64 296 90 284 120 Z" fill="url(#${uid}-hf)"/>
        </g>
        <g stroke="#FF8A2B" stroke-width="2.4" fill="none" opacity="0.95" filter="url(#${uid}-fire)">
          <path d="M214 118 C196 96 186 70 186 52"/><path d="M296 116 C314 94 324 68 324 50"/>
        </g>
        <g fill="#FFC46A" opacity="0.95" filter="url(#${uid}-fire)">
          <circle cx="176" cy="40" r="5"/><circle cx="334" cy="38" r="5"/>
        </g>
        <path d="M250 116 C246 104 248 94 256 86 C264 94 266 104 262 116 Z" fill="#FF9A3C" opacity="0.9"/>`,
    }),
  },
  {
    id: 'frost-crown', name: '서리 왕관', element: 'ice', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-cf`, [[0, '#FFFFFF'], [0.5, '#B9ECFF'], [1, '#5FA8CF']], { x1: 0, y1: 0, x2: 0.3, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M170 158 L190 118 L210 152 L232 104 L256 148 L280 102 L302 150 L322 116 L342 158 Z"
            fill="url(#${uid}-cf)" opacity="0.96"/>
          <path d="M164 156 Q256 140 348 156 L346 172 Q256 158 166 172 Z" fill="#DFF8FF" stroke="${pal.line}" stroke-width="2.2"/>
        </g>
        <g stroke="#FFFFFF" stroke-width="2" opacity="0.85" fill="none">
          <path d="M232 112 L256 152"/><path d="M280 110 L256 152"/><path d="M190 126 L206 152"/>
        </g>
        <g fill="#FFFFFF" opacity="0.9">
          <circle cx="256" cy="160" r="4"/><circle cx="206" cy="162" r="3"/><circle cx="306" cy="162" r="3"/>
        </g>`,
    }),
  },
  {
    id: 'storm-horns', name: '폭풍 뿔', element: 'thunder', rarity: 'rare',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-hf`, [[0, '#2E1157'], [0.5, '#6B3FB0'], [1, '#C6A2FF']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.6" stroke-linejoin="round">
          <path d="M210 126 L188 100 L200 96 L176 62 L206 78 L200 50 L230 104 Z" fill="url(#${uid}-hf)"/>
          <path d="M302 124 L324 98 L312 94 L336 60 L306 76 L312 48 L282 102 Z" fill="url(#${uid}-hf)"/>
        </g>
        <g stroke="#E4D0FF" stroke-width="2" fill="none" opacity="0.9" filter="url(#${uid}-hGlow)">
          <path d="M196 104 l8 -6 l-4 -14 l10 4"/><path d="M318 102 l-8 -6 l4 -14 l-10 4"/>
        </g>`,
    }),
  },
  {
    id: 'lightning-crest', name: '번개 볏', element: 'thunder', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-cb`, [[0, '#F3E7FF'], [0.45, '#B673FF'], [1, '#4B1E90']], { x1: 0, y1: 0, x2: 0.4, y2: 1 }),
      body: `
        <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
          <path d="M226 118 L214 78 L236 92 L232 52 L252 82 L256 34 L264 84 L286 52 L282 94 L302 78 L288 120 Z"
            fill="url(#${uid}-cb)"/>
        </g>
        <g stroke="#F0E4FF" stroke-width="2.4" fill="none" opacity="0.95" filter="url(#${uid}-hGlow)">
          <path d="M240 112 L236 88 L250 96 L246 60"/>
        </g>
        <g fill="#8DF6FF"><circle cx="208" cy="120" r="3"/><circle cx="304" cy="120" r="3"/></g>`,
    }),
  },
  {
    id: 'golden-crown', name: '황금 왕관', element: 'gold', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-cg`, [[0, '#FFF6CE'], [0.45, '#FFD35C'], [1, '#B37B12']], { x1: 0, y1: 0, x2: 0.2, y2: 1 }) +
        rad(`${uid}-gem`, [[0, '#FF9BE0'], [0.6, '#E0359E'], [1, '#7A1055']]),
      body: `
        <g stroke="${pal.line}" stroke-width="2.6" stroke-linejoin="round">
          <path d="M168 162 L168 118 L202 142 L222 98 L256 136 L290 96 L310 140 L344 116 L344 162 Z" fill="url(#${uid}-cg)"/>
          <path d="M160 160 Q256 144 352 160 L350 178 Q256 162 162 178 Z" fill="#FFE9A0" stroke="${pal.line}" stroke-width="2.2"/>
          <g fill="url(#${uid}-gem)" stroke="#5E0A3C" stroke-width="1.6">
            <circle cx="256" cy="160" r="7"/><circle cx="196" cy="158" r="5"/><circle cx="316" cy="158" r="5"/>
          </g>
        </g>
        <g fill="#FFFFFF" opacity="0.75"><circle cx="253" cy="157" r="2.2"/><circle cx="194" cy="156" r="1.6"/></g>
        <g stroke="#FFF6CE" stroke-width="2" opacity="0.55" fill="none"><path d="M176 150 L186 132"/><path d="M336 150 L326 130"/></g>`,
    }),
  },
  {
    id: 'angel-halo', name: '천사 고리', element: 'gold', rarity: 'epic',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) + glowDef(`${uid}-haloG`, 10) +
        lin(`${uid}-hg`, [[0, '#FFFDF0'], [0.5, '#FFE08A'], [1, '#E0A92E']], { x1: 0, y1: 0, x2: 1, y2: 0 }),
      body: `
        <ellipse cx="256" cy="58" rx="62" ry="17" fill="none" stroke="#FFE9A0" stroke-width="16" opacity="0.3" filter="url(#${uid}-haloG)"/>
        <ellipse cx="256" cy="58" rx="58" ry="15" fill="none" stroke="url(#${uid}-hg)" stroke-width="9"/>
        <ellipse cx="256" cy="55" rx="52" ry="10" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="0.6"/>
        <g fill="#FFF6CE">
          <path d="M256 22 l3 9 l9 3 l-9 3 l-3 9 l-3 -9 l-9 -3 l9 -3 z"/>
        </g>`,
    }),
  },
  {
    id: 'bubble-crown', name: '거품 왕관', element: 'spotted', rarity: 'rare',
    draw: ({ uid, pal }) => {
      const rnd = rngFor(uid + 'bc');
      const out = [];
      const rings = [[256, 62, 34], [214, 84, 22], [300, 80, 25], [238, 108, 16], [278, 108, 18], [182, 108, 14], [332, 104, 13]];
      for (const [x, y, r] of rings) {
        out.push(`<circle cx="${x}" cy="${y}" r="${r}" fill="url(#${uid}-bub)" stroke="#EAFFFF" stroke-width="2"/>
          <path d="M${x - r * 0.5} ${y - r * 0.4} a${r * 0.5} ${r * 0.4} 0 0 1 ${r * 0.55} -${r * 0.3}" fill="none" stroke="#FFFFFF" stroke-width="2.4" opacity="0.9"/>
          <circle cx="${f2(x + r * 0.3)}" cy="${f2(y + r * 0.35)}" r="${f2(r * 0.12)}" fill="#FFFFFF" opacity="0.8"/>`);
      }
      return {
        defs: shine(uid) + rad(`${uid}-bub`, [[0, '#FFFFFF', 0.06], [0.6, '#B6FFF2', 0.18], [1, '#5BD9FF', 0.55]]),
        body: `<g>${out.join('')}</g>`,
      };
    },
  },
  {
    id: 'diamond-tiara', name: '다이아 티아라', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => ({
      defs: shine(uid) +
        lin(`${uid}-tf`, [[0, '#FFFFFF'], [0.4, '#D6F3FF'], [1, '#8CC8EE']], { x1: 0, y1: 0, x2: 0.3, y2: 1 }) +
        lin(`${uid}-rb`, [[0, '#FFB3EC', 0.9], [0.5, '#B6FFF0', 0.9], [1, '#B8C6FF', 0.9]]),
      body: `
        <g stroke="${pal.line}" stroke-width="2.2" stroke-linejoin="round">
          <path d="M184 160 L214 122 L256 88 L298 122 L328 160 Z" fill="url(#${uid}-tf)" opacity="0.95"/>
          <path d="M256 88 L256 160" stroke="#FFFFFF" stroke-opacity="0.6" stroke-width="1.6"/>
          <path d="M214 122 L298 122" stroke="#FFFFFF" stroke-opacity="0.4" stroke-width="1.4"/>
          <path d="M170 158 Q256 142 342 158 L340 170 Q256 154 172 170 Z" fill="#EAF9FF" stroke="${pal.line}" stroke-width="2"/>
          <path d="M256 122 l20 20 l-20 26 l-20 -26 z" fill="url(#${uid}-rb)" stroke="${pal.line}" stroke-width="2"/>
        </g>
        <g fill="#FFFFFF" opacity="0.9"><circle cx="250" cy="132" r="3"/><circle cx="232" cy="150" r="1.8"/><circle cx="282" cy="150" r="1.8"/></g>
        <path d="M210 118 l14 -18" stroke="#FFFFFF" stroke-width="2" opacity="0.8"/>`,
    }),
  },
  {
    id: 'rainbow-halo', name: '무지개 고리', element: 'diamond', rarity: 'legendary',
    draw: ({ uid }) => ({
      defs: glowDef(`${uid}-rbG`, 10),
      body: `
        <g fill="none" stroke-linecap="round" filter="url(#${uid}-rbG)" opacity="0.92" stroke-width="7">
          <path d="M186 92 A76 46 0 0 1 326 92" stroke="#FF6B8A"/>
          <path d="M194 92 A68 40 0 0 1 318 92" stroke="#FFB03A"/>
          <path d="M202 92 A60 34 0 0 1 310 92" stroke="#FFE74C"/>
          <path d="M210 92 A52 28 0 0 1 302 92" stroke="#6DFF9B"/>
          <path d="M218 92 A44 22 0 0 1 294 92" stroke="#4CD8FF"/>
          <path d="M226 92 A36 16 0 0 1 286 92" stroke="#B06BFF"/>
        </g>
        <g fill="#FFFFFF" opacity="0.95">
          <path d="M256 20 l3 10 l10 3 l-10 3 l-3 10 l-3 -10 l-10 -3 l10 -3 z"/>
          <path d="M196 40 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 l7 -2 z"/>
          <path d="M316 38 l2 7 l7 2 l-7 2 l-2 7 l-2 -7 l-7 -2 l7 -2 z"/>
        </g>`,
    }),
  },
  {
    id: 'cosmic-antlers', name: '은하 뿔', element: 'diamond', rarity: 'legendary',
    draw: ({ uid, pal }) => {
      const rnd = rngFor(uid + 'ca');
      const stars = [];
      for (let i = 0; i < 14; i++) {
        stars.push(`<circle cx="${f2(180 + rnd() * 152)}" cy="${f2(30 + rnd() * 100)}" r="${f2(1 + rnd() * 2)}" fill="#fff" opacity="${f2(0.5 + rnd() * 0.5)}"/>`);
      }
      return {
        defs: shine(uid) +
          lin(`${uid}-an`, [[0, '#2A1155'], [0.5, '#6B4CE6'], [1, '#C9A5FF']], { x1: 0, y1: 1, x2: 0.4, y2: 0 }) +
          rad(`${uid}-neb`, [[0, '#C9A5FF', 0.5], [0.6, '#6B4CE6', 0.2], [1, '#2A1155', 0]]),
        body: `
          <ellipse cx="256" cy="74" rx="96" ry="52" fill="url(#${uid}-neb)" opacity="0.7"/>
          <g stroke="${pal.line}" stroke-width="2.4" stroke-linejoin="round">
            <path d="M218 122 C200 100 190 76 192 46 C206 62 214 78 218 92 C226 70 240 52 258 40 C252 66 242 88 232 108 Z" fill="url(#${uid}-an)"/>
            <path d="M294 120 C312 98 322 74 320 44 C306 60 298 76 294 90 C286 68 272 50 254 38 C260 64 270 86 280 106 Z" fill="url(#${uid}-an)"/>
          </g>
          ${stars.join('')}
          <g stroke="#E9DBFF" stroke-width="1.6" opacity="0.7" fill="none">
            <path d="M206 92 C214 74 226 58 244 46"/><path d="M306 90 C298 72 286 56 268 44"/>
          </g>`,
      };
    },
  },
];

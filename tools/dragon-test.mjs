/**
 * Dragon part system — asset, statistics and end-to-end checks.
 *
 * Same discipline as tools/test.mjs: each phase gets a fresh browser process
 * (this sandbox's software renderer is memory-fragile) with one retry.
 */
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

const failures = [];
const notes = [];
let sink = failures;
const ok = (cond, msg) => {
  if (!cond) sink.push(msg);
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${msg}`);
};

const { server, url } = await startServer('dist', 0);
console.log(`serving dist at ${url}`);

const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' };

async function attempt(name, ctxOpts, fn) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ deviceScaleFactor: 1, ...ctxOpts });
  const page = await ctx.newPage();
  let crashed = false;
  page.on('crash', () => {
    crashed = true;
  });
  const errors = [];
  const env = [];
  const isEnv = (t) => /ERR_INSUFFICIENT_RESOURCES/.test(t);
  page.on('console', (m) => {
    if (m.type() !== 'error') return;
    (isEnv(m.text()) ? env : errors).push(`console.error: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => {
    const t = `requestfailed: ${r.url()} ${r.failure()?.errorText}`;
    (isEnv(t) ? env : errors).push(t);
  });
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
  });
  const goto = async () => {
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  };
  let error = null;
  try {
    await fn({ page, errors, env, goto });
  } catch (e) {
    error = e;
  }
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((r) => setTimeout(r, 350));
  if (env.length) notes.push(`${name}: 환경 리소스 경고 ${env.length}건`);
  return { crashed, error, errors };
}

async function phase(name, ctxOpts, fn) {
  console.log(`\n=== ${name} ===`);
  for (let n = 1; n <= 2; n++) {
    const trial = [];
    sink = trial;
    const res = await attempt(name, ctxOpts, fn);
    sink = failures;
    const broke =
      res.crashed ||
      (res.error && /Target crashed|Target page, context or browser has been closed/.test(res.error.message));
    if (!broke) {
      failures.push(...trial);
      if (res.error) {
        failures.push(`${name}: ${res.error.message.split('\n')[0]}`);
        console.log(`FAIL  ${name} threw: ${res.error.message.split('\n')[0]}`);
      }
      if (res.errors.length) failures.push(`${name}: ${res.errors.slice(0, 4).join(' | ')}`);
      return;
    }
    notes.push(`${name}: 샌드박스 렌더러 크래시로 1회 재시도`);
    console.log('  (renderer crashed — retrying this phase once)');
  }
  failures.push(`${name}: 샌드박스 렌더러가 두 번 크래시 (앱 오류 아님)`);
}

/* ------------------------------------------------------- 1. part assets */
await phase('parts — 60+ layered images', MOBILE, async ({ page, goto }) => {
  await goto();
  const info = await page.evaluate(async () => {
    const G = window.__eggGacha;
    const layers = G.layers;
    const check = async (p, thumb) => {
      const src = G.partBase + (thumb ? p.thumb : p.img);
      const r = await fetch(src);
      const buf = await r.arrayBuffer();
      let dim = null;
      try {
        const bmp = await createImageBitmap(new Blob([buf], { type: 'image/webp' }));
        dim = [bmp.width, bmp.height];
        bmp.close?.();
      } catch (_) {
        dim = null;
      }
      return { src, status: r.status, bytes: buf.byteLength, dim };
    };
    const full = [];
    const thumbs = [];
    for (const p of G.parts) {
      full.push(await check(p, false));
      thumbs.push(await check(p, true));
    }
    return { total: G.parts.length, layers, full, thumbs, base: G.partBase };
  });

  ok(info.total >= 60, `파츠 이미지 ${info.total}장 (6슬롯 × 14)`);
  ok(info.layers.every((l) => l.count >= 10), `슬롯별 10장 이상 — ${info.layers.map((l) => `${l.ko} ${l.count}`).join(' · ')}`);
  ok(
    info.full.every((f) => f.status === 200 && f.bytes > 1200),
    `전체 파츠 HTTP 200 (${info.full.length}장, 최소 ${Math.round(Math.min(...info.full.map((f) => f.bytes)) / 1024)}KB)`
  );
  ok(
    info.full.every((f) => f.dim && f.dim[0] === 512 && f.dim[1] === 512),
    '모든 파츠 512×512 디코드'
  );
  ok(
    info.thumbs.every((f) => f.status === 200 && f.dim && f.dim[0] === 192),
    `갤러리 썸네일 192×192 ${info.thumbs.length}장`
  );
  const totalKB = Math.round(info.full.reduce((s, f) => s + f.bytes, 0) / 1024);
  ok(totalKB < 2600, `파츠 번들 ${totalKB}KB (모바일 캐시 부담 없음)`);
  notes.push(`parts ${info.total}장 · ${totalKB}KB · base "${info.base}"`);
});

/* ------------------------------------------- 2. 80% affinity statistics */
await phase('hatch — 80% affinity (통계 검정)', MOBILE, async ({ page, goto }) => {
  await goto();
  const res = await page.evaluate(() => {
    const G = window.__eggGacha;
    const eggs = ['white', 'spotted', 'forest', 'fire', 'ice', 'thunder', 'gold', 'diamond'];
    const layers = ['bg', 'wings', 'body', 'eyes', 'head', 'acc'];
    const partOf = (layer, id) => G.parts.find((p) => p.layer === layer && p.id === id);
    const perSlot = Object.fromEntries(layers.map((l) => [l, { kin: 0, total: 0 }]));
    const perEgg = {};
    const rarity = { common: 0, rare: 0, epic: 0, legendary: 0 };
    const N = 2200;
    let kinAll = 0;
    let all = 0;
    for (const egg of eggs) {
      let kinEgg = 0;
      for (let i = 0; i < N; i++) {
        const d = G.hatchDragon(egg);
        for (const layer of layers) {
          const p = partOf(layer, d.parts[layer]);
          const kin = G.elementFamily[egg].includes(p.element);
          perSlot[layer].total++;
          perSlot[layer].kin += kin ? 1 : 0;
          rarity[p.rarity]++;
          all++;
          kinAll += kin ? 1 : 0;
          kinEgg += kin ? 1 : 0;
        }
      }
      perEgg[egg] = kinEgg / (N * layers.length);
    }
    return {
      overall: kinAll / all,
      perSlot: Object.fromEntries(Object.entries(perSlot).map(([k, v]) => [k, v.kin / v.total])),
      perEgg,
      rarity,
      counts: G.parts.reduce((acc, p) => ((acc[p.rarity] = (acc[p.rarity] || 0) + 1), acc), {}),
      samples: all,
    };
  });
  console.log(
    `  affinity overall ${res.overall.toFixed(4)} · ` +
      Object.entries(res.perSlot)
        .map(([k, v]) => `${k} ${v.toFixed(3)}`)
        .join(' ') +
      ` · n=${res.samples}`
  );
  ok(Math.abs(res.overall - 0.8) < 0.012, `전체 친화율 ${(res.overall * 100).toFixed(2)}% (목표 80%)`);
  for (const [layer, v] of Object.entries(res.perSlot)) {
    ok(Math.abs(v - 0.8) < 0.025, `${layer} 슬롯 친화율 ${(v * 100).toFixed(1)}%`);
  }
  for (const [egg, v] of Object.entries(res.perEgg)) {
    ok(Math.abs(v - 0.8) < 0.03, `${egg} 알 친화율 ${(v * 100).toFixed(1)}%`);
  }
  const perPart = Object.fromEntries(
    ['common', 'rare', 'epic', 'legendary'].map((k) => [k, res.rarity[k] / res.counts[k]])
  );
  console.log(
    '  rarity per part: ' +
      Object.entries(perPart).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(' · ') +
      ` (parts ${JSON.stringify(res.counts)})`
  );
  ok(
    perPart.common > perPart.rare && perPart.rare > perPart.epic && perPart.epic > perPart.legendary,
    `파츠당 희귀도 가중치 일반>희귀>영웅>전설 (${Object.entries(perPart)
      .map(([k, v]) => `${k} ${v.toFixed(0)}`)
      .join(' / ')})`
  );
});

/* -------------------------------------------------- 3. hatch → reveal */
await phase('mobile — 뽑기 → 알 깨기 → 드래곤 공개', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.queue(['ice']));
  await page.click('#pull1', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 30000 });
  await page.waitForTimeout(300);
  ok(await page.isVisible('#hatchCue'), '부화 대기 큐 노출');
  ok((await page.evaluate(() => window.__eggGacha.state().pending.length)) === 1, '대기 알 1개');

  await page.click('#hatchCue', { noWaitAfter: true });
  await page.waitForTimeout(320);
  ok(await page.evaluate(() => document.getElementById('hatch').classList.contains('open')), '부화 화면 열림');

  await page.click('#hatchBtn', { noWaitAfter: true });
  await page.waitForSelector('#revealCard .dc', { timeout: 25000 });
  await page
    .waitForFunction(
      () => {
        const imgs = [...document.querySelectorAll('#revealCard .dc-art img')];
        return imgs.length === 6 && imgs.every((i) => i.complete && i.naturalWidth === 512);
      },
      null,
      { timeout: 8000 }
    )
    .catch(() => console.log('  (layer images not all decoded in time)'));

  const card = await page.evaluate(() => {
    const dc = document.querySelector('#revealCard .dc');
    const traits = [...dc.querySelectorAll('.dc-trait')].map((t) => ({
      k: t.querySelector('.k').textContent,
      v: t.querySelector('.v').textContent,
    }));
    const layers = [...dc.querySelectorAll('.dc-art img')].map((i) => ({ src: i.getAttribute('src'), w: i.naturalWidth }));
    return {
      rarity: dc.dataset.rarity,
      name: dc.querySelector('.dc-name').textContent,
      origin: dc.querySelector('.dc-origin').textContent,
      badges: [...dc.querySelectorAll('.dc-badge')].map((b) => b.textContent.trim()),
      traits,
      layers,
      serial: dc.querySelector('.dc-serial').textContent,
    };
  });
  ok(card.traits.length === 6, `특성 6개 — ${card.traits.map((t) => t.k + ':' + t.v).join(', ')}`);
  ok(card.badges.length >= 2, `희귀도/속성 배지 ${card.badges.length}개 (${card.badges.join(' / ')})`);
  ok(card.layers.length === 6 && card.layers.every((l) => l.w === 512), '6레이어 합성 이미지 512px 로드');
  ok(/얼음 알/.test(card.origin), `알 출처 표기 "${card.origin}"`);
  ok(/#001/.test(card.serial), `시리얼 ${card.serial}`);

  const st = await page.evaluate(() => window.__eggGacha.state());
  ok(st.dragons === 1 && st.pending.length === 0 && st.dragonList[0].egg === 'ice', '드래곤 1마리 저장 · 대기 알 소모');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('egg-gacha.dragons.v1')));
  ok(stored.list.length === 1 && stored.list[0].parts.body, 'localStorage에 6파츠 기록');

  await page.click('#revealClose', { noWaitAfter: true });
  await page.waitForTimeout(250);
  ok(await page.evaluate(() => !document.getElementById('hatch').classList.contains('open')), '공개 화면 닫힘');
  ok((await page.textContent('#dragonCount')).trim() === '1', '상단 드래곤 카운터 갱신');
  ok(!(await page.isVisible('#hatchCue')), '대기 알이 없으면 큐 숨김');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ----------------------------------------------------- 4. 5 eggs in a row */
await phase('mobile — 5연속 부화', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.queue(['fire', 'diamond', 'white', 'thunder', 'gold']));
  await page.click('#pull5', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().pending.length === 5, null, { timeout: 40000 });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 40000 });
  await page.waitForTimeout(300);
  ok((await page.$$eval('.chip.pending', (els) => els.length)) === 5, '5연속 결과 5개 모두 부화 대기');
  ok(/5개 부화하기/.test(await page.textContent('#hatchCue')), '큐 문구 "5개 부화하기"');

  await page.click('#hatchCue', { noWaitAfter: true });
  await page.waitForTimeout(320);
  const rarities = [];
  for (let i = 0; i < 5; i++) {
    if (i === 0) await page.click('#hatchBtn', { noWaitAfter: true });
    else await page.click('#nextHatch', { noWaitAfter: true }); // 다음 알은 바로 부화한다
    await page.waitForFunction(
      (n) => window.__eggGacha.state().dragons === n && !!document.querySelector('#revealCard .dc'),
      i + 1,
      { timeout: 30000 }
    );
    await page.evaluate(() => window.__eggGacha.fx.clear());
    await page.waitForTimeout(160);
    rarities.push(
      await page.evaluate(() => ({
        rarity: document.querySelector('#revealCard .dc').dataset.rarity,
        name: document.querySelector('#revealCard .dc-name').textContent,
        traits: document.querySelectorAll('#revealCard .dc-trait').length,
      }))
    );
  }
  ok(rarities.length === 5 && rarities.every((r) => r.traits === 6), `드래곤 5마리 공개 (${rarities.map((r) => r.name).join(', ')})`);
  const st = await page.evaluate(() => window.__eggGacha.state());
  ok(st.dragons === 5 && st.pending.length === 0, '5마리 저장 · 대기 알 0');
  ok(st.pulls === 5, '뽑기 5회 기록');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* -------------------------------------------- 4b. gallery + persistence */
await phase('mobile — 드래곤 도감 · 새로고침 유지 · 상세', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.seedDragons(5));
  await page
    .waitForFunction(
      () => [...document.querySelectorAll('#dragonGrid .dg-art img')].every((i) => i.dataset.ready === '1'),
      null,
      { timeout: 15000 }
    )
    .catch(() => {});
  await page.waitForTimeout(300);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 25000 });
  ok((await page.evaluate(() => window.__eggGacha.state().dragons)) === 5, '새로고침 후 드래곤 5마리 유지');
  await page.click('#dexBtn', { noWaitAfter: true });
  await page.waitForTimeout(250);
  await page.click('#tabDragons', { noWaitAfter: true });
  await page.waitForFunction(() => [...document.querySelectorAll('#dragonGrid .dg-art img')].every((i) => i.dataset.ready === '1'), null, { timeout: 15000 }).catch(() => {});
  const grid = await page.evaluate(() => ({
    cards: document.querySelectorAll('#dragonGrid .dg').length,
    thumbs: [...document.querySelectorAll('#dragonGrid .dg-art img')].filter((i) => i.dataset.ready === '1').length,
    cols: getComputedStyle(document.getElementById('dragonGrid')).gridTemplateColumns.split(' ').length,
  }));
  ok(grid.cards === 5, `드래곤 도감 5칸 (${grid.cards})`);
  ok(grid.thumbs === 5, '합성 썸네일 5장 렌더');
  ok(grid.cols === 2, '모바일 2열 그리드');

  await page.click('#dragonGrid .dg', { noWaitAfter: true });
  await page.waitForTimeout(450);
  const detail = await page.evaluate(() => ({
    open: document.getElementById('detail').classList.contains('open'),
    traits: document.querySelectorAll('#detailBox .dc-trait').length,
    name: document.querySelector('#detailBox .dc-name')?.textContent,
    origin: document.querySelector('#detailBox .dc-origin')?.textContent,
  }));
  ok(detail.open && detail.traits === 6, `상세 보기 ${detail.traits}개 특성 (${detail.name})`);
  ok(/에서 부화/.test(detail.origin || ''), `상세에 알 출처 "${detail.origin}"`);
  await page.click('#detailClose', { noWaitAfter: true });
  await page.waitForTimeout(200);
  ok(!(await page.evaluate(() => document.getElementById('detail').classList.contains('open'))), '상세 닫힘');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ------------------------------------------------------- 5. layout checks */
await phase('mobile/desktop — 부화 화면 레이아웃', MOBILE, async ({ page, errors, goto }) => {
  await page.addInitScript(() => {
    localStorage.setItem('egg-gacha.pending.v1', JSON.stringify([{ uid: 'p1', egg: 'diamond', ts: 1 }]));
  });
  await goto();
  ok(await page.isVisible('#hatchCue'), '저장된 대기 알 복원');
  await page.click('#hatchCue', { noWaitAfter: true });
  await page.waitForTimeout(350);
  const box = await page.evaluate(() => {
    const b = document.querySelector('.hatch-box').getBoundingClientRect();
    const img = document.getElementById('hatchEggImg').getBoundingClientRect();
    return { b: { x: b.x, y: b.y, w: b.width, h: b.height }, img: { w: img.width, h: img.height }, vw: innerWidth, vh: innerHeight, scrollW: document.documentElement.scrollWidth };
  });
  ok(box.b.x >= 0 && box.b.x + box.b.w <= box.vw + 1, `부화 패널 가로 안 (${Math.round(box.b.w)}px)`);
  ok(box.b.y >= 0 && box.b.y + box.b.h <= box.vh + 1, `부화 패널 세로 안 (${Math.round(box.b.h)}px)`);
  ok(box.scrollW <= box.vw, '가로 스크롤 없음');
  await page.click('#hatchBtn', { noWaitAfter: true });
  await page.waitForSelector('#revealCard .dc', { timeout: 25000 });
  await page.waitForTimeout(500);
  const rev = await page.evaluate(() => {
    const box = document.querySelector('.hatch-box').getBoundingClientRect();
    const art = document.querySelector('#revealCard .dc-art').getBoundingClientRect();
    const traits = getComputedStyle(document.querySelector('#revealCard .dc-traits')).gridTemplateColumns.split(' ').length;
    return { bottom: box.bottom, vh: innerHeight, art: { w: art.width, h: art.height }, traits };
  });
  ok(rev.bottom <= rev.vh + 1, `공개 카드 화면 안 (bottom ${Math.round(rev.bottom)}/${rev.vh})`);
  ok(Math.abs(rev.art.w - rev.art.h) < 2, `카드 아트 정사각 (${Math.round(rev.art.w)}×${Math.round(rev.art.h)})`);
  ok(rev.traits === 2, '특성 2열 배치');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

await phase('desktop 1280x800 — 컬렉션 그리드', { viewport: { width: 1280, height: 800 } }, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.seedDragons(12));
  await page.click('#dexBtn', { noWaitAfter: true });
  await page.waitForTimeout(250);
  await page.click('#tabDragons', { noWaitAfter: true });
  await page.waitForTimeout(1200);
  const g = await page.evaluate(() => {
    const grid = document.querySelector('#dragonGrid');
    const cs = getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    return { cards: grid.querySelectorAll('.dg').length, cols: cs, scrollW: document.documentElement.scrollWidth, vw: innerWidth };
  });
  ok(g.cards === 12, `드래곤 12칸 (${g.cards})`);
  ok(g.cols === 3, `데스크톱 3열 그리드 (${g.cols})`);
  ok(g.scrollW <= g.vw, '가로 스크롤 없음');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

server.close();
console.log('\n--- notes ---');
notes.forEach((n) => console.log('· ' + n));
console.log(`\n${failures.length ? `FAILED (${failures.length})` : 'ALL DRAGON CHECKS PASSED'}`);
failures.forEach((f) => console.log('  ✗ ' + f));
process.exit(failures.length ? 1 : 0);

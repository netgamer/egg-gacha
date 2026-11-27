import { chromium } from 'playwright';
import { startServer } from './server.mjs';

/**
 * Functional test suite for the built app (dist/).
 *
 * Each phase runs in its own fresh browser process: this sandbox's software
 * renderer is memory-fragile, and a fresh process per phase keeps the result
 * about the app rather than about leftover compositor memory.
 * Screenshots are captured separately by tools/shots.mjs.
 */

const failures = [];
const notes = [];
const envWarnings = [];
let sink = failures; // assertions from the running attempt land here
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
  // This sandbox's headless renderer intermittently refuses a request with
  // ERR_INSUFFICIENT_RESOURCES; that is an infrastructure limit, not an app
  // error, so it is counted separately and reported in the notes.
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
    await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
  };
  let error = null;
  try {
    await fn({ page, errors, env, goto });
  } catch (e) {
    error = e;
  }
  await ctx.close().catch(() => {});
  await browser.close().catch(() => {});
  await new Promise((r) => setTimeout(r, 400));
  if (env.length) {
    envWarnings.push(...env);
    notes.push(`${name}: 환경 리소스 경고 ${env.length}건 (ERR_INSUFFICIENT_RESOURCES)`);
  }
  return { crashed, error, errors };
}

async function phase(name, ctxOpts, fn) {
  console.log(`\n=== ${name} ===`);
  for (let attemptNo = 1; attemptNo <= 2; attemptNo++) {
    const trial = [];
    sink = trial;
    const res = await attempt(name, ctxOpts, fn);
    sink = failures;
    const broke = res.crashed || (res.error && /Target crashed|Target page, context or browser has been closed/.test(res.error.message));
    if (!broke) {
      failures.push(...trial);
      if (res.error) {
        failures.push(`${name}: ${res.error.message.split('\n')[0]}`);
        console.log(`FAIL  ${name} threw: ${res.error.message.split('\n')[0]}`);
      }
      if (res.errors.length && !trial.some((t) => t.startsWith('오류 0'))) {
        failures.push(`${name}: ${res.errors.join(' | ')}`);
      }
      return;
    }
    if (attemptNo === 1) {
      notes.push(`${name}: 샌드박스 렌더러 크래시로 1회 재시도`);
      console.log('  (renderer crashed — retrying this phase once)');
    } else {
      failures.push(`${name}: 샌드박스 렌더러가 두 번 크래시 (앱 오류 아님)`);
      console.log('FAIL  renderer crashed twice');
    }
  }
}

const pullAndWait = async (page) => {
  await page.click('#pull1', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 25000 });
};

/* ---------------------------------------------------------------- 1. boot */
await phase('mobile 390x844 — boot, images, layout', MOBILE, async ({ page, errors, goto }) => {
  await goto();

  const imgs = await page.evaluate(async () => {
    const out = [];
    for (const img of document.querySelectorAll('.dex-art img')) {
      out.push({ src: img.getAttribute('src'), w: img.naturalWidth, h: img.naturalHeight });
    }
    const fetches = [];
    for (const i of out) {
      const r = await fetch(i.src);
      const buf = await r.arrayBuffer();
      fetches.push({ status: r.status, bytes: buf.byteLength });
    }
    return { count: window.__eggGacha.eggIds.length, imgs: out, fetches };
  });
  ok(imgs.imgs.length === 8, `도감 이미지 8개 (실제 ${imgs.imgs.length})`);
  ok(imgs.imgs.every((i) => i.w === 512 && i.h === 512), '8개 알 이미지 512x512 디코드');
  ok(
    imgs.fetches.every((f) => f.status === 200 && f.bytes > 4000),
    `8개 이미지 HTTP 200 (${imgs.fetches.map((f) => Math.round(f.bytes / 1024) + 'KB').join(', ')})`
  );
  ok((await page.$eval('#dexGrid', (e) => e.children.length)) === 8, '도감 그리드 8칸');
  ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), '가로 스크롤 없음');

  const layout = await page.evaluate(() => {
    const b = document.querySelector('.btns').getBoundingClientRect();
    const f = document.querySelector('#centerFrame').getBoundingClientRect();
    const banner = document.querySelector('#banner').getBoundingClientRect();
    return { btnBottom: b.bottom, frame: { x: f.x, y: f.y, w: f.width, h: f.height }, bannerTop: banner.top, vh: innerHeight, vw: innerWidth };
  });
  ok(layout.btnBottom <= layout.vh + 1, `버튼 화면 안 (bottom ${Math.round(layout.btnBottom)}/${layout.vh})`);
  ok(layout.frame.x > 0 && layout.frame.x + layout.frame.w < layout.vw, `중앙 슬롯 화면 안 (${Math.round(layout.frame.x)}..${Math.round(layout.frame.x + layout.frame.w)}/${layout.vw})`);
  ok(layout.bannerTop >= 0 && layout.frame.y > layout.bannerTop, '배너가 룰렛 위에 배치');

  const beforeMute = await page.getAttribute('#soundBtn', 'aria-pressed');
  await page.click('#soundBtn', { noWaitAfter: true });
  ok(beforeMute === 'true' && (await page.getAttribute('#soundBtn', 'aria-pressed')) === 'false', '소리 토글 (on → off)');
  ok(await page.evaluate(() => document.getElementById('app').classList.contains('muted')), '음소거가 UI에 반영');
  await page.click('#soundBtn', { noWaitAfter: true });
  ok((await page.getAttribute('#soundBtn', 'aria-pressed')) === 'true', '소리 토글 복귀 (off → on)');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* -------------------------------------------------------- 2. legendary pull */
await phase('mobile — 전설 뽑기 & 이펙트', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.queue(['diamond']));
  await page.click('#pull1', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().banner.includes('무지개'), null, { timeout: 25000 });
  ok(/r-legendary/.test(await page.getAttribute('#banner', 'class')), '전설 배너 스타일 적용');
  ok((await page.$eval('.card.is-center', (e) => e.dataset.egg)) === 'diamond', '중앙 카드 = 다이아몬드알');
  const fx = await page.evaluate(() => {
    const f = window.__eggGacha.fx;
    return { particles: f.particles.length, bolts: f.bolts.length, shake: f.shakeAmp > 0, flash: f.flashA > 0 };
  });
  ok(fx.particles > 50 && fx.bolts > 0, `전설 이펙트 (파티클 ${fx.particles}, 번개 ${fx.bolts})`);
  ok(fx.shake, '화면 흔들림 발생');
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 25000 });
  const st = await page.evaluate(() => window.__eggGacha.state());
  ok(st.counts.diamond === 1 && st.found === 1 && st.pulls === 1, '전설 당첨 기록 (1회)');
  ok((await page.textContent('#dexCount')) === '1', '상단 도감 카운터 갱신');
  ok((await page.getAttribute('#pull1', 'disabled')) === null, '스핀 후 버튼 해제');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ----------------------------------------------------------- 3. five pulls */
await phase('mobile — 5연속 뽑기 & 결과 칩', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.queue(['white', 'fire', 'thunder', 'golden', 'ice']));
  const t0 = Date.now();
  await page.click('#pull5', { noWaitAfter: true });
  await page.waitForTimeout(200);
  ok(await page.evaluate(() => document.getElementById('pull5').disabled), '스핀 중 버튼 잠금');
  await page.waitForFunction(() => document.querySelectorAll('#results .chip').length === 5, null, { timeout: 30000 });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 30000 });
  const st = await page.evaluate(() => ({ ...window.__eggGacha.state(), chips: document.querySelectorAll('#results .chip').length }));
  notes.push(`5연속 소요 ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  ok(st.chips === 5, `결과 칩 5개 (${st.chips})`);
  ok(st.pulls === 5, `뽑기 5회 기록 (${st.pulls})`);
  ok(st.found === 5 && st.counts.thunder === 1 && st.counts.golden === 1 && st.counts.ice === 1, '5연속 결과 반영');
  ok((await page.getAttribute('#pull5', 'disabled')) === null, '5연속 후 버튼 해제');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ------------------------------------------------------------ 4. dex sheet */
await phase('mobile — 도감 시트 · 확률 · 초기화', MOBILE, async ({ page, errors, goto }) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'egg-gacha.collection.v1',
      JSON.stringify({ v: 1, pulls: 12, counts: { white: 5, spotted: 3, forest: 1, fire: 2, diamond: 1 } })
    );
  });
  await goto();
  ok((await page.textContent('#dexCount')) === '5', '저장된 도감 5종 복원');
  await page.click('#dexBtn', { noWaitAfter: true });
  await page.waitForTimeout(600);
  ok(await page.evaluate(() => window.__eggGacha.state().dexOpen), '도감 시트 열림');
  ok((await page.$$eval('.dex-item:not(.locked)', (els) => els.length)) === 5, '발견 5종 표시');
  ok((await page.$$eval('.dex-item.locked', (els) => els.length)) === 3, '미발견 3종 표시');
  const summary = await page.textContent('#dexSummary');
  ok(/발견 5 \/ 8/.test(summary) && /총 12회/.test(summary), `요약 문구 "${summary}"`);
  const odds = await page.textContent('#odds');
  ok(/일반 76%/.test(odds) && /희귀 19%/.test(odds) && /영웅 4\.6%/.test(odds) && /전설 0\.4%/.test(odds), `확률 문구 "${odds}"`);
  const counts = await page.$$eval('.dex-item .dex-count', (els) => els.map((e) => e.textContent));
  ok(counts.includes('×5') && counts.filter((c) => c === '미발견').length === 3, '개별 획득 수 표시');

  await page.click('#resetBtn', { noWaitAfter: true });
  ok(/한 번 더/.test(await page.textContent('#resetBtn')), '초기화 1차 탭 → 확인 요청');
  await page.click('#resetBtn', { noWaitAfter: true });
  const after = await page.evaluate(() => window.__eggGacha.state());
  ok(after.pulls === 0 && after.found === 0, '초기화 동작');
  await page.click('#dexClose', { noWaitAfter: true });
  await page.waitForTimeout(400);
  ok(!(await page.evaluate(() => window.__eggGacha.state().dexOpen)), '도감 닫힘');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* --------------------------------------------------------- 5. persistence */
await phase('mobile — localStorage 유지', MOBILE, async ({ page, errors, goto }) => {
  await goto();
  await page.evaluate(() => window.__eggGacha.queue(['ice', 'forest']));
  await pullAndWait(page);
  await page.waitForTimeout(1200);
  const before = await page.evaluate(() => window.__eggGacha.state());
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
  const after = await page.evaluate(() => window.__eggGacha.state());
  ok(after.pulls === before.pulls && before.pulls === 1, `새로고침 후 총 ${after.pulls}회 유지`);
  ok(after.counts.ice === 1, '새로고침 후 획득 기록 유지');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ----------------------------------------------------------- 6. landscape */
await phase('landscape 844x390', { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true }, async ({ page, errors, goto }) => {
  await goto();
  const box = await page.evaluate(() => {
    const r = document.querySelector('#centerFrame').getBoundingClientRect();
    const b = document.querySelector('.btns').getBoundingClientRect();
    return {
      frame: { x: r.x, y: r.y, w: r.width, h: r.height },
      btns: { x: b.x, y: b.y, right: b.right, bottom: b.bottom },
      vw: innerWidth,
      vh: innerHeight,
      scrollW: document.documentElement.scrollWidth,
      scrollH: document.documentElement.scrollHeight,
    };
  });
  ok(box.scrollW <= box.vw && box.scrollH <= box.vh, `오버플로 없음 (${box.scrollW}x${box.scrollH})`);
  ok(
    box.frame.x > 0 && box.frame.y > 0 && box.frame.x + box.frame.w < box.vw && box.frame.y + box.frame.h < box.vh,
    `룰렛 화면 안 (${Math.round(box.frame.x)},${Math.round(box.frame.y)} ${Math.round(box.frame.w)}x${Math.round(box.frame.h)})`
  );
  ok(box.btns.x > box.frame.x + box.frame.w, '가로 모드에서 컨트롤이 룰렛 오른쪽');
  ok(box.btns.right <= box.vw + 1 && box.btns.bottom <= box.vh + 1, '가로 모드 버튼 화면 안');
  await page.evaluate(() => window.__eggGacha.queue(['ice']));
  await pullAndWait(page);
  ok((await page.evaluate(() => window.__eggGacha.state().counts.ice)) === 1, '가로 모드에서 뽑기 동작');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* ------------------------------------------------------------- 7. desktop */
await phase('desktop 1280x800', { viewport: { width: 1280, height: 800 } }, async ({ page, errors, goto }) => {
  await goto();
  ok((await page.$eval('#dexGrid', (e) => e.children.length)) === 8, '도감 8칸');
  const box = await page.evaluate(() => {
    const f = document.querySelector('#centerFrame').getBoundingClientRect();
    return { w: f.width, vw: innerWidth, scrollW: document.documentElement.scrollWidth };
  });
  ok(box.scrollW <= box.vw, '데스크톱 가로 스크롤 없음');
  ok(box.w <= 290, `중앙 카드가 과하게 커지지 않음 (${Math.round(box.w)}px)`);
  await page.evaluate(() => window.__eggGacha.queue(['golden']));
  await page.click('#pull1', { noWaitAfter: true });
  await page.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 25000 });
  ok((await page.evaluate(() => window.__eggGacha.state().counts.golden)) === 1, '데스크톱 뽑기 동작');
  await page.click('#dexBtn', { noWaitAfter: true });
  await page.waitForTimeout(500);
  ok(await page.evaluate(() => window.__eggGacha.state().dexOpen), '도감 열림');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

/* --------------------------------------------------------- 8. small phone */
await phase('small phone 360x640', { viewport: { width: 360, height: 640 }, isMobile: true, hasTouch: true }, async ({ page, errors, goto }) => {
  await goto();
  const box = await page.evaluate(() => {
    const b = document.querySelector('.btns').getBoundingClientRect();
    const h = document.querySelector('.hint').getBoundingClientRect();
    const f = document.querySelector('#centerFrame').getBoundingClientRect();
    const banner = document.querySelector('#banner').getBoundingClientRect();
    return { btnBottom: b.bottom, hintBottom: h.bottom, frameTop: f.top, frameBottom: f.bottom, bannerTop: banner.top, vh: innerHeight, vw: innerWidth };
  });
  ok(box.btnBottom <= box.vh + 1 && box.hintBottom <= box.vh + 1, '버튼/안내 화면 안');
  ok(box.frameTop > box.bannerTop && box.frameBottom < box.btnBottom, '룰렛이 배너와 버튼 사이에 들어감');
  ok((await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)), '가로 스크롤 없음');
  ok(errors.length === 0, `오류 0 (${errors.join(' | ') || 'none'})`);
});

server.close();

console.log('\n--- notes ---');
notes.forEach((n) => console.log('· ' + n));
console.log(`\n${failures.length ? `FAILED (${failures.length})` : 'ALL CHECKS PASSED'}`);
failures.forEach((f) => console.log('  ✗ ' + f));
process.exit(failures.length ? 1 : 0);

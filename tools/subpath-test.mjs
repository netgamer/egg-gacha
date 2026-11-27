import { execFileSync } from 'node:child_process';
import { mkdirSync, rmSync } from 'node:fs';
import { chromium } from 'playwright';
import { startServer } from './server.mjs';

/**
 * GitHub Pages 는 https://<user>.github.io/<repo>/ 처럼 하위 경로에서 서빙한다.
 * gh-pages 브랜치 내용을 /tmp/ghtest/<repo>/ 에 풀어 그 경로로 열어 본다.
 */
const REPO = 'egg-gacha';
const ROOT = '/tmp/ghtest';
rmSync(ROOT, { recursive: true, force: true });
mkdirSync(`${ROOT}/${REPO}`, { recursive: true });
execFileSync('sh', ['-c', `git archive gh-pages | tar -x -C ${ROOT}/${REPO}`], { stdio: 'inherit' });

const { server, url } = await startServer(ROOT, 0);
const base = `${url}${REPO}/`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const p = await ctx.newPage();
const errs = [];
p.on('pageerror', (e) => errs.push(e.message));
p.on('console', (m) => {
  if (m.type() === 'error') errs.push(m.text());
});
p.on('response', (r) => {
  if (r.status() >= 400) errs.push(`http ${r.status()} ${r.url()}`);
});
await p.goto(base, { waitUntil: 'networkidle' });
await p.waitForFunction(() => window.__eggGacha?.ready === true, null, { timeout: 20000 });
const imgs = await p.evaluate(() => [...document.querySelectorAll('.dex-art img')].map((i) => i.naturalWidth));
await p.evaluate(() => window.__eggGacha.queue(['diamond']));
await p.click('#pull1', { noWaitAfter: true });
await p.waitForFunction(() => window.__eggGacha.state().busy === false, null, { timeout: 25000 });
const st = await p.evaluate(() => window.__eggGacha.state());
await b.close();
server.close();

const ok = errs.length === 0 && imgs.every((w) => w === 512) && st.counts.diamond === 1;
console.log(`subpath ${base}`);
console.log(`images ${imgs.join(',')}  banner "${st.banner}"  errors ${errs.length ? errs.join(' | ') : 'none'}`);
console.log(ok ? 'SUBPATH OK' : 'SUBPATH FAILED');
process.exit(ok ? 0 : 1);

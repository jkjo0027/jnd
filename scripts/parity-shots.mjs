#!/usr/bin/env node
// 기준(원본 HTML, 검토용 바 숨김) vs 구현 스크린샷. 같은 브라우저·DPR·폰트·시각(모션 정지, 전화 순환 고정)으로 캡처
// 사용: node scripts/parity-shots.mjs [--impl http://127.0.0.1:3000] [--ref http://127.0.0.1:8080/JND-A%20v4.dc.html] [--pages home] [--sizes 1440x900,1024x768,768x1024,390x844]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = (() => { try { return req('playwright'); } catch { return req('/opt/node-tools/node_modules/playwright'); } })();
const args = process.argv.slice(2); const opt = {};
for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const IMPL = opt.impl || 'http://127.0.0.1:3000', REF = opt.ref || 'http://127.0.0.1:8080/JND-A%20v4.dc.html';
const SIZES = (opt.sizes || '1440x900,1024x768,768x1024,390x844,1023x768,1100x800,560x800,320x700').split(',').map((s) => s.split('x').map(Number));
const PAGES = (opt.pages || 'home,about,services,faq,contact,cases,privacy,notfound').split(',');
const OUT = path.resolve('reports/parity');
fs.mkdirSync(OUT, { recursive: true });
const REF_SCREEN = { home: 'home', about: 'about', services: 'services', faq: 'faq', contact: 'contact', cases: 'cases', privacy: 'privacy', notfound: 'notfound' };
const IMPL_PATH = { home: '/', about: '/about/', services: '/services/', faq: '/faq/', contact: '/contact/', cases: '/cases/', privacy: '/privacy/', notfound: '/zzz-not-found/' };
const FREEZE = `
  const st = document.createElement('style'); st.textContent = '*,*::before,*::after{animation-play-state:paused!important;transition:none!important;caret-color:transparent!important}'; document.head.appendChild(st);
`;

const scrollAll = async (page) => { await page.evaluate(async () => { const h = document.documentElement.scrollHeight; for (let y = 0; y < h; y += 600) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 60)); } window.scrollTo(0, 0); }); await page.waitForTimeout(600); await page.evaluate(() => Promise.all(Array.from(document.images).filter((i) => !i.complete).map((i) => new Promise((r) => { i.onload = i.onerror = r; })))); };
const browser = await chromium.launch();
const results = [];
for (const [w, h] of SIZES) {
  const ctx = await browser.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, locale: 'ko-KR', reducedMotion: 'reduce' });
  for (const pg of PAGES) {
    // 기준
    const rp = await ctx.newPage();
    await rp.goto(REF, { waitUntil: 'networkidle' });
    await rp.waitForTimeout(1500);
    await rp.evaluate((screen) => { const sel = document.querySelector('select[aria-label="화면 이동"]'); if (sel) { sel.value = screen; sel.dispatchEvent(new Event('change', { bubbles: true })); } }, REF_SCREEN[pg]);
    await rp.waitForTimeout(1200);
    await rp.evaluate(() => { const bar = document.querySelector('select[aria-label="화면 이동"]')?.closest('div'); if (bar) bar.style.display = 'none'; const hd = document.querySelector('header'); if (hd) hd.style.top = '0px'; });
    await rp.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await rp.evaluate(() => document.fonts.ready);
    await scrollAll(rp);
    await rp.waitForTimeout(800);
    const refH = await rp.evaluate(() => document.documentElement.scrollHeight);
    const refFile = path.join(OUT, `${pg}-${w}x${h}-ref.png`);
    await rp.screenshot({ path: refFile, fullPage: true });
    await rp.close();
    // 구현
    const ip = await ctx.newPage();
    await ip.goto(IMPL + IMPL_PATH[pg], { waitUntil: 'networkidle' });
    await ip.addStyleTag({ content: '*,*::before,*::after{animation-play-state:paused!important;transition:none!important}' });
    await ip.evaluate(() => document.fonts.ready);
    await scrollAll(ip);
    await ip.waitForTimeout(1200);
    const implH = await ip.evaluate(() => document.documentElement.scrollHeight);
    const implFile = path.join(OUT, `${pg}-${w}x${h}-impl.png`);
    await ip.screenshot({ path: implFile, fullPage: true });
    await ip.close();
    results.push({ page: pg, size: `${w}x${h}`, refHeight: refH, implHeight: implH, ref: path.relative(process.cwd(), refFile), impl: path.relative(process.cwd(), implFile) });
    console.log(`[shot] ${pg} ${w}x${h} ref ${refH}px impl ${implH}px`);
  }
  await ctx.close();
}
await browser.close();
fs.writeFileSync(path.join(OUT, 'shots.json'), JSON.stringify({ at: new Date().toISOString(), freeze: FREEZE.trim(), results }, null, 1));

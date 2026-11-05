#!/usr/bin/env node
// 모바일 가로 넘침·터치 타깃·뷰포트 점검 (390/320px). 사용: node scripts/mobile-check.mjs --base http://127.0.0.1:3000 [--sample 24]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/publication-ledger.json'), 'utf8')).records;
const pub = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility).map((r) => r.path);
const fixed = ['/', '/services/', '/services/repair/', '/guides/', '/guides/g01/', '/areas/', '/areas/seoul/', '/areas/gyeonggi/r53/repair/', '/areas/seoul/r01/repair/', '/contact/', '/faq/', '/about/', '/cases/'];
const n = Number(opt.sample || 24);
const sample = [...new Set([...fixed, ...pub.filter((_, i) => i % Math.max(1, Math.floor(pub.length / n)) === 0)])].filter((p) => pub.includes(p)).slice(0, n + fixed.length);
const browser = await chromium.launch();
const issues = []; const rows = [];
for (const w of [390, 320]) {
  const ctx = await browser.newContext({ viewport: { width: w, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  for (const p of sample) {
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    const r = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth, cw = document.documentElement.clientWidth;
      const vp = document.querySelector('meta[name=viewport]')?.getAttribute('content') || '';
      const small = [...document.querySelectorAll('a,button')].filter((el) => { const b = el.getBoundingClientRect(); return b.width > 0 && b.height > 0 && (b.width < 24 || b.height < 24) && getComputedStyle(el).visibility !== 'hidden'; }).length;
      const over = [...document.querySelectorAll('body *')].filter((el) => { const b = el.getBoundingClientRect(); return b.right > cw + 1 && getComputedStyle(el).position !== 'fixed'; }).slice(0, 3).map((el) => el.tagName + (el.className ? '.' + String(el.className).split(' ')[0] : ''));
      const fs = Math.min(...[...document.querySelectorAll('main p, main li')].slice(0, 200).map((el) => parseFloat(getComputedStyle(el).fontSize)).filter(Boolean));
      return { sw, cw, vp, small, over, minFont: isFinite(fs) ? fs : null };
    });
    rows.push({ w, path: p, ...r });
    if (r.sw > r.cw) issues.push({ type: 'overflow', w, path: p, scrollWidth: r.sw, clientWidth: r.cw, els: r.over });
    if (!/width=device-width/.test(r.vp)) issues.push({ type: 'viewport', w, path: p });
    if (r.minFont && r.minFont < 12) issues.push({ type: 'small-font', w, path: p, minFont: r.minFont });
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/mobile-check.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, sample: sample.length, issues, rows }, null, 1));
console.log(`[mobile-check] pages ${sample.length} × 2 widths, issues ${issues.length}`);
for (const i of issues.slice(0, 20)) console.log('  -', JSON.stringify(i));
if (issues.length) process.exit(1);

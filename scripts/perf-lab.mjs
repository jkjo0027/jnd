#!/usr/bin/env node
// 실험실(lab) 성능 측정: Playwright(Chromium) 로 LCP·CLS·전송량·요청 수를 기록한다. 실제 사용자(field) 지표가 아니며 CrUX/콘솔 데이터로 대체되지 않는다.
// 사용: node scripts/perf-lab.mjs --base http://127.0.0.1:3000 [--paths /,/areas/gyeonggi/r53/repair/]
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium; try { ({ chromium } = require('playwright')); } catch { ({ chromium } = require('/opt/node-tools/node_modules/playwright')); }
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const paths = (opt.paths || '/,/services/repair/,/guides/g01/,/areas/gyeonggi/r53/repair/,/areas/seoul/r01/install/,/contact/').split(',');
const browser = await chromium.launch();
const rows = [];
for (const mobile of [true, false]) {
  const ctx = await browser.newContext(mobile ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true } : { viewport: { width: 1366, height: 900 } });
  const page = await ctx.newPage();
  for (const p of paths) {
    let bytes = 0, reqs = 0;
    const onResp = async (r) => { reqs++; try { const b = await r.body(); bytes += b.length; } catch {} };
    page.on('response', onResp);
    await page.addInitScript(() => {
      window.__lcp = 0; window.__cls = 0;
      new PerformanceObserver((l) => { for (const e of l.getEntries()) window.__lcp = e.startTime; }).observe({ type: 'largest-contentful-paint', buffered: true });
      new PerformanceObserver((l) => { for (const e of l.getEntries()) if (!e.hadRecentInput) window.__cls += e.value; }).observe({ type: 'layout-shift', buffered: true });
    });
    const t0 = Date.now();
    await page.goto(BASE + p, { waitUntil: 'networkidle' });
    await page.waitForTimeout(800);
    const m = await page.evaluate(() => ({ lcp: Math.round(window.__lcp), cls: +window.__cls.toFixed(4), domContentLoaded: Math.round(performance.getEntriesByType('navigation')[0]?.domContentLoadedEventEnd || 0), ttfb: Math.round(performance.getEntriesByType('navigation')[0]?.responseStart || 0), htmlBytes: document.documentElement.outerHTML.length }));
    rows.push({ device: mobile ? 'mobile-390' : 'desktop-1366', path: p, ...m, requests: reqs, transferBytes: bytes, wallMs: Date.now() - t0 });
    page.off('response', onResp);
  }
  await ctx.close();
}
await browser.close();
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/perf-lab.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, note: 'lab(로컬 Chromium, 네트워크 스로틀 없음). field 지표(CrUX·콘솔 Core Web Vitals) 아님', rows }, null, 1));
console.log('[perf-lab] device | path | LCP(ms) | CLS | TTFB | requests | KB');
for (const r of rows) console.log(`  ${r.device} | ${r.path} | ${r.lcp} | ${r.cls} | ${r.ttfb} | ${r.requests} | ${Math.round(r.transferBytes / 1024)}`);

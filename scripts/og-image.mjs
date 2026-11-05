#!/usr/bin/env node
// OG 이미지(1200×630) 생성 — 브랜드 자산(로고 마크·팔레트)만 사용, 고객 사진 미사용 → public/og.png
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const req = createRequire(import.meta.url);
const { chromium } = (() => { try { return req('playwright'); } catch { return req('/opt/node-tools/node_modules/playwright'); } })();
const html = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><link rel="stylesheet" href="file://${path.resolve('node_modules/pretendard/dist/web/variable/pretendardvariable.css')}"><style>
body{margin:0;width:1200px;height:630px;background:#000;color:#fff;font-family:"Pretendard Variable",sans-serif;word-break:keep-all;position:relative;overflow:hidden}
.bar{position:absolute;top:0;left:0;right:0;height:16px;background:#FED91B}
.wrap{position:absolute;left:80px;top:96px;right:80px}
.k{font-size:24px;font-weight:800;letter-spacing:.3em;color:#FED91B;margin:0 0 28px}
h1{margin:0 0 20px;font-size:72px;line-height:1.14;font-weight:800;letter-spacing:-0.045em}
h1 em{font-style:normal;color:#FED91B}
p{margin:0;font-size:32px;color:#C3C9D1;font-weight:600}
.logo{position:absolute;left:80px;bottom:64px;display:flex;align-items:center;gap:18px}
.logo b{font-size:34px;font-weight:800;letter-spacing:-0.03em}.logo small{display:block;font-size:16px;letter-spacing:.22em;color:#9AA3AF;font-weight:700;margin-top:6px}
.tel{position:absolute;right:80px;bottom:64px;font-size:44px;font-weight:800;color:#FED91B;letter-spacing:-0.02em}
</style></head><body><div class="bar"></div><div class="wrap"><p class="k">SPEED AUTODOOR · J&amp;D SYSTEM</p><h1>자동문의 시작부터 끝까지,<br><em>제이앤디시스템</em>이 책임집니다</h1><p>자동문 설치·수리 전문 · 평택 본사 · 서울·경기 수도권 출장</p></div>
<div class="logo"><svg viewBox="0 0 40 40" width="72" height="72"><path fill="#fff" fill-rule="evenodd" d="M14 4h9a15 15 0 0 1 0 30h-9zM20 10v18h3a9 9 0 0 0 0-18z"/><path fill="#FED91B" stroke="#000" stroke-width="3" paint-order="stroke" stroke-linejoin="round" d="M14 13h6v16a9 9 0 0 1-18 0v-1.5h6V29a3 3 0 0 0 6 0z"/></svg><div><b>제이앤디시스템</b><small>J&amp;D SYSTEM</small></div></div><div class="tel">1661-3088</div></body></html>`;
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await p.setContent(html); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
fs.mkdirSync('public', { recursive: true }); await p.screenshot({ path: 'public/og.png' }); await b.close(); console.log('[og] public/og.png');

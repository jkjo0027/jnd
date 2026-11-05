#!/usr/bin/env node
// 본문 변경일 기록: 페이지별 본문 소스(콘텐츠 파일 + 템플릿) 해시가 바뀐 날짜를 data/registry/content-lastmod.json 에 남긴다 (sitemap lastmod 근거)
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ledger = JSON.parse(R('data/registry/publication-ledger.json')).records;
const LM = path.join(ROOT, 'data/registry/content-lastmod.json');
const HASHES = path.join(ROOT, 'data/registry/content-hashes.json');
const prev = fs.existsSync(HASHES) ? JSON.parse(fs.readFileSync(HASHES, 'utf8')) : {};
const lm = fs.existsSync(LM) ? JSON.parse(fs.readFileSync(LM, 'utf8')) : {};
const today = new Date().toISOString().slice(0, 10);
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = opt.base ? opt.base.replace(/\/$/, '') : null;
const src = { services: R('src/content/services.ts'), regions: R('src/content/regions.ts'), guides: R('src/content/guides.ts') + R('src/content/guides-more.ts') + R('src/content/guide-details-a.ts') + R('src/content/guide-details-b.ts') + R('src/content/guide-extra.ts'), data: R('src/content/site-data.ts') };
const GEN = ['compose.ts', 'blocks-common.ts', 'blocks-repair.ts', 'blocks-install.ts', 'blocks-sensor.ts', 'blocks-motor.ts', 'blocks-glass.ts', 'regions-seoul.ts', 'regions-gyeonggi.ts'].map((f) => R('src/content/gen/' + f)).join('');
const mainText = (html) => (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const tpl = (p) => { try { return R(p); } catch { return ''; } };
const block = (text, idKey, id) => { const i = text.indexOf(`${idKey}: '${id}'`); if (i < 0) return ''; const j = text.indexOf('\n  }),', i); return text.slice(i, j < 0 ? i + 4000 : j); };
const sourceFor = (r) => {
  if (r.type === 'core' && r.pageId === 'C-home') return src.data + tpl('src/app/page.tsx') + tpl('src/components/home/Sections.tsx');
  if (r.type === 'core' || r.type === 'part') return block(src.services, 'pageId', r.pageId) + tpl('src/app/services/[id]/page.tsx');
  if (r.type === 'region-service') return block(src.regions, 'pageId', r.pageId) + GEN + r.pageId + tpl('src/components/RegionPage.tsx');
  if (r.type === 'guide') return block(src.guides, 'id', r.pageId.toLowerCase()) + GEN + tpl('src/components/GuidePage.tsx');
  if (r.type === 'case') return block(src.data, 'id', r.pageId.replace('CASE-', '')) + tpl('src/app/cases/[id]/page.tsx');
  if (r.type === 'hub') return tpl(`src/app${r.path}page.tsx`) + (r.path === '/areas/' ? src.data : '');
  return tpl(`src/app${r.path}page.tsx`) + src.data;
};
let changed = 0;
const hashes = {};
// --base 가 주어지면 공개 페이지는 실제 렌더링 본문(main 텍스트)을 해시해 사용자에게 보이는 내용이 바뀐 날만 lastmod 가 바뀐다
for (const r of ledger) {
  let material = sourceFor(r);
  if (BASE && r.contentStatus === 'PUBLISHED' && r.indexEligibility) { try { const res = await fetch(BASE + r.path, { redirect: 'manual' }); if (res.status === 200) material = mainText(await res.text()); } catch {} }
  const h = crypto.createHash('sha256').update(material).digest('hex').slice(0, 16);
  hashes[r.pageId] = h;
  if (prev[r.pageId] !== h) { lm[r.pageId] = today; changed++; }
}
fs.writeFileSync(HASHES, JSON.stringify(hashes, null, 1) + '\n');
fs.writeFileSync(LM, JSON.stringify(lm, null, 1) + '\n');
console.log(`[content-lastmod] ${changed} changed → ${today}`);

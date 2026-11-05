#!/usr/bin/env node
// 본문 제공처가 있는 pageId 목록을 기록한다 (validate-registry 가 approved/review 페이지의 본문 존재를 확인)
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ids = new Set(['C-home', 'H-areas', 'H-guides', 'H-cases', 'H-services', 'S-about', 'S-faq', 'S-contact', 'S-privacy', 'C-seoul', 'C-gyeonggi']);
for (const m of read('src/content/services.ts').matchAll(/pageId: '([^']+)'/g)) ids.add(m[1]);
for (const m of read('src/content/regions.ts').matchAll(/pageId: '([^']+)'/g)) ids.add(m[1]);
// 생성 본문(compose.ts): 56 지역 × 5 서비스 전부
const cand = JSON.parse(read('data/registry/candidate-pages.json'));
for (const p of cand.pages) if (/^R\d{2}-/.test(p.pageId)) ids.add(p.pageId);
for (const f of ['src/content/guides.ts', 'src/content/guides-more.ts']) for (const m of read(f).matchAll(/id: '(g\d{2})'/g)) ids.add(m[1].toUpperCase());
for (const m of read('src/content/site-data.ts').matchAll(/\{ id: '(c\d)'/g)) ids.add('CASE-' + m[1]);
const out = { generatedAt: new Date().toISOString().slice(0, 10), pageIds: [...ids].sort() };
fs.writeFileSync(path.join(ROOT, 'data/registry/content-manifest.json'), JSON.stringify(out, null, 1) + '\n');
console.log(`[content-manifest] ${ids.size} pageIds`);

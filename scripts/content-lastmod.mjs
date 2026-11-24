#!/usr/bin/env node
// 본문 변경일 기록: 페이지별 본문 소스(콘텐츠 파일 + 템플릿) 해시가 바뀐 날짜를 data/registry/content-lastmod.json 에 남긴다 (sitemap lastmod 근거)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import crypto from 'node:crypto';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const ledger = JSON.parse(R('data/registry/publication-ledger.json')).records;
const LM = path.join(ROOT, 'data/registry/content-lastmod.json');
const HASHES = path.join(ROOT, 'data/registry/content-hashes.json');
const prev = fs.existsSync(HASHES) ? JSON.parse(fs.readFileSync(HASHES, 'utf8')) : {};
const lm = fs.existsSync(LM) ? JSON.parse(fs.readFileSync(LM, 'utf8')) : {};
const changedAt = new Date().toISOString();
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = opt.base ? opt.base.replace(/\/$/, '') : null;
const src = { services: R('src/content/services.ts'), regions: R('src/content/regions.ts'), guides: R('src/content/guides.ts') + R('src/content/guides-more.ts') + R('src/content/guide-details-a.ts') + R('src/content/guide-details-b.ts') + R('src/content/guide-extra.ts'), data: R('src/content/site-data.ts') };
const GEN = ['compose.ts', 'blocks-common.ts', 'blocks-repair.ts', 'blocks-install.ts', 'blocks-sensor.ts', 'blocks-motor.ts', 'blocks-glass.ts', 'regions-seoul.ts', 'regions-gyeonggi.ts'].map((f) => R('src/content/gen/' + f)).join('');
const regionalNotes = R('src/content/gen/visit-notes.ts') + R('src/content/region-consultation.json');
const mainText = (html) => (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0].replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const renderedContent = (html) => {
  const attr = (tag, name) => tag.match(new RegExp(`${name}=["']([^"']*)["']`, 'i'))?.[1] || '';
  return JSON.stringify({
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || '',
    description: attr(html.match(/<meta[^>]+name=["']description["'][^>]*>/i)?.[0] || '', 'content'),
    canonical: attr(html.match(/<link[^>]+rel=["']canonical["'][^>]*>/i)?.[0] || '', 'href'),
    main: mainText(html),
  });
};
const tpl = (p) => { try { return R(p); } catch { return ''; } };
const handbook = JSON.parse(R('src/content/handbook.json'));
const handbookGroups = JSON.parse(R('src/content/handbook-groups.json'));
const handbookEditorial = JSON.parse(R('src/content/handbook-editorial.json'));
const guideLinks = new Map(
  [...src.guides.matchAll(/^  (g\d+): '([a-z0-9-]+)',$/gm)].map(([, id, slug]) => [slug, id])
);
const block = (text, idKey, id) => { const i = text.indexOf(`${idKey}: '${id}'`); if (i < 0) return ''; const j = text.indexOf('\n  }),', i); return text.slice(i, j < 0 ? i + 4000 : j); };
const sourceFor = (r) => {
  if (r.type === 'handbook') {
    const slug = r.path.split('/').filter(Boolean).at(-1);
    const article = handbook.articles.find((a) => a.slug === slug);
    const guideId = guideLinks.get(slug);
    const guide = guideId ? block(src.guides, 'id', guideId) : '';
    const group = handbookGroups.find(g => g.slug === slug);
    const topics = (group?.topics || [slug]).map(s => ({ article: handbook.articles.find(a => a.slug === s), editorial: handbookEditorial[s] }));
    return JSON.stringify({ group, topics, article, editorial: handbookEditorial[slug], category: handbook.categories.find((c) => c.id === article?.category), guide }) + tpl('src/app/handbook/[slug]/page.tsx');
  }
  if (r.path === '/handbook/') return JSON.stringify({ handbook, handbookGroups }) + tpl('src/app/handbook/page.tsx');
  if (r.type === 'core' && r.pageId === 'C-home') return src.data + tpl('src/app/page.tsx') + tpl('src/components/home/Sections.tsx');
  if (r.type === 'core' || r.type === 'part') return block(src.services, 'pageId', r.pageId) + tpl('src/app/services/[id]/page.tsx');
  if (r.type === 'region-service') return block(src.regions, 'pageId', r.pageId) + GEN + regionalNotes + r.pageId + tpl('src/components/RegionPage.tsx');
  if (r.type === 'guide') return block(src.guides, 'id', r.pageId.toLowerCase()) + GEN + tpl('src/components/GuidePage.tsx');
  if (r.type === 'case') return block(src.data, 'id', r.pageId.replace('CASE-', '')) + tpl('src/app/cases/[id]/page.tsx');
  if (r.type === 'hub') return tpl(`src/app${r.path}page.tsx`) + (r.path === '/areas/' ? src.data : '');
  return tpl(`src/app${r.path}page.tsx`) + src.data;
};
let changed = 0;
const hashes = { ...prev };
// --base 사용 시 실제 본문과 제목·설명·대표 URL을 함께 해시한다. 검색 메타만 변경돼도 재알림할 수 있다.
for (const r of ledger) {
  if (opt['only-type'] && r.type !== opt['only-type']) continue;
  // A rendered audit cannot establish a modification date for an unpublished page.
  if (BASE && (r.contentStatus !== 'PUBLISHED' || !r.indexEligibility)) continue;
  let material = sourceFor(r);
  if (BASE && r.contentStatus === 'PUBLISHED' && r.indexEligibility) {
    const res = await fetch(BASE + r.path, { redirect: 'manual', signal: AbortSignal.timeout(15000) });
    if (res.status !== 200) throw new Error(`content-lastmod: ${r.path} returned HTTP ${res.status}; registry files were not saved`);
    material = renderedContent(await res.text());
  }
  const h = crypto.createHash('sha256').update(material).digest('hex').slice(0, 16);
  hashes[r.pageId] = h;
  if (prev[r.pageId] !== h) { lm[r.pageId] = changedAt; changed++; }
}
fs.writeFileSync(HASHES, JSON.stringify(hashes, null, 1) + '\n');
fs.writeFileSync(LM, JSON.stringify(lm, null, 1) + '\n');
console.log(`[content-lastmod] ${changed} changed → ${changedAt}`);

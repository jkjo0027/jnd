#!/usr/bin/env node
// 발행 대장(data/registry/publication-ledger.json) 동기화.
// - 후보 318개 + 구조 페이지(허브·법정·사례)를 레코드로 보장한다. 기존 레코드의 status/검수 필드는 덮어쓰지 않는다.
// - 상태값: candidate → evidence_ready → review → approved → published / hold · merged · retired
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry', f), 'utf8'));
const LEDGER = path.join(ROOT, 'data/registry/publication-ledger.json');
const cand = R('candidate-pages.json');
const kw = R('keyword-map.json');
const existing = fs.existsSync(LEDGER) ? JSON.parse(fs.readFileSync(LEDGER, 'utf8')) : { records: [] };
const byId = new Map(existing.records.map((r) => [r.pageId, r]));
const kwByPage = new Map();
for (const k of kw.keywords) { if (!kwByPage.has(k.pageId)) kwByPage.set(k.pageId, []); kwByPage.get(k.pageId).push(k); }
const now = new Date().toISOString().slice(0, 10);
const base = (o) => ({
  pageId: o.pageId, type: o.type, sourceRows: o.sourceRows || [], primaryIntent: o.primaryIntent || '', aliases: o.aliases || [],
  path: o.path, parent: o.parent || null, relatedIds: o.relatedIds || [], coverageEvidence: o.coverageEvidence || '', evidenceIds: o.evidenceIds || [],
  status: 'candidate', reviewer: null, reviewedAt: null, publishedAt: null, updatedAt: now, indexPolicy: 'index', mergeTarget: null, notes: o.notes || '',
});
const records = [];
const want = [];
for (const p of cand.pages) {
  const ks = kwByPage.get(p.pageId) || [];
  const intentOf = { '핵심': '서비스 대표', '지역서비스': '지역×서비스', '증상·부품·정보': '증상·정보 가이드' }[p.type] || p.type;
  want.push({ pageId: p.pageId, type: p.type === '핵심' ? 'core' : p.type === '지역서비스' ? 'region-service' : 'guide', sourceRows: [`페이지설계318:${p.sheetRow}`],
    primaryIntent: `${p.primaryKeyword} — ${intentOf}`, aliases: ks.map((k) => k.keyword).filter((k) => k !== p.primaryKeyword).slice(0, 40),
    path: p.candidatePath, parent: p.hubPath, notes: p.publishCondition });
}
const structural = [
  { pageId: 'H-areas', type: 'hub', path: '/areas/', parent: '/', primaryIntent: '출장 지역 탐색 허브' },
  { pageId: 'H-guides', type: 'hub', path: '/guides/', parent: '/', primaryIntent: '증상·정보 가이드 허브' },
  { pageId: 'H-cases', type: 'hub', path: '/cases/', parent: '/', primaryIntent: '시공사례 허브' },
  { pageId: 'H-services', type: 'hub', path: '/services/', parent: '/', primaryIntent: '서비스(부품별 수리) 허브' },
  { pageId: 'S-about', type: 'static', path: '/about/', parent: '/', primaryIntent: '회사 소개' },
  { pageId: 'S-faq', type: 'static', path: '/faq/', parent: '/', primaryIntent: '자주 묻는 질문' },
  { pageId: 'S-contact', type: 'static', path: '/contact/', parent: '/', primaryIntent: '문의 남기기' },
  { pageId: 'S-privacy', type: 'static', path: '/privacy/', parent: '/', primaryIntent: '개인정보처리방침' },
  { pageId: 'P-switch', type: 'part', path: '/services/switch/', parent: '/services/', primaryIntent: '자동문 스위치 수리·교체 (시안 부품 카드 02, 사례 c1)' },
  { pageId: 'P-keypad', type: 'part', path: '/services/keypad/', parent: '/services/', primaryIntent: '번호키·출입통제 수리·연동 (시안 부품 카드 04, 사례 c4)' },
  ...['c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7', 'c8'].map((c) => ({ pageId: `CASE-${c}`, type: 'case', path: `/cases/${c}/`, parent: '/cases/', primaryIntent: `시공사례 ${c}` })),
];
for (const s of structural) want.push({ ...s, sourceRows: s.sourceRows || ['site-data.ts'] });
for (const w of want) {
  const old = byId.get(w.pageId);
  if (old) { records.push({ ...base(w), ...old, path: old.path || w.path, aliases: old.aliases?.length ? old.aliases : w.aliases }); }
  else records.push(base(w));
}
const known = new Set(want.map((w) => w.pageId));
for (const r of existing.records) if (!known.has(r.pageId)) records.push(r); // 수동 추가 레코드 보존
const out = { _doc: '발행 대장. status 는 candidate→evidence_ready→review→approved→published, 보류 hold / 통합 merged(mergeTarget) / 폐기 retired. 공개 빌드는 published 만 포함. 수정 시 reviewer/reviewedAt 기록.', source: cand.source, updatedAt: now, records };
fs.writeFileSync(LEDGER, JSON.stringify(out, null, 1) + '\n');
console.log(`[ledger] records ${records.length} (candidates ${cand.pages.length} + structural ${structural.length})`);

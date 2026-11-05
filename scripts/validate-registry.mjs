#!/usr/bin/env node
// 빌드 전 레지스트리 검증. 실패 시 exit 1 → 빌드 중단.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry', f), 'utf8'));
const errs = [];
const err = (m) => errs.push(m);
const cand = R('candidate-pages.json'), kw = R('keyword-map.json'), al = R('area-aliases.json'), led = R('publication-ledger.json');
const facts = fs.existsSync(path.join(ROOT, 'data/registry/fact-ledger.json')) ? R('fact-ledger.json') : null;
const CSTATUS = new Set(['DRAFT', 'REVIEW_REQUIRED', 'VERIFIED', 'PUBLISHED', 'HOLD']);
const QCLASS = new Set(['A', 'B', 'C', 'D']);
const PATH_RE = /^\/([a-z0-9-]+\/)*$/;
const ids = new Set(), paths = new Set();
for (const p of cand.pages) {
  if (ids.has(p.pageId)) err(`중복 페이지ID ${p.pageId}`); ids.add(p.pageId);
  if (paths.has(p.candidatePath)) err(`중복 후보 경로 ${p.candidatePath}`); paths.add(p.candidatePath);
  if (!PATH_RE.test(p.candidatePath)) err(`경로 정책 위반 ${p.pageId} ${p.candidatePath}`);
  if (!p.sourceUrl.startsWith('https://jndsystem.kr/')) err(`호스트 오류 ${p.pageId}`);
}
if (cand.pages.length !== 318) err(`후보 수 ${cand.pages.length} != 318`);
for (const p of cand.pages) if (!paths.has(p.hubPath)) err(`허브 참조 오류 ${p.pageId} -> ${p.hubPath}`);
const kids = new Set();
for (const k of kw.keywords) {
  if (kids.has(k.keywordId)) err(`중복 키워드ID ${k.keywordId}`); kids.add(k.keywordId);
  if (!paths.has(k.candidatePath)) err(`누락 조인 ${k.keywordId} -> ${k.candidatePath}`);
  if (!ids.has(k.pageId)) err(`키워드 pageId 미존재 ${k.keywordId}`);
}
if (kw.keywords.length !== 2476) err(`키워드 수 ${kw.keywords.length} != 2476`);
const rids = new Set(al.baseRegions.map((b) => b.regionId));
if (rids.size !== 56) err(`기본 지역 ${rids.size} != 56`);
for (const a of al.aliases) if (a.regionId && !rids.has(a.regionId)) err(`별칭 지역 미해결 ${a.alias}`);
// 대장
const STATUS = new Set(['candidate', 'evidence_ready', 'review', 'approved', 'published', 'hold', 'merged', 'retired']);
const lp = new Set(), lid = new Set();
for (const r of led.records) {
  if (lid.has(r.pageId)) err(`대장 중복 ID ${r.pageId}`); lid.add(r.pageId);
  if (lp.has(r.path)) err(`대장 중복 경로 ${r.path}`); lp.add(r.path);
  if (!PATH_RE.test(r.path)) err(`대장 경로 정책 위반 ${r.pageId} ${r.path}`);
  if (!STATUS.has(r.status)) err(`대장 상태값 오류 ${r.pageId} ${r.status}`);
  if ((r.status === 'approved' || r.status === 'published') && !r.reviewer) err(`검수자 없는 승인 ${r.pageId}`);
  if (!CSTATUS.has(r.contentStatus)) err(`contentStatus 오류 ${r.pageId} ${r.contentStatus}`);
  if (!QCLASS.has(r.qualityClass)) err(`qualityClass 오류 ${r.pageId} ${r.qualityClass}`);
  if (r.contentStatus === 'PUBLISHED' && r.indexEligibility !== true) err(`PUBLISHED 인데 indexEligibility!=true ${r.pageId}`);
  if (r.contentStatus !== 'PUBLISHED' && r.indexEligibility === true) err(`미발행인데 indexEligibility=true ${r.pageId}`);
  if (r.contentStatus === 'PUBLISHED' && r.qualityClass === 'D') err(`D 등급 발행 금지 ${r.pageId}`);
  if (r.contentStatus === 'PUBLISHED' && r.serviceVerified !== true) err(`서비스 미확인 페이지 발행 금지 ${r.pageId}`);
  if (r.contentStatus === 'PUBLISHED' && !r.reviewNotes?.why) err(`발행 근거(reviewNotes.why) 없음 ${r.pageId}`);
  if (facts) { const m = r.pageId.match(/-(repair|install|sensor|motor|glass-door)$/) || (r.pageId === 'P-switch' ? [0, 'switch'] : r.pageId === 'P-keypad' ? [0, 'keypad'] : null); if (m && facts.services[m[1]] && !facts.services[m[1]].verified && r.contentStatus === 'PUBLISHED') err(`fact-ledger 미확인 서비스(${m[1]}) 발행 ${r.pageId}`); }
  if (r.qualityClass === 'C' && r.contentStatus === 'HOLD' && !r.mergeTarget) err(`C 등급 보류는 mergeTarget 필요 ${r.pageId}`);
  if (r.mergeTarget) { const t = led.records.find((x) => x.path === r.mergeTarget); if (t && t.contentStatus !== 'PUBLISHED') err(`통합 대상이 비공개 ${r.pageId} -> ${r.mergeTarget}`); }
  if (r.mergeTarget && !led.records.some((x) => x.path === r.mergeTarget)) err(`통합 대상 미존재 ${r.pageId} -> ${r.mergeTarget}`);
  if (r.parent && !led.records.some((x) => x.path === r.parent)) err(`상위 경로 미존재 ${r.pageId} -> ${r.parent}`);
}
for (const id of ids) if (!lid.has(id)) err(`대장에 없는 후보 ${id} — node scripts/ledger-sync.mjs 실행`);
// 공개 페이지는 본문 제공처가 있어야 한다(콘텐츠 매니페스트)
const manifestPath = path.join(ROOT, 'data/registry/content-manifest.json');
if (fs.existsSync(manifestPath)) {
  const man = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const has = new Set(man.pageIds);
  for (const r of led.records) if ((r.status === 'approved' || r.status === 'published' || r.status === 'review' || r.status === 'evidence_ready') && !has.has(r.pageId)) err(`본문 없는 ${r.status} 페이지 ${r.pageId}`);
}
if (errs.length) { console.error('[validate-registry] 실패\n - ' + errs.join('\n - ')); process.exit(1); }
const pub = led.records.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility).length;
console.log(`[validate-registry] OK pages ${cand.pages.length} keywords ${kw.keywords.length} aliases ${al.aliases.length} ledger ${led.records.length} published ${pub}`);

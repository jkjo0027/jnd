#!/usr/bin/env node
// 사용: node scripts/ledger-set.mjs --status PUBLISHED|HOLD|REVIEW_REQUIRED|VERIFIED|DRAFT --reviewer "이름" --note "근거" [--class A|B|C|D] [--evidence id1,id2] [--merge /path/] C-home C-repair ...
// 구 상태값(approved/hold/review/...)도 받아 contentStatus 로 변환한다. 기본 검증(validate-registry)이 D 등급·서비스 미확인 발행을 막는다.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LEDGER = path.join(ROOT, 'data/registry/publication-ledger.json');
const LEGACY = { candidate: 'DRAFT', evidence_ready: 'REVIEW_REQUIRED', review: 'REVIEW_REQUIRED', approved: 'PUBLISHED', published: 'PUBLISHED', hold: 'HOLD', merged: 'HOLD', retired: 'HOLD' };
const TO_LEGACY = { DRAFT: 'candidate', REVIEW_REQUIRED: 'review', VERIFIED: 'approved', PUBLISHED: 'approved', HOLD: 'hold' };
const STATUS = Object.keys(LEGACY).concat(Object.keys(TO_LEGACY));
const args = process.argv.slice(2); const opt = {}; const ids = [];
for (let i = 0; i < args.length; i++) { if (args[i].startsWith('--')) { opt[args[i].slice(2)] = args[++i]; } else ids.push(args[i]); }
if (!opt.status || !STATUS.includes(opt.status)) { console.error('status 필요: ' + STATUS.join('|')); process.exit(2); }
if (!opt.reviewer) { console.error('--reviewer 필요'); process.exit(2); }
const l = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const today = new Date().toISOString().slice(0, 10);
let n = 0;
for (const r of l.records) {
  if (!ids.includes(r.pageId) && !ids.includes(r.path)) continue;
  const cs = TO_LEGACY[opt.status] ? opt.status : LEGACY[opt.status];
  if (cs === 'PUBLISHED' && (r.qualityClass === 'D' || r.serviceVerified === false)) { console.error(`거부: ${r.pageId} 는 D 등급 또는 서비스 미확인 — 발행 불가 (fact-ledger 갱신 후 ledger-upgrade 재실행)`); process.exit(1); }
  r.contentStatus = cs; r.indexEligibility = cs === 'PUBLISHED'; r.status = TO_LEGACY[cs]; if (opt.class) r.qualityClass = opt.class;
  r.reviewer = opt.reviewer; r.reviewedAt = today; r.lastHumanReviewedAt = today; r.updatedAt = today;
  r.reviewNotes = { ...(r.reviewNotes || {}), manual: { cls: opt.class || r.qualityClass, status: cs, note: opt.note || '' } };
  if (opt.status === 'published' && !r.publishedAt) r.publishedAt = today;
  if (opt.note) r.coverageEvidence = opt.note;
  if (opt.evidence) r.evidenceIds = opt.evidence.split(',').map((s) => s.trim()).filter(Boolean);
  if (opt.merge) r.mergeTarget = opt.merge;
  if (opt.index) r.indexPolicy = opt.index;
  r.history = (r.history || []).concat([{ at: today, by: opt.reviewer, status: cs, note: opt.note || '' }]);
  n++;
}
l.updatedAt = today;
fs.writeFileSync(LEDGER, JSON.stringify(l, null, 1) + '\n');
console.log(`[ledger-set] ${n}/${ids.length} 레코드 → ${opt.status}`);
if (n !== ids.length) { console.error('일부 ID 를 찾지 못함'); process.exit(1); }

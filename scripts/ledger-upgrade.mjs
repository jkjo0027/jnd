#!/usr/bin/env node
// 발행 대장 스키마 보강 + 품질 분류(A/B/C/D) + 상태 체계(DRAFT/REVIEW_REQUIRED/VERIFIED/PUBLISHED/HOLD) 적용.
// 분류 규칙은 근거 기반이며 결정적이다. 재실행해도 같은 결과(수동 override 는 reviewNotes.manual 로 보존).
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const LEDGER = path.join(ROOT, 'data/registry/publication-ledger.json');
const l = JSON.parse(fs.readFileSync(LEDGER, 'utf8'));
const cases = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/fact-ledger.json'), 'utf8'));
const today = '2026-11-05';
const REGION_EVIDENCE = cases.regionEvidence; // rid -> { kinds: [...], refs: [...] }
const SERVICE_VERIFIED = cases.services;      // serviceId -> { verified, ref }
let counts = {};
for (const r of l.records) {
  const m = r.pageId.match(/^(R\d\d)-(repair|install|sensor|motor|glass-door)$/);
  const g = /^G\d\d$/.test(r.pageId);
  const core = /^C-/.test(r.pageId);
  const coreSvc = core ? r.pageId.slice(2) : null;
  const svc = m ? m[2] : (coreSvc && SERVICE_VERIFIED[coreSvc] !== undefined) ? coreSvc : r.pageId === 'P-switch' ? 'switch' : r.pageId === 'P-keypad' ? 'keypad' : null;
  const rid = m ? m[1].toLowerCase() : null;
  const ev = rid ? REGION_EVIDENCE[rid] : null;
  const sv = svc ? SERVICE_VERIFIED[svc] : null;
  let cls, status, why, merge = null, finalPath = r.path;
  if (svc === 'glass-door') { cls = 'D'; status = 'HOLD'; why = '강화도어 수리 취급 범위 운영자 미확인(fact-ledger services.glass-door.verified=false). 사실 확인 전 공개 부적합'; }
  else if (m && (svc === 'sensor' || svc === 'motor')) {
    const has = ev && ev.kinds.includes(svc);
    if (has) { cls = 'B'; status = 'PUBLISHED'; why = `지역 ${svc} 사례 근거 있음(${ev.refs.join(', ')}). 지역 수리 페이지와 구분되는 실제 작업 기록`; }
    else { cls = 'C'; status = 'HOLD'; merge = `/areas/${r.path.split('/')[2]}/${rid}/repair/`; finalPath = merge; why = '지역 고유 센서/모터 근거 없음 — 서비스 설명이 지역 수리 페이지와 사실상 같아 통합. 키워드는 지역 수리 페이지 센서·모터 절로 흡수'; }
  }
  else if (m) {
    const has = ev && (ev.kinds.includes(svc) || (svc === 'repair' && ev.kinds.some((k) => ['sensor', 'switch', 'motor', 'repair', 'gallery'].includes(k))));
    cls = has ? 'A' : 'B'; status = 'PUBLISHED';
    why = has ? `지역 실제 근거(${ev.refs.join(', ')}) + 지역 현장 조건·준비·안전 안내` : '지역 공개 사실 기반 안내. 지역 고유 사례 미확보 → 보강 대상(출장 기록·사진 확보 시 A). 출장권은 운영자 회신으로 확인';
  }
  else if (g && Object.values(SERVICE_VERIFIED).some((x) => !x.verified && (x.relatedGuides || []).includes(r.pageId))) { cls = 'D'; status = 'HOLD'; why = '미확인 서비스(강화도어)의 작업 안내 가이드 — 서비스 범위 확인 전 공개 부적합'; }
  else if (g) { cls = 'B'; status = 'PUBLISHED'; why = '주제별 고유 기술 안내. 기술 담당 최종 검수 전(technicalReviewed=false) — 확정적 표현 회피 규칙으로 작성'; }
  else if (core && !svc) { cls = 'A'; status = 'PUBLISHED'; why = '홈·광역 허브 — 회사 공개 사실(PPTX 02 출장 지역·사업자 정보)만 기술'; }
  else if (core || svc === 'switch' || svc === 'keypad') { cls = sv && sv.verified ? 'A' : 'B'; status = sv && sv.verified ? 'PUBLISHED' : 'HOLD'; why = sv && sv.verified ? `서비스 범위 확인(${sv.ref})` : '서비스 범위 미확인'; }
  else if (/^CASE-/.test(r.pageId)) { cls = r.status === 'approved' ? 'A' : 'D'; status = r.status === 'approved' ? 'PUBLISHED' : 'REVIEW_REQUIRED'; why = r.coverageEvidence; }
  else { cls = 'A'; status = 'PUBLISHED'; why = '허브·법정·운영 페이지'; }
  if (r.reviewNotes?.manual) { cls = r.reviewNotes.manual.cls || cls; status = r.reviewNotes.manual.status || status; why += ' | 수동: ' + r.reviewNotes.manual.note; }
  const prev = r.contentStatus;
  r.qualityClass = cls; r.contentStatus = status;
  r.indexEligibility = status === 'PUBLISHED';
  r.serviceVerified = sv ? !!sv.verified : !(g && cls === 'D'); // 서비스 페이지가 아니면 해당 없음(true)
  r.serviceAreaVerified = rid ? !!(ev && ev.areaVerified) : /^C-(seoul|gyeonggi)$/.test(r.pageId) ? true : !m;
  r.evidenceRefs = r.evidenceIds || [];
  r.technicalReviewed = false;
  r.lastHumanReviewedAt = r.reviewedAt || null;
  r.contentOwner = r.contentOwner || '제이앤디시스템 (운영자) / 구현: 개발팀';
  r.finalPath = finalPath; r.mergeTarget = merge;
  r.reviewNotes = { ...(r.reviewNotes || {}), audit: today, why };
  // 구 상태 필드 동기화 (하위 호환)
  r.status = status === 'PUBLISHED' ? 'approved' : status === 'HOLD' ? 'hold' : status === 'REVIEW_REQUIRED' ? 'review' : status === 'VERIFIED' ? 'approved' : 'candidate';
  r.updatedAt = today;
  if (prev !== status) r.history = (r.history || []).concat([{ at: today, by: 'ledger-upgrade (품질 감사)', status: r.status, note: `${cls}: ${why}` }]);
  counts[cls + '/' + status] = (counts[cls + '/' + status] || 0) + 1;
}
l._doc = '발행 대장. contentStatus: DRAFT→REVIEW_REQUIRED→VERIFIED→PUBLISHED / HOLD. indexEligibility=true 인 PUBLISHED 만 공개 빌드·사이트맵. qualityClass A(독립 가치)·B(보강 후 발행 적합)·C(통합 권장, mergeTarget/finalPath)·D(사실 확인 전 공개 부적합). status 는 구 호환 필드.';
l.updatedAt = today;
fs.writeFileSync(LEDGER, JSON.stringify(l, null, 1) + '\n');
console.log('[ledger-upgrade]', counts);

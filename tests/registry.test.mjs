import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const R = (f) => JSON.parse(fs.readFileSync(new URL('../data/registry/' + f, import.meta.url), 'utf8'));
const src = fs.readFileSync(new URL('../src/content/site-data.ts', import.meta.url), 'utf8');

test('후보 318 · 키워드 2476 · 조인 누락 없음', () => {
  const c = R('candidate-pages.json'), k = R('keyword-map.json');
  assert.equal(c.pages.length, 318); assert.equal(k.keywords.length, 2476);
  const paths = new Set(c.pages.map((p) => p.candidatePath));
  for (const x of k.keywords) assert.ok(paths.has(x.candidatePath), x.keywordId);
});
test('R-ID ↔ 지역목록 순서 일치 (수원 r38, 평택 r53, 화성 r56)', () => {
  const a = R('area-aliases.json');
  const by = Object.fromEntries(a.baseRegions.map((b) => [b.regionId, b.name]));
  assert.equal(by.r38, '수원시'); assert.equal(by.r53, '평택시'); assert.equal(by.r56, '화성시'); assert.equal(by.r08, '금천구'); assert.equal(by.r21, '용산구');
});
test('생활권 별칭 → 대표 지역 (동탄→r56, 분당구→r37, 경기/경기도→gyeonggi)', () => {
  const a = R('area-aliases.json');
  const f = (n) => a.aliases.find((x) => x.alias === n);
  assert.equal(f('동탄').regionId, 'r56'); assert.equal(f('분당구').regionId, 'r37'); assert.equal(f('경기도').province, 'gyeonggi'); assert.equal(f('경기').province, 'gyeonggi');
});
test('site-data CITIES.regionId 가 지역목록과 일치', () => {
  const a = R('area-aliases.json');
  const by = Object.fromEntries(a.baseRegions.map((b) => [b.regionId, b.name]));
  for (const m of src.matchAll(/\{ c: '([^']+)', p: '(경기|서울)', tag: '[^']+', regionId: '(r\d\d)'/g)) {
    const name = m[1].replace('경기광주시', '광주시');
    assert.equal(by[m[3]], name, `${m[1]} → ${m[3]}`);
  }
});
test('대장: 공개 상태는 검수자 필수, 경로 유일, 통합 대상 존재', () => {
  const l = R('publication-ledger.json');
  const paths = new Set();
  for (const r of l.records) {
    assert.ok(!paths.has(r.path), 'dup ' + r.path); paths.add(r.path);
    if (r.status === 'approved' || r.status === 'published') assert.ok(r.reviewer, r.pageId);
    assert.ok(['DRAFT', 'REVIEW_REQUIRED', 'VERIFIED', 'PUBLISHED', 'HOLD'].includes(r.contentStatus), r.pageId);
    assert.ok(['A', 'B', 'C', 'D'].includes(r.qualityClass), r.pageId);
    assert.equal(r.indexEligibility, r.contentStatus === 'PUBLISHED', r.pageId);
    if (r.contentStatus === 'PUBLISHED') { assert.notEqual(r.qualityClass, 'D', r.pageId); assert.equal(r.serviceVerified, true, r.pageId); }
    if (/glass-door/.test(r.pageId)) assert.notEqual(r.contentStatus, 'PUBLISHED', '강화도어 미확인 서비스 발행 금지 ' + r.pageId);
    if (r.mergeTarget) assert.ok(l.records.some((x) => x.path === r.mergeTarget), r.pageId);
  }
});
test('지역 상담번호 고정 해시: 시작 7, h*31+charCode, uint32, % n', () => {
  const pin = (key, n) => { let h = 7; for (const ch of Array.from(key)) h = (Math.imul(h, 31) + ch.charCodeAt(0)) >>> 0; return h % n; };
  assert.equal(pin('r56', 3), pin('r56', 3));
  const all = ['r38', 'r53', 'r56', 'r48', 'r08', 'r21'].map((k) => pin(k, 3));
  assert.ok(new Set(all).size >= 2, '분산 ' + all.join(','));
  assert.equal(pin('r56', 1), 0);
});
test('리뷰 원문이 추가요청1/내용.txt 와 일치', () => {
  const txt = fs.readFileSync(new URL('../reference/jnd_handoff/materials/uploads/요청사항/추가요청1/내용.txt', import.meta.url), 'utf8').normalize('NFC');
  for (const t of ['설치부터 마무리까지 만족스러웠어요!', '빠른 방문과 깔끔한 시공 감사합니다.', '오래된 자동문 교체하길 잘했네요.', '꼼꼼하게 설치해 주셔서 좋았습니다.', '다음에도 자동문 관련 작업은 여기서 할 것 같아요.']) assert.ok(txt.includes(t), t);
});

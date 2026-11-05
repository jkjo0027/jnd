#!/usr/bin/env node
// 검색엔진별 측정 대시보드 생성: 발행 / 색인 적합 / 색인 확인 / 실노출 확인 / 클릭 을 구분하고, 근거 없는 칸은 "데이터 대기" 또는 "측정 불가"로 둔다.
// 입력: publication-ledger.json(발행·적합), search-evidence.json(콘솔·URL 검사 기록) → reports/measurement-dashboard.md + search-evidence.json dashboard 갱신
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const P = (f) => path.join(ROOT, 'data/registry', f);
const ledger = JSON.parse(fs.readFileSync(P('publication-ledger.json'), 'utf8')).records;
const ev = JSON.parse(fs.readFileSync(P('search-evidence.json'), 'utf8'));
const today = new Date().toISOString().slice(0, 10);
const published = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility);
const eligible = published.filter((r) => r.indexPolicy === 'index');
const count = (engine, state) => ev.rows.filter((x) => x.engine === engine && x.state === state).length;
const ENGINES = {
  google: { label: 'Google', indexedScope: 'Search Console URL 검사(저장된 색인 상태)·페이지 색인 보고서', exposureScope: '검색 실적(웹, 페이지 기준) 노출 1회 이상', note: '속성 권한 수령 전 — 데이터 대기' },
  naver: { label: 'Naver', indexedScope: '서치어드바이저 URL 검사(수동) · 사이트 진단 총량', exposureScope: '콘텐츠 노출·클릭 — 클릭 상위 30 URL 만 제공', note: 'URL 별 실노출은 상위 30 URL 밖이면 측정 불가' },
  bing: { label: 'Bing', indexedScope: 'Webmaster Tools URL Inspection · Site Explorer', exposureScope: 'Search Performance(Web, Pages) 노출 1회 이상', note: '사이트 추가·IndexNow 키 등록 전 — 데이터 대기' },
};
const dash = Object.entries(ENGINES).map(([engine, m]) => {
  const indexed = count(engine, 'indexed'), notIndexed = count(engine, 'not_indexed'), exposed = ev.rows.filter((x) => x.engine === engine && x.impressions > 0).length;
  const hasData = ev.rows.some((x) => x.engine === engine);
  return { engine, as_of: today, published: published.length, eligible: eligible.length, indexed_confirmed: indexed, not_indexed_confirmed: notIndexed, indexed_unknown: eligible.length - indexed - notIndexed, exposed_confirmed: exposed, exposure_coverage: engine === 'naver' ? `${exposed}/${eligible.length} (상위 30 URL 한정 — 나머지 측정 불가)` : `${exposed}/${eligible.length}`, impressions: hasData ? ev.rows.filter((x) => x.engine === engine).reduce((a, x) => a + (x.impressions || 0), 0) : null, clicks: hasData ? ev.rows.filter((x) => x.engine === engine).reduce((a, x) => a + (x.clicks || 0), 0) : null, verdict: hasData ? (exposed >= Math.ceil(eligible.length * 0.9) ? '목표(90%) 달성 확인' : '미달 확인') : '데이터 대기', evidence_scope: `${m.indexedScope} / ${m.exposureScope}`, evidence_ref: `docs/search-console-runbook.md#${engine}`, note: m.note };
});
ev.dashboard = dash; ev.updatedAt = today;
fs.writeFileSync(P('search-evidence.json'), JSON.stringify(ev, null, 1) + '\n');
const md = `# 측정 대시보드 (${today})\n\n수치는 모두 근거 파일(search-evidence.json rows)에서 계산한다. 콘솔 권한·등록이 없는 엔진은 "데이터 대기"이며 추정치를 넣지 않는다.\n\n| 엔진 | 발행 | 색인 적합 | 색인 확인 | 미색인 확인 | 색인 미확인 | 실노출 확인 | 노출/클릭 | 판정 |\n|---|---:|---:|---:|---:|---:|---|---|---|\n${dash.map((d) => `| ${ENGINES[d.engine].label} | ${d.published} | ${d.eligible} | ${d.indexed_confirmed} | ${d.not_indexed_confirmed} | ${d.indexed_unknown} | ${d.exposure_coverage} | ${d.impressions ?? '—'} / ${d.clicks ?? '—'} | ${d.verdict} |`).join('\n')}\n\n정의\n- 발행: contentStatus=PUBLISHED, indexEligibility=true 인 URL 수(사이트 빌드 포함).\n- 색인 적합: 발행 중 indexPolicy=index 이고 사이트맵에 포함된 URL 수.\n- 색인 확인: 엔진 콘솔 URL 검사에서 "색인됨"으로 기록된 URL 수(rows.state=indexed). 사이트맵 제출·IndexNow 통지는 색인 확인이 아니다.\n- 실노출 확인: 해당 엔진 검색 실적에서 노출 1회 이상 기록된 URL 수. Naver 는 상위 30 URL 밖은 측정 불가.\n- 판정: 색인 적합 URL 의 90% 이상이 실노출 확인되면 "달성 확인". 데이터가 없으면 "데이터 대기"(추정 금지).\n\n${dash.map((d) => `- ${ENGINES[d.engine].label}: ${d.note}. 근거 범위: ${d.evidence_scope}`).join('\n')}\n\n## 300 URL 목표 대비\n\n- 색인 적합 URL: ${eligible.length}개. 목표 300 의 90%(270) 를 충족하려면 **색인 적합 URL 자체가 270개 이상이어야 하며**, 현재 근거로는 ${eligible.length}개까지만 발행 가능하다(강화도어 57 미확인, 지역 센서·모터 110 통합, 사례 5 검수 대기). 따라서 "300개 중 90% 상위 노출"은 현재 상태로는 달성 불가이며, 달성 가능 상한은 발행 ${eligible.length}개 기준 90% = ${Math.ceil(eligible.length * 0.9)}개 실노출이다.\n- 숫자를 늘리기 위한 지역 변형 URL 추가는 하지 않는다. 보류 URL 은 운영자 사실 확인(강화도어)·지역 고유 근거(사례 사진·출장 기록) 확보 시 다시 심사한다.\n`;
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/measurement-dashboard.md'), md);
console.log('[search-dashboard] published', published.length, 'eligible', eligible.length, dash.map((d) => `${d.engine}:${d.verdict}`).join(' '));

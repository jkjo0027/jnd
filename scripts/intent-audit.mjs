#!/usr/bin/env node
// 검색 의도 클러스터·키워드 카니벌라이제이션 분석 → data/registry/intent-clusters.json, data/export/intent-audit.csv, reports/intent-audit.md
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry', f), 'utf8'));
const kw = R('keyword-map.json'), led = R('publication-ledger.json'), al = R('area-aliases.json');
const byPath = new Map(led.records.map((r) => [r.path, r]));
const CLUSTERS = [
  ['자동문 수리', /수리(?! 비용| 업체)|A\/?S|AS$/], ['자동문 설치', /설치(?! 비용)|시공/], ['자동문 고장', /고장|안 열림|안 닫힘|작동 안됨|열렸다 닫힘|정전/],
  ['자동문 센서', /센서/], ['자동문 모터', /모터/], ['자동문 컨트롤러', /컨트롤러/], ['자동문 문열림·닫힘 문제', /열림|닫힘|닫힐 때/], ['자동문 소음', /소음/],
  ['자동문 유지보수', /벨트|레일|롤러|유지보수|속도 조절|리모컨|버튼/], ['상가·병원·사무실 출입문', /상가|병원|약국|사무실|장애인|슬라이딩|양개|편개/],
  ['강화도어(미확인 서비스)', /강화도어/], ['고장 원인·비용·점검 정보', /비용|견적|교체 비교|확인사항|고려사항|차이|항목/],
];
// 지역 축: 키워드의 지역 라벨(구·시 단위) 그대로 — 지역이 다르면 다른 검색 의도이므로 광역 단위로 묶지 않는다
const geo = (areaLabel) => (areaLabel === '공통' ? '공통' : areaLabel);
const prov = (areaLabel) => (areaLabel === '공통' ? '공통' : /^서울/.test(areaLabel) || al.aliases.some((a) => a.alias === areaLabel.replace(/^서울 /, '') && a.province === 'seoul') ? '서울' : '경기');
const clusterOf = (intent) => { for (const [name, re] of CLUSTERS) if (re.test(intent)) return name; return '기타'; };
const rows = kw.keywords.map((k) => {
  const rec = byPath.get(k.candidatePath);
  return { keywordId: k.keywordId, keyword: k.keyword, intent: k.intent, cluster: clusterOf(k.intent), geo: geo(k.areaLabel), province: prov(k.areaLabel), candidatePath: k.candidatePath, finalPath: rec?.finalPath || k.candidatePath, pageStatus: rec?.contentStatus || '?', qualityClass: rec?.qualityClass || '?', evidenceType: k.evidenceType, volume: k.monthlyVolume };
});
// 대표 URL(final) 기준 집계: 한 의도(클러스터+지역)가 여러 공개 URL 에 분산되면 카니벌라이제이션 후보
const byIntentGeo = new Map();
for (const r of rows) { const key = `${r.cluster}|${r.geo}|${r.intent}`; if (!byIntentGeo.has(key)) byIntentGeo.set(key, new Set()); byIntentGeo.get(key).add(r.finalPath); }
const cannibal = [...byIntentGeo].filter(([, s]) => s.size > 1).map(([k, s]) => ({ key: k, urls: [...s] }));
// 공개 URL 별 대표 의도
const pageIntent = {};
for (const r of rows) { const p = r.finalPath; pageIntent[p] = pageIntent[p] || { cluster: new Set(), geo: new Set(), n: 0 }; pageIntent[p].cluster.add(r.cluster); pageIntent[p].geo.add(r.geo); pageIntent[p].n++; }
// 같은 클러스터·같은 지역에 공개 페이지가 2개 이상(비지역 페이지끼리) → 검토
const pubPages = led.records.filter((r) => r.contentStatus === 'PUBLISHED');
const clusterPages = {};
for (const p of pubPages) { const pi = pageIntent[p.path]; const key = pi ? [...pi.cluster].sort().join('+') + '|' + [...pi.geo].sort().join('+') : (p.type === 'guide' ? 'guide' : p.type); (clusterPages[key] = clusterPages[key] || []).push(p.path); }
const overlaps = Object.entries(clusterPages).filter(([k, v]) => v.length > 1 && /\|공통$/.test(k));
const out = { at: '2026-11-05', clusters: CLUSTERS.map((c) => c[0]).concat(['서울 지역 검색', '경기 지역 검색']), keywordCount: rows.length, cannibalizationCandidates: cannibal, publishedClusterOverlaps: overlaps.map(([k, v]) => ({ cluster: k, urls: v })), remapped: rows.filter((r) => r.finalPath !== r.candidatePath).length, excludedUnverified: rows.filter((r) => r.cluster.startsWith('강화도어')).length };
fs.writeFileSync(path.join(ROOT, 'data/registry/intent-clusters.json'), JSON.stringify(out, null, 1) + '\n');
fs.mkdirSync(path.join(ROOT, 'data/export'), { recursive: true });
const cols = ['keywordId', 'keyword', 'intent', 'cluster', 'geo', 'province', 'candidatePath', 'finalPath', 'pageStatus', 'qualityClass', 'evidenceType', 'volume'];
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
fs.writeFileSync(path.join(ROOT, 'data/export/intent-audit.csv'), '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
const cc = {}; for (const r of rows) cc[r.cluster] = (cc[r.cluster] || 0) + 1;
const md = `# 검색 의도·카니벌라이제이션 분석 (2026-11-05)\n\n키워드 ${rows.length}개를 13개 의도 클러스터 + 지역 축(공통 / 구·시 단위 지역 라벨)으로 분류했다. 검색량·경쟁도는 엑셀에 "미확인"으로만 존재하므로 수치를 쓰지 않는다.\n\n## 클러스터별 키워드 수\n\n| 클러스터 | 키워드 |\n|---|---:|\n${Object.entries(cc).sort((a, b) => b[1] - a[1]).map(([k, v]) => `| ${k} | ${v} |`).join('\n')}\n\n## 대표 URL 재배정\n\n- 센서·모터 지역 키워드 ${out.remapped}개는 통합 보류된 지역 센서/모터 페이지 대신 **해당 지역 수리 페이지(finalPath)** 로 배정했다(지역 수리 페이지에 센서·모터·컨트롤러 절이 있음).\n- 강화도어 클러스터 ${out.excludedUnverified}개는 서비스 미확인으로 대표 URL 이 보류 상태다. 운영자 확인 전까지 색인 대상이 없다.\n\n## 같은 의도를 여러 공개 URL 이 겨루는 경우(finalPath 기준)\n\n${cannibal.length ? cannibal.map((c) => `- ${c.key}: ${c.urls.join(', ')}`).join('\n') : '- 없음 — 모든 키워드가 하나의 대표 URL 에 배정됨'}\n\n## 공개 페이지 간 클러스터 중복(비지역)\n\n${out.publishedClusterOverlaps.length ? out.publishedClusterOverlaps.map((o) => `- ${o.cluster}: ${o.urls.join(', ')}`).join('\n') : '- 없음'}\n\n판단: 핵심 서비스(일반 의도)와 지역 서비스(지역 의도)는 지역 수식어로 의도가 구분된다. 핵심 \`/services/repair/\`·\`/services/switch/\`·\`/services/keypad/\` 는 부품 의도가 다르나 본문 유사도(최대 0.485)가 높은 편이라 switch/keypad 페이지는 각자 부품 특화 내용을 유지하고 공통 블록 의존을 낮췄다. 가이드는 진단 의도, 서비스는 수리 의도로 분리된다(G04 vs /services/sensor/).\n`;
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/intent-audit.md'), md);
console.log('[intent-audit] keywords', rows.length, 'cannibal', cannibal.length, 'overlaps', overlaps.length, 'remapped', out.remapped);

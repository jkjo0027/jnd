#!/usr/bin/env node
// 콘텐츠 품질 감사: 공개 URL 전수 크롤 → 본문 길이·고유 문장 비율·템플릿 비율(다른 페이지 3곳 이상에 같은 문장)·헤딩 구조 반복·근거 없는 확약 문구
// 결과: data/registry/content-quality.json, data/export/content-quality.csv, reports/content-quality.md
// 사용: node scripts/content-audit.mjs --base http://127.0.0.1:3000
import fs from 'node:fs';
import path from 'node:path';
const args = process.argv.slice(2); const opt = {}; for (let i = 0; i < args.length; i++) if (args[i].startsWith('--')) opt[args[i].slice(2)] = args[++i];
const BASE = (opt.base || 'http://127.0.0.1:3000').replace(/\/$/, '');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry', f), 'utf8'));
const ledger = R('publication-ledger.json').records, aliases = R('area-aliases.json'), facts = R('fact-ledger.json');
const regionWords = [...new Set(aliases.aliases.map((a) => a.alias).concat(aliases.baseRegions.map((b) => b.name)).concat(aliases.baseRegions.map((b) => b.name.replace(/(시|구|군)$/, ''))).concat(['서울특별시', '경기도', '서울', '경기']))].filter((w) => w.length >= 2).sort((a, b) => b.length - a.length);
const normRegion = (t) => { let s = t; for (const w of regionWords) s = s.split(w).join('지역'); return s; };
const pub = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility);
const text = (html) => html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const docs = [];
for (const r of pub) {
  const res = await fetch(BASE + r.path, { redirect: 'manual' });
  if (res.status !== 200) { console.log('skip', r.path, res.status); continue; }
  const html = await res.text();
  const main = (html.match(/<main[\s\S]*?<\/main>/i) || [''])[0].replace(/<nav[\s\S]*?<\/nav>/gi, '').replace(/<aside[\s\S]*?<\/aside>/gi, '');
  const body = text(main);
  const h2 = [...main.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/gi)].map((m) => normRegion(text(m[1])));
  const sents = body.split(/(?<=[.!?요다]) /).map((s) => s.trim()).filter((s) => s.length >= 12);
  const keys = sents.map((s) => normRegion(s).replace(/[\s\p{P}\p{S}\d]+/gu, ''));
  docs.push({ r, chars: body.length, sents, keys, h2sig: h2.join('>'), body });
}
// 문장 빈도(정규화 키 기준)
const freq = new Map();
for (const d of docs) for (const k of new Set(d.keys)) freq.set(k, (freq.get(k) || 0) + 1);
const sigCount = new Map(); for (const d of docs) sigCount.set(d.h2sig, (sigCount.get(d.h2sig) || 0) + 1);
const CLAIMS = [[/24시간 (출동|대응|상담)/, '24시간'], [/연중무휴/, '연중무휴'], [/즉시 출동|바로 출동/, '즉시 출동'], [/최저가|최저 비용|가장 저렴/, '가격 확약'], [/(100%|무조건) (보장|가능|해결|수리|교체)/, '절대 표현'], [/\d+분 (내|이내) (도착|방문)/, '도착 시간 확약']];
const rows = docs.map((d) => {
  const uniq = d.keys.filter((k) => freq.get(k) === 1).length;
  const tpl = d.keys.filter((k) => freq.get(k) >= 3).length;
  const tpl10 = d.keys.filter((k) => freq.get(k) >= 10).length; // 변형 풀(3~5종)이 아닌 진짜 공통 문구(10개 이상 페이지)
  const templateRatio10 = d.keys.length ? +(tpl10 / d.keys.length).toFixed(3) : 0;
  const templateRatio = d.keys.length ? +(tpl / d.keys.length).toFixed(3) : 0;
  const uniqueRatio = d.keys.length ? +(uniq / d.keys.length).toFixed(3) : 0;
  const flags = CLAIMS.filter(([re]) => re.test(d.body)).map(([, n]) => n);
  const claimTxt = d.body.split(/(?<=[.?!])\s/).filter((s) => !/\?$/.test(s.trim())).join(' ').replace(/경기도권은 당일[^.]*\./g, '');
  if (d.r.path.startsWith('/areas/seoul/r') && /당일 (출장|방문|수리|교체)/.test(claimTxt)) flags.push('서울 당일 확약');
  const rid = (d.r.pageId.match(/^(R\d\d)/) || [])[1]?.toLowerCase();
  const ev = rid ? facts.regionEvidence[rid] : null;
  // 콘텐츠 지표 기반 판정 제안(근거 등급은 대장 qualityClass 가 우선) — 템플릿 비율 0.6 초과 또는 고유 문장 비율 0.2 미만이면 보강 대상
  const metricVerdict = flags.length ? '수정 필요(확약 문구)' : templateRatio > 0.6 || uniqueRatio < 0.2 ? '보강 대상(템플릿 비율)' : d.chars < 1500 ? '보강 대상(분량)' : '적합';
  const why = [`본문 ${d.chars}자 · 문장 ${d.keys.length} · 고유 ${uniqueRatio} · 템플릿 ${templateRatio}`, rid ? (ev ? `지역 근거: ${ev.kinds.join('/')}` : '지역 고유 근거 없음(출장권만 확인)') : '', d.r.reviewNotes?.why || ''].filter(Boolean).join(' | ');
  return { path: d.r.path, pageId: d.r.pageId, qualityClass: d.r.qualityClass, contentStatus: d.r.contentStatus, chars: d.chars, sentences: d.keys.length, uniqueRatio, templateRatio, templateRatio10, headingGroup: sigCount.get(d.h2sig), claims: flags.join('|'), evidenceRefs: (d.r.evidenceRefs || []).length, metricVerdict, rationale: why };
});
// 대장에 측정값 기록(판정은 바꾸지 않는다 — 근거 등급은 ledger-upgrade 규칙이 결정)
if (opt['write-ledger'] !== 'false') {
  const lp = path.join(ROOT, 'data/registry/publication-ledger.json'); const l = JSON.parse(fs.readFileSync(lp, 'utf8'));
  for (const rec of l.records) { const m = rows.find((x) => x.pageId === rec.pageId); if (m) rec.reviewNotes = { ...(rec.reviewNotes || {}), metrics: { at: new Date().toISOString().slice(0, 10), chars: m.chars, uniqueRatio: m.uniqueRatio, templateRatio: m.templateRatio, templateRatio10: m.templateRatio10, claims: m.claims || null } }; }
  fs.writeFileSync(lp, JSON.stringify(l, null, 1) + '\n');
}
fs.writeFileSync(path.join(ROOT, 'data/registry/content-quality.json'), JSON.stringify({ at: new Date().toISOString(), base: BASE, pages: rows.length, rows }, null, 1) + '\n');
fs.mkdirSync(path.join(ROOT, 'data/export'), { recursive: true });
const cols = Object.keys(rows[0]);
const esc = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
fs.writeFileSync(path.join(ROOT, 'data/export/content-quality.csv'), '﻿' + [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n') + '\n');
const avg = (k) => +(rows.reduce((a, r) => a + r[k], 0) / rows.length).toFixed(3);
const byClass = {}; for (const r of rows) byClass[r.qualityClass] = (byClass[r.qualityClass] || 0) + 1;
const byVerdict = {}; for (const r of rows) byVerdict[r.metricVerdict] = (byVerdict[r.metricVerdict] || 0) + 1;
const worst = [...rows].sort((a, b) => b.templateRatio - a.templateRatio).slice(0, 10);
const md = `# 콘텐츠 품질 감사 (${new Date().toISOString().slice(0, 10)})\n\n공개(PUBLISHED) URL ${rows.length}개를 실제 렌더링 본문으로 측정했다. 템플릿 비율 = 지역명을 정규화한 뒤 다른 페이지 3곳 이상에 똑같이 나오는 문장의 비율, 고유 비율 = 사이트 전체에서 이 페이지에만 있는 문장의 비율.\n\n| 지표 | 값 |\n|---|---:|\n| 평균 본문 길이(자) | ${avg('chars')} |\n| 평균 고유 문장 비율 | ${avg('uniqueRatio')} |\n| 평균 템플릿 문장 비율(3개 이상 페이지 공유) | ${avg('templateRatio')} |\n| 평균 공통 문구 비율(10개 이상 페이지 공유) | ${avg('templateRatio10')} |\n| 등급 분포 | ${Object.entries(byClass).map(([k, v]) => `${k} ${v}`).join(' · ')} |\n| 지표 판정 | ${Object.entries(byVerdict).map(([k, v]) => `${k} ${v}`).join(' · ')} |\n| 확약 문구 검출 | ${rows.filter((r) => r.claims).length} |\n| 헤딩 구조 그룹(가장 큰 그룹 크기) | ${Math.max(...rows.map((r) => r.headingGroup))} |\n\n## 템플릿 비율 상위 10\n\n| URL | 등급 | 본문 | 고유 | 템플릿(≥3) | 공통(≥10) |\n|---|---|---:|---:|---:|---:|\n${worst.map((r) => `| ${r.path} | ${r.qualityClass} | ${r.chars} | ${r.uniqueRatio} | ${r.templateRatio} | ${r.templateRatio10} |`).join('\n')}\n\n## 해석\n\n- 지역 페이지는 지역 사실(동·권역·접근 동선·건물 유형)과 서비스 블록 변형(3~5종)을 결정적으로 조합해 만든다. 5-gram 유사도(dup-check: 최대 0.49, 평균 0.12)는 낮지만 **문장 단위로 보면 변형 풀에서 고른 문장이 다른 지역 3곳 이상에 다시 나타나는 비율이 높다**. 이는 변형 조합 방식의 구조적 한계이며 숨기지 않고 그대로 기록한다.\n- 공통 문구 비율(10개 이상 페이지 공유)은 진짜 보일러플레이트의 비율이다. 지역 고유 가치는 고유 문장 비율과 지역 근거(fact-ledger regionEvidence)로 판단한다.\n- 조치: 고유 문장 비율 하위 지역 페이지부터 운영자 제공 자료(출장 기록·현장 사진·지역별 작업 메모)로 보강한다. 보강 전까지 B 등급 유지, 근거가 확보되면 A 로 승격. 지역명만 바꾼 변형 URL 은 추가하지 않는다.\n\n전체 표: data/export/content-quality.csv (URL 별 근거·판정 포함).\n`;
fs.mkdirSync(path.join(ROOT, 'reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'reports/content-quality.md'), md);
const claimRows = rows.filter((r) => r.claims);
if (claimRows.length) console.log('[content-audit] claims:', claimRows.map((r) => r.path + ':' + r.claims));
console.log('[content-audit] pages', rows.length, 'avgChars', avg('chars'), 'avgUnique', avg('uniqueRatio'), 'avgTemplate', avg('templateRatio'), byVerdict, 'claims', rows.filter((r) => r.claims).length);

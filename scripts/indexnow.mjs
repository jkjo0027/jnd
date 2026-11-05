#!/usr/bin/env node
// IndexNow 변경 알림 (Bing·Naver·Yandex 등 IndexNow 참여 엔진에 URL 변경을 '통지'한다 — 색인·노출을 보장하지 않는다).
// 사용: node scripts/indexnow.mjs            → 변경 URL 계산·드라이런(제출 안 함)
//       INDEXNOW_KEY=... node scripts/indexnow.mjs --submit [--all]   → 실제 제출(운영 반영 후·운영자 승인 후에만)
// 변경 감지: data/registry/content-hashes.json(본문 해시) vs var/indexnow-state.json(마지막 제출 해시). 중복 제출 방지·로그 var/indexnow-log.jsonl
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const args = new Set(process.argv.slice(2));
const HOST = 'jndsystem.kr';
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/publication-ledger.json'), 'utf8')).records;
const hashes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/content-hashes.json'), 'utf8'));
const hashOf = (p) => (hashes.pages && hashes.pages[p]) || (hashes[p] && (hashes[p].hash || hashes[p])) || null;
const statePath = path.join(ROOT, 'var/indexnow-state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { submitted: {} };
const pub = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility && r.indexPolicy === 'index');
const changed = pub.filter((r) => args.has('--all') || !state.submitted[r.path] || state.submitted[r.path].hash !== hashOf(r.path));
// 통합(C)·보류(D) 페이지가 과거에 제출된 적이 있으면 그 URL 도 한 번 더 통지(리디렉션·404 반영)
const removed = ledger.filter((r) => r.contentStatus !== 'PUBLISHED' && state.submitted[r.path] && !state.submitted[r.path].retired);
const urls = [...new Set([...changed.map((r) => `https://${HOST}${r.path}`), ...removed.map((r) => `https://${HOST}${r.path}`)])];
console.log(`[indexnow] published ${pub.length} changed ${changed.length} retired-notify ${removed.length} → ${urls.length} URL`);
if (!args.has('--submit')) { console.log('[indexnow] 드라이런 — 제출하지 않음. 상위 10개:', urls.slice(0, 10)); process.exit(0); }
const key = process.env.INDEXNOW_KEY;
if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key)) { console.error('[indexnow] INDEXNOW_KEY 미설정/형식 오류'); process.exit(2); }
if (!urls.length) { console.log('[indexnow] 제출할 변경 없음'); process.exit(0); }
fs.mkdirSync(path.join(ROOT, 'var'), { recursive: true });
const log = (o) => fs.appendFileSync(path.join(ROOT, 'var/indexnow-log.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n');
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const body = { host: HOST, key, keyLocation: `https://${HOST}/indexnow/${key}.txt`, urlList: batch };
  let status = 0, text = '';
  try { const r = await fetch('https://api.indexnow.org/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) }); status = r.status; text = await r.text(); } catch (e) { text = String(e); }
  log({ endpoint: 'api.indexnow.org', count: batch.length, status, response: text.slice(0, 200) });
  console.log(`[indexnow] ${batch.length} URL → HTTP ${status} ${text.slice(0, 80)}`);
  if (status === 200 || status === 202) {
    for (const r of changed) state.submitted[r.path] = { hash: hashOf(r.path), at: new Date().toISOString() };
    for (const r of removed) state.submitted[r.path] = { ...state.submitted[r.path], retired: true, at: new Date().toISOString() };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
  } else process.exitCode = 1;
}

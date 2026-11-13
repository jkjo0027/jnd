#!/usr/bin/env node
// IndexNow 변경 알림 (Bing·Naver·Yandex 등 IndexNow 참여 엔진에 URL 변경을 '통지'한다 — 색인·노출을 보장하지 않는다).
// 사용: node scripts/indexnow.mjs            → 변경 URL 계산·드라이런(제출 안 함)
//       node scripts/indexnow.mjs --submit [--all] → 실제 제출. data/ops/indexnow.json의 공개 소유 확인 키 사용
// 변경 감지: data/registry/content-hashes.json(본문 해시) vs var/indexnow-state.json(마지막 제출 해시). 중복 제출 방지·로그 var/indexnow-log.jsonl
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = new Set(process.argv.slice(2));
const HOST = 'jndsystem.kr';
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/publication-ledger.json'), 'utf8')).records;
const hashes = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/registry/content-hashes.json'), 'utf8'));
const hashOf = (record) => {
  const value = hashes.pages?.[record.path] ?? hashes[record.pageId] ?? hashes[record.path];
  return typeof value === 'string' ? value : value?.hash || null;
};
const statePath = path.join(ROOT, 'var/indexnow-state.json');
const state = fs.existsSync(statePath) ? JSON.parse(fs.readFileSync(statePath, 'utf8')) : { submitted: {} };
const pub = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility && r.indexPolicy === 'index');
const missingHashes = pub.filter((r) => !hashOf(r));
if (missingHashes.length) {
  console.error('[indexnow] 공개 URL의 본문 해시가 없습니다. content:lastmod를 먼저 실행하세요:', missingHashes.map((r) => r.path));
  process.exit(2);
}
const changed = pub.filter((r) => args.has('--all') || !state.submitted[r.path] || state.submitted[r.path].hash !== hashOf(r));
// 통합(C)·보류(D) 페이지가 과거에 제출된 적이 있으면 그 URL 도 한 번 더 통지(리디렉션·404 반영)
const removed = ledger.filter((r) => r.contentStatus !== 'PUBLISHED' && state.submitted[r.path] && !state.submitted[r.path].retired);
const urls = [...new Set([...changed.map((r) => `https://${HOST}${r.path}`), ...removed.map((r) => `https://${HOST}${r.path}`)])];
console.log(`[indexnow] published ${pub.length} changed ${changed.length} retired-notify ${removed.length} → ${urls.length} URL`);
if (!args.has('--submit')) { console.log('[indexnow] 드라이런 — 제출하지 않음. 상위 10개:', urls.slice(0, 10)); process.exit(0); }
const publicConfig = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/ops/indexnow.json'), 'utf8'));
const key = process.env.INDEXNOW_KEY || publicConfig.key;
if (!key || !/^[A-Fa-f0-9-]{8,128}$/.test(key)) { console.error('[indexnow] INDEXNOW_KEY 미설정/형식 오류(16진수·하이픈, 8~128자)'); process.exit(2); }
if (!urls.length) { console.log('[indexnow] 제출할 변경 없음'); process.exit(0); }
// 네이버는 하위 폴더의 키로 다른 경로를 통지할 수 없으므로 루트에 있는 키만 사용한다.
const keyLocation = `https://${HOST}/${key}.txt`;
try {
  const proof = await fetch(keyLocation, { signal: AbortSignal.timeout(15000) });
  if (!proof.ok || (await proof.text()).trim() !== key) throw new Error(`root verification failed: HTTP ${proof.status}`);
} catch (error) { console.error('[indexnow] 운영 루트 키 파일을 먼저 배포해야 합니다:', String(error)); process.exit(2); }
fs.mkdirSync(path.join(ROOT, 'var'), { recursive: true });
const log = (o) => fs.appendFileSync(path.join(ROOT, 'var/indexnow-log.jsonl'), JSON.stringify({ at: new Date().toISOString(), ...o }) + '\n');
for (let i = 0; i < urls.length; i += 10000) {
  const batch = urls.slice(i, i + 10000);
  const body = { host: HOST, key, keyLocation, urlList: batch };
  let status = 0, text = '';
  try { const r = await fetch('https://searchadvisor.naver.com/indexnow', { method: 'POST', headers: { 'content-type': 'application/json; charset=utf-8' }, body: JSON.stringify(body), signal: AbortSignal.timeout(15000) }); status = r.status; text = await r.text(); } catch (e) { text = String(e); }
  log({ endpoint: 'searchadvisor.naver.com', count: batch.length, status, keyLocation, response: text.slice(0, 200) });
  console.log(`[indexnow] ${batch.length} URL → HTTP ${status} ${text.slice(0, 80)}`);
  if (status === 200 || status === 202) {
    for (const r of changed) state.submitted[r.path] = { hash: hashOf(r), at: new Date().toISOString() };
    for (const r of removed) state.submitted[r.path] = { ...state.submitted[r.path], retired: true, at: new Date().toISOString() };
    fs.writeFileSync(statePath, JSON.stringify(state, null, 1) + '\n');
  } else process.exitCode = 1;
}

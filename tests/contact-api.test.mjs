import { test } from 'node:test';
import assert from 'node:assert/strict';
const BASE = process.env.TEST_BASE || 'http://127.0.0.1:3000';
const up = await fetch(BASE + '/').then((r) => r.ok).catch(() => false);
test('문의 API: 검증·중복 방지·접수 ID', { skip: !up && '서버 미기동(TEST_BASE)' }, async () => {
  const bad = await fetch(BASE + '/api/contact/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: '', phone: 'x', agree: false }) });
  assert.equal(bad.status, 400);
  const key = 'test-' + Date.now();
  const ok = await fetch(BASE + '/api/contact/', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ name: '테스트', phone: '010-0000-0000', agree: true, msg: '자동 테스트', source: '/test' }) });
  if (ok.status === 429) { console.log('rate-limited; skip remaining'); return; }
  assert.equal(ok.status, 200); const j = await ok.json(); assert.match(j.id, /^JND-\d{8}-[0-9A-F]{6}$/);
  const dup = await fetch(BASE + '/api/contact/', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key }, body: JSON.stringify({ name: '테스트', phone: '010-0000-0000', agree: true }) });
  const d = await dup.json(); assert.equal(d.id, j.id); assert.equal(d.duplicate, true);
  const big = await fetch(BASE + '/api/contact/', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: 'x', phone: '010-0000-0000', agree: true, msg: 'a'.repeat(40000) }) }); assert.equal(big.status, 413);
});
test('관리자: 인증 없는 접근 차단 (페이지 리디렉션, API 401, noindex)', { skip: !up && '서버 미기동' }, async () => {
  const p = await fetch(BASE + '/admin/', { redirect: 'manual' }); assert.ok([302, 307, 308].includes(p.status)); assert.match(p.headers.get('location') || '', /\/admin\/login/);
  const a = await fetch(BASE + '/api/admin/inquiries/'); assert.equal(a.status, 401);
  const d = await fetch(BASE + '/api/admin/drafts/', { method: 'POST' }); assert.equal(d.status, 401);
  const pv = await fetch(BASE + '/admin/preview/areas/gyeonggi/r38/repair/', { redirect: 'manual' }); assert.ok([302, 307, 308].includes(pv.status));
  const l = await fetch(BASE + '/admin/login/'); assert.match(l.headers.get('x-robots-tag') || '', /noindex/);
});
test('미지 경로·초안 경로는 404', { skip: !up && '서버 미기동' }, async () => {
  for (const p of ['/areas/gyeonggi/r99/repair/', '/guides/g99/', '/cases/c4/', '/regions/', '/areas/seoul/r01/']) { const r = await fetch(BASE + p); assert.equal(r.status, 404, p); }
});

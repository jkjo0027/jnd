import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const code = ts.transpileModule(fs.readFileSync(new URL('../src/lib/server/notify.ts', import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const inquiry = { id: 'JND-QA-123', at: '2026-11-12T00:00:00Z', name: '검증', phone: '010-0000-0000', area: '검증 위치', sym: '확인', bld: '사무실', msg: '실제 고객 문의가 아닌 검증 자료', source: '/contact/', mode: 'live', ip: 'private-ip', ua: 'private-agent' };
function fixture(env, response = { ok: true, status: 200 }) {
  const calls = []; const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, URL, URLSearchParams, AbortSignal, process: { env }, require: name => name === '../site' ? { SITE_URL: 'https://jndsystem.kr' } : {}, fetch: async (...args) => { calls.push(args); if (response instanceof Error) throw response; return response; } });
  return { notify: loaded.exports.notify, calls };
}
test('live inquiries go to the site-owned static Netlify form with expected fields and no telemetry', async () => {
  const f = fixture({ CONTACT_NOTIFY_PROVIDER: 'netlify-forms' });
  assert.equal((await f.notify(inquiry)).status, 'sent');
  assert.equal(String(f.calls[0][0]), 'https://jndsystem.kr/__forms.html');
  const body = new URLSearchParams(f.calls[0][1].body);
  assert.equal(body.get('form-name'), 'jnd-inquiry'); assert.equal(body.get('inquiry_id'), inquiry.id);
  assert.equal(body.get('phone'), inquiry.phone); assert.equal(body.get('message'), inquiry.msg);
  assert.equal(body.has('ip'), false); assert.equal(body.has('ua'), false);
  const html = fs.readFileSync(new URL('../public/__forms.html', import.meta.url), 'utf8');
  for (const key of body.keys()) assert.ok(html.includes(`name="${key}"`), key);
});
test('test mode makes no request; missing configuration and provider failures do not report sent', async () => {
  const testMode = fixture({ CONTACT_NOTIFY_PROVIDER: 'netlify-forms' });
  assert.equal((await testMode.notify({ ...inquiry, mode: 'test' })).status, 'skipped'); assert.equal(testMode.calls.length, 0);
  assert.equal((await fixture({}).notify(inquiry)).status, 'failed');
  assert.equal((await fixture({ CONTACT_NOTIFY_PROVIDER: 'netlify-forms' }, { ok: false, status: 503 }).notify(inquiry)).status, 'failed');
  assert.equal((await fixture({ CONTACT_NOTIFY_WEBHOOK: 'https://example.test/notify' }, new Error('offline')).notify(inquiry)).status, 'failed');
});

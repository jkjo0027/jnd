import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const nativeRequire = createRequire(import.meta.url);
function fixture() {
  const blobs = new Map(); let generation = 0, offline = false;
  const store = {
    async getWithMetadata(key) { if (offline) throw new Error('storage offline'); const x = blobs.get(key); return x ? { data: JSON.parse(x.data.toString()), etag: x.etag, metadata: {} } : null; },
    async setJSON(key, data, options) {
      if (offline) throw new Error('storage offline');
      const old = blobs.get(key);
      if (options?.onlyIfNew && old || options?.onlyIfMatch && old?.etag !== options.onlyIfMatch) return { modified: false };
      const etag = String(++generation); blobs.set(key, { data: Buffer.from(JSON.stringify(data)), etag }); return { modified: true, etag };
    },
    async set(key, data) { if (offline) throw new Error('storage offline'); const etag = String(++generation); blobs.set(key, { data: Buffer.from(data), etag }); return { modified: true, etag }; },
    async get(key) { if (offline) throw new Error('storage offline'); const x = blobs.get(key); return x ? new Uint8Array(x.data).buffer : null; },
    async delete(key) { blobs.delete(key); },
  };
  function runtime() {
    const cache = new Map();
    function load(filename) {
      if (cache.has(filename)) return cache.get(filename).exports;
      if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
      const loadedModule = { exports: {} }; cache.set(filename, loadedModule);
      const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
      function request(name) {
        if (name === 'server-only') return {};
        if (name === '@netlify/blobs') return { getStore(options) { assert.equal(options.name, 'jnd-cms-v1'); assert.equal(options.consistency, 'strong'); return store; } };
        if (name.startsWith('.') || name.startsWith('@/')) {
          let f = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
          if (!path.extname(f)) f += fs.existsSync(f + '.ts') ? '.ts' : '.tsx';
          return load(f);
        }
        return nativeRequire(name);
      }
      vm.runInNewContext(code, { module: loadedModule, exports: loadedModule.exports, require: request, Buffer, URL, console, structuredClone, setTimeout, process: { env: { AWS_LAMBDA_FUNCTION_NAME: 'jnd-test' }, cwd: () => root } }, { filename });
      return loadedModule.exports;
    }
    return { content: load(path.join(root, 'src/lib/server/content.ts')), uploads: load(path.join(root, 'src/lib/server/uploads.ts')), audit: load(path.join(root, 'src/lib/server/store.ts')) };
  }
  return { runtime, blobs, offline(value) { offline = value; } };
}

test('cloud data survives a fresh runtime and simultaneous creates do not overwrite each other', async () => {
  const f = fixture(); const a = f.runtime().content, b = f.runtime().content;
  const pages = await Promise.all([a.createPage('guide', 'owner', { title: '첫 번째 안내 초안' }), b.createPage('guide', 'owner', { title: '두 번째 안내 초안' })]);
  assert.equal((await f.runtime().content.listPages()).length, 2);
  assert.notEqual(pages[0].id, pages[1].id);
  assert.equal((await f.runtime().content.getPage(pages[0].id)).title, pages[0].title);
});

test('competing saves keep one version and reject stale edits', async () => {
  const f = fixture(), c = f.runtime().content;
  const p = await c.createPage('guide', 'owner');
  const result = await Promise.all([c.savePage(p.id, 'owner', { title: '수정본 하나입니다' }, p.version), f.runtime().content.savePage(p.id, 'owner', { title: '수정본 둘입니다' }, p.version)]);
  assert.equal(result.filter(x => x.page).length, 1);
  assert.equal(result.filter(x => x.status === 409).length, 1);
  assert.equal((await c.getPage(p.id)).version, 2);
});

test('autosave stays private, publish is atomic, snapshots survive and stale checks cannot undo unpublish', async () => {
  const f = fixture(), c = f.runtime().content;
  let p = await c.createPage('guide', 'owner', { title: '처음 공개한 안내 제목' });
  assert.equal((await c.livePages()).length, 0);
  p = await c.setStatus(p.id, 'owner', 'publishing', { lastPublishedVersion: 2 }, 'publish', p.version);
  assert.equal((await f.runtime().content.liveByPath(p.path)).title, p.title);
  const saved = await c.savePage(p.id, 'owner', { title: '아직 승인하지 않은 수정본' }, p.version);
  assert.equal((await c.liveByPath(p.path)).title, '처음 공개한 안내 제목');
  assert.equal((await c.getPage(p.id)).title, '아직 승인하지 않은 수정본');
  await assert.rejects(c.setStatus(p.id, 'system', 'published', {}, 'published', p.version), { status: 409 });
  let next = await c.setStatus(p.id, 'owner', 'publishing', {}, 'publish', saved.page.version);
  assert.equal((await c.liveByPath(p.path)).title, '아직 승인하지 않은 수정본');
  assert.ok((await f.runtime().content.listSnapshots(p.id)).length >= 2);
  next = await c.setStatus(p.id, 'owner', 'unpublished', {}, 'unpublish', next.version);
  assert.equal(await c.liveByPath(p.path), null);
  await assert.rejects(c.setStatus(p.id, 'system', 'published', {}, 'published', next.version - 1), { status: 409 });
  assert.equal(await c.liveByPath(p.path), null);
  const restored = await c.restoreSnapshot(p.id, 2, 'owner');
  assert.equal(restored.title, '처음 공개한 안내 제목');
  assert.equal((await c.livePages()).length, 0);
});

test('audit and registry drafts persist; an unavailable store never looks empty or reports success', async () => {
  const f = fixture(), r = f.runtime();
  await r.audit.audit({ who: 'owner', action: 'content.create' });
  await r.audit.appendDraft({ kind: 'region', note: '확인용 초안' });
  assert.equal((await f.runtime().audit.readAudit())[0].action, 'content.create');
  assert.equal((await f.runtime().audit.readDrafts())[0].note, '확인용 초안');
  f.offline(true);
  await assert.rejects(r.content.listPages(), /storage offline/);
  await assert.rejects(r.content.createPage('guide', 'owner'), /storage offline/);
});

test('inquiries survive runtime replacement, deduplicate competing submissions and retry failed delivery once', async () => {
  const f = fixture(), a = f.runtime().audit, b = f.runtime().audit;
  const inquiry = { id: 'JND-20261112-AAAAAA', at: new Date().toISOString(), name: '검증용', phone: '010-0000-0000', area: '', sym: '', bld: '', msg: '', agree: true, source: '/contact/', ip: '', ua: '', mode: 'live', notify: { status: 'skipped', attempts: 0 }, status: 'new', idem: 'shared-inquiry-key' };
  const saved = await Promise.all([a.append(inquiry), b.append({ ...inquiry, id: 'JND-20261112-BBBBBB' })]);
  assert.equal(saved.filter(x => x.created).length, 1);
  assert.equal(saved[0].inquiry.id, saved[1].inquiry.id);
  assert.equal((await f.runtime().audit.readAll()).length, 1);
  const id = saved[0].inquiry.id;
  const leases = await Promise.all([a.claimNotification(id), b.claimNotification(id)]);
  assert.equal(leases.filter(x => x.claimed).length, 1);
  await a.update(id, { notify: { status: 'failed', attempts: 1, lastAt: new Date().toISOString() } });
  const retry = await f.runtime().audit.claimNotification(id);
  assert.equal(retry.claimed, true); assert.equal(retry.inquiry.notify.attempts, 2);
  await b.update(id, { notify: { status: 'sent', attempts: 2, lastAt: new Date().toISOString() } });
  assert.equal((await f.runtime().audit.findByIdem(inquiry.idem)).notify.status, 'sent');
  assert.equal((await a.claimNotification(id)).claimed, false);
  f.offline(true);
  await assert.rejects(a.readAll(), /storage offline/);
  await assert.rejects(a.append({ ...inquiry, idem: 'another-key' }), /storage offline/);
});

test('originals, resized WebP and names survive runtime replacement; invalid images are rejected', async () => {
  const f = fixture(), u = f.runtime().uploads, sharp = nativeRequire('sharp');
  const png = await sharp({ create: { width: 640, height: 360, channels: 3, background: '#164aab' } }).png().toBuffer();
  const result = await u.processUpload({ name: '영구 저장 확인 (사진).png', bytes: png }, 'owner');
  assert.ok(result.upload);
  assert.equal(result.upload.name, '영구 저장 확인 (사진).png');
  const reload = f.runtime().uploads;
  assert.equal((await reload.readUploads())[0].id, result.upload.id);
  for (const width of result.upload.sizes) {
    const data = await reload.webFile(`${result.upload.id}-${width}.webp`);
    assert.equal((await sharp(data).metadata()).format, 'webp');
  }
  assert.ok(f.blobs.has(`uploads/orig/${result.upload.id}.png`));
  assert.equal(await reload.webFile('../../private'), null);
  assert.ok((await u.processUpload({ name: 'fake.png', bytes: Buffer.from('this is not an image') }, 'owner')).error);
});

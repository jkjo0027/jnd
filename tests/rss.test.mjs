import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = name => JSON.parse(fs.readFileSync(path.join(root, name), 'utf8'));
function fixture() {
  let published = [];
  const cache = new Map();
  function load(filename) {
    if (cache.has(filename)) return cache.get(filename).exports;
    if (filename.endsWith('.json')) return JSON.parse(fs.readFileSync(filename, 'utf8'));
    const loaded = { exports: {} }; cache.set(filename, loaded);
    const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
    const require = name => {
      if (name === '@/lib/server/content') return { livePages: async () => published };
      let target = name.startsWith('@/') ? path.join(root, 'src', name.slice(2)) : path.resolve(path.dirname(filename), name);
      if (!path.extname(target)) target += '.ts';
      return load(target);
    };
    vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require, Buffer, Response, process: { env: {} } }, { filename });
    return loaded.exports;
  }
  return { rss: load(path.join(root, 'src/lib/rss.ts')), route: load(path.join(root, 'src/app/rss.xml/route.ts')), publish: pages => { published = pages; } };
}
const page = (extra = {}) => ({ type: 'guide', path: '/guides/gd-rss-fixture/', status: 'published', title: '공개 RSS 검증 글', summary: '공개된 요약 전체', body: '## 별도 본문\n\n첫 문단입니다.\n\n- 목록 항목입니다.', fields: { answer: '답변 전체', safe: '안전 항목 전체', stop: '중지 기준 전체', pro: '전문가 진단 전체' }, photos: [{ id: 'abcdef123456', sizes: [480, 960], alt: '실제 사진 설명', caption: '사진 설명 전체' }], publishedAt: '2026-11-06', createdAt: '2026-11-05', updatedAt: '2026-11-13', createdBy: 'PRIVATE_AUTHOR', ...extra });
const escaped = text => text.replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[ch]);

test('RSS includes every reviewed handbook article with its complete unique body and original publication date', () => {
  const { rss } = fixture(), items = rss.handbookFeedItems();
  const { articles, categories } = read('src/content/handbook.json'), editorial = read('src/content/handbook-editorial.json');
  assert.equal(items.length, 140);
  assert.equal(new Set(items.map(x => x.path)).size, 140);
  for (const article of articles) {
    const item = items.find(x => x.path === `/handbook/${article.slug}/`), detail = editorial[article.slug];
    const category = categories.find(x => x.id === article.category);
    for (const text of [article.answer, ...article.checks, article.decision, ...article.handoff, article.example, detail.explanation, detail.question, category.introduction, ...detail.comparisons.flatMap(x => [x.situation, x.nextStep])]) assert.ok(item.html.includes(escaped(text)), article.slug);
    assert.equal(item.published, article.publishedAt);
  }
  const output = rss.renderRss();
  assert.equal((output.match(/<item>/g) || []).length, 140);
  assert.ok(Buffer.byteLength(output) < 9_000_000);
  assert.ok(!output.includes('/admin/') && !output.includes('/preview/'));
});

test('RSS route reads approved public snapshots on each request and removes unpublished content without a deploy', async () => {
  const f = fixture(); f.publish([page(), page({ path: '/guides/gd-private/', status: 'draft', title: 'PRIVATE_DRAFT' }), page({ path: '/admin/content/private/', title: 'PRIVATE_PATH' })]);
  const response = await f.route.GET(), output = await response.text();
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-type'), /application\/rss\+xml; charset=utf-8/);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal((output.match(/<item>/g) || []).length, 141);
  for (const text of ['공개 RSS 검증 글', '답변 전체', '안전 항목 전체', '중지 기준 전체', '전문가 진단 전체', '첫 문단입니다.', '목록 항목입니다.', '사진 설명 전체']) assert.ok(output.includes(text), text);
  assert.match(output, /https:\/\/jndsystem.kr\/uploads\/abcdef123456-960.webp/);
  for (const secret of ['PRIVATE_AUTHOR', 'PRIVATE_DRAFT', 'PRIVATE_PATH']) assert.ok(!output.includes(secret));
  f.publish([]);
  const removed = await (await f.route.GET()).text();
  assert.equal((removed.match(/<item>/g) || []).length, 140);
  assert.ok(!removed.includes('/guides/gd-rss-fixture/'));
});

test('RSS escapes markup and invalid XML controls instead of executing editor text', () => {
  const { rss } = fixture();
  const output = rss.renderRss([page({ title: '검증 & <script> ]]> \u0001', body: '<script>alert("fixture")</script>\n\n일반 본문' })]);
  assert.ok(output.includes('검증 &amp; &lt;script&gt; ]]&gt;'));
  assert.ok(!output.includes('\u0001') && !output.includes('<script>'));
  assert.ok(output.includes('&lt;script&gt;alert(&quot;fixture&quot;)&lt;/script&gt;'));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const { categories, articles } = read('../src/content/handbook.json');
const ledger = read('../data/registry/publication-ledger.json').records;
const facts = read('../data/registry/fact-ledger.json');
const editorial = read('../src/content/handbook-editorial.json');

test('공개 안내에 빠진 상황별 설명이 없고 개정일이 최초 발행일을 덮지 않는다', () => {
  assert.deepEqual(Object.keys(editorial).sort(), articles.map(a => a.slug).sort());
  for (const key of ['explanation', 'question']) assert.equal(new Set(Object.values(editorial).map(e => e[key])).size, articles.length);
  for (const a of articles) {
    const e = editorial[a.slug];
    assert.equal(e.comparisons.length, 2, a.slug);
    assert.notEqual(e.comparisons[0].situation, e.comparisons[1].situation, a.slug);
    for (const row of e.comparisons) assert.ok(row.situation.trim() && row.nextStep.trim(), a.slug);
    assert.match(a.publishedAt, /^\d{4}-\d{2}-\d{2}$/);
    assert.ok(a.publishedAt < a.updatedAt, `${a.slug}: original publication date`);
  }
});

test('실무 안내는 고유 질문·본문·경로와 확인된 서비스에 연결된다', () => {
  assert.equal(articles.length, 140);
  for (const key of ['slug', 'title', 'answer', 'decision', 'example']) assert.equal(new Set(articles.map(a => a[key])).size, articles.length, key);
  for (const a of articles) {
    assert.match(a.slug, /^[a-z0-9-]+$/);
    const c = categories.find(c => c.id === a.category); assert.ok(c, a.slug);
    assert.equal(facts.services[c.service].verified, true, a.slug);
    assert.equal(a.checks.length, 3, a.slug);
    assert.ok(a.handoff.length >= 2, a.slug);
    for (const key of ['answer', 'decision', 'example']) assert.ok(a[key].length >= 50, `${a.slug}: incomplete ${key}`);
    const r = ledger.find(r => r.path === `/handbook/${a.slug}/`);
    assert.equal(r?.contentStatus, 'PUBLISHED', a.slug);
    assert.equal(r?.indexEligibility, true, a.slug);
    assert.equal(r?.parent, '/handbook/', a.slug);
  }
});

test('300개 이상 공개 경로를 제공하며 기존 보류 서비스·중복 페이지는 유지한다', () => {
  const published = ledger.filter(r => r.contentStatus === 'PUBLISHED' && r.indexEligibility && r.indexPolicy === 'index');
  assert.ok(published.length >= 300);
  assert.equal(published.filter(r => r.pageId.startsWith('HB-')).length, 141);
  assert.equal(published.filter(r => !r.pageId.startsWith('HB-')).length, 167);
  for (let n = 4; n <= 8; n++) assert.ok(published.some(r => r.pageId === `CASE-c${n}`));
  assert.equal(new Set(published.map(r => r.path)).size, published.length);
  assert.equal(ledger.filter(r => r.contentStatus === 'HOLD' && r.qualityClass === 'C').length, 110);
  assert.equal(facts.services['glass-door'].verified, false);
});

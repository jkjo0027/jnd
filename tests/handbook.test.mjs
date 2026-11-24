import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = p => JSON.parse(fs.readFileSync(new URL(p, import.meta.url), 'utf8'));
const { categories, articles } = read('../src/content/handbook.json');
const ledger = read('../data/registry/publication-ledger.json').records;
const facts = read('../data/registry/fact-ledger.json');
const editorial = read('../src/content/handbook-editorial.json');
const groups = read('../src/content/handbook-groups.json');
const groupOf = slug => groups.find(g => g.topics.includes(slug));
const consultations = read('../src/content/region-consultation.json');

test('공개 지역의 상담 상황마다 실제 공개 안내와 인계 항목이 연결된다', () => {
  const publicPaths = new Set(ledger.filter(r => r.contentStatus === 'PUBLISHED' && r.indexEligibility).map(r => r.path));
  for (const r of ledger.filter(r => publicPaths.has(r.path))) {
    const match = r.path.match(/^\/areas\/(?:seoul|gyeonggi)\/(r\d+)\/(repair|install)\/$/);
    if (!match) continue;
    const context = consultations[match[1]]?.[match[2]];
    assert.ok(context?.note.trim(), r.path);
    assert.equal(new Set(context.guides).size, 2, r.path);
    for (const slug of context.guides) {
      const article = articles.find(a => a.slug === slug);
      assert.ok(article?.handoff.length, `${r.path}: missing handoff ${slug}`);
      assert.ok(publicPaths.has(`/handbook/${groupOf(slug)?.slug}/`), `${r.path}: unpublished ${slug}`);
      if (article.fieldCase) assert.ok(publicPaths.has(`/cases/${article.fieldCase.id}/`));
    }
  }
});

test('운반 소리·바닥 마찰·감지 환경은 건물 태그 대신 실제 상담 주제로 연결된다', () => {
  assert.deepEqual(consultations.r52.repair.guides, ['sound-record', 'delivery-cart']);
  assert.deepEqual(consultations.r34.repair.guides, ['after-collision', 'sound-record']);
  assert.deepEqual(consultations.r40.repair.guides, ['bottom-scrape', 'after-collision']);
  assert.deepEqual(consultations.r55.repair.guides, ['air-curtain', 'decorations']);
  assert.deepEqual(consultations.r08.repair.guides, ['sensor-identification', 'sensor-after-service']);
});

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
  for (const key of ['slug', 'title', 'answer', 'decision', 'example']) assert.equal(new Set(articles.map(a => a[key])).size, articles.length, key);
  for (const a of articles) {
    assert.match(a.slug, /^[a-z0-9-]+$/);
    const c = categories.find(c => c.id === a.category); assert.ok(c, a.slug);
    assert.equal(facts.services[c.service].verified, true, a.slug);
    assert.equal(a.checks.length, 3, a.slug);
    assert.ok(a.handoff.length >= 2, a.slug);
    for (const key of ['answer', 'decision', 'example']) assert.ok(a[key].trim(), `${a.slug}: missing ${key}`);
    const r = ledger.find(r => r.path === `/handbook/${groupOf(a.slug)?.slug}/`);
    assert.equal(r?.contentStatus, 'PUBLISHED', a.slug);
    assert.equal(r?.indexEligibility, true, a.slug);
    assert.equal(r?.parent, '/handbook/', a.slug);
  }
});

test('작업 단위 통합은 모든 원문을 한 번씩 보존하고 대표 경로로만 색인 대상을 구성한다', () => {
  const topics = groups.flatMap(g => g.topics);
  assert.deepEqual([...topics].sort(), articles.map(a => a.slug).sort());
  assert.equal(new Set(topics).size, topics.length);
  for (const g of groups) {
    assert.equal(g.topics[0], g.slug);
    assert.ok(g.title.trim() && g.summary.trim());
    assert.equal(new Set(g.topics.map(s => articles.find(a => a.slug === s).category)).size, 1);
    const target = ledger.find(r => r.path === `/handbook/${g.slug}/`);
    assert.equal(target.contentStatus, 'PUBLISHED');
    for (const slug of g.topics.slice(1)) {
      const old = ledger.find(r => r.path === `/handbook/${slug}/`);
      assert.equal(old.mergeTarget, target.path);
      assert.equal(old.indexEligibility, false);
    }
  }
  for (const a of articles.filter(a => a.fieldCase)) {
    assert.ok(ledger.some(r => r.path === `/cases/${a.fieldCase.id}/` && r.contentStatus === 'PUBLISHED'));
  }
});

test('지역 설치 안내는 같은 지역의 공개 대표 안내로 통합되며 미확인 서비스는 발행하지 않는다', () => {
  const published = ledger.filter(r => r.contentStatus === 'PUBLISHED' && r.indexEligibility);
  assert.equal(new Set(published.map(r => r.path)).size, published.length);
  for (const r of ledger.filter(r => r.type === 'region-service' && r.path.endsWith('/install/'))) {
    assert.equal(r.mergeTarget, r.path.replace('/install/', '/repair/'));
    assert.ok(published.some(p => p.path === r.mergeTarget));
  }
  assert.equal(facts.services['glass-door'].verified, false);
  assert.ok(!published.some(r => r.path.includes('/glass-door/')));
});

import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

function dryRun(t, hashes, submitted) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'jnd-indexnow-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const dir of ['scripts', 'data/registry', 'var']) fs.mkdirSync(path.join(root, dir), { recursive: true });
  fs.copyFileSync(new URL('../scripts/indexnow.mjs', import.meta.url), path.join(root, 'scripts/indexnow.mjs'));
  const record = { pageId: 'G01', path: '/guides/g01/', contentStatus: 'PUBLISHED', indexEligibility: true, indexPolicy: 'index' };
  fs.writeFileSync(path.join(root, 'data/registry/publication-ledger.json'), JSON.stringify({ records: [record] }));
  fs.writeFileSync(path.join(root, 'data/registry/content-hashes.json'), JSON.stringify(hashes));
  fs.writeFileSync(path.join(root, 'var/indexnow-state.json'), JSON.stringify({ submitted }));
  return spawnSync(process.execPath, [path.join(root, 'scripts/indexnow.mjs')], { encoding: 'utf8' });
}

test('IndexNow resolves page-ID hashes and detects changes without resubmitting unchanged content', t => {
  const same = dryRun(t, { G01: 'current-hash' }, { '/guides/g01/': { hash: 'current-hash' } });
  assert.equal(same.status, 0, same.stderr);
  assert.match(same.stdout, /changed 0/);
  const changed = dryRun(t, { G01: 'updated-hash' }, { '/guides/g01/': { hash: 'current-hash' } });
  assert.equal(changed.status, 0, changed.stderr);
  assert.match(changed.stdout, /changed 1/);
});

test('Legacy null acknowledgement cannot suppress a real content notification', t => {
  const result = dryRun(t, { G01: 'actual-hash' }, { '/guides/g01/': { hash: null } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /changed 1/);
});

test('Missing content hashes stop before any submission or null acknowledgement', t => {
  const result = dryRun(t, {}, { '/guides/g01/': { hash: null } });
  assert.equal(result.status, 2);
  assert.match(result.stderr, /content:lastmod/);
  assert.doesNotMatch(result.stdout, /changed 0/);
});

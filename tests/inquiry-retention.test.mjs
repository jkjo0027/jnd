import { test } from 'node:test';
import assert from 'node:assert/strict';
import { recentInquiries } from '../src/lib/inquiry-retention.mjs';

test('retention removes only expired backups, preserving boundary, fresh and undated records', () => {
  const now = Date.parse('2026-11-12T00:00:00Z');
  const rows = [{ id: 'expired', at: '2026-10-12T23:59:59Z' }, { id: 'boundary', at: '2026-10-13T00:00:00Z' }, { id: 'fresh', at: '2026-11-12T00:00:00Z' }, { id: 'review', at: 'unknown' }];
  assert.deepEqual(recentInquiries(rows, 30, now).map(r => r.id), ['boundary', 'fresh', 'review']);
  assert.equal(rows.length, 4);
  assert.throws(() => recentInquiries(rows, 0, now), /retention/);
});

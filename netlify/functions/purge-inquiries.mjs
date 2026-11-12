import { getStore } from '@netlify/blobs';
import ops from '../../data/ops/config.json' with { type: 'json' };
import { recentInquiries } from '../../src/lib/inquiry-retention.mjs';

/** Scheduled-only endpoint; no inquiry contents are logged or returned. */
export default async function purgeInquiries() {
  const store = getStore({ name: 'jnd-cms-v1', consistency: 'strong' });
  for (let attempt = 0; attempt < 6; attempt++) {
    const current = await store.getWithMetadata('inquiries-v1.json', { type: 'json' });
    if (!current) return;
    const retained = recentInquiries(current.data, ops.privacyRetentionDays);
    if (retained.length === current.data.length) return;
    const written = await store.setJSON('inquiries-v1.json', retained, { onlyIfMatch: current.etag });
    if (written.modified) { console.log('Expired inquiry backups removed:', current.data.length - retained.length); return; }
  }
  throw new Error('Inquiry retention update conflicted; no records overwritten');
}
export const config = { schedule: '@daily' };

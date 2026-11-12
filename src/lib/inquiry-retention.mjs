/** Keep undated records for review; never infer a deletion date from malformed data. */
export function recentInquiries(rows, days, now = Date.now()) {
  if (!Number.isInteger(days) || days < 1) throw new Error('Invalid retention period');
  const cutoff = now - days * 24 * 60 * 60 * 1000;
  return rows.filter(row => !Number.isFinite(Date.parse(row.at)) || Date.parse(row.at) >= cutoff);
}

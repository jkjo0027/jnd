import 'server-only';
/** 메모리 토큰 버킷(프로세스 단위). 다중 인스턴스에서는 공유 저장소(예: Redis) 로 교체 — docs/release-and-rollback.md */
const buckets = new Map<string, { tokens: number; at: number }>();
export function allow(key: string, limit = 5, perMs = 10 * 60 * 1000) {
  const now = Date.now();
  const b = buckets.get(key) || { tokens: limit, at: now };
  const refill = ((now - b.at) / perMs) * limit;
  b.tokens = Math.min(limit, b.tokens + refill); b.at = now;
  if (b.tokens < 1) { buckets.set(key, b); return false; }
  b.tokens -= 1; buckets.set(key, b);
  if (buckets.size > 5000) buckets.clear();
  return true;
}

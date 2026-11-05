import type { LedgerRecord } from './registry';
import lastmodJson from '../../data/registry/content-lastmod.json';
/** 본문 변경일. scripts/content-lastmod.mjs 가 콘텐츠 파일 해시 변화를 기록한다. 없으면 대장 updatedAt */
export const contentLastmod = (r: LedgerRecord): Date => {
  const m = (lastmodJson as Record<string, string>)[r.pageId];
  return new Date(m || r.publishedAt || r.updatedAt);
};

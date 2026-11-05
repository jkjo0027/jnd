import { isPublicPath, recordByPath } from '@/lib/registry';
import { CITIES, SEOUL_GU_RID, type City } from '@/content/site-data';
import { allRegionPages } from '@/content/gen/compose';

export const PROVINCE_SLUG: Record<string, 'seoul' | 'gyeonggi' | null> = { 경기: 'gyeonggi', 서울: 'seoul', 인천: null, 충청: null };
export const regionPath = (province: 'seoul' | 'gyeonggi', rid: string, service = 'repair') => `/areas/${province}/${rid}/${service}/`;

/** 지역 대표 링크: 공개된 지역 페이지 → 없으면 광역 허브의 앵커 → 없으면 /areas/ */
export function regionLink(province: 'seoul' | 'gyeonggi' | null, rid: string | null): { href: string; published: boolean } {
  if (province && rid) {
    for (const svc of ['repair', 'install']) {
      const p = regionPath(province, rid, svc);
      if (isPublicPath(p)) return { href: p, published: true };
    }
    return { href: `/areas/${province}/#${rid}`, published: false };
  }
  return { href: '/areas/', published: false };
}
export const cityLink = (c: City) => regionLink(PROVINCE_SLUG[c.p], c.regionId);
export const guLink = (c: City, g: string) => (c.p === '서울' && SEOUL_GU_RID[g] ? regionLink('seoul', SEOUL_GU_RID[g]) : cityLink(c));
export const cityByName = (n: string) => CITIES.find((c) => c.c === n);
/** 공개된 지역 페이지 목록(허브·사이트맵용) */
export const publicRegionPages = () => allRegionPages().filter((r) => isPublicPath(r.path));
export const draftRegionPages = () => allRegionPages().filter((r) => !isPublicPath(r.path) && recordByPath(r.path));

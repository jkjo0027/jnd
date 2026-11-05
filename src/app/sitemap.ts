import type { MetadataRoute } from 'next';
import { publicRecords } from '@/lib/registry';
import { abs } from '@/lib/site';
import { contentLastmod } from '@/lib/lastmod';
import { livePages } from '@/lib/server/content';

/** 등록한 사이트맵 주소는 고정. 운영자 발행·비공개가 바로 반영되도록 요청마다 생성한다(300여 URL 규모라 비용 없음) */
export const dynamic = 'force-dynamic';

/** 사이트맵: 공개 대장(approved/published, index) 의 대표 URL 만. lastmod 는 본문 변경일(content lastmod 맵) */
export default function sitemap(): MetadataRoute.Sitemap {
  const reg = publicRecords().map((r) => ({ url: abs(r.path), lastModified: contentLastmod(r), changeFrequency: (r.type === 'core' ? 'weekly' : 'monthly') as 'weekly' | 'monthly', priority: r.path === '/' ? 1 : r.type === 'core' ? 0.8 : 0.6 }));
  const seen = new Set(reg.map((x) => x.url));
  const authored = livePages().filter((p) => p.path && !seen.has(abs(p.path))).map((p) => ({ url: abs(p.path), lastModified: new Date(p.updatedAt), changeFrequency: 'monthly' as const, priority: 0.6 }));
  return [...reg, ...authored];
}

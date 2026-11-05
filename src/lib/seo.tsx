import { BRAND, INFO, MAIN_PHONE, SITE_URL, abs } from '@/lib/site';
import type { Metadata } from 'next';

export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean }): Metadata {
  const url = abs(o.path);
  return {
    title: { absolute: o.title }, description: o.description,
    alternates: { canonical: url },
    robots: o.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title: o.title, description: o.description, url, siteName: BRAND, locale: 'ko_KR', type: 'website', images: [{ url: abs(o.image || '/og.png'), width: 1200, height: 630, alt: `${BRAND} 자동문 설치·수리` }] },
    twitter: { card: 'summary_large_image', title: o.title, description: o.description },
  };
}

/** 검증된 항목만 담은 LocalBusiness. 팩스·이메일은 운영자 회신과 상충(owner-approvals #6·#7)이라 확인 전까지 구조화 데이터에서 제외 */
export const orgJsonLd = () => ({
  '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': SITE_URL + '/#org', name: BRAND, alternateName: 'J&D SYSTEM', url: SITE_URL + '/',
  telephone: '+82-' + MAIN_PHONE, image: abs('/og.png'), logo: abs('/icon.svg'), vatID: INFO.biz, taxID: INFO.biz,
  address: { '@type': 'PostalAddress', streetAddress: '진위면 진위2산단로 140, 4층 421호', addressLocality: '평택시', addressRegion: '경기도', addressCountry: 'KR' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' }],
  areaServed: ['경기도', '서울특별시'], foundingDate: '2018-01-16', knowsAbout: ['자동문 설치', '자동문 수리', '자동문 센서', '자동문 컨트롤러', '자동문 스위치'],
});
/** 홈에만 넣는 WebSite (사이트 내 검색 기능이 없으므로 SearchAction 은 넣지 않는다) */
export const websiteJsonLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: BRAND, alternateName: 'J&D SYSTEM', inLanguage: 'ko-KR', publisher: { '@id': SITE_URL + '/#org' } });
export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

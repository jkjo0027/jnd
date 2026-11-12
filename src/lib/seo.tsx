import { BRAND, INFO, MAIN_PHONE, SITE_URL, abs } from '@/lib/site';
import type { Metadata } from 'next';
import { EXTERNAL_LINKS } from '@/content/external-links';
import { SVCS } from '@/content/site-data';
import { searchDescription } from './search-description';

const searchSummaries: Record<string, string> = {
  '/services/motor/': '자동문 모터·컨트롤러 이상으로 생기는 반복 개폐와 소음의 진단, 설정 초기화·교체 범위를 안내합니다.',
  '/guides/g20/': '상가 자동문 설치 전 출입구 폭, 전원, 간판·조명 간섭, 인테리어 공정과 스위치 선택을 확인하세요.',
  '/guides/g22/': '약국 자동문 설치 시 편개형 선택, 감지 범위, 대기시간, 간판 조명과 야간 잠금의 확인 기준을 안내합니다.',
  '/guides/': '자동문 안 열림·반복 개폐·센서 오작동·소음의 원인과 안전하게 확인할 항목, 전문가 점검이 필요한 신호를 안내합니다.',
  '/faq/': '자동문 고장 원인, 수리 비용 기준, 출장 지역과 상담 시간, 타사 제품 수리와 설치 후 A/S에 답합니다.',
};

export function pageMeta(o: { title: string; description: string; path: string; image?: string; noindex?: boolean }): Metadata {
  const url = abs(o.path);
  const description = searchDescription(searchSummaries[o.path] || o.description);
  return {
    title: { absolute: o.title }, description,
    alternates: { canonical: url },
    robots: o.noindex ? { index: false, follow: false } : { index: true, follow: true },
    openGraph: { title: o.title, description, url, siteName: BRAND, locale: 'ko_KR', type: 'website', images: [{ url: abs(o.image || '/og.png'), width: 1200, height: 630, alt: `${BRAND} 자동문 설치·수리` }] },
    twitter: { card: 'summary_large_image', title: o.title, description },
  };
}

/** 검증된 항목만 담은 LocalBusiness. 팩스·이메일은 운영자 회신과 상충(owner-approvals #6·#7)이라 확인 전까지 구조화 데이터에서 제외 */
export const orgJsonLd = () => ({
  '@context': 'https://schema.org', '@type': 'LocalBusiness', '@id': SITE_URL + '/#org', name: BRAND, alternateName: 'J&D SYSTEM', url: SITE_URL + '/',
  telephone: '+82-' + MAIN_PHONE, image: abs('/og.png'), logo: abs('/icon.svg'), vatID: INFO.biz, taxID: INFO.biz,
  address: { '@type': 'PostalAddress', streetAddress: '진위면 진위2산단로 140, 4층 421호', addressLocality: '평택시', addressRegion: '경기도', addressCountry: 'KR' },
  openingHoursSpecification: [{ '@type': 'OpeningHoursSpecification', dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], opens: '08:00', closes: '18:00' }],
  sameAs: EXTERNAL_LINKS.filter(link => link.id === 'PL01').map(link => link.href),
  contactPoint: { '@type': 'ContactPoint', telephone: '+82-' + MAIN_PHONE, contactType: 'customer service', availableLanguage: ['ko'], url: abs('/contact/') },
  hasOfferCatalog: { '@type': 'OfferCatalog', name: '자동문 설치·수리 서비스', itemListElement: SVCS.map(s => ({ '@type': 'Offer', itemOffered: { '@type': 'Service', name: s.f || s.t, url: abs(s.route), provider: { '@id': abs('/#org') } } })) },
  areaServed: ['경기도', '서울특별시', '천안시', '아산시', '청주시', '세종특별자치시', '대전광역시'], foundingDate: '2018-01-16', knowsAbout: ['자동문 설치', '자동문 수리', '자동문 센서', '자동문 컨트롤러', '자동문 스위치'],
});
/** 홈에만 넣는 WebSite (사이트 내 검색 기능이 없으므로 SearchAction 은 넣지 않는다) */
export const websiteJsonLd = () => ({ '@context': 'https://schema.org', '@type': 'WebSite', '@id': SITE_URL + '/#website', url: SITE_URL + '/', name: BRAND, alternateName: 'J&D SYSTEM', inLanguage: 'ko-KR', publisher: { '@id': SITE_URL + '/#org' } });
export const breadcrumbJsonLd = (items: { name: string; path: string }[]) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: abs(it.path) })),
});
/** Matches the visible service lead and the verified business entity. */
export const serviceJsonLd = (s: { h1: string; lead: string; path: string }) => ({
  '@context': 'https://schema.org', '@type': 'Service', '@id': abs(s.path) + '#service',
  name: s.h1, description: s.lead, url: abs(s.path), provider: { '@id': abs('/#org') },
  areaServed: ['서울특별시', '경기도', '천안시', '아산시', '청주시', '세종특별자치시', '대전광역시'],
  availableChannel: { '@type': 'ServiceChannel', serviceUrl: abs('/contact/'), servicePhone: { '@type': 'ContactPoint', telephone: '+82-' + MAIN_PHONE, availableLanguage: ['ko'] } },
});
export function JsonLd({ data }: { data: object | object[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

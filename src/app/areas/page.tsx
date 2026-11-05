import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import AreaBrowser from '@/components/AreaBrowser';
import Icon from '@/components/Icon';
import { pageMeta } from '@/lib/seo';
import { CITIES } from '@/content/site-data';
import { cityLink, guLink, publicRegionPages } from '@/lib/links';
import { regionById } from '@/lib/registry';

export const metadata: Metadata = pageMeta({
  title: '출장 지역 안내 | 서울·경기·충청 자동문 수리 출장 | 제이앤디시스템',
  description: '평택 본사에서 화성·수원·용인을 주로 다니고 서울·경기 수도권과 천안·아산·청주·세종·대전까지 출장합니다. 경기도권은 당일·긴급 출장 가능. 지역별 안내 페이지를 확인하세요.',
  path: '/areas/',
});

export default function Areas() {
  const hrefs = Object.fromEntries(CITIES.map((c) => [c.c, { city: cityLink(c).href, gus: Object.fromEntries(c.gus.map((g) => [g.g, guLink(c, g.g).href])) }]));
  const pub = publicRegionPages();
  return (
    <PublicShell>
      <main className="page-narrow">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '출장 지역', path: '/areas/' }]} />
        <h1 style={{ margin: '0 0 16px', fontSize: 'var(--fs-1)', letterSpacing: '-0.03em', fontWeight: 800 }}>출장 지역</h1>
        <p style={{ margin: '0 0 32px', fontSize: 'var(--fs-3)', lineHeight: 1.6, color: 'var(--g600)' }}>평택 본사에서 서울·경기 수도권과 충청권까지 직접 출장해요. 경기도권은 당일·긴급 출장이 가능해요.</p>
        <div className="hub-grid">
          <Link href="/areas/gyeonggi/" className="hub-cell">경기 자동문 수리·설치<Icon name="arrow-right" /></Link>
          <Link href="/areas/seoul/" className="hub-cell">서울 자동문 수리·설치<Icon name="arrow-right" /></Link>
        </div>
        {pub.length > 0 && (
          <>
            <h2 style={{ margin: '0 0 12px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>지역별 상세 안내</h2>
            <div className="hub-grid">{pub.map((r) => <Link key={r.path} href={r.path} className="hub-cell">{r.h1}<Icon name="arrow-right" /></Link>)}</div>
          </>
        )}
        <AreaBrowser hrefs={hrefs} />
        <p className="sr-only">{CITIES.filter((c) => c.regionId).map((c) => regionById(c.regionId!)?.label).join(', ')}</p>
      </main>
    </PublicShell>
  );
}

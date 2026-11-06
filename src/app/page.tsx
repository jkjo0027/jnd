import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Hero from '@/components/home/Hero';
import Diagnose from '@/components/home/Diagnose';
import DoorTypes from '@/components/home/DoorTypes';
import HomePhonesProvider from '@/components/home/HomePhonesProvider';
import { REVIEW_IMAGES } from '@/content/review-images';
import PhoneBand from '@/components/home/PhoneBand';
import { Targets, Overview, ServicesGrid, Steps, CasesSection, Reviews, Areas, Clients, FaqTop, AboutBand } from '@/components/home/Sections';
import { publicCases, publicClients, smsPhone } from '@/lib/gate';
import { pageMeta, orgJsonLd, websiteJsonLd, JsonLd } from '@/lib/seo';
import { CITIES } from '@/content/site-data';
import { cityLink } from '@/lib/links';

export const metadata: Metadata = pageMeta({
  title: '자동문 설치·수리 전문 | 제이앤디시스템',
  description: '평택 본사에서 서울·경기 수도권 자동문 설치·수리. 센서·스위치·컨트롤러 고장 증상별 점검과 부품 교체, 실측부터 1년 무상 A/S까지 6단계 설치. 평일 08:00–18:00 전화 상담.',
  path: '/',
});

export default function Home() {
  const cases = publicCases();
  const regionHref = Object.fromEntries(CITIES.map((c) => [c.c, cityLink(c).href]));
  return (
    <PublicShell>
      <HomePhonesProvider><main>
        <Hero smsPhone={smsPhone()} />
        <Targets />
        <Overview />
        <Diagnose cases={cases} regionHref={regionHref} />
        <DoorTypes />
        <ServicesGrid />
        <Steps />
        <CasesSection cases={cases} />
        <Reviews reviews={REVIEW_IMAGES} />
        <Areas />
        <Clients clients={publicClients()} />
        <FaqTop />
        <AboutBand />
        <PhoneBand />
      </main></HomePhonesProvider>
      <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
    </PublicShell>
  );
}

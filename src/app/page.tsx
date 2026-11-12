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
  title: '제이앤디시스템 | 평택 자동문 설치·수리 · 서울·경기 출장',
  description: '평택 본사에서 서울·경기 자동문 설치·수리. 센서·스위치·모터 점검과 교체, 신규 설치·1년 무상 A/S를 안내합니다. 평일 전화 상담.',
  path: '/',
});

export default function Home() {
  const cases = publicCases();
  const clients = publicClients();
  const areaNumber = REVIEW_IMAGES.length >= 4 ? 6 : 5;
  const sectionNumber = (n: number) => String(n).padStart(2, '0');
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
        <Areas number={sectionNumber(areaNumber)} />
        <Clients clients={clients} number={sectionNumber(areaNumber + 1)} />
        <FaqTop number={sectionNumber(areaNumber + (clients.length ? 2 : 1))} />
        <AboutBand />
        <PhoneBand />
      </main></HomePhonesProvider>
      <JsonLd data={[orgJsonLd(), websiteJsonLd()]} />
    </PublicShell>
  );
}

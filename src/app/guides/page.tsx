import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { pageMeta } from '@/lib/seo';
import { ALL_GUIDES } from '@/content/guides';
import { isPublicPath } from '@/lib/registry';
import AuthoredList from '@/components/AuthoredList';
import { liveByType } from '@/lib/server/content';

export const revalidate = 60;

export const metadata: Metadata = pageMeta({
  title: '자동문 증상 가이드 | 안 열림·안 닫힘·반복·소음·충격 | 제이앤디시스템',
  description: '자동문이 안 열리거나 안 닫힐 때, 열렸다 닫히기를 반복할 때, 센서가 인식하지 못할 때, 소음·충격이 날 때 안전하게 확인할 항목과 전문가 점검이 필요한 신호를 증상별로 정리했습니다.',
  path: '/guides/',
});

export default function Guides() {
  const pub = ALL_GUIDES.filter((g) => isPublicPath(g.path));
  return (
    <PublicShell>
      <main className="page-narrow">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '증상 가이드', path: '/guides/' }]} />
        <h1 style={{ margin: '0 0 16px', fontSize: 'var(--fs-1)', letterSpacing: '-0.03em', fontWeight: 800 }}>자동문 증상 가이드</h1>
        <p style={{ margin: '0 0 32px', fontSize: 'var(--fs-3)', lineHeight: 1.6, color: 'var(--g600)' }}>증상별로 안전하게 확인할 수 있는 것과 전문가가 봐야 하는 것을 나눠 정리했어요. 전기·구동부 분해나 안전센서 해제는 안내하지 않아요.</p>
        <section style={{ margin: '0 0 32px', padding: '20px 24px', borderRadius: 'var(--r-l)', background: 'var(--g50)', fontSize: 'var(--fs-b)', lineHeight: 1.7, color: 'var(--g700)' }}>
          <p style={{ margin: '0 0 8px' }}><b>가이드를 읽는 법.</b> 각 가이드는 질문에 먼저 답하고, 가능한 원인을 부품별로 나눈 뒤, 이용자가 눈으로 안전하게 확인할 수 있는 항목과 여기서 멈춰야 하는 기준, 그리고 전문가가 계측·교체로 처리하는 진단을 구분해요.</p>
          <p style={{ margin: 0 }}>원인이 같은 증상은 하나의 가이드로 묶었고, 실제 수리 사례가 있는 경우 사례 기록으로 연결해요. 가이드만으로 해결되지 않으면 증상과 설치 제조사를 알려주시고 전화로 상담하세요.</p>
        </section>
        {pub.length ? (
          <div className="guides-list">
            {pub.map((g) => <Link key={g.id} href={g.path} className="guide-card"><p className="t">{g.h1}</p><p className="d">{g.question}</p><span className="more">가이드 보기<Icon name="arrow-right" size={14} /></span></Link>)}
          </div>
        ) : (
          <p className="empty-note">증상 가이드는 기술 담당 검수 후 공개돼요. 급한 고장은 <Link href="/#diagnose">증상 진단</Link>이나 전화로 바로 상담하세요.</p>
        )}
        <AuthoredList pages={liveByType('guide')} heading="최근 등록한 가이드" />
        <h2 style={{ margin: '0 0 12px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>증상을 모르시겠다면</h2>
        <div className="related"><Link href="/#diagnose">증상으로 진단하기<Icon name="arrow-right" size={14} /></Link><Link href="/services/repair/">자동문 수리 안내<Icon name="arrow-right" size={14} /></Link><Link href="/faq/">자주 묻는 질문<Icon name="arrow-right" size={14} /></Link></div>
      </main>
    </PublicShell>
  );
}

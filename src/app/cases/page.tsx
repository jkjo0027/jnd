import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import CaseList from '@/components/CaseList';
import { pageMeta } from '@/lib/seo';
import { publicCases } from '@/lib/gate';
import AuthoredList from '@/components/AuthoredList';
import { liveByType } from '@/lib/server/content';
export const metadata: Metadata = pageMeta({
    title: '자동문 시공사례 | 수리·설치 현장 기록 | 제이앤디시스템',
    description: '용인·서울·화성 등 실제 자동문 수리·설치 현장의 증상, 점검, 조치, 결과 기록. 스위치·센서·컨트롤러 교체와 편개형 자동문 설치 사례를 지역·서비스별로 확인하세요.',
    path: '/cases/',
});
export default async function Cases() {
    return (<PublicShell>
      <main className="page cases-page">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '시공사례', path: '/cases/' }]}/>
        <h1>시공사례</h1>
        <p style={{ margin: '-16px 0 24px', fontSize: 'var(--fs-b)', lineHeight: 1.7, color: 'var(--g600)', maxWidth: 720 }}>현장 유형, 지역(익명화), 증상, 점검, 조치, 부품, 확인 결과를 같은 형식으로 기록한 실제 작업 사례예요. 고장 난 부품만 교체해 기존 문을 살린 수리 사례와 여닫이·강화도어를 자동문으로 바꾼 설치 사례를 지역·서비스별로 걸러볼 수 있어요. 공개 전 검수를 마친 사례만 올리고, 사진 권리와 고객사명 노출 동의를 확인하지 못한 사례는 보류해요.</p>
        <CaseList cases={publicCases()}/>
        <AuthoredList pages={(await liveByType('case'))} heading="최근 등록한 사례"/>
      </main>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

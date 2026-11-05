import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import { pageMeta } from '@/lib/seo';
import { BRAND, INFO, MAIN_PHONE } from '@/lib/site';
import { ops } from '@/lib/registry';

export const metadata: Metadata = pageMeta({
  title: '개인정보처리방침 | 제이앤디시스템',
  description: '제이앤디시스템 문의 상담 시 수집하는 개인정보 항목, 이용 목적, 보유 기간, 파기 절차와 이용자의 권리를 안내합니다.',
  path: '/privacy/',
});

export default function Privacy() {
  const retention = ops.privacyRetentionDays ? `${ops.privacyRetentionDays}일` : null;
  return (
    <PublicShell>
      <main className="page-narrow privacy">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '개인정보처리방침', path: '/privacy/' }]} />
        <h1>개인정보처리방침</h1>
        <p className="date">시행일 {ops.privacyEffectiveDate || '(운영자 확정 대기)'}</p>
        {!(retention && ops.privacyEffectiveDate) && <p className="pending">보유 기간·시행일은 운영자 확정 전 표준안입니다. 확정 전에는 문의 폼 안내문에도 같은 표기가 적용됩니다.</p>}
        <p>{BRAND}(이하 &quot;회사&quot;)는 문의 상담을 위해 필요한 최소한의 개인정보만 수집하며, 「개인정보 보호법」을 지킵니다.</p>
        <h2>1. 수집 항목</h2><p>필수: 이름, 연락처 / 선택: 설치 위치, 증상, 건물 종류, 문의 내용{ops.contactAttachments ? ', 첨부 사진' : ''}</p>
        <h2>2. 수집·이용 목적</h2><p>자동문 수리·설치 상담, 방문 일정 안내, 견적 안내</p>
        <h2>3. 보유·이용 기간</h2><p>상담 완료 후 {retention || '[보유기간 확정 대기]'}. 관계 법령에 따라 보존이 필요한 경우 해당 기간 동안 보관합니다.</p>
        <h2>4. 제3자 제공</h2><p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
        <h2>5. 파기 절차·방법</h2><p>보유 기간이 지난 개인정보는 지체 없이 복구할 수 없는 방법으로 파기합니다.</p>
        <h2>6. 이용자의 권리</h2><p>이용자는 언제든 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.</p>
        <h2>7. 개인정보 보호책임자</h2><p>성명 {INFO.privacyOfficer} · 연락처 {MAIN_PHONE} · 이메일 {INFO.email}</p>
      </main>
    </PublicShell>
  );
}

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
        <h2>1. 수집 항목</h2><p>필수: 이름, 연락처 / 선택: 설치 위치, 증상, 건물 종류, 문의 내용{ops.contactAttachments ? ', 첨부 사진' : ''}. 중복 접수와 부정 이용 방지를 위해 접수 시각·접속 IP·브라우저 정보가 함께 기록됩니다.</p>
        <h2>2. 수집·이용 목적</h2><p>자동문 수리·설치 상담, 방문 일정 안내, 견적 안내</p>
        <h2>3. 보유·이용 기간</h2><p>문의 접수일로부터 {retention || '[보유기간 확정 대기]'} 동안 보관합니다. 웹사이트 문의 백업은 기간 경과 후 정기적으로 자동 삭제하며, 알림 이메일과 접수 서비스의 사본은 담당자가 같은 보유기간을 기준으로 정리합니다. 관계 법령에 따라 별도 보존 의무가 있는 거래 기록은 해당 기준에 따라 구분하여 보관합니다.</p>
        <h2>4. 제3자 제공</h2><p>회사는 이용자의 동의 없이 개인정보를 제3자에게 제공하지 않습니다.</p>
        <h2>5. 파기 절차·방법</h2><p>보유 기간이 지난 개인정보는 지체 없이 복구할 수 없는 방법으로 파기합니다.</p>
        <h2>6. 이용자의 권리</h2><p>이용자는 언제든 개인정보 열람·정정·삭제·처리정지를 요청할 수 있습니다.</p>
        <h2>7. 개인정보 보호책임자</h2><p>성명 {INFO.privacyOfficer} · 연락처 {MAIN_PHONE} · 이메일 {INFO.email}</p>
        <h2>8. 접수·알림 처리 서비스</h2><p>홈페이지 호스팅과 문의 저장·전달에는 Netlify의 호스팅·Blobs·Forms 서비스를 사용하며, 문의 알림은 회사가 지정한 업무용 이메일로 전달합니다. 해당 서비스의 국외 인프라에서 정보가 처리될 수 있습니다. 이용자는 온라인 접수 대신 대표번호 전화 상담을 선택할 수 있습니다.</p>
      </main>
    </PublicShell>
  );
}

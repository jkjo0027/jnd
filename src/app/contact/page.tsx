import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import ContactForm from '@/components/ContactForm';
import { pageMeta } from '@/lib/seo';
import { ops } from '@/lib/registry';
import { smsPhone } from '@/lib/gate';

export const metadata: Metadata = pageMeta({
  title: '문의 남기기 | 자동문 수리·설치 상담 접수 | 제이앤디시스템',
  description: '이름·연락처와 증상을 남겨주시면 전문 기사가 연락드립니다. 급하시면 전화가 가장 빠릅니다. 평일 08:00–18:00.',
  path: '/contact/',
});

export default function Contact() {
  return (
    <PublicShell>
      <main className="page-form contact">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '문의 남기기', path: '/contact/' }]} />
        <ContactForm testMode={process.env.CONTACT_MODE !== 'live'} attachments={!!ops.contactAttachments && process.env.CONTACT_ATTACHMENTS === 'on'} smsPhone={smsPhone()} retention={ops.privacyRetentionDays ? `${ops.privacyRetentionDays}일` : null} />
      </main>
    </PublicShell>
  );
}

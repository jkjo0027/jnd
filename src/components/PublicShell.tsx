import type { ReactNode } from 'react';
import Header from './Header';
import Footer from './Footer';
import MobileBar from './MobileBar';
import Reveal from './Reveal';
import { PhoneProvider } from './PhoneProvider';
import { consultPhones } from '@/lib/gate';

/** 공개 페이지 공통 틀: 상담번호 컨텍스트 + 헤더/푸터/모바일 전화바. pinned: 지역 상세 고정 번호 */
export default function PublicShell({ children, pinned = null }: { children: ReactNode; pinned?: string | null }) {
  return (
    <PhoneProvider phones={consultPhones()} pinned={pinned}>
      <Header />
      {children}
      <Footer />
      <MobileBar />
      <Reveal />
    </PhoneProvider>
  );
}

'use client';
import Link from 'next/link';
import Icon from './Icon';
import { RollingPhone, usePhones } from './PhoneProvider';

/** 모바일(1024px 미만) 하단 고정 전화바. 본문 하단 여백은 <MobileBarSpace/> */
export default function MobileBar() {
  const { tel, holdProps } = usePhones();
  return (
    <div className="mobile-bar">
      <Link href="/contact/" aria-label="문의 남기기" className="msg"><Icon name="message-square" size={22} /></Link>
      <a href={tel} className="tel" {...holdProps}><Icon name="phone" size={20} />전화 상담 <RollingPhone h={24} /></a>
    </div>
  );
}
export const MobileBarSpace = () => <div className="mobile-bar-space" aria-hidden="true" />;

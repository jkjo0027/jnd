'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import LogoMark from './Logo';
import Icon from './Icon';
import { RollingPhone, usePhones } from './PhoneProvider';
import { BRAND, BRAND_EN } from '@/lib/site';

const NAV = [
  ['/services/', '서비스'], ['/areas/', '출장 지역'], ['/cases/', '시공사례'], ['/faq/', '자주 묻는 질문'], ['/about/', '업체 소개'],
] as const;

export default function Header() {
  const { tel, holdProps } = usePhones();
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    if (!menu) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setMenu(false); };
    const previousOverflow = document.body.style.overflow;
    document.addEventListener('keydown', onKey); document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = previousOverflow; };
  }, [menu]);
  return (
    <header className="site-header">
      <div className="bar">
        <Link href="/" className="logo" aria-label={`${BRAND} 홈`}>
          <LogoMark size={44} />
          <span className="t"><b>{BRAND}</b><small>{BRAND_EN}</small></span>
        </Link>
        <nav aria-label="주 메뉴">{NAV.map(([h, t]) => <Link key={h} href={h} className="nav-btn">{t}</Link>)}</nav>
        <Link href="/contact/#inquiry" className="nav-btn header-contact">문의 남기기</Link>
        <a href={tel} className="header-tel header-contact" {...holdProps}><Icon name="phone" size={18} /><RollingPhone /></a>
        <div className="header-mob">
          <span className="sp" />
          <Link href="/areas/" aria-label="지역 찾기" className="icon-btn48"><Icon name="map-pin" size={22} /></Link>
          <button type="button" aria-label="메뉴" aria-expanded={menu} aria-controls="mobile-menu" className="icon-btn48" onClick={() => setMenu(true)}><Icon name="menu" size={22} /></button>
        </div>
      </div>
      {menu && (
        <div className="mobile-menu" onClick={() => setMenu(false)}>
          <nav id="mobile-menu" className="panel" aria-label="모바일 메뉴" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="close" aria-label="메뉴 닫기" onClick={() => setMenu(false)} autoFocus><Icon name="x" size={22} /></button>
            {NAV.map(([h, t]) => <Link key={h} href={h} onClick={() => setMenu(false)}>{t}</Link>)}
            <Link href="/contact/#inquiry" onClick={() => setMenu(false)}>문의 남기기</Link>
            <Link href="/guides/" onClick={() => setMenu(false)}>증상 가이드</Link>
          </nav>
        </div>
      )}
    </header>
  );
}

import Link from 'next/link';
import LogoMark from './Logo';
import TelLink from './TelLink';
import { BRAND, BRAND_EN, INFO, MAIN_PHONE } from '@/lib/site';
import { SVCS, FOOTER_BRANDS } from '@/content/site-data';
import { consultPhones } from '@/lib/gate';
import { EXTERNAL_LINKS } from '@/content/external-links';
import { MobileBarSpace } from './MobileBar';

export default function Footer() {
  const phones = consultPhones();
  return (
    <footer className="site-footer">
      <div className="footer-grid">
        <div>
          <Link href="/" className="footer-brand" aria-label={`${BRAND} 홈`}><LogoMark size={50} dark /><span className="t"><b>{BRAND}</b><small>{BRAND_EN}</small></span></Link>
          <p className="footer-sub">경기 평택 본사 · 자동문 수리·설치<br />상담 {INFO.hours}</p>
          <TelLink className="footer-tel" label="number" />
        </div>
        <div>
          <p className="footer-h">서비스</p>
          {SVCS.map((v) => <Link key={v.id} href={v.route} className="footer-link">{v.f || v.t + ' 수리'}</Link>)}
        </div>
        <div>
          <p className="footer-h">안내</p>
          <Link href="/about/" className="footer-link">업체 소개</Link>
          <Link href="/cases/" className="footer-link">시공사례</Link>
          <Link href="/guides/" className="footer-link">증상 가이드</Link>
          <Link href="/faq/" className="footer-link">자주 묻는 질문</Link>
          <Link href="/contact/#inquiry" className="footer-link">문의 남기기</Link>
        </div>
        <div>
          <p className="footer-h">취급 브랜드</p>
          <div className="brand-grid">
            {FOOTER_BRANDS.map(n => <span key={n} className="brand-cell">{n}</span>)}
            <span className="brand-more">외 국내 제조사</span>
          </div>
        </div>
      </div>
      <section className="footer-channels" aria-label="관련 채널">
        <h2>관련 채널</h2>
        <div className="channel-groups">{(['naver_place', 'naver_blog', 'daangn'] as const).map(channel => {
          const links = EXTERNAL_LINKS.filter(e => e.channel === channel);
          return <div key={channel}><h3>{links[0].channel_label}</h3><ul>{links.map(e => <li key={e.id}><a href={e.href} target="_blank" rel="noopener noreferrer" aria-label={`${e.display_name} ${e.channel_label} (새 창)`}>{e.display_name}<span aria-hidden="true"> ↗</span></a></li>)}</ul></div>;
        })}</div>
      </section>
      <div className="footer-legal">
        <p>
          <b>상호</b> {BRAND} <span aria-hidden="true" className="sep">|</span><b>대표</b> {INFO.ceo} <span aria-hidden="true" className="sep">|</span><b>사업자등록번호</b> {INFO.biz} <span aria-hidden="true" className="sep">|</span><b>개업일</b> {INFO.open}<br />
          <b>주소</b> {INFO.addr}<br />
          <b>업태</b> {INFO.bizType} <span aria-hidden="true" className="sep">|</span><b>종목</b> {INFO.bizItems} <span aria-hidden="true" className="sep">|</span><b>과세 구분</b> {INFO.bizKind}<br />
          <b>대표전화</b> {MAIN_PHONE} <span aria-hidden="true" className="sep">|</span><b>상담전화</b> {phones.join(' · ')} <span aria-hidden="true" className="sep">|</span><b>팩스</b> {INFO.fax} <span aria-hidden="true" className="sep">|</span><b>이메일</b> {INFO.email}<br />
          <span style={{ opacity: .7 }}>© 2018–{new Date().getFullYear()} {BRAND}. All rights reserved.</span>
        </p>
        <div className="links">
          <Link href="/privacy/" className="strong">개인정보처리방침</Link>
          <a href="/admin/login/" rel="nofollow">관리자</a>
        </div>
      </div>
      <MobileBarSpace />
    </footer>
  );
}

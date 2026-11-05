'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import DoorLoop from '@/components/DoorLoop';
import Icon from '@/components/Icon';
import { MotionToggle, useMotion } from '@/components/MotionContext';
import { usePhones } from '@/components/PhoneProvider';
import { BRAND, DOOR_INTRO_MS, INFO } from '@/lib/site';
import { SLOGAN } from '@/content/site-data';

export default function Hero({ smsPhone }: { smsPhone: string | null }) {
  const [open, setOpen] = useState(false);
  const { list, k, holdProps } = usePhones();
  const { paused } = useMotion();
  useEffect(() => {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const t = setTimeout(() => setOpen(true), reduce ? 0 : DOOR_INTRO_MS); return () => clearTimeout(t);
  }, []);
  return (
    <section aria-label="메인" className={`hero${open ? ' open' : ''}`}>
      <div aria-hidden="true" className="hero-video"><DoorLoop bare fit="cover" paused={paused} /></div>
      <div aria-hidden="true" className="hero-shade" />
      <div aria-hidden="true" className="hero-rail">
        <span className="l">SPEED AUTODOOR · SD-2000</span>
        <span className="r"><span className="led" />SENSOR</span>
      </div>
      <div aria-hidden="true" className="hero-pane l"><div className="bar"><Icon name="arrow-left" size={14} />AUTOMATIC DOOR</div></div>
      <div aria-hidden="true" className="hero-pane r"><div className="bar"><Icon name="arrow-right" size={14} />AUTOMATIC DOOR</div></div>
      <div className="hero-grid">
        <div>
          <p className="hero-kicker"><i />자동문 설치 · 수리 전문기업</p>
          <h1>{SLOGAN.h},<br /><em>{BRAND}</em>이 책임집니다</h1>
          <p className="hero-sub">{SLOGAN.sub}</p>
          <p className="hero-body">{SLOGAN.body}</p>
          <div className="hero-badges">
            <Link href="/services/install/" className="hero-badge"><Icon name="square-plus" />자동문 신규 설치</Link>
            <Link href="/services/repair/" className="hero-badge"><Icon name="wrench" />고장 수리</Link>
            <Link href="/services/sensor/" className="hero-badge"><Icon name="radar" />센서·스위치 교체</Link>
            <Link href="/about/" className="hero-badge"><Icon name="shield-check" />1년 무상 A/S</Link>
          </div>
          <p className="hero-note"><Icon name="zap" />경기도권 당일 출장 · 긴급 출장 가능</p>
        </div>
        <div className="hero-card">
          <div className="top"><span className="k"><i />전화 상담</span><span className="h">{INFO.hours}</span></div>
          <h2>자동문 고장·설치,<br />전문 기사가 바로 상담합니다</h2>
          <div className="phone-list">
            {list.map((n, i) => (
              <a key={n} href={'tel:' + n} className={`phone-row${i === k ? ' on' : ''}`} {...holdProps}>
                <Icon name="phone-call" className="ic" />
                <span className="n">{n}</span>
                <span className="go">바로 걸기<Icon name="arrow-right" size={14} /></span>
              </a>
            ))}
          </div>
          <div className="cta2">
            {smsPhone ? <a href={'sms:' + smsPhone} className="btn btn-g100"><Icon name="message-square" size={18} />사진으로 견적</a>
              : <Link href="/contact/#photo" className="btn btn-g100"><Icon name="message-square" size={18} />사진으로 견적</Link>}
            <Link href="/contact/" className="btn btn-g100">문의 남기기</Link>
          </div>
        </div>
      </div>
      <MotionToggle className="door-ctl" />
    </section>
  );
}

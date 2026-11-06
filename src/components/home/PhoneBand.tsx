'use client';
import Icon from '@/components/Icon';
import { useHomePhones } from './HomePhonesProvider';
import { INFO } from '@/lib/site';

export default function PhoneBand() {
  const list = useHomePhones();
  return (
    <section className="band" aria-label="전화 상담">
      <div className="wrap">
        <div>
          <h2>자동문 설치·고장 전화 상담</h2>
          <p className="d">전문 기사가 직접 상담합니다. 증상과 위치를 말씀해 주시면 필요한 부품을 챙겨 방문해요.</p>
          <p className="h">{INFO.hours}</p>
        </div>
        <div className="band-phones">
          {list.map((n) => <a key={n} href={'tel:' + n} className="band-tel on"><Icon name="phone" />{n}</a>)}
        </div>
      </div>
    </section>
  );
}

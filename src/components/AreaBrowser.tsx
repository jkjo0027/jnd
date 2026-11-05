'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { CITIES, type City } from '@/content/site-data';

const short = (c: string) => c.replace(/(특별시|광역시|시)$/, '');
/** 시·도 → 시·군 → 구 → 동 탐색 UI. 탐색 상태는 URL 로 발행하지 않는다(클라이언트 상태). 링크는 공개된 지역 대표 페이지로만 */
export default function AreaBrowser({ hrefs }: { hrefs: Record<string, { city: string; gus: Record<string, string> }> }) {
  const [bc, setBc] = useState<string | null>(null);
  const [bg, setBg] = useState<string | null>(null);
  const city: City | undefined = bc ? CITIES.find((c) => c.c === bc) : undefined;
  const single = !!city && city.gus.length === 1;
  const lvl = !city ? 0 : single || bg ? 2 : 1;
  const gu = city ? (single ? city.gus[0] : city.gus.find((g) => g.g === bg)) : undefined;
  const title = lvl === 0 ? '어느 지역인가요?' : lvl === 1 ? `${city!.c}의 어느 구인가요?` : `${single ? city!.c : short(city!.c) + ' ' + bg} 출장 범위`;
  const link = city ? (gu && !single ? hrefs[city.c]?.gus[gu.g] : hrefs[city.c]?.city) || '/areas/' : '/areas/';
  return (
    <div className="browse">
      <div className="crumbs-btn" aria-label="탐색 경로">
        <button type="button" onClick={() => { setBc(null); setBg(null); }}>전체 지역</button>
        {city && <button type="button" onClick={() => setBg(null)}>{city.c}</button>}
        {city && bg && <button type="button">{bg}</button>}
      </div>
      <h2 style={{ margin: '0 0 24px', fontSize: 'var(--fs-2)', fontWeight: 800 }}>{title}</h2>
      {lvl === 0 && (
        <div className="groups">
          {(['경기', '서울', '인천', '충청'] as const).map((p) => (
            <div key={p}>
              <p className="p">{p}</p>
              <div className="list">
                {CITIES.filter((c) => c.p === p).map((c) => (
                  <button type="button" key={c.c} className="row" onClick={() => { setBc(c.c); setBg(null); }}>
                    <span className="t">{c.c}</span><span className="tag2">{c.tag}</span><Icon name="chevron-right" className="ch" />
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      {lvl === 1 && city && (
        <div className="gus">
          {city.gus.map((g) => (
            <button type="button" key={g.g} className="gu-row" onClick={() => setBg(g.g)}>
              <span style={{ flex: 1 }}><span className="t">{g.g}</span><span className="s">{g.d.slice(0, 3).join(' · ')} 외</span></span>
              <Icon name="chevron-right" className="ch" />
            </button>
          ))}
        </div>
      )}
      {lvl === 2 && city && gu && (
        <div>
          <Link href={link} className="btn btn-primary all">{single ? city.c : short(city.c) + ' ' + gu.g} 안내 보기<Icon name="arrow-right" /></Link>
          <div className="dong-grid">{gu.d.map((d) => <span key={d} className="dong">{d}</span>)}</div>
          <p className="hint">읍·면·동은 모두 같은 지역 안내 페이지에서 다뤄요. 동별로 따로 페이지를 만들지 않고, 실제 사례가 쌓인 지역부터 상세 안내를 늘려가요.</p>
        </div>
      )}
    </div>
  );
}

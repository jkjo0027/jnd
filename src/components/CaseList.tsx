'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import type { Case } from '@/content/site-data';

/** 시공사례 목록 필터(지역·서비스). 필터 상태는 URL 로 발행하지 않는다 */
export default function CaseList({ cases }: { cases: Case[] }) {
  const FR = ['전체', ...new Set(cases.map((c) => c.area))];
  const ORDER = ['센서', '스위치', '컨트롤러', '번호키', '설치'];
  const FS = ['전체', ...ORDER.filter((t) => cases.some((c) => c.svcT === t)), ...new Set(cases.map((c) => c.svcT).filter((t) => !ORDER.includes(t)))];
  const [fr, setFr] = useState('전체');
  const [fs, setFs] = useState('전체');
  const list = cases.filter((c) => (fr === '전체' || c.area === fr) && (fs === '전체' || c.svcT === fs));
  return (
    <>
      <div className="filters">
        <div className="row" role="group" aria-label="지역 필터"><span className="k">지역</span>{FR.map((t) => <button type="button" key={t} className={`f${fr === t ? ' on' : ''}`} aria-pressed={fr === t} onClick={() => setFr(t)}>{t}</button>)}</div>
        <div className="row" role="group" aria-label="서비스 필터"><span className="k">서비스</span>{FS.map((t) => <button type="button" key={t} className={`f${fs === t ? ' on' : ''}`} aria-pressed={fs === t} onClick={() => setFs(t)}>{t}</button>)}</div>
      </div>
      {list.length ? (
        <div className="cases-grid">
          {list.map((c) => (
            <Link key={c.id} href={`/cases/${c.id}/`} className="case-tile">
              <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
              <span className="tx"><span className="k" style={{ display: 'block' }}>{c.place} · {c.svcT}</span><span className="t" style={{ display: 'block' }}>{c.title}</span><span className="s" style={{ display: 'block' }}>증상 · {c.sym}</span></span>
            </Link>
          ))}
        </div>
      ) : (
        <div className="cases-empty" role="status">
          <Icon name="search-x" />
          <p className="t">조건에 맞는 사례가 아직 없어요</p>
          <p className="d">비슷한 고장이라면 전화로 먼저 물어보셔도 돼요.</p>
          <button type="button" className="btn btn-ink" onClick={() => { setFr('전체'); setFs('전체'); }}>필터 초기화</button>
        </div>
      )}
    </>
  );
}

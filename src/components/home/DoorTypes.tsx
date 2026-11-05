'use client';
import DoorLoop from '@/components/DoorLoop';
import { useMotion } from '@/components/MotionContext';

const TYPES = [
  { n: 'TYPE 01', t: '편개 자동문', d: '문짝 한 장이 한쪽으로 미끄러져 열립니다. 출입구가 좁거나 한쪽 벽에 여유가 있을 때 맞습니다.', tags: ['상가', '사무실', '아파트 공용현관'], kind: 'pen' },
  { n: 'TYPE 02', t: '양개 자동문', d: '문짝 두 장이 가운데서 양옆으로 갈라지며 열립니다. 출입이 많은 넓은 출입구에 맞습니다.', tags: ['병원', '마트', '관공서'], kind: 'bi' },
  { n: 'TYPE 03', t: '스윙 자동문', d: '여닫이문을 자동으로 밀어 열어 줍니다. 미닫이가 어려운 구조나 무장애 출입구에 씁니다.', tags: ['화장실', '요양시설', '무장애 출입구'], kind: 'sw' },
];
function Frame({ kind }: { kind: string }) {
  if (kind === 'pen') return <div className="frame pen"><div className="leaf-m"><span className="h r" /></div><div className="leaf-f" /></div>;
  if (kind === 'bi') return <div className="frame bi"><div className="leaf-f f1" /><div className="leaf-m m1"><span className="h r" /></div><div className="leaf-m m2"><span className="h l" /></div><div className="leaf-f f2" /></div>;
  return <div className="frame sw"><div className="leaf-m"><span className="h r" /></div></div>;
}
export default function DoorTypes() {
  const { paused } = useMotion();
  return (
    <section id="door-types" aria-label="자동문 종류" className="sec types">
      <div className="wrap">
        <div className="sec-head">
          <div><p className="sec-num">자동문 종류</p><h2 className="sec-h2">어떤 자동문이든 설치·수리합니다</h2></div>
          <p className="sec-lede">출입구 폭과 사용 환경에 맞춰 방식을 고릅니다. 지금 쓰시는 문 그대로 부품만 교체하는 수리도 가능합니다.</p>
        </div>
        <div className="video"><div style={{ position: 'absolute', inset: 0 }}><DoorLoop fit="contain" paused={paused} /></div></div>
        <div className="cards">
          {TYPES.map((ty) => (
            <article key={ty.n} className="type-card">
              <div aria-hidden="true" className="stage"><div className="unit"><div className="head"><span className="s" /><span className="led" /></div><Frame kind={ty.kind} /></div></div>
              <div className="tx"><p className="k">{ty.n}</p><h3>{ty.t}</h3><p>{ty.d}</p><div className="tags">{ty.tags.map((t) => <span key={t} className="tag">{t}</span>)}</div></div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

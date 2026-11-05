'use client';
import { useEffect, useRef, useState } from 'react';
import { LOOP_TOTAL, STILL_FRAME } from '@/lib/site';

/* ── jnd-video.jsx 의 JNDDoorLoop + PieceCore 이식 (1920×1080, 18.5초 반복). Easing/animate/clamp 는 animations-v3.jsx 에서 가져옴 ── */
const Easing = {
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeInOutCubic: (t: number) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),
  easeOutBack: (t: number) => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2); },
};
const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
function animate({ from = 0, to = 1, start = 0, end = 1, ease = Easing.easeInOutCubic }: { from?: number; to?: number; start: number; end: number; ease?: (t: number) => number }) {
  return (t: number) => { if (t <= start) return from; if (t >= end) return to; return from + (to - from) * ease((t - start) / (end - start)); };
}
const MOTION = {
  enter: (a: number, b: number) => animate({ start: a, end: b, ease: Easing.easeOutCubic }),
  move: (a: number, b: number) => animate({ start: a, end: b, ease: Easing.easeInOutCubic }),
  pop: (a: number, b: number) => animate({ start: a, end: b, ease: Easing.easeOutBack }),
};
const ACCENT = '#FED91B';
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const FONT = '"Pretendard Variable",Pretendard,-apple-system,sans-serif';
const FLOOR = 820, DW = 400, DH = 560, HH = 56;
const DX = [420, 960, 1500];
const TYPES = [
  { key: 'Sliding', n: '01', t: '편개 자동문', d: '문짝 한 장이 한쪽으로 미끄러져 열립니다.', d2: '출입구가 좁거나 한쪽 벽에 여유가 있을 때', chips: ['상가', '사무실', '아파트 공용현관'] },
  { key: 'BiParting', n: '02', t: '양개 자동문', d: '문짝 두 장이 가운데서 양옆으로 열립니다.', d2: '출입이 많은 넓은 출입구에', chips: ['병원', '마트', '관공서'] },
  { key: 'Swing', n: '03', t: '스윙 자동문', d: '여닫이문을 자동으로 밀어 열어 줍니다.', d2: '미닫이가 어려운 구조, 무장애 출입구에', chips: ['화장실', '요양시설', '무장애 출입구'] },
] as const;
const GLASS_M = 'linear-gradient(115deg,rgba(158,192,220,.78) 0%,rgba(222,234,244,.62) 46%,rgba(176,204,228,.74) 100%)';
const GLASS_F = 'linear-gradient(115deg,rgba(140,170,196,.86) 0%,rgba(200,216,230,.8) 50%,rgba(150,180,206,.84) 100%)';
const LOOP_CUES = { Sliding: 0, BiParting: 5, Swing: 10, Lineup: 15, Call: 1e9 };

const leaf = (key: string, left: number | string, w: string, z: number, moving: boolean, tx: number, handle?: 'left' | 'right') => (
  <div key={key} style={{ position: 'absolute', top: 0, bottom: 0, left, width: w, zIndex: z, background: moving ? GLASS_M : GLASS_F, border: `6px solid ${moving ? '#8A929D' : '#6E7682'}`, boxSizing: 'border-box', transform: `translateX(${tx}%)` }}>
    {handle && <span style={{ position: 'absolute', top: '38%', [handle]: 10, width: 6, height: '26%', borderRadius: 3, background: '#555E6B' }} />}
  </div>
);

function DoorUnit({ x, type, open, sense }: { x: number; type: number; open: number; sense: number }) {
  const led = open > 0.02;
  let leaves;
  if (type === 0) leaves = [leaf('a', 0, '50%', 1, true, open * 94, 'right'), leaf('b', '50%', '50%', 2, false, 0)];
  else if (type === 1) leaves = [leaf('a', 0, '25%', 2, false, 0), leaf('b', '25%', '25%', 1, true, -open * 94, 'right'), leaf('c', '50%', '25%', 1, true, open * 94, 'left'), leaf('d', '75%', '25%', 2, false, 0)];
  else {
    const R = 100 - 70 * open, k = 5 * open;
    leaves = [
      <div key="s" style={{ position: 'absolute', inset: 0, background: GLASS_M, clipPath: `polygon(0 0,${R}% ${k}%,${R}% ${100 - k}%,0 100%)` }} />,
      <div key="e" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: '#8A929D' }} />,
      <div key="r" style={{ position: 'absolute', left: `calc(${R}% - 6px)`, top: `${k}%`, bottom: `${k}%`, width: 6, background: '#8A929D' }} />,
      <div key="h" style={{ position: 'absolute', left: `calc(${R}% - 22px)`, top: `${38 + k * 0.2}%`, width: 6, height: `${26 - k * 0.4}%`, borderRadius: 3, background: '#555E6B' }} />,
    ];
  }
  return (
    <div style={{ position: 'absolute', left: x - DW / 2, top: FLOOR - DH - HH, width: DW }}>
      <div style={{ height: HH, margin: '0 -18px', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#434B57 0%,#262B33 100%)', borderBottom: '3px solid #0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.3em', color: '#C3C9D1' }}>SPEED AUTODOOR</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 7, borderRadius: 4, background: '#14181E' }} />
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: led ? '#2BD46A' : '#5B636E', boxShadow: led ? '0 0 10px #2BD46A' : 'none' }} />
        </span>
      </div>
      <div style={{ position: 'relative', height: DH, border: '10px solid #555E6B', borderBottom: 0, boxSizing: 'border-box', overflow: 'hidden', background: 'linear-gradient(180deg,#F7F2E4 0%,#FFFFFF 70%)' }}>
        {type === 2 && <div style={{ position: 'absolute', inset: 0, background: '#3A3F47', opacity: 0.12 * open }} />}
        {leaves}
      </div>
      <div style={{ position: 'absolute', top: HH + 3, left: '50%', width: DW + 120, height: DH, transform: 'translateX(-50%)', clipPath: 'polygon(44% 0,56% 0,100% 100%,0 100%)', background: `linear-gradient(180deg,${rgba(ACCENT, 0.5)} 0%,${rgba(ACCENT, 0)} 85%)`, opacity: sense, zIndex: 5 }} />
      <div style={{ position: 'absolute', top: HH + DH, left: -24, right: -24, height: 10, background: '#9AA0A8' }} />
    </div>
  );
}

function TypeText({ T, C, i, next }: { T: number; C: typeof LOOP_CUES; i: number; next: number }) {
  const ty = TYPES[i], c = C[ty.key];
  const a = MOTION.enter(c + 0.25, c + 1.0)(T), l = MOTION.move(next - 0.55, next - 0.1)(T);
  const op = a * (1 - l);
  return (
    <div style={{ position: 'absolute', left: 150, top: 300, width: 720, opacity: op, transform: `translateY(${(1 - a) * 50 - l * 30}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <span style={{ padding: '8px 16px', borderRadius: 8, background: ACCENT, color: '#000', fontSize: 26, fontWeight: 800, letterSpacing: '.08em' }}>TYPE {ty.n}</span>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#8A929D', letterSpacing: '.08em' }}>{ty.n} / 03</span>
      </div>
      <h2 style={{ margin: '0 0 28px', fontSize: 120, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>{ty.t}</h2>
      <p style={{ margin: '0 0 8px', fontSize: 38, lineHeight: 1.45, fontWeight: 600, color: '#E6E8EB', letterSpacing: '-0.02em' }}>{ty.d}</p>
      <p style={{ margin: '0 0 36px', fontSize: 32, lineHeight: 1.45, color: '#9AA3AF', letterSpacing: '-0.02em' }}>{ty.d2}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        {ty.chips.map((ch, k) => { const p = MOTION.pop(c + 1.0 + k * 0.12, c + 1.5 + k * 0.12)(T); return <span key={ch} style={{ padding: '12px 22px', borderRadius: 999, border: '2px solid #3A3F47', color: '#fff', fontSize: 28, fontWeight: 700, opacity: clamp(p, 0, 1), transform: `scale(${0.8 + 0.2 * p})` }}>{ch}</span>; })}
      </div>
    </div>
  );
}

function PieceCore({ T, bare }: { T: number; bare: boolean }) {
  const C = LOOP_CUES, authoredTotal = LOOP_TOTAL;
  const p1 = MOTION.move(C.BiParting - 0.6, C.BiParting + 0.6)(T);
  const p2 = MOTION.move(C.Swing - 0.6, C.Swing + 0.6)(T);
  const pL = MOTION.move(C.Lineup - 0.3, C.Lineup + 1.1)(T);
  const pIn = MOTION.move(C.Sliding - 0.5, C.Sliding + 1.6)(T);
  let cx = DX[0] + (DX[1] - DX[0]) * p1 + (DX[2] - DX[1]) * p2;
  cx = cx + (960 - cx) * pL;
  const s = (1.78 - 0.23 * pIn) * (1 - pL) + 0.92 * pL;
  const ax = 1300 + (960 - 1300) * pL, ay = 560 + 60 * pL;
  const cyc = (c: number) => ({ open: MOTION.move(c + 1.1, c + 2.0)(T) - MOTION.move(c + 3.5, c + 4.4)(T), sense: MOTION.enter(c + 0.6, c + 1.0)(T) * (1 - MOTION.enter(c + 2.1, c + 2.7)(T)) });
  const lin = (k: number) => ({ open: MOTION.move(C.Lineup + 0.9 + k * 0.15, C.Lineup + 1.8 + k * 0.15)(T), sense: MOTION.enter(C.Lineup + 0.5 + k * 0.15, C.Lineup + 0.9 + k * 0.15)(T) * (1 - MOTION.enter(C.Lineup + 2.0, C.Lineup + 2.6)(T)) });
  const doors = [C.Sliding, C.BiParting, C.Swing].map((c, k) => { const a = cyc(c), b = lin(k); return { open: clamp(a.open + b.open, 0, 1), sense: clamp(a.sense + b.sense, 0, 1) }; });
  const scrim = MOTION.enter(C.Sliding - 0.2, C.Sliding + 0.6)(T) * (1 - MOTION.move(C.Lineup - 0.3, C.Lineup + 0.6)(T));
  const lt = MOTION.enter(C.Lineup + 0.4, C.Lineup + 1.1)(T);
  const cu = MOTION.move(C.Call - 0.35, C.Call + 0.5)(T);
  const fade = Math.max(MOTION.move(authoredTotal - 0.7, authoredTotal)(T), 1 - MOTION.enter(0, 0.6)(T));
  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#E4E1DA', fontFamily: FONT, wordBreak: 'keep-all' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${ax}px,${ay}px) scale(${s}) translate(${-cx}px,${-512}px)` }}>
        <div style={{ position: 'absolute', left: -3000, top: -2000, width: 8000, height: 2000 + FLOOR, background: 'linear-gradient(180deg,#D9D5CC 0%,#E8E5DE 100%)' }} />
        <div style={{ position: 'absolute', left: -3000, top: FLOOR, width: 8000, height: 2000, background: 'linear-gradient(180deg,#B9B4AA 0%,#CFCAC0 30%,#D8D4CB 100%)' }} />
        {DX.map((x, k) => <DoorUnit key={k} x={x} type={k} open={doors[k].open} sense={doors[k].sense} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: bare ? 'none' : 'block', opacity: scrim, background: 'linear-gradient(90deg,rgba(0,0,0,.94) 0%,rgba(0,0,0,.88) 40%,rgba(0,0,0,0) 62%)' }} />
      {!bare && TYPES.map((ty, i) => <TypeText key={ty.key} T={T} C={C} i={i} next={i < 2 ? C[TYPES[i + 1].key] : C.Lineup} />)}
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, textAlign: 'center', display: bare ? 'none' : 'block', opacity: lt * (1 - cu), transform: `translateY(${(1 - lt) * 30}px)` }}>
        <p style={{ margin: '0 0 12px', fontSize: 30, fontWeight: 800, letterSpacing: '.3em', color: '#3A3F47' }}>편개 · 양개 · 스윙</p>
        <h2 style={{ margin: 0, fontSize: 84, fontWeight: 800, letterSpacing: '-0.04em', color: '#000' }}>모든 자동문, 설치부터 수리까지</h2>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: fade }} />
    </div>
  );
}

/**
 * 홈 삽입용 자동문 모션 (컨트롤 없음, 18.5초 반복). bare: 글자 없이 문만. fit: cover|contain.
 * 화면 밖·탭 숨김 시 정지, prefers-reduced-motion·인쇄·paused 는 17.2초 정지 프레임.
 */
export default function DoorLoop({ bare = false, fit = 'cover', paused = false, className }: { bare?: boolean; fit?: 'cover' | 'contain'; paused?: boolean; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [T, setT] = useState(0.6);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (paused || reduce) { const id = requestAnimationFrame(() => setT(STILL_FRAME)); return () => cancelAnimationFrame(id); }
    let raf = 0, last: number | null = null, t = 0.6, vis = true;
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
    io.observe(el);
    const mql = matchMedia('print');
    const onPrint = () => setT(STILL_FRAME);
    mql.addEventListener?.('change', onPrint);
    const tick = (ts: number) => {
      if (last != null && vis && !document.hidden) { t = (t + Math.min(0.1, (ts - last) / 1000)) % LOOP_TOTAL; setT(t); }
      last = ts; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); mql.removeEventListener?.('change', onPrint); };
  }, [paused]);
  const sx = box.w / 1920, sy = box.h / 1080;
  const sc = fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
  return (
    <div ref={ref} aria-hidden="true" className={`door-loop${className ? ' ' + className : ''}`} style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      {box.w > 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${sc})` }}>
          <PieceCore T={T} bare={bare} />
        </div>
      )}
    </div>
  );
}

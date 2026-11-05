// 제이앤디시스템 · 자동문 모션 영상 (1920×1080)
const { useComposition, CompositionStage, Easing, animate, clamp } = window;

const MOTION = {
  enter: (a, b) => animate({ from: 0, to: 1, start: a, end: b, ease: Easing.easeOutCubic }),
  move: (a, b) => animate({ from: 0, to: 1, start: a, end: b, ease: Easing.easeInOutCubic }),
  pop: (a, b) => animate({ from: 0, to: 1, start: a, end: b, ease: Easing.easeOutBack }),
};
const ACCENTS = { 옐로우: '#FED91B', 오렌지: '#F07600' };
const rgba = (hex, a) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const FONT = '"Pretendard Variable",Pretendard,-apple-system,sans-serif';
const FLOOR = 820, DW = 400, DH = 560, HH = 56;
const DX = [420, 960, 1500];
const PHONES = ['1661-3088', '1661-5863', '1661-6878'];
const TYPES = [
  { key: 'Sliding', n: '01', t: '편개 자동문', d: '문짝 한 장이 한쪽으로 미끄러져 열립니다.', d2: '출입구가 좁거나 한쪽 벽에 여유가 있을 때', chips: ['상가', '사무실', '아파트 공용현관'] },
  { key: 'BiParting', n: '02', t: '양개 자동문', d: '문짝 두 장이 가운데서 양옆으로 열립니다.', d2: '출입이 많은 넓은 출입구에', chips: ['병원', '마트', '관공서'] },
  { key: 'Swing', n: '03', t: '스윙 자동문', d: '여닫이문을 자동으로 밀어 열어 줍니다.', d2: '미닫이가 어려운 구조, 무장애 출입구에', chips: ['화장실', '요양시설', '무장애 출입구'] },
];

const GLASS_M = 'linear-gradient(115deg,rgba(158,192,220,.78) 0%,rgba(222,234,244,.62) 46%,rgba(176,204,228,.74) 100%)';
const GLASS_F = 'linear-gradient(115deg,rgba(140,170,196,.86) 0%,rgba(200,216,230,.8) 50%,rgba(150,180,206,.84) 100%)';
const leaf = (left, w, z, moving, tx, handle) => (
  <div style={{ position: 'absolute', top: 0, bottom: 0, left, width: w, zIndex: z, background: moving ? GLASS_M : GLASS_F, border: `6px solid ${moving ? '#8A929D' : '#6E7682'}`, boxSizing: 'border-box', transform: `translateX(${tx}%)` }}>
    {handle && <span style={{ position: 'absolute', top: '38%', [handle]: 10, width: 6, height: '26%', borderRadius: 3, background: '#555E6B' }}></span>}
  </div>
);

function DoorUnit({ x, type, open, sense, accent }) {
  const led = open > 0.02;
  let leaves;
  if (type === 0) leaves = [leaf(0, '50%', 1, true, open * 94, 'right'), leaf('50%', '50%', 2, false, 0)];
  else if (type === 1) leaves = [leaf(0, '25%', 2, false, 0), leaf('25%', '25%', 1, true, -open * 94, 'right'), leaf('50%', '25%', 1, true, open * 94, 'left'), leaf('75%', '25%', 2, false, 0)];
  else {
    const R = 100 - 70 * open, k = 5 * open;
    leaves = [
      <div key="s" style={{ position: 'absolute', inset: 0, background: GLASS_M, clipPath: `polygon(0 0,${R}% ${k}%,${R}% ${100 - k}%,0 100%)` }}></div>,
      <div key="e" style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 6, background: '#8A929D' }}></div>,
      <div key="r" style={{ position: 'absolute', left: `calc(${R}% - 6px)`, top: `${k}%`, bottom: `${k}%`, width: 6, background: '#8A929D' }}></div>,
      <div key="h" style={{ position: 'absolute', left: `calc(${R}% - 22px)`, top: `${38 + k * 0.2}%`, width: 6, height: `${26 - k * 0.4}%`, borderRadius: 3, background: '#555E6B' }}></div>,
    ];
  }
  return (
    <div style={{ position: 'absolute', left: x - DW / 2, top: FLOOR - DH - HH, width: DW }}>
      <div style={{ height: HH, margin: '0 -18px', borderRadius: '6px 6px 0 0', background: 'linear-gradient(180deg,#434B57 0%,#262B33 100%)', borderBottom: '3px solid #0B0E13', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', boxSizing: 'border-box' }}>
        <span style={{ fontSize: 13, fontWeight: 800, letterSpacing: '.3em', color: '#C3C9D1' }}>SPEED AUTODOOR</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ width: 28, height: 7, borderRadius: 4, background: '#14181E' }}></span>
          <span style={{ width: 11, height: 11, borderRadius: '50%', background: led ? '#2BD46A' : '#5B636E', boxShadow: led ? '0 0 10px #2BD46A' : 'none' }}></span>
        </span>
      </div>
      <div style={{ position: 'relative', height: DH, border: '10px solid #555E6B', borderBottom: 0, boxSizing: 'border-box', overflow: 'hidden', background: 'linear-gradient(180deg,#F7F2E4 0%,#FFFFFF 70%)' }}>
        {type === 2 && <div style={{ position: 'absolute', inset: 0, background: '#3A3F47', opacity: 0.12 * open }}></div>}
        {leaves}
      </div>
      <div style={{ position: 'absolute', top: HH + 3, left: '50%', width: DW + 120, height: DH, transform: 'translateX(-50%)', clipPath: 'polygon(44% 0,56% 0,100% 100%,0 100%)', background: `linear-gradient(180deg,${rgba(accent, 0.5)} 0%,${rgba(accent, 0)} 85%)`, opacity: sense, zIndex: 5 }}></div>
      <div style={{ position: 'absolute', top: HH + DH, left: -24, right: -24, height: 10, background: '#9AA0A8' }}></div>
    </div>
  );
}

function TypeText({ T, CUES, i, next, accent }) {
  const ty = TYPES[i], c = CUES[ty.key];
  const a = MOTION.enter(c + 0.25, c + 1.0)(T), l = MOTION.move(next - 0.55, next - 0.1)(T);
  const op = a * (1 - l);
  return (
    <div style={{ position: 'absolute', left: 150, top: 300, width: 720, opacity: op, transform: `translateY(${(1 - a) * 50 - l * 30}px)` }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 18, marginBottom: 28 }}>
        <span style={{ padding: '8px 16px', borderRadius: 8, background: accent, color: '#000', fontSize: 26, fontWeight: 800, letterSpacing: '.08em' }}>TYPE {ty.n}</span>
        <span style={{ fontSize: 26, fontWeight: 700, color: '#8A929D', letterSpacing: '.08em' }}>{ty.n} / 03</span>
      </div>
      <h2 style={{ margin: '0 0 28px', fontSize: 120, lineHeight: 1.05, fontWeight: 800, letterSpacing: '-0.04em', color: '#fff' }}>{ty.t}</h2>
      <p style={{ margin: '0 0 8px', fontSize: 38, lineHeight: 1.45, fontWeight: 600, color: '#E6E8EB', letterSpacing: '-0.02em' }}>{ty.d}</p>
      <p style={{ margin: '0 0 36px', fontSize: 32, lineHeight: 1.45, color: '#9AA3AF', letterSpacing: '-0.02em' }}>{ty.d2}</p>
      <div style={{ display: 'flex', gap: 12 }}>
        {ty.chips.map((ch, k) => {
          const p = MOTION.pop(c + 1.0 + k * 0.12, c + 1.5 + k * 0.12)(T);
          return <span key={ch} style={{ padding: '12px 22px', borderRadius: 999, border: '2px solid #3A3F47', color: '#fff', fontSize: 28, fontWeight: 700, opacity: clamp(p, 0, 1), transform: `scale(${0.8 + 0.2 * p})` }}>{ch}</span>;
        })}
      </div>
    </div>
  );
}

function Piece({ accent }) {
  const { T, CUES, authoredTotal } = useComposition();
  return <PieceCore accent={accent} T={T} CUES={CUES} authoredTotal={authoredTotal} only={!!window.JND_DOORS_ONLY} />;
}

function PieceCore({ accent, T, CUES, authoredTotal, only, bare }) {
  const C = only ? { Sliding: CUES.Sliding, BiParting: CUES.BiParting, Swing: CUES.Swing, Lineup: CUES.Lineup, Call: 1e9 } : CUES;
  // 카메라
  const p1 = MOTION.move(C.BiParting - 0.6, C.BiParting + 0.6)(T);
  const p2 = MOTION.move(C.Swing - 0.6, C.Swing + 0.6)(T);
  const pL = MOTION.move(C.Lineup - 0.3, C.Lineup + 1.1)(T);
  const pIn = MOTION.move(C.Sliding - 0.5, C.Sliding + 1.6)(T);
  let cx = DX[0] + (DX[1] - DX[0]) * p1 + (DX[2] - DX[1]) * p2;
  cx = cx + (960 - cx) * pL;
  const s = (1.78 - 0.23 * pIn) * (1 - pL) + 0.92 * pL;
  const ax = 1300 + (960 - 1300) * pL, ay = 560 + 60 * pL;
  // 문 개폐
  const cyc = (c) => ({ open: MOTION.move(c + 1.1, c + 2.0)(T) - MOTION.move(c + 3.5, c + 4.4)(T), sense: MOTION.enter(c + 0.6, c + 1.0)(T) * (1 - MOTION.enter(c + 2.1, c + 2.7)(T)) });
  const lin = (k) => ({ open: MOTION.move(C.Lineup + 0.9 + k * 0.15, C.Lineup + 1.8 + k * 0.15)(T), sense: MOTION.enter(C.Lineup + 0.5 + k * 0.15, C.Lineup + 0.9 + k * 0.15)(T) * (1 - MOTION.enter(C.Lineup + 2.0, C.Lineup + 2.6)(T)) });
  const doors = [C.Sliding, C.BiParting, C.Swing].map((c, k) => {
    const a = cyc(c), b = lin(k);
    return { open: clamp(a.open + b.open, 0, 1), sense: clamp(a.sense + b.sense, 0, 1) };
  });
  // 인트로 (양개문처럼 갈라짐)
  const iA = MOTION.enter(0.3, 1.0)(T), iB = MOTION.enter(0.6, 1.3)(T), iBar = MOTION.move(1.0, 1.9)(T);
  const iOut = MOTION.enter(2.6, 3.0)(T), seam = MOTION.enter(2.85, 3.05)(T) * (1 - MOTION.enter(3.2, 3.5)(T));
  const split = MOTION.move(3.0, 3.9)(T);
  const scrim = MOTION.enter(C.Sliding - 0.2, C.Sliding + 0.6)(T) * (1 - MOTION.move(C.Lineup - 0.3, C.Lineup + 0.6)(T));
  // 라인업 타이틀
  const lt = MOTION.enter(C.Lineup + 0.4, C.Lineup + 1.1)(T);
  // 전화 카드
  const cu = MOTION.move(C.Call - 0.35, C.Call + 0.5)(T);
  const ct = MOTION.enter(C.Call + 0.4, C.Call + 1.1)(T);
  const hi = T > C.Call + 1.4 ? Math.floor((T - (C.Call + 1.4)) / 0.75) % PHONES.length : -1;
  const fade = Math.max(MOTION.move(authoredTotal - 0.7, authoredTotal)(T), only ? 1 - MOTION.enter(0, 0.6)(T) : 0);
  const half = { position: 'absolute', top: 0, bottom: 0, width: '50%', background: '#000' };

  return (
    <div data-screen-label={`t=${Math.floor(T)}s`} style={{ position: 'absolute', inset: 0, overflow: 'hidden', background: '#E4E1DA', fontFamily: FONT, wordBreak: 'keep-all' }}>
      <div style={{ position: 'absolute', left: 0, top: 0, width: 1920, height: 1080, transformOrigin: '0 0', transform: `translate(${ax}px,${ay}px) scale(${s}) translate(${-cx}px,${-512}px)` }}>
        <div style={{ position: 'absolute', left: -3000, top: -2000, width: 8000, height: 2000 + FLOOR, background: 'linear-gradient(180deg,#D9D5CC 0%,#E8E5DE 100%)' }}></div>
        <div style={{ position: 'absolute', left: -3000, top: FLOOR, width: 8000, height: 2000, background: 'linear-gradient(180deg,#B9B4AA 0%,#CFCAC0 30%,#D8D4CB 100%)' }}></div>
        {DX.map((x, k) => <DoorUnit key={k} x={x} type={k} open={doors[k].open} sense={doors[k].sense} accent={accent} />)}
      </div>
      <div style={{ position: 'absolute', inset: 0, display: bare ? 'none' : 'block', opacity: scrim, background: 'linear-gradient(90deg,rgba(0,0,0,.94) 0%,rgba(0,0,0,.88) 40%,rgba(0,0,0,0) 62%)' }}></div>
      {!bare && TYPES.map((ty, i) => <TypeText key={ty.key} T={T} CUES={C} i={i} next={i < 2 ? C[TYPES[i + 1].key] : C.Lineup} accent={accent} />)}
      <div style={{ position: 'absolute', top: 96, left: 0, right: 0, textAlign: 'center', display: bare ? 'none' : 'block', opacity: lt * (1 - cu), transform: `translateY(${(1 - lt) * 30}px)` }}>
        <p style={{ margin: '0 0 12px', fontSize: 30, fontWeight: 800, letterSpacing: '.3em', color: '#3A3F47' }}>편개 · 양개 · 스윙</p>
        <h2 style={{ margin: 0, fontSize: 84, fontWeight: 800, letterSpacing: '-0.04em', color: '#000' }}>모든 자동문, 설치부터 수리까지</h2>
      </div>
      {/* 인트로 */}
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', display: only ? 'none' : 'block' }}>
        <div style={{ ...half, left: 0, transform: `translateX(${-split * 100}%)` }}></div>
        <div style={{ ...half, right: 0, transform: `translateX(${split * 100}%)` }}></div>
        <div style={{ position: 'absolute', left: 958, top: 0, bottom: 0, width: 4, background: accent, opacity: seam }}></div>
        <div style={{ position: 'absolute', left: 150, top: 330, opacity: 1 - iOut }}>
          <p style={{ margin: '0 0 36px', fontSize: 28, fontWeight: 800, letterSpacing: '.4em', color: accent, opacity: iA }}>SPEED AUTODOOR</p>
          <div style={{ overflow: 'hidden' }}><h1 style={{ margin: 0, fontSize: 124, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-0.045em', color: '#fff', transform: `translateY(${(1 - iA) * 100}%)` }}>자동문의 시작부터 끝까지</h1></div>
          <div style={{ overflow: 'hidden' }}><h1 style={{ margin: 0, fontSize: 124, lineHeight: 1.18, fontWeight: 800, letterSpacing: '-0.045em', color: accent, transform: `translateY(${(1 - iB) * 100}%)` }}>제이앤디시스템이 책임집니다</h1></div>
          <div style={{ marginTop: 44, width: 560 * iBar, height: 10, background: accent }}></div>
        </div>
      </div>
      {/* 전화 상담 */}
      <div style={{ position: 'absolute', inset: 0, background: accent, transform: `translateY(${(1 - cu) * 100}%)`, display: only ? 'none' : 'grid', gridTemplateColumns: '1fr 700px', alignItems: 'center', gap: 80, padding: '0 150px', boxSizing: 'border-box' }}>
        <div style={{ opacity: ct, transform: `translateY(${(1 - ct) * 40}px)` }}>
          <p style={{ margin: '0 0 32px', fontSize: 28, fontWeight: 800, letterSpacing: '.3em', color: '#000' }}>SPEED AUTODOOR · 제이앤디시스템</p>
          <h2 style={{ margin: '0 0 36px', fontSize: 128, lineHeight: 1.1, fontWeight: 800, letterSpacing: '-0.045em', color: '#000' }}>자동문 설치·고장<br />전화 상담</h2>
          <p style={{ margin: 0, fontSize: 36, fontWeight: 600, color: '#1A1A1A', letterSpacing: '-0.02em' }}>평일 08:00–18:00 · 전국 27개 대리점</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {PHONES.map((p, k) => {
            const e = MOTION.pop(C.Call + 0.6 + k * 0.1, C.Call + 1.1 + k * 0.1)(T), on = k === hi;
            return (
              <div key={p} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 104, padding: '0 36px', borderRadius: 16, background: on ? '#000' : 'rgba(0,0,0,.08)', color: on ? accent : '#000', opacity: clamp(e, 0, 1), transform: `translateX(${(1 - e) * 60}px) scale(${on ? 1.03 : 1})` }}>
                <span style={{ fontSize: 58, fontWeight: 800, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>{p}</span>
                <span style={{ fontSize: 26, fontWeight: 800, letterSpacing: '.1em', opacity: on ? 1 : 0 }}>CALL</span>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ position: 'absolute', inset: 0, background: '#000', opacity: fade }}></div>
    </div>
  );
}

function JNDVideoApp() {
  const [t, setTweak] = window.useTweaks(window.TWEAK_DEFAULTS);
  const accent = ACCENTS[t.accent] || ACCENTS['옐로우'];
  return (
    <>
      <CompositionStage width={1920} height={1080} scenes={window.OM_SCENES} playback={window.OM_PLAYBACK} bg="#000">
        <Piece accent={accent} />
      </CompositionStage>
      <window.TweaksPanel>
        <window.TweakSection label="영상" />
        <window.TweakToggle label="Motion editor" value={t.motionEditor} onChange={(v) => setTweak('motionEditor', v)} />
        <window.TweakRadio label="포인트 컬러" value={t.accent} options={['옐로우', '오렌지']} onChange={(v) => setTweak('accent', v)} />
      </window.TweaksPanel>
    </>
  );
}
window.JNDVideoApp = JNDVideoApp;

// 홈페이지 삽입용 — 컨트롤 없이 자동 반복 재생 (자동문만 18.5초)
const LOOP_CUES = { Sliding: 0, BiParting: 5, Swing: 10, Lineup: 15, Call: 1e9 };
const LOOP_TOTAL = 18.5;
function JNDDoorLoop(props) {
  const accent = props.accent || ACCENTS['옐로우'];
  const still = props.still != null && props.still !== '' ? +props.still : null;
  const ref = React.useRef(null);
  const [box, setBox] = React.useState({ w: 0, h: 0 });
  const [T, setT] = React.useState(still != null ? still : 0.6);
  React.useEffect(() => {
    const el = ref.current; if (!el) return;
    const ro = new ResizeObserver(([e]) => setBox({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el); return () => ro.disconnect();
  }, []);
  React.useEffect(() => {
    if (still != null || matchMedia('(prefers-reduced-motion: reduce)').matches) { setT(still != null ? still : 17.2); return; }
    let raf, last = null, t = 0.6, vis = true;
    const io = new IntersectionObserver(([e]) => { vis = e.isIntersecting; });
    io.observe(ref.current);
    const tick = (ts) => {
      if (last != null && vis && !document.hidden) { t = (t + Math.min(0.1, (ts - last) / 1000)) % LOOP_TOTAL; setT(t); }
      last = ts; raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); io.disconnect(); };
  }, [still]);
  const sx = box.w / 1920, sy = box.h / 1080;
  const sc = props.fit === 'contain' ? Math.min(sx, sy) : Math.max(sx, sy);
  return (
    <div ref={ref} aria-hidden="true" style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden', background: '#000' }}>
      {box.w > 0 && (
        <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1920, height: 1080, transform: `translate(-50%,-50%) scale(${sc})` }}>
          <PieceCore accent={accent} T={T} CUES={LOOP_CUES} authoredTotal={LOOP_TOTAL} only bare={!!props.bare} />
        </div>
      )}
    </div>
  );
}
window.JNDDoorLoop = JNDDoorLoop;

'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
type Ctx = { paused: boolean; toggle: () => void };
const C = createContext<Ctx>({ paused: false, toggle: () => {} });
/** 반복 모션을 멈출 수 있는 접근 가능한 제어 (WCAG 2.2.2). 선택은 localStorage 에 보관 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const [paused, setPaused] = useState(false);
  useEffect(() => { let on = false; try { on = localStorage.getItem('jnd-motion') === 'paused'; } catch {} if (!on) return; const id = requestAnimationFrame(() => setPaused(true)); return () => cancelAnimationFrame(id); }, []);
  const toggle = () => setPaused((p) => { const n = !p; try { localStorage.setItem('jnd-motion', n ? 'paused' : 'play'); } catch {} return n; });
  return <C.Provider value={{ paused, toggle }}>{children}</C.Provider>;
}
export const useMotion = () => useContext(C);
export function MotionToggle({ className }: { className?: string }) {
  const { paused, toggle } = useMotion();
  return (
    <button type="button" className={className} onClick={toggle} aria-pressed={paused} aria-label={paused ? '자동문 모션 재생' : '자동문 모션 일시정지'}>
      <i className={paused ? 'icon-play' : 'icon-pause'} aria-hidden="true" style={{ fontSize: 14 }} />{paused ? '모션 재생' : '모션 정지'}
    </button>
  );
}

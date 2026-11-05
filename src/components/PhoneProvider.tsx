'use client';
import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ROTATE_SEC } from '@/lib/site';

type Ctx = { phones: string[]; k: number; pinned: string | null; hold: (on: boolean) => void };
const PhoneCtx = createContext<Ctx>({ phones: [], k: 0, pinned: null, hold: () => {} });

/**
 * 상담 번호 강조 순환 (시안 rotateSec 2.5초). 초기 HTML 은 항상 첫 번째(대표번호)를 강조한다.
 * 포커스·호버·누르는 중(hold)에는 순환을 멈춰 버튼 글자와 tel: 대상이 어긋나지 않게 한다.
 * pinned 가 있으면(지역 상세) 순환 없이 고정 번호만 쓴다.
 */
export function PhoneProvider({ phones, pinned = null, children }: { phones: string[]; pinned?: string | null; children: ReactNode }) {
  const [k, setK] = useState(0);
  const holdRef = useRef(0);
  useEffect(() => {
    if (pinned || phones.length < 2) return;
    if (typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const id = setInterval(() => { if (holdRef.current === 0 && !document.hidden) setK((x) => (x + 1) % phones.length); }, ROTATE_SEC * 1000);
    return () => clearInterval(id);
  }, [phones.length, pinned]);
  const value = useMemo<Ctx>(() => ({ phones, k, pinned, hold: (on) => { holdRef.current = Math.max(0, holdRef.current + (on ? 1 : -1)); } }), [phones, k, pinned]);
  return <PhoneCtx.Provider value={value}>{children}</PhoneCtx.Provider>;
}

export function usePhones() {
  const c = useContext(PhoneCtx);
  const list = c.pinned ? [c.pinned] : c.phones;
  const k = c.pinned ? 0 : c.k % Math.max(1, list.length);
  const current = list[k] || list[0];
  const holdProps = {
    onMouseEnter: () => c.hold(true), onMouseLeave: () => c.hold(false), onFocus: () => c.hold(true), onBlur: () => c.hold(false),
    onPointerDown: () => c.hold(true), onPointerUp: () => c.hold(false), onPointerCancel: () => c.hold(false),
  };
  return { list, k, current, tel: 'tel:' + current, holdProps, pinned: !!c.pinned };
}

/** 헤더·하단바·상담 버튼의 숫자 롤링 (translateY(-k*20px) / 24px) */
export function RollingPhone({ h = 20 }: { h?: 20 | 24 }) {
  const { list, k, holdProps, current } = usePhones();
  if (list.length < 2) return <span style={{ fontVariantNumeric: 'tabular-nums' }}>{current}</span>;
  return (
    <span className={`rolling${h === 24 ? ' rolling-24' : ''}`} {...holdProps}>
      <span style={{ transform: `translateY(${-k * h}px)` }}>{list.map((n) => <span key={n}>{n}</span>)}</span>
    </span>
  );
}

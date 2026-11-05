'use client';
import type { ReactNode } from 'react';
import { usePhones } from './PhoneProvider';

/** 현재 강조 번호로 거는 tel: 링크. 글자(children 에 번호가 들어가면)와 href 가 같은 번호를 가리킨다 */
export default function TelLink({ className, children, label, ariaLabel }: { className?: string; children?: ReactNode; label?: 'number' | 'rolling' | 'none'; ariaLabel?: string }) {
  const { tel, current, holdProps } = usePhones();
  return (
    <a href={tel} className={className} aria-label={ariaLabel} {...holdProps}>
      {children}
      {label === 'number' ? current : null}
    </a>
  );
}

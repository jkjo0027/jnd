import type { CSSProperties } from 'react';
/** Lucide static font v0.460.0 — <i class="icon-이름"> 규칙 그대로 */
export default function Icon({ name, size, className, style }: { name: string; size?: number; className?: string; style?: CSSProperties }) {
  return <i className={`icon-${name}${className ? ' ' + className : ''}`} aria-hidden="true" style={size ? { fontSize: size, ...style } : style} />;
}

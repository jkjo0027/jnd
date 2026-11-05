export default function LogoMark({ size = 34, dark = false, ring = '#fff' }: { size?: number; dark?: boolean; ring?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" style={{ flex: 'none', display: 'block' }}>
      <path fill={dark ? '#fff' : 'var(--ink)'} fillRule="evenodd" d="M14 4h9a15 15 0 0 1 0 30h-9zM20 10v18h3a9 9 0 0 0 0-18z" />
      <path fill={dark ? 'var(--on-dark)' : 'var(--blue)'} stroke={dark ? '#14181E' : ring} strokeWidth="3" paintOrder="stroke" strokeLinejoin="round" d="M14 13h6v16a9 9 0 0 1-18 0v-1.5h6V29a3 3 0 0 0 6 0z" />
    </svg>
  );
}

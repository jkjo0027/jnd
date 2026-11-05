import 'server-only';
import crypto from 'node:crypto';
import { cookies } from 'next/headers';

/**
 * 관리자 인증. ADMIN_USERS="id:email:scrypt-hash:role,..." (해시: node scripts/admin-hash.mjs)
 * 세션: HMAC 서명 쿠키(httpOnly, SameSite=Lax, Secure in prod), 12시간. 역할: admin(승인·공개 포함 전체) | editor(글 작성·검수 요청) | viewer(열람만)
 */
export type Role = 'admin' | 'editor' | 'viewer';
export type User = { id: string; email: string; role: Role };
const COOKIE = 'jnd_admin';
const SECRET = () => process.env.ADMIN_SESSION_SECRET || '';

function users(): (User & { hash: string })[] {
  return (process.env.ADMIN_USERS || '').split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
    const [id, email, hash, role] = s.split(':');
    return { id, email, hash, role: (role as Role) || 'viewer' };
  }).filter((u) => u.id && u.hash);
}
export const configured = () => !!SECRET() && users().length > 0;

export function verifyPassword(pw: string, stored: string) {
  // 형식: scrypt$<saltHex>$<hashHex>
  const [alg, salt, hex] = stored.split('$');
  if (alg !== 'scrypt' || !salt || !hex) return false;
  const h = crypto.scryptSync(pw, Buffer.from(salt, 'hex'), 64);
  const want = Buffer.from(hex, 'hex');
  return h.length === want.length && crypto.timingSafeEqual(h, want);
}
export function hashPassword(pw: string) { const salt = crypto.randomBytes(16); return `scrypt$${salt.toString('hex')}$${crypto.scryptSync(pw, salt, 64).toString('hex')}`; }

const sign = (payload: string) => crypto.createHmac('sha256', SECRET()).update(payload).digest('base64url');
export function login(id: string, pw: string): User | null {
  if (!configured()) return null;
  const u = users().find((x) => x.id === id);
  // 존재하지 않는 계정도 같은 시간이 걸리도록 더미 해시 검증
  const ok = u ? verifyPassword(pw, u.hash) : (verifyPassword(pw, 'scrypt$00$00'), false);
  return ok && u ? { id: u.id, email: u.email, role: u.role } : null;
}
export function sessionToken(u: User) {
  const payload = Buffer.from(JSON.stringify({ id: u.id, role: u.role, exp: Date.now() + 12 * 3600 * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}
export function parseToken(tok?: string | null): User | null {
  if (!tok || !configured()) return null;
  const [payload, sig] = tok.split('.');
  if (!payload || !sig) return null;
  const want = sign(payload);
  if (want.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(want), Buffer.from(sig))) return null;
  try {
    const p = JSON.parse(Buffer.from(payload, 'base64url').toString());
    if (p.exp < Date.now()) return null;
    const u = users().find((x) => x.id === p.id);
    return u ? { id: u.id, email: u.email, role: u.role } : null;
  } catch { return null; }
}
export async function currentUser(): Promise<User | null> { return parseToken((await cookies()).get(COOKIE)?.value); }
export const cookieName = COOKIE;
export const can = (u: User | null, action: 'edit-drafts' | 'manage'): boolean => {
  if (!u) return false;
  if (u.role === 'admin') return true;
  if (action === 'edit-drafts') return u.role === 'editor';
  return false;
};

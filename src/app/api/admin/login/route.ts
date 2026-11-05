import { NextResponse, type NextRequest } from 'next/server';
import { login, sessionToken, cookieName, configured } from '@/lib/server/auth';
import { allow } from '@/lib/server/ratelimit';
import { audit } from '@/lib/server/store';
export const runtime = 'nodejs';
export async function POST(req: NextRequest) {
  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'local';
  if (!allow('login:' + ip, 10, 15 * 60 * 1000)) return NextResponse.json({ error: '잠시 후 다시 시도해 주세요.' }, { status: 429 });
  if (!configured()) return NextResponse.json({ error: '관리자 계정이 아직 설정되지 않았어요. (.env ADMIN_USERS / ADMIN_SESSION_SECRET)' }, { status: 503 });
  const fd = await req.formData();
  const id = String(fd.get('id') || '').slice(0, 64), pw = String(fd.get('pw') || '').slice(0, 200), next = String(fd.get('next') || '/admin/');
  const u = login(id, pw);
  audit({ who: id || '?', action: u ? 'login.ok' : 'login.fail', ip });
  if (!u) return NextResponse.redirect(new URL('/admin/login/?err=1', req.url), 303);
  const res = NextResponse.redirect(new URL(next.startsWith('/admin') || next.startsWith('/preview') ? next : '/admin/', req.url), 303);
  res.cookies.set(cookieName, sessionToken(u), { httpOnly: true, sameSite: 'lax', secure: process.env.NODE_ENV === 'production', path: '/', maxAge: 12 * 3600 });
  return res;
}

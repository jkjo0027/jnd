import { NextResponse, type NextRequest } from 'next/server';
import { cookieName, currentUser } from '@/lib/server/auth';
import { audit } from '@/lib/server/store';
export async function POST(req: NextRequest) {
  const u = await currentUser();
  audit({ who: u?.id || '?', action: 'logout' });
  const res = NextResponse.redirect(new URL('/admin/login/', req.url), 303);
  res.cookies.set(cookieName, '', { path: '/', maxAge: 0 });
  return res;
}

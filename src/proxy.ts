import { NextResponse, type NextRequest } from 'next/server';
/**
 * 관리자·미리보기·관리 API 보호 (Next 16 proxy). 세션 쿠키가 없으면 로그인으로 보내고, API 는 401.
 * 서명 검증은 서버(auth.ts)에서 다시 수행한다 — 여기서는 존재 여부만 빠르게 거른다.
 */
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname.startsWith('/admin/login') || pathname.startsWith('/api/admin/login');
  const has = !!req.cookies.get('jnd_admin')?.value;
  if (!open && !has) {
    if (pathname.startsWith('/api/')) return NextResponse.json({ error: 'unauthorized' }, { status: 401, headers: { 'X-Robots-Tag': 'noindex' } });
    const url = req.nextUrl.clone(); url.pathname = '/admin/login/'; url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  const res = NextResponse.next();
  res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  res.headers.set('Cache-Control', 'private, no-store');
  return res;
}
export const config = { matcher: ['/admin/:path*', '/api/admin/:path*', '/preview/:path*'] };

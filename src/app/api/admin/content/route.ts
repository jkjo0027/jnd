import { NextResponse, type NextRequest } from 'next/server';
import { currentUser, can } from '@/lib/server/auth';
import { audit } from '@/lib/server/store';
import { createPage, listPages, verifiedServices, type AuthoredPage } from '@/lib/server/content';
import type { PageType } from '@/lib/content-body';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** GET: 운영자 페이지 목록 · POST: 새 페이지(초안) 생성 → 편집 화면으로 */
export async function GET() {
  const u = await currentUser();
  if (!can(u, 'edit-drafts')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ pages: listPages().map(brief) });
}
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!can(u, 'edit-drafts')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const ct = req.headers.get('content-type') || '';
  const body = ct.includes('application/json') ? await req.json().catch(() => ({})) : Object.fromEntries((await req.formData()).entries());
  const type = String(body.type || '') as PageType;
  if (!['case', 'guide', 'service', 'region'].includes(type)) return NextResponse.json({ error: '유형을 골라 주세요.' }, { status: 400 });
  const init: Parameters<typeof createPage>[2] = { title: String(body.title || '').slice(0, 120) };
  if (type === 'region') {
    const province = String(body.province || ''), rid = String(body.rid || ''), service = String(body.service || '');
    if (!/^(seoul|gyeonggi)$/.test(province) || !/^r\d\d$/.test(rid)) return NextResponse.json({ error: '지역을 골라 주세요.' }, { status: 400 });
    if (!verifiedServices().some((s) => s.id === service)) return NextResponse.json({ error: '확인된 서비스만 고를 수 있어요.' }, { status: 400 });
    init.region = { province: province as 'seoul' | 'gyeonggi', rid }; init.service = service;
  }
  if (type === 'service') init.slug = String(body.slug || '').toLowerCase().trim() || null;
  const p = createPage(type, u!.id, init);
  audit({ who: u!.id, action: 'content.create', target: p.id, detail: type });
  if (!ct.includes('application/json')) return NextResponse.redirect(new URL(`/admin/content/${p.id}/`, req.url), 303);
  return NextResponse.json({ page: p });
}
const brief = (p: AuthoredPage) => ({ id: p.id, type: p.type, path: p.path, title: p.title, status: p.status, updatedAt: p.updatedAt, publishedAt: p.publishedAt, version: p.version, checkOk: p.check?.ok ?? null });

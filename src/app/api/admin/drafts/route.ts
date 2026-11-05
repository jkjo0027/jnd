import { NextResponse, type NextRequest } from 'next/server';
import { currentUser, can } from '@/lib/server/auth';
import { appendDraft, audit } from '@/lib/server/store';
export const runtime = 'nodejs';
/** 지역 페이지 일괄 생성·사례 편집 → 검수 대기 초안만 만든다(발행 아님). 발행은 대장(publication-ledger) 검수 절차로만 */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!can(u, 'edit-drafts')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const fd = await req.formData();
  const kind = String(fd.get('kind') || '');
  const now = new Date().toISOString();
  if (kind === 'region-batch') {
    const province = String(fd.get('province') || '').slice(0, 10), rid = String(fd.get('rid') || '').slice(0, 5);
    const services = fd.getAll('service').map(String).filter((s) => ['repair', 'install', 'sensor', 'motor', 'glass-door'].includes(s));
    if (!/^(seoul|gyeonggi)$/.test(province) || !/^r\d{2}$/.test(rid) || !services.length) return NextResponse.json({ error: 'invalid' }, { status: 400 });
    for (const s of services) appendDraft({ kind: 'region-service', pageId: `${rid.toUpperCase()}-${s}`, path: `/areas/${province}/${rid}/${s}/`, status: 'candidate', createdBy: u!.id, createdAt: now, note: String(fd.get('note') || '').slice(0, 500) });
    audit({ who: u!.id, action: 'drafts.region-batch', target: `${province}/${rid}`, detail: services.join(',') });
    return NextResponse.redirect(new URL('/admin/pages/?created=' + services.length, req.url), 303);
  }
  if (kind === 'case') {
    const d = { kind: 'case', caseId: String(fd.get('caseId') || '').slice(0, 20), place: String(fd.get('place') || '').slice(0, 80), title: String(fd.get('title') || '').slice(0, 80), sym: String(fd.get('sym') || '').slice(0, 200), check: String(fd.get('check') || '').slice(0, 1000), act: String(fd.get('act') || '').slice(0, 1000), res: String(fd.get('res') || '').slice(0, 1000), status: 'review', createdBy: u!.id, createdAt: now };
    appendDraft(d); audit({ who: u!.id, action: 'drafts.case', target: d.caseId || '(new)' });
    return NextResponse.redirect(new URL('/admin/cases/?saved=1', req.url), 303);
  }
  return NextResponse.json({ error: 'invalid' }, { status: 400 });
}

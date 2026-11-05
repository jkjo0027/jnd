import { NextResponse, type NextRequest } from 'next/server';
import { currentUser, can } from '@/lib/server/auth';
import { audit } from '@/lib/server/store';
import { processUpload, MAX_MB, ALLOWED } from '@/lib/server/uploads';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 사진 다중 업로드(multipart, 필드 file). 파일마다 개별 결과를 돌려주므로 실패한 것만 다시 올릴 수 있다 */
export async function POST(req: NextRequest) {
  const u = await currentUser();
  if (!can(u, 'edit-drafts')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  const len = Number(req.headers.get('content-length') || 0);
  if (len > (MAX_MB * 10 + 2) * 1024 * 1024) return NextResponse.json({ error: `한 번에 올리는 용량이 너무 커요(최대 ${MAX_MB}MB × 10장).` }, { status: 413 });
  let fd: FormData;
  try { fd = await req.formData(); } catch { return NextResponse.json({ error: '업로드 요청을 읽지 못했어요. 다시 시도해 주세요.' }, { status: 400 }); }
  const files = fd.getAll('file').filter((f): f is File => f instanceof File).slice(0, 10);
  if (!files.length) return NextResponse.json({ error: '파일이 없어요.' }, { status: 400 });
  const results = [];
  for (const f of files) {
    const bytes = Buffer.from(await f.arrayBuffer());
    const r = await processUpload({ name: f.name, bytes }, u!.id);
    results.push(r.upload ? { ok: true, name: f.name, upload: r.upload } : { ok: false, name: f.name, error: r.error });
  }
  audit({ who: u!.id, action: 'uploads', detail: `${results.filter((r) => r.ok).length}/${results.length}` });
  return NextResponse.json({ results, limits: { maxMb: MAX_MB, allowed: ALLOWED } });
}
export async function GET() {
  const u = await currentUser();
  if (!can(u, 'edit-drafts')) return NextResponse.json({ error: 'forbidden' }, { status: 403 });
  return NextResponse.json({ limits: { maxMb: MAX_MB, allowed: ALLOWED, maxCount: 10 } });
}

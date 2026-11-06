import { NextResponse, type NextRequest, after } from 'next/server';
import { revalidatePath } from 'next/cache';
import { currentUser, can } from '@/lib/server/auth';
import { audit } from '@/lib/server/store';
import { getPage, liveByPath, savePage, validatePage, setStatus, postPublishCheck, postUnpublishCheck, listSnapshots, restoreSnapshot, deleteDraft, findSimilar, snapshot } from '@/lib/server/content';
import { StorageConflict } from '@/lib/server/persistence';
import { removeUploads } from '@/lib/server/uploads';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const inflight = new Set<string>(); // 같은 글의 발행 중복 클릭·동시 발행 방지(프로세스 내)
const revalidateFor = (paths: string[]) => { for (const p of new Set(paths)) {
    try {
        revalidatePath(p);
    }
    catch { }
} };
async function GETImpl(_req: NextRequest, ctx: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await currentUser();
    if (!can(u, 'edit-drafts'))
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const p = (await getPage((await ctx.params).id));
    if (!p)
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ page: p, validation: (await validatePage(p)), snapshots: (await listSnapshots(p.id)), canPublish: can(u, 'manage') });
}
/** 자동저장 */
async function PUTImpl(req: NextRequest, ctx: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await currentUser();
    if (!can(u, 'edit-drafts'))
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== 'object')
        return NextResponse.json({ error: 'invalid' }, { status: 400 });
    const r = (await savePage(id, u!.id, body.patch || {}, typeof body.ifVersion === 'number' ? body.ifVersion : undefined));
    if (!r.page)
        return NextResponse.json({ error: r.error }, { status: r.status || 400 });
    return NextResponse.json({ page: r.page, validation: (await validatePage(r.page)), savedAt: r.page.updatedAt });
}
/** 행동: submit(검수 요청) · publish(승인·공개) · unpublish(비공개) · recheck(검색 발견 준비 재검사) · restore(이력 복원) · delete(초안 삭제) · similar */
async function POSTImpl(req: NextRequest, ctx: {
    params: Promise<{
        id: string;
    }>;
}) {
    const u = await currentUser();
    if (!can(u, 'edit-drafts'))
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const { id } = await ctx.params;
    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');
    const p = (await getPage(id));
    if (!p)
        return NextResponse.json({ error: 'not found' }, { status: 404 });
    const origin = new URL(process.env.NEXT_PUBLIC_SITE_URL || req.url).origin;
    if (action === 'similar')
        return NextResponse.json({ similar: (await findSimilar(p)) });
    if (action === 'submit') {
        const v = (await validatePage(p));
        if (v.errors.length)
            return NextResponse.json({ error: '필수 항목을 먼저 채워 주세요.', validation: v }, { status: 400 });
        const n = (await setStatus(id, u!.id, 'review', {}, 'submit', p.version));
        (await audit({ who: u!.id, action: 'content.submit', target: id }));
        return NextResponse.json({ page: n, validation: v });
    }
    if (action === 'publish') {
        if (!can(u, 'manage'))
            return NextResponse.json({ error: '승인·공개 권한(admin)이 필요해요. 검수 요청으로 넘겨 주세요.' }, { status: 403 });
        const v = (await validatePage(p));
        if (v.errors.length)
            return NextResponse.json({ error: '발행 조건을 통과하지 못했어요.', validation: v }, { status: 400 });
        if (typeof body.ifVersion === 'number' && body.ifVersion !== p.version)
            return NextResponse.json({ error: '편집 중 버전이 바뀌었어요. 새로고침 후 다시 발행해 주세요.' }, { status: 409 });
        if (inflight.has(id))
            return NextResponse.json({ error: '이미 발행 중이에요.' }, { status: 409 });
        inflight.add(id);
        try {
            const now = new Date().toISOString();
            const pub = (await setStatus(id, u!.id, 'publishing', { publishedAt: p.publishedAt || now, reviewedBy: u!.id, reviewedAt: now, lastPublishedVersion: p.version + 1, check: null }, 'publish', p.version))!;
            revalidateFor([pub.path, pub.hub, '/sitemap.xml', '/cases/', '/guides/', '/services/', '/areas/seoul/', '/areas/gyeonggi/']);
            (await audit({ who: u!.id, action: 'content.publish', target: id, detail: pub.path }));
            // 캐시 재검증은 이 응답이 끝난 뒤 반영된다 → 검색 발견 준비 검사는 응답 후 실행하고 결과를 저장(화면은 상태를 폴링)
            after(async () => {
                try {
                    const check = await postPublishCheck(origin, pub);
                    (await setStatus(id, u!.id, check.ok ? 'published' : 'error', { check: { at: new Date().toISOString(), ...check } }, check.ok ? 'published' : 'publish-check-failed', pub.version));
                    (await audit({ who: 'system', action: 'content.publish-check', target: id, detail: check.ok ? 'ok' : 'failed: ' + check.items.filter((i) => !i.ok).map((i) => i.k).join(',') }));
                }
                catch (e) {
                    if (e instanceof StorageConflict) return;
                    (await setStatus(id, u!.id, 'error', { check: { at: new Date().toISOString(), ok: false, items: [{ k: '검사 실행', ok: false, detail: String(e).slice(0, 200) }] } }, 'publish-check-error', pub.version));
                }
                finally {
                    inflight.delete(id);
                }
            });
            return NextResponse.json({ page: pub, validation: v, pending: true });
        }
        catch (e) {
            inflight.delete(id);
            throw e;
        }
    }
    if (action === 'recheck') {
        if (!['published', 'error', 'publishing'].includes(p.status))
            return NextResponse.json({ error: '공개된 글만 검사해요.' }, { status: 400 });
        revalidateFor([p.path, p.hub, '/sitemap.xml']);
        const pending = (await setStatus(id, u!.id, 'publishing', {}, 'recheck', p.version))!;
        after(async () => { const check = await postPublishCheck(origin, (await liveByPath(p.path)) || pending); (await setStatus(id, u!.id, check.ok ? 'published' : 'error', { check: { at: new Date().toISOString(), ...check } }, 'recheck-done', pending.version).catch((e) => { if (!(e instanceof StorageConflict)) throw e; })); });
        return NextResponse.json({ page: pending, pending: true });
    }
    if (action === 'unpublish') {
        if (!can(u, 'manage'))
            return NextResponse.json({ error: '비공개 전환은 승인 권한이 필요해요.' }, { status: 403 });
        const n = (await setStatus(id, u!.id, 'unpublished', {}, 'unpublish', p.version))!;
        revalidateFor([n.path, n.hub, '/sitemap.xml', '/cases/', '/guides/', '/services/', '/areas/seoul/', '/areas/gyeonggi/']);
        (await audit({ who: u!.id, action: 'content.unpublish', target: id, detail: n.path }));
        after(async () => { const check = await postUnpublishCheck(origin, n); (await setStatus(id, u!.id, 'unpublished', { check: { at: new Date().toISOString(), ...check } }, 'unpublish-check', n.version).catch((e) => { if (!(e instanceof StorageConflict)) throw e; })); });
        return NextResponse.json({ page: n, pending: true });
    }
    if (action === 'restore') {
        const version = Number(body.version);
        const n = (await restoreSnapshot(id, version, u!.id));
        if (!n)
            return NextResponse.json({ error: '복원할 버전이 없어요.' }, { status: 404 });
        if (['published', 'error'].includes(n.status))
            revalidateFor([n.path, n.hub, '/sitemap.xml']);
        (await audit({ who: u!.id, action: 'content.restore', target: id, detail: `v${version}` }));
        return NextResponse.json({ page: n, validation: (await validatePage(n)), snapshots: (await listSnapshots(id)) });
    }
    if (action === 'snapshot') {
        (await snapshot(p));
        return NextResponse.json({ snapshots: (await listSnapshots(id)) });
    }
    if (action === 'delete') {
        const r = (await deleteDraft(id));
        if (!r.ok)
            return NextResponse.json({ error: '발행된 적 있는 글은 삭제 대신 비공개로 전환해요.' }, { status: 400 });
        (await removeUploads(r.freedPhotos));
        (await audit({ who: u!.id, action: 'content.delete', target: id, detail: `photos freed ${r.freedPhotos.length}` }));
        return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ error: 'invalid action' }, { status: 400 });
}

export async function GET(...args: Parameters<typeof GETImpl>) {
  try { return await GETImpl(...args); }
  catch (error) {
    if (error instanceof StorageConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Content storage operation failed", error);
    return NextResponse.json({ error: "저장소에 연결하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요." }, { status: 503 });
  }
}

export async function PUT(...args: Parameters<typeof PUTImpl>) {
  try { return await PUTImpl(...args); }
  catch (error) {
    if (error instanceof StorageConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Content storage operation failed", error);
    return NextResponse.json({ error: "저장소에 연결하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요." }, { status: 503 });
  }
}

export async function POST(...args: Parameters<typeof POSTImpl>) {
  try { return await POSTImpl(...args); }
  catch (error) {
    if (error instanceof StorageConflict) return NextResponse.json({ error: error.message }, { status: 409 });
    console.error("Content storage operation failed", error);
    return NextResponse.json({ error: "저장소에 연결하지 못했어요. 입력 내용을 유지한 채 다시 시도해 주세요." }, { status: 503 });
  }
}

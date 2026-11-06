import { NextResponse, type NextRequest } from 'next/server';
import { currentUser, can } from '@/lib/server/auth';
import { searchPublicPaths, hubOptions, regionOptions, verifiedServices } from '@/lib/server/content';
import kwJson from '../../../../../data/registry/keyword-map.json';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
type Kw = {
    keywordId: string;
    keyword: string;
    intent: string;
    areaLabel: string;
    candidatePath: string;
};
const KW = (kwJson as {
    keywords: Kw[];
}).keywords;
const key = (s: string) => s.normalize('NFC').replace(/\s+/g, '').toLowerCase();
/** 편집 화면용 조회: kind=keywords|paths|options */
export async function GET(req: NextRequest) {
    const u = await currentUser();
    if (!can(u, 'edit-drafts'))
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
    const sp = req.nextUrl.searchParams;
    const kind = sp.get('kind') || 'options';
    const q = (sp.get('q') || '').slice(0, 60);
    if (kind === 'keywords') {
        const k = key(q);
        const hits = k ? KW.filter((x) => key(x.keyword).includes(k) || key(x.intent).includes(k)).slice(0, 30) : [];
        return NextResponse.json({ keywords: hits.map((x) => ({ id: x.keywordId, keyword: x.keyword, intent: x.intent, area: x.areaLabel, path: x.candidatePath })) });
    }
    if (kind === 'paths')
        return NextResponse.json({ paths: (await searchPublicPaths(q)) });
    return NextResponse.json({ hubs: hubOptions(), regions: regionOptions(), services: verifiedServices() });
}

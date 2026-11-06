import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/admin';
import { audit } from '@/lib/server/store';
import RegionPageView from '@/components/RegionPage';
import GuidePageView from '@/components/GuidePage';
import { regionPageByPath } from '@/content/gen/compose';
import { ALL_GUIDES } from '@/content/guides';
import { recordByPath } from '@/lib/registry';
import { CASES } from '@/content/site-data';
import Link from 'next/link';
export const dynamic = 'force-dynamic';
/** 보호된 미리보기: 대장에 있는 초안(지역·가이드·사례)을 인증된 사용자만 열람. 공개 라우트와 분리되며 noindex */
export default async function Preview({ params }: {
    params: Promise<{
        slug: string[];
    }>;
}) {
    const { user } = await requireUser();
    const path = '/' + (await params).slug.join('/') + '/';
    const rec = recordByPath(path);
    if (!rec)
        notFound();
    (await audit({ who: user.id, action: 'preview', target: path }));
    const r = regionPageByPath(path);
    if (r)
        return <RegionPageView g={r} draft/>;
    const g = ALL_GUIDES.find((x) => x.path === path);
    if (g)
        return <GuidePageView g={g} draft/>;
    const c = CASES.find((x) => `/cases/${x.id}/` === path);
    return (<main className="page-narrow">
      <div className="draft-banner" style={{ position: 'static', marginBottom: 24 }}><span>{rec.pageId}</span><span>{rec.status}</span><span>{rec.coverageEvidence}</span></div>
      {c ? (<>
          <p style={{ color: 'var(--blue-t)', fontWeight: 700 }}>{c.place} · {c.svcT}</p>
          <h1>{c.title}</h1>
          <img src={c.img} alt={`${c.place} ${c.title}`} style={{ width: '100%', borderRadius: 20, margin: '16px 0' }}/>
          <p><b>증상</b> {c.sym}</p><p><b>점검</b> {c.check}</p><p><b>조치</b> {c.act}</p><p><b>결과</b> {c.res}</p>
        </>) : (<>
          <h1>{rec.pageId}</h1>
          <p>{rec.primaryIntent}</p>
          <p style={{ color: 'var(--g600)' }}>이 후보는 아직 본문 초안이 없어요. 근거 확보 후 작성합니다. 게시 조건: {rec.notes}</p>
          {rec.mergeTarget && <p>통합 대상: <Link href={'/admin/preview' + rec.mergeTarget}>{rec.mergeTarget}</Link></p>}
        </>)}
      <p><Link href="/admin/pages/">← 페이지 대장</Link></p>
    </main>);
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { pageMeta } from '@/lib/seo';
import { publicCases, caseById } from '@/lib/gate';
import { SVCS } from '@/content/site-data';
import { SERVICES } from '@/content/services';
import { isPublicPath, recordById } from '@/lib/registry';
import { regionLink } from '@/lib/links';
import AuthoredPageView from '@/components/AuthoredPage';
import { liveByPath } from '@/lib/server/content';
/** 레지스트리 사례는 빌드 시 생성, 운영자가 관리자에서 발행한 사례는 요청 시 저장소에서 찾는다(없으면 404) */
export const dynamicParams = true;
export function generateStaticParams() { return publicCases().map((c) => ({ id: c.id })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        id: string;
    }>;
}): Promise<Metadata> {
    const { id } = await params;
    const c = caseById(id);
    if (!c) {
        const a = (await liveByPath(`/cases/${id}/`));
        return a ? pageMeta({ title: a.seoTitle || `${a.title} | 제이앤디시스템`, description: a.seoDesc || a.summary, path: a.path, image: a.photos[0] ? `/uploads/${a.photos[0].id}-${a.photos[0].sizes[a.photos[0].sizes.length - 1]}.webp` : undefined }) : {};
    }
    return pageMeta({ title: `${c.place} ${c.title} 시공사례 | 제이앤디시스템`, description: `${c.place} 자동문 ${c.sym} 증상을 ${c.title}으로 해결한 시공사례. 점검부터 조치·결과까지 현장 기록을 확인하세요.`, path: `/cases/${c.id}/`, image: c.img });
}
export default async function CaseDetail({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const c = caseById(id);
    if (!c) {
        const a = (await liveByPath(`/cases/${id}/`));
        if (a)
            return <AuthoredPageView p={a}/>;
        notFound();
    }
    const rec = recordById(`CASE-${c.id}`);
    const svcCard = SVCS.find((v) => v.id === c.svc);
    const svcPage = SERVICES.find((s) => s.id === c.svc && isPublicPath(s.path));
    const others = publicCases().filter((x) => x.id !== c.id).slice(0, 3);
    const rl = regionLink(c.province, c.regionId);
    const steps = [{ k: '증상', v: c.sym, icon: 'circle-alert', n: '01' }, { k: '점검', v: c.check, icon: 'search', n: '02' }, { k: '조치', v: c.act, icon: 'wrench', n: '03' }, { k: '결과', v: c.res, icon: 'circle-check', n: '04' }];
    return (<PublicShell>
      <main className="page-narrow cased">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '시공사례', path: '/cases/' }, { name: c.title, path: `/cases/${c.id}/` }]}/>
        <p className="k">{c.place} · {svcCard?.t || c.svcT}</p>
        <h1>{c.title}</h1>
        <div className="photo"><img src={c.img} alt={`${c.place} ${c.title}`} width={800} height={600} className="img-cover"/></div>
        <ol className="steps4">{steps.map((t) => <li key={t.k}><span className="ic"><Icon name={t.icon}/></span><div><p className="kk">{t.n} {t.k}</p><p className="v">{t.v}</p></div></li>)}</ol>
        <h2>현장 정보</h2>
        <dl className="meta">
          <dt>현장 유형</dt><dd>{c.place}</dd>
          <dt>지역</dt><dd>{c.city}{c.gu !== '전체' ? ' ' + c.gu : ''} (익명화)</dd>
          <dt>제품·부품</dt><dd>{c.brand} · {c.svcT}</dd>
          <dt>작업 구분</dt><dd>{c.kind === 'repair' ? '수리' : '설치·교체'}</dd>
          <dt>검증</dt><dd>{rec?.coverageEvidence || '검수 기록 없음'}</dd>
        </dl>
        <div className="cta-box">
          <p className="q">같은 증상으로 고민 중이세요?</p>
          <TelLink className="btn btn-primary"><Icon name="phone" size={20}/>전화 상담 <RollingPhone h={24}/></TelLink>
          {svcPage && <Link href={svcPage.path} className="btn btn-outline">{svcPage.h1} 안내</Link>}
          <Link href={rl.href} className="btn btn-outline">{c.area} 지역 안내 보기</Link>
        </div>
        {others.length > 0 && (<>
            <h2>다른 사례</h2>
            <div className="case-list-sm">
              {others.map((o) => (<Link key={o.id} href={`/cases/${o.id}/`} className="case-sm">
                  <span className="th" style={{ width: 56, height: 56 }}><img src={o.img} alt={`${o.place} ${o.title}`} loading="lazy" width={800} height={600} className="img-cover"/></span>
                  <span className="tx"><span className="k" style={{ display: 'block' }}>{o.place}</span><span className="t" style={{ display: 'block' }}>{o.title}</span></span>
                </Link>))}
            </div>
          </>)}
      </main>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

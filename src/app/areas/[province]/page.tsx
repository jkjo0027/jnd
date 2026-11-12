import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { pageMeta } from '@/lib/seo';
import { isPublicPath, aliasesOf } from '@/lib/registry';
import { regionPath } from '@/lib/links';
import { SERVICES } from '@/content/services';
import AuthoredList from '@/components/AuthoredList';
import { livePages } from '@/lib/server/content';
import { publicCases } from '@/lib/gate';
import { REGIONS, SERVICE_IDS, SERVICE_BLOCKS } from '@/content/gen/compose';
const P = {
    seoul: { name: '서울', path: '/areas/seoul/', title: '서울 자동문 수리·설치 | 25개 자치구 출장 안내 | 제이앤디시스템', description: '서울 25개 자치구 상가·병원·사무실·공용현관 자동문 수리와 설치. 자치구별 현장 특성, 출장 범위, 수리·설치·센서·모터·강화도어 서비스 안내. 평택 본사 기사 직접 출장.', lead: '서울 25개 자치구 전역에 평택 본사 기사가 직접 출장해요. 테헤란로 오피스, 홍대·연남 상권, 노원·목동 대단지 아파트, 가산·구로 지식산업센터처럼 자치구마다 현장 특성이 달라 자치구별 안내 페이지를 따로 두었어요. 금천구·용산구 등 실제 수리 사례가 있어요.' },
    gyeonggi: { name: '경기', path: '/areas/gyeonggi/', title: '경기 자동문 수리·설치 | 31개 시·군 출장 안내 | 제이앤디시스템', description: '경기 31개 시·군 자동문 수리·설치. 평택 본사에서 수원·화성·용인·성남·안양 등 당일·긴급 출장. 시·군별 현장 특성, 생활권 표기, 서비스별 안내 페이지와 실제 시공사례.', lead: '평택 본사에서 경기도 31개 시·군 전역에 당일·긴급 출장해요. 수원·화성·용인·오산·안성처럼 본사와 가까운 지역부터 가평·연천·포천 같은 경기 북부·동부까지 시·군별 안내 페이지가 있어요. "경기도"·"경기" 표기와 동탄·분당·광교 같은 생활권 이름은 모두 해당 시·군 페이지에서 안내해요.' },
} as const;
type Prov = keyof typeof P;
export const dynamicParams = false;
export function generateStaticParams() { return (Object.keys(P) as Prov[]).filter((p) => isPublicPath(P[p].path)).map((province) => ({ province })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        province: string;
    }>;
}): Promise<Metadata> {
    const p = P[(await params).province as Prov];
    if (!p)
        return {};
    return pageMeta({ title: p.title, description: p.description, path: p.path });
}
export default async function ProvinceHub({ params }: {
    params: Promise<{
        province: string;
    }>;
}) {
    const prov = (await params).province as Prov;
    const p = P[prov];
    if (!p || !isPublicPath(p.path))
        notFound();
    const regions = REGIONS.filter((r) => r.province === prov);
    const cases = publicCases().filter((c) => c.province === prov);
    const svcs = SERVICES.filter((s) => isPublicPath(s.path));
    return (<PublicShell>
      <main className="page">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '출장 지역', path: '/areas/' }, { name: p.name, path: p.path }]}/>
        <h1 style={{ margin: '0 0 16px', fontSize: 'var(--fs-d)', letterSpacing: '-0.035em', fontWeight: 800, lineHeight: 1.2 }}>{p.name} 자동문 수리·설치</h1>
        <p style={{ margin: '0 0 40px', fontSize: 'var(--fs-3)', lineHeight: 1.6, color: 'var(--g600)', maxWidth: 760 }}>{p.lead}</p>
        <h2 style={{ margin: '0 0 16px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>서비스</h2>
        <div className="related">{svcs.map((s) => <Link key={s.id} href={s.path}>{s.h1}<Icon name="arrow-right" size={14}/></Link>)}</div>
        <h2 style={{ margin: '0 0 8px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>{p.name} 지역별 안내</h2>
        <p style={{ margin: '0 0 24px', fontSize: 'var(--fs-s)', lineHeight: 1.6, color: 'var(--g600)' }}>지역 이름을 누르면 수리 안내로, 아래 작은 링크는 설치·센서·모터·강화도어 안내로 이동해요. 모든 지역이 출장 범위예요.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(min(100%,320px),1fr))', gap: 12, marginBottom: 48 }}>
          {regions.map((r) => {
            const aliases = aliasesOf(r.rid).filter((a) => a.kind === 'living-area').map((a) => a.alias);
            const links = SERVICE_IDS.map((s) => ({ s, p: regionPath(prov, r.rid, s) })).filter((x) => isPublicPath(x.p));
            const main = links.find((x) => x.s === 'repair') || links[0];
            return (<article key={r.rid} id={r.rid} style={{ padding: 20, borderRadius: 'var(--r-l)', background: '#fff', boxShadow: 'var(--sh-1)', scrollMarginTop: 84 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>{main ? <Link href={main.p} style={{ color: 'var(--ink)' }}>{r.name}</Link> : r.name}{aliases.length > 0 && <small style={{ marginLeft: 8, fontSize: 'var(--fs-c)', fontWeight: 600, color: 'var(--g500)' }}>{aliases.slice(0, 3).join('·')}</small>}</h3>
                <p style={{ margin: '0 0 10px', fontSize: 'var(--fs-c)', lineHeight: 1.6, color: 'var(--g600)' }}>{r.zones.slice(0, 3).join(' · ')}</p>
                <p style={{ margin: '0 0 12px', fontSize: 'var(--fs-s)', lineHeight: 1.65, color: 'var(--g700)' }}>{r.profile.split('. ')[0]}.</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>{links.map((x) => <Link key={x.p} href={x.p} className="tag" style={{ textDecoration: 'none' }}>{SERVICE_BLOCKS[x.s].label.replace('자동문 ', '')}</Link>)}</div>
              </article>);
        })}
        </div>
        <AuthoredList pages={(await livePages()).filter((x) => (x.type === 'region' || x.type === 'case') && x.hub === p.path)} heading={`${p.name} 추가 안내`}/>
        {cases.length > 0 && (<>
            <h2 style={{ margin: '0 0 16px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>{p.name} 시공사례</h2>
            <div className="case-list-sm" style={{ maxWidth: 760 }}>
              {cases.map((c) => (<Link key={c.id} href={`/cases/${c.id}/`} className="case-sm">
                  <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover"/></span>
                  <span className="tx"><span className="k" style={{ display: 'block' }}>{c.place} · {c.svcT}</span><span className="t" style={{ display: 'block' }}>{c.title}</span></span>
                  <Icon name="chevron-right" className="ch"/>
                </Link>))}
            </div>
          </>)}
        <div className="cta-box" style={{ maxWidth: 760 }}>
          <p className="q">{p.name} 지역 자동문 출장 상담</p>
          <TelLink className="btn btn-primary"><Icon name="phone" size={20}/>전화 상담 <RollingPhone h={24}/></TelLink>
          <Link href="/contact/#inquiry" className="btn btn-g100">문의 남기기</Link>
        </div>
      </main>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

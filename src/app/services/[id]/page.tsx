import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { pageMeta } from '@/lib/seo';
import { SERVICES, serviceById, symsOf } from '@/content/services';
import { ALL_GUIDES } from '@/content/guides';
import { FAQ, SVCS } from '@/content/site-data';
import { isPublicPath, recordByPath } from '@/lib/registry';
import { publicCases } from '@/lib/gate';
import { INFO } from '@/lib/site';
import { TAG_PARAS, SAFETY, GLOSSARY } from '@/content/gen/blocks-common';
import { SERVICE_BLOCKS, REGIONS, type ServiceId } from '@/content/gen/compose';
import { regionPath } from '@/lib/links';
import { JsonLd } from '@/lib/seo';
import AuthoredPageView from '@/components/AuthoredPage';
import { liveByPath } from '@/lib/server/content';
export const dynamicParams = true;
export function generateStaticParams() {
    return SERVICES.filter((s) => isPublicPath(s.path)).map((s) => ({ id: s.id }));
}
export async function generateMetadata({ params }: {
    params: Promise<{
        id: string;
    }>;
}): Promise<Metadata> {
    const { id } = await params;
    const s = serviceById(id);
    if (!s) {
        const a = (await liveByPath(`/services/${id}/`));
        return a ? pageMeta({ title: a.seoTitle || `${a.title} | 제이앤디시스템`, description: a.seoDesc || a.summary, path: a.path }) : {};
    }
    return pageMeta({ title: s.title, description: s.description, path: s.path });
}
export default async function ServiceDetail({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const s = serviceById(id);
    if (!s) {
        const a = (await liveByPath(`/services/${id}/`));
        if (a)
            return <AuthoredPageView p={a}/>;
        notFound();
    }
    if (!isPublicPath(s.path))
        notFound();
    const cases = publicCases().filter((c) => s.caseIds.includes(c.id));
    const guides = ALL_GUIDES.filter((g) => s.guideIds.includes(g.id) && isPublicPath(g.path));
    const card = SVCS.find((v) => v.id === s.id);
    const B = SERVICE_BLOCKS[(['repair', 'install', 'sensor', 'motor', 'glass-door'].includes(s.id) ? s.id : s.id === 'switch' ? 'repair' : 'repair') as ServiceId];
    const tagKeys = ['office', 'commercial', 'apartment', 'villa', 'factory', 'hospital', 'school', 'logistics'] as const;
    // 지역 링크는 전 지역 나열 대신 우선 지역(본사 평택·수원·화성·용인) + 지역 근거가 있는 A 등급 페이지만. 나머지는 광역 허브에서 탐색
    const PRIORITY = ['r53', 'r38', 'r56', 'r48'];
    const linkSvc: ServiceId = B.id === 'install' ? 'install' : 'repair'; // 지역 센서·모터 페이지는 지역 수리 페이지(센서·모터·컨트롤러 절)로 통합됨
    const regionLinks = REGIONS.filter((r) => PRIORITY.includes(r.rid) || recordByPath(regionPath(r.province, r.rid, linkSvc))?.qualityClass === 'A')
        .sort((a, b) => (PRIORITY.indexOf(a.rid) + 1 || 99) - (PRIORITY.indexOf(b.rid) + 1 || 99))
        .map((r) => ({ t: linkSvc === B.id ? r.short : `${r.short} 자동문 수리`, href: regionPath(r.province, r.rid, linkSvc) })).filter((x) => isPublicPath(x.href)).slice(0, 8)
        .concat([{ t: '서울 전체 지역', href: '/areas/seoul/' }, { t: '경기 전체 지역', href: '/areas/gyeonggi/' }].filter((x) => isPublicPath(x.href)));
    const hs = Array.from(s.id).reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
    const genFaq = B.faq.map((f, i) => ({ q: f.q[(hs + i) % f.q.length].replace(/\{r\}/g, '서울·경기'), a: f.a[(hs + i) % f.a.length].replace(/\{r\}/g, '서울·경기') }));
    const genSyms = B.symptoms.map((y, i) => ({ t: y.t, icon: y.icon, cause: y.cause[(hs + i) % y.cause.length], action: y.action[(hs + i + 1) % y.action.length] }));
    const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [...s.faqIdx.map((i) => FAQ[i]).filter(Boolean).map((f) => ({ q: f.q, a: f.a })), ...genFaq].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
    return (<PublicShell>
      <main className="page-narrow svcd">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '서비스', path: '/services/' }, { name: s.h1, path: s.path }]}/>
        <span className="ic"><Icon name={s.icon}/></span>
        <h1>{s.h1}</h1>
        <p className="lede">{s.lead}</p>
        {s.id === 'install' && <p id="machine" className="sr-only">자동문 기계(오퍼레이터·레일·행거) 설치·교체</p>}
        {s.extra && s.extra.map((t, i) => <p key={i} className="lede" style={{ fontSize: 'var(--fs-b)', color: 'var(--g700)', marginBottom: 16 }}>{t}</p>)}
        <h2>작업 범위</h2>
        <ul className="checks">{s.scope.map((it) => <li key={it}><Icon name="check"/>{it}</li>)}</ul>
        {symsOf(s).length > 0 && (<>
            <h2>이런 증상이면 {card ? card.t : s.h1}를 확인해요</h2>
            <div className="sym-cards">
              {symsOf(s).map((y) => <div key={y.id} className="sym-card"><p className="t"><Icon name={y.icon}/>{y.t}</p><p className="d">{y.cause}</p></div>)}
            </div>
          </>)}
        <h2>작업 절차</h2>
        <ol className="proc">{s.procedure.map((p, i) => <li key={p.t}><i>{i + 1}</i><div><p className="t">{p.t}</p><p className="d">{p.d}</p></div></li>)}</ol>
        <h2>수리·교체 판단</h2>
        <div className="decide">{s.decision.map((d) => <div key={d.t}><p className="t">{d.t}</p><p className="d">{d.d}</p></div>)}</div>
        <div className="cost">
          <p className="k">비용</p>
          <p>출장비 {INFO.fee} · 부품비와 작업비는 현장 점검 후 먼저 안내해 드려요. 비용에 영향을 주는 조건:</p>
          <ul>{s.quoteFactors.map((f) => <li key={f}>{f}</li>)}</ul>
        </div>
        <h2>상담 때 알려주시면 빨라요</h2>
        <ul className="checks">{s.customerInfo.map((it) => <li key={it}><Icon name="check"/>{it}</li>)}</ul>
        <div className="ev"><b>근거</b>{s.evidence.join(' · ')}</div>
        <h2>현장 유형별 점검 포인트</h2>
        <div className="sym-cards">{tagKeys.map((t, i) => <div key={t} className="sym-card"><p className="d" style={{ color: 'var(--g700)', fontSize: 'var(--fs-b)' }}>{TAG_PARAS[t][(hs + i) % TAG_PARAS[t].length].replace(/\{r\}/g, '서울·경기')}</p></div>)}</div>
        <h2>증상별 원인과 조치 더 보기</h2>
        <div className="sym-cards">{genSyms.map((y) => <div key={y.t} className="sym-card"><p className="t"><Icon name={y.icon}/>{y.t}</p><p className="d">{y.cause} 조치: {y.action}</p></div>)}</div>
        <h2>용어 설명</h2>
        <div className="decide">{GLOSSARY[B.id].map((x) => <div key={x.t}><p className="t">{x.t}</p><p className="d">{x.d}</p></div>)}</div>
        <h2>기다리는 동안 안전하게</h2>
        <p className="lede" style={{ fontSize: 'var(--fs-b)' }}>{SAFETY[hs % SAFETY.length]}</p>
        <h2>{card ? card.t : s.h1} 시공사례</h2>
        {cases.length ? (<div className="case-list-sm">
            {cases.map((c) => (<Link key={c.id} href={`/cases/${c.id}/`} className="case-sm">
                <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover"/></span>
                <span className="tx"><span className="k" style={{ display: 'block' }}>{c.place}</span><span className="t" style={{ display: 'block' }}>{c.title}</span></span>
                <Icon name="chevron-right" className="ch"/>
              </Link>))}
          </div>) : <p className="empty-note">아직 등록된 {card ? card.t : s.h1} 시공사례가 없어요.</p>}
        {guides.length > 0 && (<>
            <h2>관련 증상 가이드</h2>
            <div className="sym-cards">{guides.map((g) => <Link key={g.id} href={g.path} className="sym-card" style={{ textDecoration: 'none', color: 'var(--ink)' }}><p className="t">{g.h1}<span style={{ marginLeft: 'auto', fontSize: 'var(--fs-c)', color: 'var(--blue-t)' }}>가이드 →</span></p><p className="d">{g.question} — {g.answer}</p></Link>)}</div>
          </>)}
        {s.faqIdx.length > 0 && (<>
            <h2>자주 묻는 질문</h2>
            <div style={{ marginBottom: 40 }}>{s.faqIdx.map((i) => FAQ[i]).filter(Boolean).map((f) => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</div>
          </>)}
        {genFaq.length > 0 && (<><h2>더 자주 묻는 질문</h2><div style={{ marginBottom: 40 }}>{genFaq.map((f) => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</div></>)}
        {regionLinks.length > 0 && (<><h2>지역별 {s.h1} 안내</h2><p className="lede" style={{ fontSize: 'var(--fs-b)', marginBottom: 12 }}>평택 본사에서 서울 25개 자치구와 경기 31개 시·군 전역에 출장해요. 지역 페이지에서 현장 특성과 출장 범위를 확인하세요.</p><div className="related">{regionLinks.map((r) => <Link key={r.href} href={r.href}>{r.t}</Link>)}</div></>)}
        <h2>관련 서비스</h2>
        <div className="related">{s.relatedServices.map((id) => serviceById(id)).filter((x) => x && isPublicPath(x.path)).map((x) => <Link key={x!.id} href={x!.path}>{x!.h1}<Icon name="arrow-right" size={14}/></Link>)}</div>
        <div className="cta-box">
          <p className="q">{card ? card.t : s.h1} 문제로 고민 중이세요?</p>
          <TelLink className="btn btn-primary"><Icon name="phone" size={20}/>전화 상담 <RollingPhone h={24}/></TelLink>
          <Link href="/contact/" className="btn btn-g100">문의 남기기</Link>
        </div>
      </main>
      <JsonLd data={faqLd}/>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

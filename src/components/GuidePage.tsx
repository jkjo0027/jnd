import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { ALL_GUIDES, type Guide } from '@/content/guides';
import { SERVICES } from '@/content/services';
import { isPublicPath } from '@/lib/registry';
import { publicCases } from '@/lib/gate';
import { SERVICE_BLOCKS, REGIONS, type ServiceId } from '@/content/gen/compose';
import { SAFETY, TAG_PARAS, GLOSSARY } from '@/content/gen/blocks-common';
import type { Tag } from '@/content/gen/types';
import { regionPath } from '@/lib/links';
import { JsonLd } from '@/lib/seo';

const hash = (s: string) => Array.from(s).reduce((a, c) => (Math.imul(a, 31) + c.charCodeAt(0)) >>> 0, 7);
export default function GuidePageView({ g, draft = false }: { g: Guide; draft?: boolean }) {
  const svcs = SERVICES.filter((s) => g.serviceIds.includes(s.id) && isPublicPath(s.path));
  const cases = publicCases().filter((c) => g.caseIds.includes(c.id));
  const rel = ALL_GUIDES.filter((x) => g.relatedGuides.includes(x.id) && (isPublicPath(x.path) || draft));
  const svcOf = (id?: string) => (id ? SERVICES.find((s) => s.id === id && isPublicPath(s.path)) : undefined);
  const h = hash(g.id);
  // 가이드 주제와 가장 가까운 서비스 블록(절차·비용 조건)을 붙여 답변을 완결한다
  const primary = (['repair', 'install', 'sensor', 'motor', 'glass-door'] as ServiceId[]).find((s) => g.serviceIds.includes(s) || (s === 'motor' && g.serviceIds.includes('motor'))) || 'repair';
  const B = SERVICE_BLOCKS[primary];
  const proc = B.proc.map((p, i) => ({ t: p.t, d: p.d[(h + i) % p.d.length] }));
  const decision = B.decision.map((d, i) => ({ t: d.t, d: d.d[(h + i + 1) % d.d.length] }));
  const safety = SAFETY[h % SAFETY.length];
  const tagKeys: Tag[] = ['office', 'commercial', 'apartment', 'villa', 'factory', 'hospital', 'school', 'logistics', 'hotel', 'newtown'];
  const tagParas = [0, 1, 2].map((k) => { const t = tagKeys[(h + k * 3) % tagKeys.length]; return TAG_PARAS[t][(h + k) % TAG_PARAS[t].length].replace(/\{r\}/g, '서울·경기'); });
  const genFaq = B.faq.map((f, i) => ({ q: f.q[(h + i) % f.q.length].replace(/\{r\}/g, '서울·경기'), a: f.a[(h + i + 1) % f.a.length].replace(/\{r\}/g, '서울·경기') })).slice(0, 5);
  // 가이드의 지역 링크는 임의 해시 나열 대신 우선 지역(평택·수원·화성·용인) 중 3곳 + 광역 허브만
  const PRIORITY = ['r53', 'r38', 'r56', 'r48'];
  const linkSvc: ServiceId = primary === 'install' ? 'install' : 'repair'; // 지역 센서·모터 페이지는 지역 수리 페이지로 통합됨
  const regionLinks = PRIORITY.map((rid) => REGIONS.find((r) => r.rid === rid)!).filter(Boolean).slice(h % 2, (h % 2) + 3).map((r) => ({ t: `${r.short} ${SERVICE_BLOCKS[linkSvc].label}`, href: regionPath(r.province, r.rid, linkSvc) })).filter((x) => isPublicPath(x.href))
    .concat([{ t: '서울 전체 지역', href: '/areas/seoul/' }, { t: '경기 전체 지역', href: '/areas/gyeonggi/' }].filter((x) => isPublicPath(x.href)));
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ q: g.question, a: g.answer }, ...(g.detail?.faq || []), ...genFaq].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  return (
    <PublicShell>
      {draft && <div className="draft-banner"><span>기술 검수 대기 초안 · 공개 전</span><span>{g.pageId}</span></div>}
      <main className="page-narrow guide">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '증상 가이드', path: '/guides/' }, { name: g.h1, path: g.path }]} />
        <h1>{g.h1}</h1>
        <p className="q">Q. {g.question}</p>
        <p className="a">{g.answer}</p>
        {g.detail && <section style={{ margin: '0 0 40px' }}><h2>자세히 알아보기</h2>{g.detail.paras.map((t, i) => <p key={i} className="a" style={{ marginBottom: 16 }}>{t}</p>)}</section>}
        <h2>가능한 원인</h2>
        <div className="causes">
          {g.causes.map((c) => { const s = svcOf(c.svc); return <div key={c.t} className="cause"><p className="t">{c.t}{s && <Link href={s.path}>{s.h1} →</Link>}</p><p className="d">{c.d}</p></div>; })}
        </div>
        <h2>확인 범위를 나눠서 보세요</h2>
        <div className="cols3">
          <div className="observe"><p className="h"><Icon name="eye" style={{ color: 'var(--ok)' }} />안전하게 볼 수 있는 것</p><ul>{g.observe.map((o) => <li key={o}>{o}</li>)}</ul></div>
          {g.stop.length > 0 && <div className="stop"><p className="h"><Icon name="octagon-alert" style={{ color: 'var(--err)' }} />여기서 멈추세요</p><ul>{g.stop.map((o) => <li key={o}>{o}</li>)}</ul></div>}
          <div className="pro"><p className="h"><Icon name="wrench" style={{ color: 'var(--blue-t)' }} />전문가가 하는 진단</p><ul>{g.pro.map((o) => <li key={o}>{o}</li>)}</ul></div>
        </div>
        <h2>{B.label}로 처리하는 작업 범위</h2>
        <p className="a" style={{ marginBottom: 12 }}>{B.scopeIntro[h % B.scopeIntro.length]}</p>
        <ul style={{ margin: '0 0 40px', paddingLeft: 20, fontSize: 'var(--fs-b)', lineHeight: 1.8, color: 'var(--g700)' }}>{B.scopeItems.map((c) => <li key={c}>{c}</li>)}</ul>
        <h2>관련 증상과 원인</h2>
        <div className="causes">
          {B.symptoms.slice(0, 4).map((s, i) => <div key={s.t} className="cause"><p className="t"><Icon name={s.icon} style={{ color: 'var(--blue-t)', marginRight: 6 }} />{s.t}</p><p className="d">{s.cause[(h + i) % s.cause.length]} 조치: {s.action[(h + i) % s.action.length]}</p></div>)}
        </div>
        <h2>기사가 방문하면 이렇게 진행해요</h2>
        <ol className="checks" style={{ listStyle: 'none', padding: 0, margin: '0 0 40px', display: 'grid', gap: 8 }}>
          {proc.map((p, i) => <li key={p.t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, padding: 16, borderRadius: 'var(--r-m)', background: 'var(--g50)', minHeight: 0, border: 0 }}><i style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: 'var(--on-accent)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, fontStyle: 'normal' }}>{i + 1}</i><div><p style={{ margin: '0 0 4px', fontWeight: 700 }}>{p.t}</p><p style={{ margin: 0, fontSize: 'var(--fs-s)', lineHeight: 1.6, color: 'var(--g600)' }}>{p.d}</p></div></li>)}
        </ol>
        <h2>수리·교체 판단</h2>
        <div className="cols3" style={{ marginBottom: 40 }}>{decision.map((d) => <div key={d.t}><p className="h">{d.t}</p><p style={{ margin: 0, fontSize: 'var(--fs-s)', lineHeight: 1.7, color: 'var(--g700)' }}>{d.d}</p></div>)}</div>
        <h2>비용에 영향을 주는 조건</h2>
        <p className="a" style={{ marginBottom: 12 }}>{B.costIntro[h % B.costIntro.length]}</p>
        <ul style={{ margin: '0 0 40px', paddingLeft: 20, fontSize: 'var(--fs-b)', lineHeight: 1.8, color: 'var(--g700)' }}>{B.costItems.map((c) => <li key={c}>{c}</li>)}</ul>
        <h2>기다리는 동안 안전하게</h2>
        <p className="a">{safety}</p>
        <h2>용어 설명</h2>
        <div className="cols3" style={{ marginBottom: 40 }}>{GLOSSARY[primary].map((x) => <div key={x.t}><p className="h">{x.t}</p><p style={{ margin: 0, fontSize: 'var(--fs-s)', lineHeight: 1.7, color: 'var(--g700)' }}>{x.d}</p></div>)}</div>
        <h2>현장 유형별로 달라지는 점</h2>
        <div className="causes">{tagParas.map((t, i) => <div key={i} className="cause"><p className="d" style={{ fontSize: 'var(--fs-b)', color: 'var(--g700)' }}>{t}</p></div>)}</div>
        <h2>자주 묻는 질문</h2>
        <div style={{ marginBottom: 40 }}>{[...(g.detail?.faq || []), ...genFaq].map((f) => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</div>
        {cases.length > 0 && (
          <>
            <h2>실제 수리 사례</h2>
            <div className="case-list-sm">
              {cases.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}/`} className="case-sm">
                  <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                  <span className="tx"><span className="k" style={{ display: 'block' }}>{c.place} · {c.svcT}</span><span className="t" style={{ display: 'block' }}>{c.title} — {c.sym}</span></span>
                  <Icon name="chevron-right" className="ch" />
                </Link>
              ))}
            </div>
          </>
        )}
        {svcs.length > 0 && (<><h2>관련 서비스</h2><div className="related">{svcs.map((s) => <Link key={s.id} href={s.path}>{s.h1}<Icon name="arrow-right" size={14} /></Link>)}</div></>)}
        {regionLinks.length > 0 && (<><h2>지역별 출장 안내</h2><p className="a" style={{ marginBottom: 12 }}>평택 본사에서 서울·경기 전역에 출장해요. 지역 페이지에서 현장 특성과 출장 범위를 확인하세요.</p><div className="related">{regionLinks.map((r) => <Link key={r.href} href={r.href}>{r.t}<Icon name="arrow-right" size={14} /></Link>)}</div></>)}
        {rel.length > 0 && (<><h2>관련 가이드</h2><div className="causes">{rel.map((x) => <Link key={x.id} href={x.path} className="cause" style={{ textDecoration: 'none', color: 'var(--ink)' }}><p className="t">{x.h1}<span style={{ fontSize: 'var(--fs-c)', color: 'var(--blue-t)' }}>가이드 보기 →</span></p><p className="d">{x.question} — {x.answer.slice(0, 120)}…</p></Link>)}</div></>)}
        <div className="cta-box">
          <p className="q" style={{ padding: 0, background: 'none', fontSize: 'var(--fs-b)' }}>증상을 말씀해 주시면 원인을 먼저 짚어드려요</p>
          <TelLink className="btn btn-primary"><Icon name="phone" size={20} />전화 상담 <RollingPhone h={24} /></TelLink>
          <Link href="/contact/#inquiry" className="btn btn-g100">문의 남기기</Link>
        </div>
      </main>
      <JsonLd data={faqLd} />
    </PublicShell>
  );
}

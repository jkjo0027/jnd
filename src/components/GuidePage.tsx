import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { ALL_GUIDES, handbookSlugByGuide, type Guide } from '@/content/guides';
import { SERVICES } from '@/content/services';
import { isPublicPath } from '@/lib/registry';
import { publicCases } from '@/lib/gate';
import { handbookArticle, handbookPath } from '@/content/handbook';
import { JsonLd } from '@/lib/seo';

export default function GuidePageView({ g, draft = false }: { g: Guide; draft?: boolean }) {
  const svcs = SERVICES.filter((s) => g.serviceIds.includes(s.id) && isPublicPath(s.path));
  const cases = publicCases().filter((c) => g.caseIds.includes(c.id));
  const rel = ALL_GUIDES.filter((x) => g.relatedGuides.includes(x.id) && (isPublicPath(x.path) || draft));
  const svcOf = (id?: string) => (id ? SERVICES.find((s) => s.id === id && isPublicPath(s.path)) : undefined);
  const article = handbookArticle(handbookSlugByGuide[g.id]);
  const questions = g.detail?.faq || [];
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ q: g.question, a: g.answer }, ...questions].map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  return (
    <PublicShell>
      {draft && <div className="draft-banner"><span>기술 검수 대기 초안 · 공개 전</span><span>{g.pageId}</span></div>}
      <main className="page-narrow guide">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '증상 가이드', path: '/guides/' }, { name: g.h1, path: g.path }]} />
        <h1>{g.h1}</h1>
        <p className="q">Q. {g.question}</p>
        <p className="a">{g.answer}</p>
        {g.detail && <section style={{ margin: '0 0 40px' }}><h2>자세히 알아보기</h2>{g.detail.paras.map((t, i) => <p key={i} className="a" style={{ marginBottom: 16 }}>{t}</p>)}</section>}
        <h2>{g.serviceIds[0] === 'install' ? '설치 조건과 선택 기준' : '확인할 항목'}</h2>
        <div className="causes">
          {g.causes.map((c) => { const s = svcOf(c.svc); return <div key={c.t} className="cause"><p className="t">{c.t}{s && <Link href={s.path}>{s.h1} →</Link>}</p><p className="d">{c.d}</p></div>; })}
        </div>
        <h2>확인 범위를 나눠서 보세요</h2>
        <div className="cols3">
          <div className="observe"><p className="h"><Icon name="eye" style={{ color: 'var(--ok)' }} />안전하게 볼 수 있는 것</p><ul>{g.observe.map((o) => <li key={o}>{o}</li>)}</ul></div>
          {g.stop.length > 0 && <div className="stop"><p className="h"><Icon name="octagon-alert" style={{ color: 'var(--err)' }} />여기서 멈추세요</p><ul>{g.stop.map((o) => <li key={o}>{o}</li>)}</ul></div>}
          <div className="pro"><p className="h"><Icon name="wrench" style={{ color: 'var(--blue-t)' }} />전문가가 하는 진단</p><ul>{g.pro.map((o) => <li key={o}>{o}</li>)}</ul></div>
        </div>
        {article && <section><h2>현장에서 준비할 자료</h2><div className="causes"><Link className="cause" href={handbookPath(article.slug)}><p className="t">{article.title} →</p><p className="d">{article.answer}</p></Link></div></section>}
        {questions.length > 0 && <section><h2>자주 묻는 질문</h2>{questions.map(f => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</section>}
        {cases.length > 0 && (
          <>
            <h2>관련 시공사례</h2>
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

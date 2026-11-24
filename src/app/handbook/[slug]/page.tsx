import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import { JsonLd, pageMeta } from '@/lib/seo';
import { abs, MAIN_PHONE } from '@/lib/site';
import { handbookArticle, handbookArticles, handbookTopics, handbookCategory, handbookPath, handbookEditorial } from '@/content/handbook';
import { caseById } from '@/lib/gate';
import '../handbook.css';

export const dynamicParams = false;
export function generateStaticParams() { return handbookArticles.map(a => ({ slug: a.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const a = handbookArticles.find(a => a.slug === slug);
  return a ? pageMeta({ title: `${a.title} | 제이앤디시스템`, description: a.answer, path: handbookPath(a.slug) }) : {};
}
const serviceNames: Record<string, string> = { repair: '자동문 수리', install: '자동문 설치', sensor: '자동문 센서', switch: '자동문 스위치', keypad: '번호키·출입통제' };

export default async function HandbookArticle({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = handbookArticles.find(a => a.slug === slug); if (!a) notFound();
  const c = handbookCategory(a.category), topics = handbookTopics(slug);
  const related = [...new Map(topics.flatMap(t => t.relatedSlugs).map(handbookArticle).filter(x => !!x)
    .filter(x => handbookPath(x.slug).split('#')[0] !== handbookPath(slug)).map(x => [handbookPath(x.slug), x])).values()];
  const evidence = [...new Map(topics.flatMap(t => {
    const record = t.fieldCase && caseById(t.fieldCase.id);
    return record ? [[record.id, record] as const] : [];
  })).values()];
  return <PublicShell><main className="page-narrow handbook">
    <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '설치·관리 안내', path: '/handbook/' }, { name: a.title, path: handbookPath(a.slug) }]} />
    <p className="handbook-eyebrow">{c.title}</p><h1>{a.title}</h1>
    <p className="handbook-lead">{a.answer}</p>
    <p className="handbook-date">제이앤디시스템 · 안내 갱신 <time dateTime={a.updatedAt}>{a.updatedAt}</time></p>
    <nav className="handbook-topics" aria-label="필요한 상황으로 이동">{topics.map(t => <a key={t.slug} href={`#${t.slug}`}>{t.title}</a>)}{evidence.length > 0 && <a href="#field-records">사진과 실제 작업 기록</a>}</nav>
    <aside className="handbook-note"><h2>이 안내의 적용 범위</h2><p>{c.introduction}</p></aside>
    {topics.map(t => {
      const detail = handbookEditorial(t.slug);
      return <section id={t.slug} key={t.slug} className="handbook-topic">
        <h2>{t.title}</h2><p>{t.answer}</p><p>{detail.explanation}</p>
        <h3>확인할 항목</h3><ol className="handbook-checks">{t.checks.map(x => <li key={x}>{x}</li>)}</ol>
        <table className="handbook-comparison"><caption>{t.title} — 상황별 다음 행동</caption><thead><tr><th scope="col">관찰한 상황</th><th scope="col">다음 행동</th></tr></thead><tbody>{detail.comparisons.map(row => <tr key={row.situation}><th scope="row">{row.situation}</th><td>{row.nextStep}</td></tr>)}</tbody></table>
        <h3>판단과 전달할 자료</h3><p>{t.decision}</p><ul className="handbook-checks">{t.handoff.map(x => <li key={x}>{x}</li>)}</ul>
        {t.fieldCase && caseById(t.fieldCase.id) && <p className="handbook-note">{t.fieldCase.note} <Link href={`#record-${t.fieldCase.id}`}>해당 현장 사진·작업 결과 보기</Link></p>}
        <details className="handbook-example"><summary>이 상황의 접수 메모와 상담 질문</summary><h3>메모 작성 예시</h3><p>{t.example}</p><h3>상담할 때 확인할 질문</h3><p>{detail.question}</p></details>
      </section>;
    })}
    {evidence.length > 0 && <section id="field-records"><h2>사진과 실제 작업 기록</h2><p>아래 기록은 표시된 현장에서 수행한 작업입니다. 비슷한 증상이라도 내 현장의 원인과 교체 범위는 점검 후 달라질 수 있습니다.</p><div className="handbook-evidence">{evidence.map(record => <article key={record.id} id={`record-${record.id}`}>
      <Link href={`/cases/${record.id}/`}><img src={record.img} alt={`${record.place} — ${record.title}`} width={800} height={600} loading="lazy" /><h3>{record.place} · {record.title}</h3></Link><dl><dt>현장 요청·증상</dt><dd>{record.sym}</dd><dt>기록된 작업 결과</dt><dd>{record.res}</dd></dl><Link href={`/cases/${record.id}/`}>원본 시공 기록 보기 →</Link>
    </article>)}</div></section>}
    <section className="handbook-contact"><h2>현장 자료를 준비했다면</h2><p>보이지 않는 장치는 열지 말고 현장 점검에 맡겨 주세요. 사진과 메모에서 얼굴·출입 비밀번호·카드 정보는 가려 주세요.</p><a className="btn btn-primary" href={`tel:${MAIN_PHONE.replace(/-/g, '')}`}>전화 상담 {MAIN_PHONE}</a><Link className="btn btn-g100" href="/contact/#inquiry">상담 방법 보기</Link></section>
    <section><h2>다음 작업에 필요한 안내</h2><nav aria-label="관련 설치·관리 안내"><div className="handbook-grid">{related.map(x => <Link className="handbook-card" key={x.slug} href={handbookPath(x.slug)}><h3>{x.title}</h3><p>{x.answer}</p></Link>)}</div><div className="handbook-links"><Link href={`/handbook/#${c.id}`}>{c.title} 전체 안내</Link><Link href={`/services/${c.service}/`}>{serviceNames[c.service]} 서비스 범위</Link><Link href="/guides/">증상별 원인 가이드</Link></div></nav></section>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.answer, inLanguage: 'ko-KR', datePublished: a.publishedAt, dateModified: a.updatedAt, mainEntityOfPage: abs(handbookPath(a.slug)), author: { '@type': 'Organization', name: '제이앤디시스템', url: abs('/about/') }, publisher: { '@id': abs('/#org') } }} />
  </main></PublicShell>;
}

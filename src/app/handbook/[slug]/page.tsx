import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import { JsonLd, pageMeta } from '@/lib/seo';
import { abs, MAIN_PHONE } from '@/lib/site';
import { handbookArticle, handbookArticles, handbookCategory, handbookPath, handbookEditorial } from '@/content/handbook';
import '../handbook.css';

export const dynamicParams = false;
export function generateStaticParams() { return handbookArticles.map(a => ({ slug: a.slug })); }
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const a = handbookArticle((await params).slug);
  return a ? pageMeta({ title: `${a.title} | 제이앤디시스템`, description: a.answer, path: handbookPath(a.slug) }) : {};
}
const serviceNames: Record<string, string> = { repair: '자동문 수리', install: '자동문 설치', sensor: '자동문 센서', switch: '자동문 스위치', keypad: '번호키·출입통제' };
const servicePaths: Record<string, string> = { repair: '/services/repair/', install: '/services/install/', sensor: '/services/sensor/', switch: '/services/switch/', keypad: '/services/keypad/' };

export default async function HandbookArticle({ params }: { params: Promise<{ slug: string }> }) {
  const a = handbookArticle((await params).slug); if (!a) notFound();
  const c = handbookCategory(a.category);
  const detail = handbookEditorial(a.slug);
  const siblings = handbookArticles.filter(x => x.category === a.category && x.slug !== a.slug);
  const position = handbookArticles.filter(x => x.category === a.category).findIndex(x => x.slug === a.slug);
  const related = [...siblings.slice(position, position + 3), ...siblings.slice(0, 3)].filter((x, i, ar) => ar.findIndex(y => y.slug === x.slug) === i).slice(0, 3);
  return <PublicShell><main className="page-narrow handbook">
    <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '설치·관리 안내', path: '/handbook/' }, { name: a.title, path: handbookPath(a.slug) }]} />
    <p className="handbook-eyebrow">{c.title}</p><h1>{a.title}</h1>
    <p className="handbook-lead">{a.answer}</p>
    <p className="handbook-date">제이앤디시스템 · 안내 갱신 <time dateTime={a.updatedAt}>{a.updatedAt}</time></p>
    <nav className="handbook-topics" aria-label="이 글의 순서"><a href="#interpretation">상황 구분</a><a href="#checks">확인할 항목</a><a href="#situations">관찰별 다음 행동</a><a href="#decision">판단과 다음 단계</a><a href="#prepare">전달할 자료</a></nav>
    <section id="interpretation"><h2>이 상황을 구분하는 방법</h2><p>{detail.explanation}</p></section>
    <section id="checks"><h2>안전한 범위에서 확인할 항목</h2><ol className="handbook-checks">{a.checks.map(x => <li key={x}>{x}</li>)}</ol><p>확인한 사실과 추측을 나누어 적어 주세요. 자료를 안전하게 확인할 수 없거나 내용이 불분명하면, 직접 장치를 열어 찾는 대신 ‘현장 확인 필요’로 표시해도 됩니다.</p></section>
    <section id="situations"><h2>관찰 결과에 따른 다음 단계</h2><table className="handbook-comparison"><caption>{a.title} — 상황별 확인과 전달</caption><thead><tr><th scope="col">관찰한 상황</th><th scope="col">다음 행동</th></tr></thead><tbody>{detail.comparisons.map(row => <tr key={row.situation}><th scope="row">{row.situation}</th><td>{row.nextStep}</td></tr>)}</tbody></table></section>
    <section id="decision"><h2>판단과 다음 단계</h2><p>{a.decision}</p><aside className="handbook-note"><strong>{c.title} 안내의 적용 범위</strong><p>{c.introduction}</p></aside></section>
    <section id="prepare"><h2>담당자에게 전달할 자료</h2><ul className="handbook-checks">{a.handoff.map(x => <li key={x}>{x}</li>)}</ul><p>출입구 위치와 현재 운영 상태를 함께 알려 주세요. 장비가 여러 대면 위치 번호를 붙여 자료가 섞이지 않도록 합니다. 비밀번호·카드 정보·고객 얼굴 등 상담에 필요하지 않은 정보는 제외해 주세요.</p>
      <div className="handbook-contact"><h3>메모 작성 예시</h3><p>{a.example}</p><p>위 문장은 기록 방법을 보여주는 예시입니다. 실제 현장에서 확인한 내용에 맞춰 바꾸고, 작업 범위와 일정은 상담 후 확인해 주세요.</p><h3>상담할 때 확인할 질문</h3><p>{detail.question}</p><a className="btn btn-primary" href={`tel:${MAIN_PHONE.replace(/-/g, '')}`}>전화 상담 {MAIN_PHONE}</a><Link className="btn btn-g100" href="/contact/#inquiry">상담 방법 보기</Link></div>
    </section>
    <section><h2>함께 확인할 안내</h2><nav aria-label="관련 설치·관리 안내"><div className="handbook-grid">{related.map(x => <Link className="handbook-card" key={x.slug} href={handbookPath(x.slug)}><h3>{x.title}</h3><p>{x.answer}</p></Link>)}</div><div className="handbook-links"><Link href={`/handbook/#${c.id}`}>{c.title} 전체 안내</Link><Link href={servicePaths[c.service]}>{serviceNames[c.service]} 서비스 범위</Link><Link href="/guides/">증상별 원인 가이드</Link></div></nav></section>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Article', headline: a.title, description: a.answer, inLanguage: 'ko-KR', datePublished: a.publishedAt, dateModified: a.updatedAt, mainEntityOfPage: abs(handbookPath(a.slug)), author: { '@type': 'Organization', name: '제이앤디시스템', url: abs('/about/') }, publisher: { '@id': abs('/#org') } }} />
  </main></PublicShell>;
}

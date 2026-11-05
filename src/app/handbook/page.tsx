import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import { pageMeta } from '@/lib/seo';
import { handbookArticles, handbookCategories, handbookPath } from '@/content/handbook';
import { isPublicPath } from '@/lib/registry';
import { notFound } from 'next/navigation';
import './handbook.css';

export const metadata = pageMeta({ title: '자동문 설치·관리 실무 안내 | 제이앤디시스템', description: '설치 준비, 고장 기록, 센서·스위치 관리, 전원과 출입통제, 유지관리, 견적 확인을 질문별로 안내합니다. 안전하게 관찰할 항목과 상담 준비 자료를 확인하세요.', path: '/handbook/' });

export default function HandbookIndex() {
  if (!isPublicPath('/handbook/')) notFound();
  return <PublicShell><main className="page-narrow handbook">
    <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '증상 가이드', path: '/guides/' }, { name: '설치·관리 실무 안내', path: '/handbook/' }]} />
    <h1>자동문 설치·관리 실무 안내</h1>
    <p className="handbook-lead">설치 상담부터 일상 관리까지, 현장에서 생기는 질문을 모았습니다. 필요한 질문을 골라 확인할 항목과 담당자에게 전달할 자료를 준비하세요.</p>
    <nav className="handbook-topics" aria-label="안내 주제">{handbookCategories.map(c => <a key={c.id} href={`#${c.id}`}>{c.title}</a>)}</nav>
    <p className="handbook-note">이 안내는 현장 진단이나 제품 설명서를 대신하지 않습니다. 움직이는 문에 접근하거나 장치를 분해하지 말고, 위험한 동작·손상이 있으면 현장 관리 담당자에게 먼저 알리세요.</p>
    {handbookCategories.map(c => <section key={c.id} id={c.id} className="handbook-category">
      <h2>{c.title}</h2><p>{c.introduction}</p>
      <div className="handbook-grid">{handbookArticles.filter(a => a.category === c.id).map(a => <Link className="handbook-card" key={a.slug} href={handbookPath(a.slug)}><h3>{a.title}</h3><p>{a.answer}</p><span>확인 항목 보기 →</span></Link>)}</div>
    </section>)}
    <div className="handbook-links"><Link href="/guides/">증상별 원인 가이드</Link><Link href="/services/repair/">수리 서비스 안내</Link><Link href="/contact/">상담 방법 확인</Link></div>
  </main></PublicShell>;
}

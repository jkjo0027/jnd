import type { Metadata } from 'next';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import { pageMeta } from '@/lib/seo';
import { FAQ } from '@/content/site-data';

export const metadata: Metadata = pageMeta({
  title: '자주 묻는 질문 | 자동문 고장 증상·비용·출장 지역 | 제이앤디시스템',
  description: '자동문이 안 열리거나 소음이 날 때의 원인, 수리 비용 결정 기준, 출장 지역과 상담 시간, 타사 제품 수리 가능 여부, 설치 후 A/S까지 자주 묻는 질문을 정리했습니다.',
  path: '/faq/',
});

export default function Faq() {
  const groups = (['고장·증상', '비용·출장', '서비스'] as const).map((cat) => ({ cat, items: FAQ.filter((f) => f.cat === cat) }));
  return (
    <PublicShell>
      <main className="page-narrow faqp">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '자주 묻는 질문', path: '/faq/' }]} />
        <h1>자주 묻는 질문</h1>
        <div className="groups">
          {groups.map((g) => (
            <section key={g.cat}>
              <h2>{g.cat}</h2>
              <div className="list">{g.items.map((f) => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</div>
            </section>
          ))}
        </div>
      </main>
    </PublicShell>
  );
}

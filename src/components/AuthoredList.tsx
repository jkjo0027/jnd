import Link from 'next/link';
import Icon from '@/components/Icon';
import type { AuthoredPage } from '@/lib/server/content';
import { TYPE_LABEL } from '@/lib/content-body';
/** 허브에 붙는 운영자 발행 글 목록 — JS 없이 따라갈 수 있는 실제 <a href>. 비어 있으면 아무것도 그리지 않는다 */
export default function AuthoredList({ pages, heading }: { pages: AuthoredPage[]; heading: string }) {
  if (!pages.length) return null;
  const list = [...pages].sort((a, b) => (a.publishedAt || a.updatedAt) < (b.publishedAt || b.updatedAt) ? 1 : -1);
  return (
    <section className="au-list" aria-label={heading}>
      <h2 style={{ margin: '40px 0 12px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>{heading}</h2>
      <div className="guides-list">
        {list.map((p) => <Link key={p.id} href={p.path} className="guide-card"><p className="t">{p.title}</p><p className="d">{p.summary}</p><span className="more">{TYPE_LABEL[p.type]} 보기<Icon name="arrow-right" size={14} /></span></Link>)}
      </div>
    </section>
  );
}

import Link from 'next/link';
import AdminShell from '@/components/admin/Shell';
import Icon from '@/components/Icon';
import { requireUser } from '@/lib/server/admin';
import { listPages, STATUS_LABEL, type Status } from '@/lib/server/content';
import { TYPE_LABEL } from '@/lib/content-body';
export const dynamic = 'force-dynamic';

const ORDER: Status[] = ['error', 'review', 'draft', 'publishing', 'published', 'unpublished'];
/** 작성한 페이지 목록: 운영 상태(초안/검수 요청/발행 중/공개 및 검색 발견 준비/공개 오류/비공개) · 업데이트 시각 · 실제 URL · 검사 결과 */
export default async function ContentList({ searchParams }: { searchParams: Promise<{ st?: string; q?: string }> }) {
  const { user } = await requireUser();
  const sp = await searchParams; const st = sp.st || 'all'; const q = (sp.q || '').toLowerCase();
  const all = listPages();
  const rows = all.filter((p) => (st === 'all' || p.status === st) && (!q || p.title.toLowerCase().includes(q) || p.path.includes(q)));
  const cnt = (s: Status) => all.filter((p) => p.status === s).length;
  return (
    <AdminShell user={user} current="/admin/content/">
      <div className="adm-h"><div><p className="sub">관리자에서 만든 페이지 {all.length}개</p><h1>작성한 페이지</h1></div><Link href="/admin/new/" className="btn btn-primary" style={{ height: 52, padding: '0 20px' }}><Icon name="plus" size={20} />새 페이지 작성</Link></div>
      <div className="adm-filters">
        <Link href="/admin/content/" className={st === 'all' ? 'on' : ''}>전체 {all.length}</Link>
        {ORDER.map((s) => <Link key={s} href={`/admin/content/?st=${s}`} className={st === s ? 'on' : ''}>{STATUS_LABEL[s]} {cnt(s)}</Link>)}
      </div>
      <form className="adm-search" method="get"><Icon name="search" /><input name="q" defaultValue={sp.q || ''} placeholder="제목·주소 검색" /></form>
      <div className="adm-list">
        {rows.map((p) => (
          <Link key={p.id} href={`/admin/content/${p.id}/`} className="adm-item">
            <span className="m"><b>{p.title || '(제목 없음)'}</b><span>{TYPE_LABEL[p.type]} · {p.path || '주소 미정'} · 업데이트 {p.updatedAt.slice(0, 16).replace('T', ' ')} · v{p.version}{p.check && !p.check.ok ? ` · 검사 실패 ${p.check.items.filter((i) => !i.ok).length}건` : ''}</span></span>
            <span className={`badge st-${p.status}`}>{STATUS_LABEL[p.status]}</span>
          </Link>
        ))}
        {!rows.length && <p style={{ color: 'var(--g600)', fontSize: 'var(--fs-s)' }}>해당하는 글이 없어요. <Link href="/admin/new/">새 페이지 작성</Link>에서 시작하세요.</p>}
      </div>
    </AdminShell>
  );
}

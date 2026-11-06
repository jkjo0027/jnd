import Link from 'next/link';
import AdminShell from '@/components/admin/Shell';
import Icon from '@/components/Icon';
import { requireUser } from '@/lib/server/admin';
import { readDrafts } from '@/lib/server/store';
import { ledger } from '@/lib/registry';
const ST = ['all', 'approved', 'published', 'review', 'evidence_ready', 'candidate', 'hold'] as const;
export default async function Pages({ searchParams }: {
    searchParams: Promise<{
        st?: string;
        q?: string;
        created?: string;
    }>;
}) {
    const { user } = await requireUser();
    const sp = await searchParams;
    const st = ST.includes(sp.st as typeof ST[number]) ? sp.st! : 'all';
    const q = (sp.q || '').trim().toLowerCase();
    const rows = ledger.filter((r) => (st === 'all' || r.status === st) && (!q || r.pageId.toLowerCase().includes(q) || r.path.includes(q) || r.primaryIntent.includes(q))).slice(0, 200);
    const drafts = (await readDrafts());
    return (<AdminShell user={user} current="/admin/pages/">
      <div className="adm-h"><h1>페이지 대장</h1><Link href="/admin/new-region/" className="btn btn-primary" style={{ height: 48, padding: '0 18px' }}><Icon name="plus" size={18}/>새 지역 초안</Link></div>
      {sp.created && <p className="adm-ok">검수 대기 초안 {sp.created}개를 만들었어요. 발행은 대장 검수 절차(docs/owner-approvals.md)로만 진행돼요.</p>}
      <form className="adm-search" method="get"><Icon name="search"/><input name="q" defaultValue={sp.q || ''} placeholder="pageId·경로·의도 검색 (예: r38)"/><input type="hidden" name="st" value={st}/></form>
      <div className="adm-filters">{ST.map((s) => <Link key={s} href={`/admin/pages/?st=${s}${q ? '&q=' + encodeURIComponent(q) : ''}`} className={s === st ? 'on' : ''}>{s === 'all' ? '전체' : s} {s === 'all' ? ledger.length : ledger.filter((r) => r.status === s).length}</Link>)}</div>
      <div className="adm-list">
        {rows.map((r) => (<Link key={r.pageId} href={`/admin/preview${r.path}`} className="adm-item">
            <span className="m"><b>{r.pageId} · {r.primaryIntent}</b><span>{r.path} · {r.reviewer ? `${r.reviewer} ${r.reviewedAt}` : '미검수'}{r.mergeTarget ? ` · 통합 → ${r.mergeTarget}` : ''}</span></span>
            <span className={`badge ${r.status}`}>{r.status}</span><Icon name="chevron-right" size={20} style={{ color: 'var(--g400)' }}/>
          </Link>))}
        {!rows.length && <p className="adm-note">조건에 맞는 페이지가 없어요.</p>}
      </div>
      {drafts.length > 0 && (<>
          <h2 style={{ margin: '32px 0 12px', fontSize: 'var(--fs-3)', fontWeight: 800 }}>관리자 초안 (var/drafts.jsonl)</h2>
          <div className="adm-list">{drafts.slice(-30).reverse().map((d, i) => <div key={i} className="adm-item"><span className="m"><b>{String(d.pageId || d.caseId || d.kind)}</b><span>{String(d.path || d.title || '')} · {String(d.createdBy)} · {String(d.createdAt).slice(0, 16)}</span></span><span className={`badge ${String(d.status)}`}>{String(d.status)}</span></div>)}</div>
        </>)}
    </AdminShell>);
}

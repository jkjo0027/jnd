import Link from 'next/link';
import AdminShell from '@/components/admin/Shell';
import Icon from '@/components/Icon';
import { requireUser } from '@/lib/server/admin';
import { readAudit } from '@/lib/server/store';
import { ledger } from '@/lib/registry';
import { listPages, STATUS_LABEL } from '@/lib/server/content';
import { TYPE_LABEL } from '@/lib/content-body';
export const dynamic = 'force-dynamic';

/** 관리자 첫 화면: 새 페이지 작성 버튼, 작성한 페이지 상태, 대장(레지스트리) 요약, 감사 로그. 문의 내역은 두지 않는다(접수는 알림 채널로 전달, 파일 백업만) */
export default async function Dashboard() {
  const { user } = await requireUser();
  const pages = listPages();
  const live = pages.filter((p) => p.status === 'published' || p.status === 'error' || p.status === 'publishing');
  const reg = ledger.filter((r) => r.contentStatus === 'PUBLISHED' && r.indexEligibility).length;
  const today = new Date();
  const stats = [
    { k: '공개 중인 페이지', v: String(reg + live.length), s: `대장 ${reg} · 관리자 작성 ${live.length}`, icon: 'globe', to: '/admin/content/?st=published' },
    { k: '검수 요청', v: String(pages.filter((p) => p.status === 'review').length), s: '승인 권한자가 확인할 글', icon: 'send', to: '/admin/content/?st=review' },
    { k: '공개 오류', v: String(pages.filter((p) => p.status === 'error').length), s: '검색 발견 준비 검사 실패', icon: 'circle-alert', to: '/admin/content/?st=error' },
    { k: '초안', v: String(pages.filter((p) => p.status === 'draft').length), s: `비공개 ${pages.filter((p) => p.status === 'unpublished').length}`, icon: 'file-text', to: '/admin/content/?st=draft' },
  ];
  return (
    <AdminShell user={user} current="/admin/">
      <div className="adm-h">
        <div><p className="sub">{today.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'long' })}</p><h1>작성한 페이지 {pages.length}개 · 공개 {live.length}개</h1></div>
        <div style={{ display: 'flex', gap: 8 }}><Link href="/admin/new/" className="btn btn-primary" style={{ height: 52, padding: '0 20px' }}><Icon name="plus" size={20} />새 페이지 작성</Link><Link href="/admin/new-region/" className="btn btn-g100" style={{ height: 52, padding: '0 16px' }}>지역 초안(대장)</Link></div>
      </div>
      <div className="stats">{stats.map((t) => <Link key={t.k} href={t.to} className="stat"><span className="k"><Icon name={t.icon} />{t.k}</span><span className="v">{t.v}</span><span className="s">{t.s}</span></Link>)}</div>
      <div className="panels">
        <div className="panel">
          <h2>최근 작성한 페이지</h2>
          {pages.slice(0, 6).map((p) => <Link key={p.id} href={`/admin/content/${p.id}/`} className="row-btn"><span className="m"><b>{p.title || '(제목 없음)'}</b><span>{TYPE_LABEL[p.type]} · {p.path || '주소 미정'} · {p.updatedAt.slice(0, 16).replace('T', ' ')}</span></span><span className={`badge st-${p.status}`}>{STATUS_LABEL[p.status]}</span></Link>)}
          {!pages.length && <p style={{ margin: 0, color: 'var(--g600)', fontSize: 'var(--fs-s)' }}>아직 작성한 글이 없어요. 새 페이지 작성에서 시작하세요.</p>}
        </div>
        <div className="panel">
          <h2>검수 대기 (대장)</h2>
          {ledger.filter((r) => r.contentStatus === 'REVIEW_REQUIRED').slice(0, 6).map((r) => <Link key={r.pageId} href={`/admin/preview${r.path}`} className="row-btn"><span className="m"><b>{r.pageId}</b><span>{r.path}</span></span><span className="badge review">검수</span></Link>)}
        </div>
        <div className="panel">
          <h2>최근 감사 로그</h2>
          <div className="audit">{readAudit(12).reverse().map((a, i) => <div key={i}>{a.at?.slice(0, 19)} {a.who} {a.action} {a.target || ''} {a.detail || ''}</div>)}</div>
        </div>
      </div>
    </AdminShell>
  );
}

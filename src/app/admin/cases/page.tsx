import Link from 'next/link';
import AdminShell from '@/components/admin/Shell';
import { requireUser } from '@/lib/server/admin';
import { can } from '@/lib/server/auth';
import { CASES } from '@/content/site-data';
import { recordById } from '@/lib/registry';

export default async function AdminCases({ searchParams }: { searchParams: Promise<{ saved?: string; edit?: string }> }) {
  const { user } = await requireUser();
  const sp = await searchParams;
  const editing = CASES.find((c) => c.id === sp.edit);
  const editable = can(user, 'edit-drafts');
  return (
    <AdminShell user={user} current="/admin/cases/">
      <div className="adm-h"><h1>시공사례</h1>{editable && <Link href="/admin/cases/?edit=new" className="btn btn-primary" style={{ height: 48, padding: '0 18px' }}>사례 초안 작성</Link>}</div>
      {sp.saved && <p className="adm-ok">검수 대기 초안으로 저장했어요. 공개는 대장 승인 후 빌드에서 반영돼요.</p>}
      {sp.edit && editable && (
        <form className="adm-form" action="/api/admin/drafts" method="post" style={{ marginBottom: 32 }}>
          <input type="hidden" name="kind" value="case" />
          <p className="adm-note">편집 내용은 초안(var/drafts.jsonl)으로만 저장돼요. 사진 첨부·공개 전환은 검수 절차에서 처리해요.</p>
          <label>현장 ID<input name="caseId" defaultValue={editing?.id || ''} placeholder="새 사례는 비워두세요" /></label>
          <label>현장(익명화: 음식점·병원 등 유형)<input name="place" defaultValue={editing?.place || ''} required /></label>
          <label>제목<input name="title" defaultValue={editing?.title || ''} required /></label>
          <label>01 증상<input name="sym" defaultValue={editing?.sym || ''} /></label>
          <label>02 점검<textarea name="check" rows={2} defaultValue={editing?.check || ''} /></label>
          <label>03 조치<textarea name="act" rows={2} defaultValue={editing?.act || ''} /></label>
          <label>04 결과<textarea name="res" rows={2} defaultValue={editing?.res || ''} /></label>
          <button type="submit" className="btn btn-primary" style={{ height: 56 }}>검수 대기 초안으로 저장</button>
        </form>
      )}
      <div className="adm-list">
        {CASES.map((c) => { const r = recordById(`CASE-${c.id}`); return (
          <div key={c.id} className="adm-item">
            <span className="m"><b>{c.place} · {c.title}</b><span>{c.svcT} · {r?.coverageEvidence || ''}</span></span>
            <span className={`badge ${r?.status || 'candidate'}`}>{r?.status || '-'}</span>
            <Link href={`/admin/preview/cases/${c.id}/`} className="btn btn-g100" style={{ height: 40, padding: '0 12px', fontSize: 'var(--fs-s)' }}>미리보기</Link>
            {editable && <Link href={`/admin/cases/?edit=${c.id}`} className="btn btn-g100" style={{ height: 40, padding: '0 12px', fontSize: 'var(--fs-s)' }}>편집</Link>}
          </div>
        ); })}
      </div>
    </AdminShell>
  );
}

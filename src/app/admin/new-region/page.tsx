import AdminShell from '@/components/admin/Shell';
import { requireUser } from '@/lib/server/admin';
import { can } from '@/lib/server/auth';
import { baseRegions } from '@/lib/registry';

export default async function NewRegion() {
  const { user } = await requireUser();
  const editable = can(user, 'edit-drafts');
  return (
    <AdminShell user={user} current="/admin/new-region/">
      <h1 style={{ margin: '0 0 8px', fontSize: 'var(--fs-1)', fontWeight: 800, letterSpacing: '-0.03em' }}>새 지역 초안</h1>
      <p style={{ margin: '0 0 32px', fontSize: 'var(--fs-b)', color: 'var(--g600)' }}>엑셀 후보(56개 지역 × 5개 서비스) 범위 안에서 검수 대기 초안을 만들어요. 지역명만 바꾼 복제 본문은 만들지 않으며, 본문은 담당자가 지역 근거를 확인해 작성해요.</p>
      {!editable && <p className="adm-note">초안 작성 권한(editor/admin)이 필요해요.</p>}
      <form className="adm-form" action="/api/admin/drafts" method="post">
        <input type="hidden" name="kind" value="region-batch" />
        <label>광역<select name="province"><option value="gyeonggi">경기</option><option value="seoul">서울</option></select></label>
        <label>지역(R-ID)<select name="rid">{baseRegions.map((b) => <option key={b.regionId} value={b.regionId}>{b.regionId.toUpperCase()} · {b.province === 'seoul' ? '서울 ' : '경기 '}{b.name}</option>)}</select></label>
        <div className="checks">{(['repair', 'install', 'sensor', 'motor', 'glass-door'] as const).map((s) => <label key={s}><input type="checkbox" name="service" value={s} defaultChecked={s === 'repair'} />{s}</label>)}</div>
        <label>근거 메모(출장 확인·사례·사진)<textarea name="note" rows={3} placeholder="예: 2026-11 출장 3건, 사진 6장 수령, 담당 기사 OOO" /></label>
        <button type="submit" className="btn btn-primary" style={{ height: 56 }} disabled={!editable}>검수 대기 초안 만들기</button>
      </form>
    </AdminShell>
  );
}

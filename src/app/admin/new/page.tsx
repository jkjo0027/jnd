import AdminShell from '@/components/admin/Shell';
import Icon from '@/components/Icon';
import { requireUser } from '@/lib/server/admin';
import { can } from '@/lib/server/auth';
import { regionOptions, verifiedServices } from '@/lib/server/content';
import { FIELDS, TYPE_LABEL, type PageType } from '@/lib/content-body';
export const dynamic = 'force-dynamic';

const TYPES: { t: PageType; icon: string; d: string; ex: string }[] = [
  { t: 'case', icon: 'images', d: '실제 작업 기록. 현장 유형·증상 → 확인한 원인 → 실제 조치 → 작동 확인 결과와 현장 사진.', ex: '예: 영통 상가 출입문 안전센서 교체' },
  { t: 'guide', icon: 'book-open', d: '이용자의 한 가지 질문에 답하는 글. 안전하게 볼 수 있는 항목과 멈춰야 하는 기준을 나눠요.', ex: '예: 자동문이 닫히다 다시 열릴 때 확인할 점' },
  { t: 'service', icon: 'wrench', d: '새 서비스 안내. 작업 범위 → 수리·교체 판단 → 견적 변수 → 문의 준비물.', ex: '예: 자동문 비상배터리 교체' },
  { t: 'region', icon: 'map-pin', d: '특정 지역의 서비스 안내. 실제 출장 범위와 이 지역 작업 근거(사진·기록)가 있어야 발행돼요.', ex: '예: 평택 자동문 스위치 교체' },
];

/** 새 페이지 작성 1단계: 유형 선택 → 초안 생성 → 편집 화면 */
export default async function NewPage({ searchParams }: { searchParams: Promise<{ type?: string }> }) {
  const { user } = await requireUser();
  const editable = can(user, 'edit-drafts');
  const type = (await searchParams).type as PageType | undefined;
  const picked = TYPES.find((x) => x.t === type);
  return (
    <AdminShell user={user} current="/admin/new/">
      <div className="adm-h"><div><p className="sub">새 페이지 작성</p><h1>{picked ? `${TYPE_LABEL[picked.t]} 시작하기` : '어떤 글을 만들까요?'}</h1></div></div>
      {!editable && <p className="adm-note">글 작성 권한(editor 또는 admin)이 필요해요.</p>}
      {!picked ? (
        <div className="type-grid">
          {TYPES.map((x) => (
            <a key={x.t} href={`/admin/new/?type=${x.t}`} className="type-card">
              <span className="ic"><Icon name={x.icon} /></span>
              <b>{TYPE_LABEL[x.t]}</b>
              <span className="d">{x.d}</span>
              <span className="ex">{x.ex}</span>
            </a>
          ))}
        </div>
      ) : (
        <form className="adm-form" action="/api/admin/content/" method="post">
          <input type="hidden" name="type" value={picked.t} />
          <p className="adm-note" style={{ background: 'var(--blue-50)', color: 'var(--ink)' }}>{picked.d}<br />이 유형에서 꼭 채울 입력란: {FIELDS[picked.t].filter((f) => f.required).map((f) => f.label).join(' · ')}</p>
          <label>제목(나중에 바꿀 수 있어요)<input name="title" placeholder={picked.ex.replace('예: ', '')} maxLength={120} /></label>
          {picked.t === 'region' && (
            <>
              <label>지역<select name="rid" required>{regionOptions().map((r) => <option key={r.rid} value={r.rid} data-province={r.province}>{r.label}</option>)}</select></label>
              <input type="hidden" name="province" value="" id="province-hidden" />
              <label>서비스<select name="service" required>{verifiedServices().map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              <p className="adm-note">이미 공개된 지역·서비스 조합(예: 평택 자동문 수리)은 새 글 대신 기존 글 보강을 안내해요. 통합(리디렉션) 중인 주소는 운영자 확인 후 개발에서 복원해요.</p>
              <script dangerouslySetInnerHTML={{ __html: `(function(){var s=document.querySelector('select[name=rid]'),h=document.getElementById('province-hidden');function u(){h.value=s.options[s.selectedIndex].dataset.province}s.addEventListener('change',u);u()})();` }} />
            </>
          )}
          {picked.t === 'service' && <label>주소(영문 소문자·숫자·하이픈, 3~40자)<input name="slug" pattern="[a-z0-9][a-z0-9-]{2,39}" placeholder="battery" required /></label>}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-primary" style={{ height: 56, padding: '0 24px' }} disabled={!editable}>초안 만들고 글쓰기</button>
            <a href="/admin/new/" className="btn btn-g100" style={{ height: 56, padding: '0 20px' }}>다른 유형</a>
          </div>
        </form>
      )}
    </AdminShell>
  );
}

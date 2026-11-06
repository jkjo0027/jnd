'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { FIELDS, TYPE_LABEL, WRITING_GUIDE, bodyText } from '@/lib/content-body';
import type { AuthoredPage, Validation, Photo, Status } from '@/lib/server/content';

type Snap = { version: number; at: string; by: string; action: string; title: string };
type Opts = { hubs: { path: string; label: string }[]; regions: { rid: string; province: 'seoul' | 'gyeonggi'; label: string }[]; services: { id: string; label: string }[]; upload: { maxMb: number; allowed: string } };
const STATUS_LABEL: Record<Status, string> = { draft: '초안', review: '검수 요청', publishing: '발행 중', published: '공개 및 검색 발견 준비', error: '공개 오류', unpublished: '비공개' };
type UpItem = { key: string; name: string; state: 'uploading' | 'done' | 'error'; error?: string; file?: File };

/** 한 화면 편집기: 자동저장(2초) · 사진 업로드(한글 파일명 그대로) · 비슷한 글 안내 · 검색 표시 예시 · 발행 전 체크리스트 · 검수 요청/승인 공개/비공개/이력 복원 */
export default function Editor({ initial, validation: v0, snapshots: s0, canEdit, canPublish, options }: { initial: AuthoredPage; validation: Validation; snapshots: Snap[]; canEdit: boolean; canPublish: boolean; options: Opts }) {
  const [p, setP] = useState<AuthoredPage>(initial);
  const [val, setVal] = useState<Validation>(v0);
  const [snaps, setSnaps] = useState<Snap[]>(s0);
  const [save, setSave] = useState<{ st: 'idle' | 'dirty' | 'saving' | 'saved' | 'error'; at?: string; msg?: string }>({ st: 'idle', at: initial.updatedAt });
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'err'; msg: string } | null>(null);
  const [ups, setUps] = useState<UpItem[]>([]);
  const [kwQ, setKwQ] = useState(''); const [kwHits, setKwHits] = useState<{ id: string; keyword: string; intent: string; area: string }[]>([]);
  const [relQ, setRelQ] = useState(''); const [relHits, setRelHits] = useState<{ path: string; label: string }[]>([]);
  const [device, setDevice] = useState<'mobile' | 'pc'>('mobile');
  const [previewKey, setPreviewKey] = useState(0);
  const dirty = useRef<Record<string, unknown>>({}); const timer = useRef<ReturnType<typeof setTimeout> | null>(null); const ver = useRef(initial.version);
  const live = p.status === 'published' || p.status === 'error' || p.status === 'publishing';
  const locked = !canEdit;

  const flush = useCallback(async () => {
    const patch = dirty.current; if (!Object.keys(patch).length) return;
    dirty.current = {}; setSave({ st: 'saving' });
    try {
      const r = await fetch(`/api/admin/content/${p.id}/`, { method: 'PUT', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ patch, ifVersion: ver.current }) });
      const j = await r.json();
      if (!r.ok) { dirty.current = { ...patch, ...dirty.current }; setSave({ st: 'error', msg: j.error || `저장 실패 (${r.status})` }); return; }
      ver.current = j.page.version; setP((cur) => ({ ...cur, version: j.page.version, path: j.page.path, status: j.page.status, hub: j.page.hub, updatedAt: j.page.updatedAt })); setVal(j.validation); setSave({ st: 'saved', at: j.savedAt }); setPreviewKey((k) => k + 1);
    } catch { dirty.current = { ...patch, ...dirty.current }; setSave({ st: 'error', msg: '네트워크 오류 — 다시 시도해요' }); }
  }, [p.id]);
  const set = useCallback(<K extends keyof AuthoredPage>(k: K, v: AuthoredPage[K]) => {
    if (locked) return;
    setP((cur) => ({ ...cur, [k]: v })); dirty.current[k as string] = v; setSave({ st: 'dirty' });
    if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 2000);
  }, [flush, locked]);
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  useEffect(() => { const h = (e: BeforeUnloadEvent) => { if (Object.keys(dirty.current).length) { e.preventDefault(); } }; window.addEventListener('beforeunload', h); return () => window.removeEventListener('beforeunload', h); }, []);
  const setField = (k: string, v: string) => set('fields', { ...p.fields, [k]: v });

  // 조회
  useEffect(() => { const t = setTimeout(async () => { if (!kwQ.trim()) { setKwHits([]); return; } const r = await fetch(`/api/admin/lookup/?kind=keywords&q=${encodeURIComponent(kwQ)}`); const j = await r.json(); setKwHits(j.keywords || []); }, 300); return () => clearTimeout(t); }, [kwQ]);
  useEffect(() => { const t = setTimeout(async () => { if (!relQ.trim()) { setRelHits([]); return; } const r = await fetch(`/api/admin/lookup/?kind=paths&q=${encodeURIComponent(relQ)}`); const j = await r.json(); setRelHits(j.paths || []); }, 300); return () => clearTimeout(t); }, [relQ]);

  const act = async (action: string, extra: Record<string, unknown> = {}) => {
    if (timer.current) clearTimeout(timer.current); await flush();
    setBusy(action); setNotice(null);
    try {
      const r = await fetch(`/api/admin/content/${p.id}/`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action, ifVersion: ver.current, ...extra }) });
      const j = await r.json();
      if (j.validation) setVal(j.validation);
      if (j.snapshots) setSnaps(j.snapshots);
      if (!r.ok) { setNotice({ kind: 'err', msg: j.error || `실패 (${r.status})` }); return; }
      if (action === 'delete') { window.location.href = '/admin/content/'; return; }
      if (j.page) { ver.current = j.page.version; setP(j.page); }
      if (j.pending) {
        // 응답 이후에 실행되는 검색 발견 준비 검사 결과를 폴링(최대 60초)
        setNotice({ kind: 'ok', msg: action === 'unpublish' ? '비공개로 바꿨어요. 주소·사이트맵 반영을 확인하는 중…' : '반영 중… 새 주소·허브 링크·사이트맵·사진 응답을 확인하고 있어요.' });
        const startedAt = j.page?.check?.at || null;
        for (let i = 0; i < 40; i++) {
          await new Promise((r) => setTimeout(r, 1500));
          const g = await fetch(`/api/admin/content/${p.id}/`, { cache: 'no-store' }); const gj = await g.json();
          if (gj.page && gj.page.status !== 'publishing' && gj.page.check && gj.page.check.at !== startedAt) {
            ver.current = gj.page.version; setP(gj.page); setPreviewKey((k) => k + 1);
            const ok = gj.page.check.ok;
            setNotice({ kind: ok ? 'ok' : 'err', msg: action === 'unpublish' ? (ok ? '비공개로 바꿨어요. 주소 404·사이트맵 제외·허브 링크 제거를 확인했어요.' : '비공개로 바꿨지만 확인 항목 일부가 실패했어요.') : ok ? '공개했어요. 새 주소·허브 링크·사이트맵·사진 응답을 확인했어요.' : '공개는 됐지만 검색 발견 준비 검사에서 실패한 항목이 있어요. 아래 결과를 확인하세요.' });
            return;
          }
        }
        setNotice({ kind: 'err', msg: '검사 결과를 아직 받지 못했어요. 잠시 후 새로고침해 주세요.' }); return;
      }
      const okMsg: Record<string, string> = { submit: '검수 요청으로 넘겼어요.', restore: '이전 버전으로 되돌렸어요.' };
      setNotice({ kind: 'ok', msg: okMsg[action] || '완료' }); setPreviewKey((k) => k + 1);
    } catch { setNotice({ kind: 'err', msg: '네트워크 오류' }); } finally { setBusy(null); }
  };

  // 사진 업로드 (파일마다 개별 결과·재시도)
  const upload = async (files: File[]) => {
    if (!files.length) return;
    const items: UpItem[] = files.map((f) => ({ key: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`, name: f.name, state: 'uploading', file: f }));
    setUps((cur) => [...cur, ...items]);
    for (const it of items) await uploadOne(it);
  };
  const uploadOne = async (it: UpItem) => {
    if (!it.file) return;
    setUps((cur) => cur.map((x) => (x.key === it.key ? { ...x, state: 'uploading', error: undefined } : x)));
    const fd = new FormData(); fd.append('file', it.file, it.file.name);
    try {
      const r = await fetch('/api/admin/uploads/', { method: 'POST', body: fd });
      const j = await r.json();
      const res = j.results?.[0];
      if (!r.ok || !res?.ok) { setUps((cur) => cur.map((x) => (x.key === it.key ? { ...x, state: 'error', error: res?.error || j.error || `실패 (${r.status})` } : x))); return; }
      const u = res.upload; const ph: Photo = { id: u.id, name: u.name, alt: '', caption: '', w: u.w, h: u.h, sizes: u.sizes, cover: p.photos.length === 0 };
      setP((cur) => { const photos = [...cur.photos, { ...ph, cover: cur.photos.length === 0 }]; dirty.current.photos = photos; return { ...cur, photos }; });
      setSave({ st: 'dirty' }); if (timer.current) clearTimeout(timer.current); timer.current = setTimeout(flush, 800);
      setUps((cur) => cur.filter((x) => x.key !== it.key));
    } catch { setUps((cur) => cur.map((x) => (x.key === it.key ? { ...x, state: 'error', error: '네트워크 중단 — 다시 시도' } : x))); }
  };
  const photos = (next: Photo[]) => set('photos', next);
  const move = (i: number, d: -1 | 1) => { const n = [...p.photos]; const j = i + d; if (j < 0 || j >= n.length) return; [n[i], n[j]] = [n[j], n[i]]; photos(n); };

  const errFor = (f: string) => val.errors.filter((e) => e.field === f);
  const serpTitle = p.seoTitle || p.title || '(제목)'; const serpDesc = p.seoDesc || p.summary || bodyText(p.body).slice(0, 120) || '(설명)';
  const focusField = (f: string) => { const el = document.getElementById('f-' + f) || document.getElementById(f); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); (el?.querySelector('input,textarea,select') as HTMLElement | null)?.focus(); };
  const previewUrl = `/admin/preview/content/${p.id}/?v=${previewKey}`;
  const copy = async () => { try { await navigator.clipboard.writeText(`https://jndsystem.kr${p.path}`); setNotice({ kind: 'ok', msg: '주소를 복사했어요.' }); } catch { setNotice({ kind: 'err', msg: '복사 실패 — 주소를 직접 선택해 복사하세요.' }); } };

  return (
    <div className="ed">
      <div className="ed-top">
        <div>
          <p className="sub">{TYPE_LABEL[p.type]} · {p.id}</p>
          <h1>{p.title || '(제목 없음)'}</h1>
          <p className="ed-path">{p.path ? <>https://jndsystem.kr<b>{p.path}</b></> : '주소 미정 (유형별 정보를 채우면 정해져요)'}{live && <> · <a href={p.path} target="_blank" rel="noreferrer">게시물 열기</a> · <button type="button" className="lnk" onClick={copy}>URL 복사</button></>}</p>
        </div>
        <div className="ed-status">
          <span className={`badge st-${p.status}`}>{STATUS_LABEL[p.status]}</span>
          <span className={`save ${save.st}`}>{save.st === 'saving' ? '저장 중…' : save.st === 'dirty' ? '변경됨 (곧 저장)' : save.st === 'error' ? `저장 실패: ${save.msg}` : `저장됨 ${(save.at || p.updatedAt).slice(11, 19)}`}{save.st === 'error' && <button type="button" className="lnk" onClick={flush}>다시 저장</button>}</span>
        </div>
      </div>
      {notice && <p className={notice.kind === 'ok' ? 'adm-ok' : 'adm-note'} role="status">{notice.msg}</p>}
      {locked && <p className="adm-note">읽기 전용: 글 작성 권한이 없어요.</p>}
      <div className="ed-grid">
        <div className="ed-main">
          <section className="ed-sec" id="f-title">
            <h2>제목과 요약</h2>
            <label>제목 <small>실제 증상·서비스와, 구분에 필요한 지역만 자연스럽게. 같은 말을 반복하지 않아요.</small>
              <input value={p.title} onChange={(e) => set('title', e.target.value)} maxLength={120} placeholder="예: 수원 상가 자동문이 닫히다 다시 열릴 때 확인할 점" disabled={locked} />
            </label>
            {errFor('title').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            <label id="f-summary">요약(첫 문단) <small>누구에게 해당하는지와 확인할 수 있는 답을 한두 문장으로. 검색 설명의 기본값이 돼요.</small>
              <textarea value={p.summary} onChange={(e) => set('summary', e.target.value)} rows={3} maxLength={400} disabled={locked} />
            </label>
            {errFor('summary').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
          </section>
          {p.type === 'region' && (
            <section className="ed-sec" id="f-region">
              <h2>지역과 서비스</h2>
              <div className="ed-row">
                <label>지역<select value={p.region?.rid || ''} disabled={locked || p.lastPublishedVersion !== null} onChange={(e) => { const r = options.regions.find((x) => x.rid === e.target.value); set('region', r ? { province: r.province, rid: r.rid } : null); }}><option value="">선택</option>{options.regions.map((r) => <option key={r.rid} value={r.rid}>{r.label}</option>)}</select></label>
                <label>서비스<select value={p.service || ''} disabled={locked || p.lastPublishedVersion !== null} onChange={(e) => set('service', e.target.value || null)}><option value="">선택</option>{options.services.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></label>
              </div>
              {errFor('region').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            </section>
          )}
          {p.type === 'service' && (
            <section className="ed-sec" id="f-slug">
              <h2>주소</h2>
              <label>/services/<b>{p.slug || '…'}</b>/ <small>영문 소문자·숫자·하이픈 3~40자. 발행 뒤에는 바꿀 수 없어요.</small>
                <input value={p.slug || ''} onChange={(e) => set('slug', e.target.value.toLowerCase())} disabled={locked || p.lastPublishedVersion !== null} pattern="[a-z0-9][a-z0-9-]{2,39}" />
              </label>
              {errFor('slug').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            </section>
          )}
          <section className="ed-sec">
            <h2>{TYPE_LABEL[p.type]} 필수 내용</h2>
            {FIELDS[p.type].map((d) => (
              <div key={d.key} id={'f-' + d.key}>
                <label>{d.label}{d.required && <em> 필수</em>} <small>{d.hint}</small>
                  {d.multiline ? <textarea value={p.fields[d.key] || ''} onChange={(e) => setField(d.key, e.target.value)} rows={3} placeholder={d.example} disabled={locked} /> : <input value={p.fields[d.key] || ''} onChange={(e) => setField(d.key, e.target.value)} placeholder={d.example} disabled={locked} />}
                </label>
                {errFor('f-' + d.key).map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
              </div>
            ))}
          </section>
          <section className="ed-sec" id="f-body">
            <h2>본문</h2>
            <p className="ed-hint">빈 줄로 문단을 나누고, 소제목은 줄 앞에 <code>## </code>, 목록은 <code>- </code>로 시작하면 돼요. HTML 은 필요 없어요. 현재 {bodyText(p.body).length}자.</p>
            <textarea className="ed-body" value={p.body} onChange={(e) => set('body', e.target.value)} rows={16} disabled={locked} placeholder={'## 현장 상황\n매장 출입문이 저녁 시간대에만 닫히다 다시 열렸어요.\n\n## 확인한 것\n- 센서 앞 입간판\n- 렌즈 오염'} />
            {errFor('body').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
          </section>
          <section className="ed-sec" id="photos">
            <h2>사진</h2>
            <p className="ed-hint">{options.upload.allowed} · 장당 {options.upload.maxMb}MB · 한 번에 10장. 한글·영문·공백·괄호가 있는 파일명도 그대로 올려요. 원본은 비공개로 보관하고 웹용으로 줄인 사진만 공개돼요(위치정보 제거).</p>
            {!locked && (
              <label className="ed-drop" onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); upload(Array.from(e.dataTransfer.files)); }}>
                <Icon name="image-plus" /> 사진 선택 또는 끌어다 놓기
                <input type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp" multiple onChange={(e) => { upload(Array.from(e.target.files || [])); e.target.value = ''; }} />
              </label>
            )}
            {ups.map((u) => <div key={u.key} className={`ed-up ${u.state}`}><span>{u.name}</span>{u.state === 'uploading' ? <span>올리는 중…</span> : <><span className="ed-err">{u.error}</span><button type="button" className="btn btn-g100 sm" onClick={() => uploadOne(u)}>다시 시도</button><button type="button" className="lnk" onClick={() => setUps((c) => c.filter((x) => x.key !== u.key))}>지우기</button></>}</div>)}
            {errFor('photos').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            <div className="ed-photos">
              {p.photos.map((ph, i) => (
                <div key={ph.id} className={`ed-photo${ph.cover ? ' cover' : ''}`} id={'photo-' + i}>
                  <img src={`/uploads/${ph.id}-${ph.sizes[0]}.webp`} alt="" width={ph.w} height={ph.h} />
                  <div className="ed-photo-f">
                    <p className="nm" title={ph.name}>{ph.name} <small>{ph.w}×{ph.h}</small>{ph.cover && <span className="badge st-published">대표</span>}</p>
                    <label>사진 설명(alt) <em>필수</em><input value={ph.alt} placeholder="예: 상가 출입문 상단 안전센서 점검 모습" onChange={(e) => photos(p.photos.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x)))} disabled={locked} /></label>
                    {errFor('photo-' + i).map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
                    <label>캡션(선택)<input value={ph.caption} placeholder="작업 맥락 설명" onChange={(e) => photos(p.photos.map((x, j) => (j === i ? { ...x, caption: e.target.value } : x)))} disabled={locked} /></label>
                    {!locked && <div className="ed-photo-acts"><button type="button" className="lnk" onClick={() => photos(p.photos.map((x, j) => ({ ...x, cover: j === i })))}>대표로</button><button type="button" className="lnk" onClick={() => move(i, -1)}>↑</button><button type="button" className="lnk" onClick={() => move(i, 1)}>↓</button><button type="button" className="lnk danger" onClick={() => photos(p.photos.filter((_, j) => j !== i).map((x, j, a) => ({ ...x, cover: a.some((y) => y.cover) ? x.cover : j === 0 })))}>빼기</button></div>}
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className="ed-sec" id="f-hub">
            <h2>연결</h2>
            <label>상위 허브 <small>공개된 목록 중에서만 고를 수 있어요. 발행하면 이 허브에 링크가 생겨요.</small>
              <select value={p.hub} onChange={(e) => set('hub', e.target.value)} disabled={locked || p.type === 'region'}>{options.hubs.map((h) => <option key={h.path} value={h.path}>{h.label} ({h.path})</option>)}</select>
            </label>
            {errFor('hub').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            <div id="f-related">
              <label>관련 페이지 <small>목적지가 드러나는 글을 골라요(예: 자동문 센서 점검 범위).</small>
                <input value={relQ} onChange={(e) => setRelQ(e.target.value)} placeholder="제목·주소로 검색" disabled={locked} />
              </label>
              {relHits.length > 0 && <div className="ed-hits">{relHits.map((h) => <button key={h.path} type="button" onClick={() => { if (!p.related.includes(h.path)) set('related', [...p.related, h.path]); setRelQ(''); }}>{h.label}</button>)}</div>}
              <div className="ed-chips">{p.related.map((r) => <span key={r} className="chip">{r}{!locked && <button type="button" aria-label="제거" onClick={() => set('related', p.related.filter((x) => x !== r))}>×</button>}</span>)}</div>
              {errFor('related').map((e) => <p key={e.msg} className="ed-err">{e.msg}</p>)}
            </div>
            <div id="f-keyword">
              <label>대표 검색 의도 <small>엑셀 키워드 매핑에서 찾아 고르면 비슷한 글 판단에 쓰여요. 본문에 반복해서 넣을 필요는 없어요.</small>
                <input value={kwQ} onChange={(e) => setKwQ(e.target.value)} placeholder="예: 수원 자동문 센서" disabled={locked} />
              </label>
              {kwHits.length > 0 && <div className="ed-hits">{kwHits.map((k) => <button key={k.id} type="button" onClick={() => { set('keyword', { id: k.id, keyword: k.keyword, intent: k.intent }); setKwQ(''); }}>{k.keyword} <small>{k.intent} · {k.area}</small></button>)}</div>}
              {p.keyword && <div className="ed-chips"><span className="chip">{p.keyword.keyword} <small>{p.keyword.intent}</small>{!locked && <button type="button" aria-label="제거" onClick={() => set('keyword', null)}>×</button>}</span></div>}
            </div>
          </section>
          <section className="ed-sec" id="f-seoTitle">
            <h2>검색 결과 표시</h2>
            <p className="ed-hint">비워 두면 제목·요약을 그대로 써요. 아래 화면은 예시이며 검색엔진이 다르게 표시할 수 있어요.</p>
            <label>검색 제목<input value={p.seoTitle} onChange={(e) => set('seoTitle', e.target.value)} placeholder={p.title} maxLength={120} disabled={locked} /></label>
            <label id="f-seoDesc">검색 설명<textarea value={p.seoDesc} onChange={(e) => set('seoDesc', e.target.value)} placeholder={p.summary} rows={2} maxLength={300} disabled={locked} /></label>
            <div className="serp"><p className="u">jndsystem.kr{p.path || '/…/'}</p><p className="t">{serpTitle.slice(0, 70)}{serpTitle.length > 70 ? '…' : ''}</p><p className="d">{serpDesc.slice(0, 160)}{serpDesc.length > 160 ? '…' : ''}</p></div>
            <label className="ed-check"><input type="checkbox" checked={p.showMeta} onChange={(e) => set('showMeta', e.target.checked)} disabled={locked} />작성일·검토일을 글에 표시</label>
          </section>
          <details className="ed-guide"><summary>글쓰기 가이드 (네이버·구글 공통)</summary>{WRITING_GUIDE.map((g) => <div key={g.h}><b>{g.h}</b><ul>{g.items.map((it) => <li key={it}>{it}</li>)}</ul></div>)}</details>
        </div>
        <aside className="ed-side">
          <section className="ed-sec">
            <h2>발행 전 확인</h2>
            {val.errors.length === 0 ? <p className="adm-ok">필수 항목을 모두 채웠어요.</p> : <ul className="ed-list err">{val.errors.map((e) => <li key={e.field + e.msg}><button type="button" className="lnk" onClick={() => focusField(e.field)}>{e.msg}</button></li>)}</ul>}
            {val.warnings.length > 0 && <ul className="ed-list warn">{val.warnings.map((w) => <li key={w.field + w.msg}><button type="button" className="lnk" onClick={() => focusField(w.field)}>{w.msg}</button></li>)}</ul>}
            {val.similar.length > 0 && (
              <div className="ed-similar">
                <p><b>비슷한 글이 있어요.</b> 새 글 대신 기존 글을 보강하는 게 나을 수 있어요.</p>
                {val.similar.map((s) => <p key={s.path}><a href={s.path} target="_blank" rel="noreferrer">{s.title}</a> <small>{s.why} · {s.path}</small></p>)}
              </div>
            )}
            <div className="ed-acts">
              {!live && <button type="button" className="btn btn-g100" disabled={!!busy || locked || val.errors.length > 0} onClick={() => act('submit')}>{busy === 'submit' ? '…' : '검수 요청'}</button>}
              <button type="button" className="btn btn-primary" disabled={!!busy || !canPublish || val.errors.length > 0} onClick={() => act('publish')} title={canPublish ? '' : '승인 권한(admin)이 필요해요'}>{busy === 'publish' ? '발행 중…' : live ? '수정 내용 다시 공개' : '승인하고 공개'}</button>
              {live && <button type="button" className="btn btn-g100" disabled={!!busy || !canPublish} onClick={() => { if (confirm('비공개로 바꾸면 주소가 404 가 되고 사이트맵에서 빠져요. 계속할까요?')) act('unpublish'); }}>비공개</button>}
              {live && <button type="button" className="btn btn-g100" disabled={!!busy} onClick={() => act('recheck')}>검색 발견 준비 재검사</button>}
              {p.lastPublishedVersion === null && !locked && <button type="button" className="lnk danger" disabled={!!busy} onClick={() => { if (confirm('이 초안을 삭제할까요? 다른 글에서 쓰지 않는 사진도 함께 지워요.')) act('delete'); }}>초안 삭제</button>}
            </div>
            <p className="ed-hint">저장은 편집본을 보관합니다. 방문자에게 수정 내용을 보이려면 승인하고 공개 또는 수정 내용 다시 공개를 눌러 주세요.</p>
            {!canPublish && <p className="ed-hint">공개는 승인 권한자가 해요. 검수 요청을 보내면 목록에 표시돼요.</p>}
          </section>
          {p.check && (
            <section className="ed-sec">
              <h2>검색 발견 준비 검사 <small>{p.check.at.slice(0, 16).replace('T', ' ')}</small></h2>
              <ul className="ed-check-list">{p.check.items.map((i) => <li key={i.k} className={i.ok ? 'ok' : 'ng'}><Icon name={i.ok ? 'circle-check' : 'circle-x'} />{i.k} <small>{i.detail}</small></li>)}</ul>
              <p className="ed-hint">검색엔진의 수집·색인·노출은 별도 관측 상태예요(검색 콘솔 런북).</p>
            </section>
          )}
          <section className="ed-sec">
            <h2>미리보기 <span className="ed-dev"><button type="button" className={device === 'mobile' ? 'on' : ''} onClick={() => setDevice('mobile')}>모바일</button><button type="button" className={device === 'pc' ? 'on' : ''} onClick={() => setDevice('pc')}>PC</button><a href={previewUrl} target="_blank" rel="noreferrer">새 창</a></span></h2>
            <div className={`ed-frame ${device}`}><iframe key={previewKey + device} src={previewUrl} title="미리보기" /></div>
          </section>
          <section className="ed-sec">
            <h2>이력</h2>
            <ul className="ed-hist">{snaps.slice(0, 12).map((s) => <li key={s.version}>v{s.version} · {s.at.slice(0, 16).replace('T', ' ')} · {s.by} · {s.action}{s.version !== p.version && !locked && <button type="button" className="lnk" onClick={() => { if (confirm(`v${s.version} 내용으로 되돌릴까요? 현재 내용은 이력에 남아요.`)) act('restore', { version: s.version }); }}>복원</button>}</li>)}{!snaps.length && <li>발행·복원 시점마다 버전이 남아요.</li>}</ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

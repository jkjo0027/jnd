'use client';
import Link from 'next/link';
import { useEffect, useId, useState } from 'react';
import Icon from '@/components/Icon';
import { usePhones } from '@/components/PhoneProvider';
import { INFO } from '@/lib/site';
import { BUILDINGS, SYMS } from '@/content/site-data';

type Result = { ok: true; id: string; notify: string } | { ok: false; error: string; retryable: boolean };

export default function ContactForm({ testMode, attachments, smsPhone, retention }: { testMode: boolean; attachments: boolean; smsPhone: string | null; retention: string | null }) {
  const { tel, current, holdProps } = usePhones();
  const [f, setF] = useState({ name: '', phone: '', area: '', sym: '', bld: '', msg: '' });
  const [agree, setAgree] = useState(false);
  const [tried, setTried] = useState(false);
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<Result | null>(null);
  const [sent, setSent] = useState<{ id: string } | null>(null);
  const [idem, setIdem] = useState('');
  useEffect(() => { const k = typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : String(Date.now()) + Math.random(); const t = setTimeout(() => setIdem(k), 0); return () => clearTimeout(t); }, []);
  const uid = useId();
  const nameOk = f.name.trim().length > 0, phoneOk = /^0\d{1,2}-?\d{3,4}-?\d{4}$/.test(f.phone.replace(/\s/g, ''));
  const can = nameOk && phoneOk && agree;
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!can) { setTried(true); return; }
    setBusy(true); setRes(null);
    try {
      const r = await fetch('/api/contact', { method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': idem }, body: JSON.stringify({ ...f, agree, source: typeof location !== 'undefined' ? location.pathname : '' }) });
      const j = await r.json().catch(() => ({}));
      if (r.ok && j.id) { setSent({ id: j.id }); try { (window as unknown as { dataLayer?: unknown[] }).dataLayer?.push({ event: testMode ? 'contact_submit_test' : 'contact_submit', inquiry_id: j.id }); } catch {} }
      else setRes({ ok: false, error: j.error || '접수하지 못했어요. 잠시 후 다시 시도해 주세요.', retryable: r.status !== 400 });
    } catch { setRes({ ok: false, error: '네트워크 연결을 확인하고 다시 시도해 주세요. 작성한 내용은 그대로 남아 있어요.', retryable: true }); }
    finally { setBusy(false); }
  };
  if (sent) {
    return (
      <div className="sent" role="status">
        <span className="ic"><Icon name="check" /></span>
        <h1>문의를 받았어요</h1>
        <p className="d">남겨주신 번호로 연락드릴게요.<br />급하시면 지금 바로 전화 주세요.</p>
        <p className="id">접수번호 {sent.id}{testMode ? ' · 테스트 접수(운영 알림 미발송)' : ''}</p>
        <div className="acts">
          <a href={tel} className="btn btn-primary" {...holdProps}><Icon name="phone" size={20} />{current}</a>
          <Link href="/" className="btn btn-g100">메인으로</Link>
          <button type="button" className="btn-text" style={{ height: 48 }} onClick={() => { setSent(null); setF({ name: '', phone: '', area: '', sym: '', bld: '', msg: '' }); setAgree(false); setTried(false); }}>새 문의 작성</button>
        </div>
      </div>
    );
  }
  return (
    <>
      <h1>급하시면<br />전화가 가장 빨라요</h1>
      <a href={tel} className="tel-card" {...holdProps}>
        <span className="ic"><Icon name="phone" /></span>
        <span className="tx"><span className="n">{current}</span><span className="h">{INFO.hours}</span></span>
        <Icon name="chevron-right" className="ch" />
      </a>
      <h2>문의 남기기</h2>
      <form className="form" onSubmit={submit} noValidate>
        {testMode && <p className="test-note">지금은 접수 테스트 단계예요. 접수 내용은 저장되지만 운영 알림은 보내지 않아요. 급한 문의는 전화로 부탁드려요.</p>}
        <label><span className="lb">이름 <em>*</em></span><input name="name" value={f.name} onChange={set('name')} placeholder="홍길동" autoComplete="name" maxLength={40} aria-invalid={tried && !nameOk} aria-describedby={tried && !nameOk ? uid + 'n' : undefined} />{tried && !nameOk && <span className="err" id={uid + 'n'}>이름을 입력해 주세요</span>}</label>
        <label><span className="lb">연락처 <em>*</em></span><input name="phone" value={f.phone} onChange={set('phone')} type="tel" inputMode="numeric" placeholder="010-0000-0000" autoComplete="tel" maxLength={20} aria-invalid={tried && !phoneOk} aria-describedby={tried && !phoneOk ? uid + 'p' : undefined} />{tried && !phoneOk && <span className="err" id={uid + 'p'}>연락받으실 번호를 입력해 주세요</span>}</label>
        <label><span className="lb">설치 위치</span><input name="area" value={f.area} onChange={set('area')} placeholder="예: 용인시 처인구 김량장동 ○○상가" maxLength={120} /></label>
        <label><span className="lb">증상</span><select name="sym" value={f.sym} onChange={set('sym')}><option value="">선택해 주세요</option>{SYMS.map((s) => <option key={s.id} value={s.t}>{s.t}</option>)}</select></label>
        <div className="fld"><span className="lb">건물 종류</span><div className="bld">{BUILDINGS.map((b) => <button type="button" key={b} aria-pressed={f.bld === b} onClick={() => setF({ ...f, bld: f.bld === b ? '' : b })}>{b}</button>)}</div></div>
        <label><span className="lb">내용</span><textarea name="msg" value={f.msg} onChange={set('msg')} rows={4} placeholder="언제부터 어떻게 고장났는지 알려주세요" maxLength={2000} /></label>
        <div className="photo" id="photo"><Icon name="camera" />{attachments ? '고장 부위 사진 첨부 (선택)' : smsPhone ? <>고장 부위 사진은 <a href={'sms:' + smsPhone}>{smsPhone} 문자</a>로 보내주세요</> : '고장 부위 사진 첨부는 준비 중이에요. 전화 상담 때 안내해 드려요.'}</div>
        <div className="agree">
          <button type="button" role="checkbox" aria-checked={agree} onClick={() => setAgree(!agree)}>
            <span className={`box${agree ? ' on' : tried && !agree ? ' err' : ''}`}>{agree && <Icon name="check" />}</span>
            <span style={{ flex: 1 }}>[필수] 개인정보 수집·이용에 동의해요</span>
          </button>
          <p>이름·연락처·설치 위치를 상담 목적으로 수집하며, 상담 완료 후 {retention || '[보유기간 확정 대기]'} 뒤 파기해요. <Link href="/privacy/">전문 보기</Link></p>
        </div>
        {res && !res.ok && <p className="fail" role="alert">{res.error}{res.retryable ? ' 다시 시도할 수 있어요.' : ''}</p>}
        <button type="submit" className={`btn btn-primary submit${!can ? ' off' : ''}`} aria-disabled={!can || busy} disabled={busy}>{busy ? '보내는 중…' : '문의 보내기'}</button>
        {!can && <p className="hint">이름·연락처 입력과 개인정보 동의가 필요해요</p>}
      </form>
    </>
  );
}

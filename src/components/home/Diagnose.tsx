'use client';
import Link from 'next/link';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { usePhones } from '@/components/PhoneProvider';
import { SYMS, PICKS, SVCS, type Case } from '@/content/site-data';

/** 01 증상 진단 — 증상 → 지역 → 결과 3단계. 결과는 서비스 페이지와 검수된 사례(정확 일치)로만 연결 */
export default function Diagnose({ cases, regionHref }: { cases: Case[]; regionHref: Record<string, string> }) {
  const [step, setStep] = useState(0);
  const [symId, setSym] = useState<string | null>(null);
  const [pick, setPick] = useState<string | null>(null);
  const { tel, holdProps } = usePhones();
  const sym = SYMS.find((x) => x.id === symId) || SYMS[0];
  const pk = PICKS.find((x) => x.l === pick) || PICKS[0];
  const svc = SVCS.find((x) => x.id === sym.svc)!;
  const sameSvc = cases.filter((c) => c.svc === sym.svc);
  const exact = sameSvc.find((c) => pk.c && c.city === pk.c);
  const rcase = exact || sameSvc[0] || null;
  const progress = ['33%', '66%', '100%'][step];
  return (
    <section id="diagnose" className="sec sec-g50 diag">
      <div className="wrap">
        <div>
          <p className="sec-num">01</p>
          <h2 className="t">증상으로 고장 원인 찾기</h2>
          <p className="lede">자동문 고장은 대부분 센서·스위치·컨트롤러 중 한 곳에서 시작돼요. 증상과 지역을 고르면 예상 원인과 조치 방법, 비슷한 시공사례를 바로 보여드려요.</p>
          <dl className="facts">
            <div><dt>본사</dt><dd>경기 평택</dd></div>
            <div><dt>주요 지역</dt><dd>화성·수원·용인</dd></div>
            <div><dt>출장 범위</dt><dd>수도권·충청권</dd></div>
          </dl>
        </div>
        <div className="diag-card">
          <div className="head">
            {step > 0 && <button type="button" className="back" aria-label="이전 단계" onClick={() => setStep((s) => Math.max(0, s - 1))}><Icon name="arrow-left" size={20} /></button>}
            <span className="k">증상 진단</span>
            <div className="bar" role="progressbar" aria-valuenow={step + 1} aria-valuemin={1} aria-valuemax={3} aria-label="진단 단계"><i style={{ width: progress }} /></div>
            <span className="n">{step + 1} / 3</span>
          </div>
          <div className="body">
            {step === 0 && (
              <div className="diag-step" key="s0">
                <h2>문이 어떻게 고장났나요?</h2>
                <p className="sub">가장 가까운 증상을 골라 주세요.</p>
                <div className="sym-list">
                  {SYMS.map((o) => (
                    <button type="button" key={o.id} className="sym-btn" onClick={() => { setSym(o.id); setStep(1); }}>
                      <Icon name={o.icon} className="ic" /><span className="t">{o.t}</span><Icon name="chevron-right" className="ch" />
                    </button>
                  ))}
                </div>
                <a href={tel} className="diag-tel" {...holdProps}>증상을 잘 모르겠어요 — 바로 전화할게요<Icon name="arrow-right" /></a>
              </div>
            )}
            {step === 1 && (
              <div className="diag-step" key="s1">
                <p className="diag-kicker"><Icon name={sym.icon} />{sym.t}</p>
                <h2>자동문이 있는 곳은 어디인가요?</h2>
                <p className="sub">지역을 고르면 출장 가능 여부도 함께 알려드려요.</p>
                <div className="pick-grid">
                  {PICKS.map((p) => <button type="button" key={p.l} className={`pick${pick === p.l ? ' on' : ''}`} onClick={() => { setPick(p.l); setStep(2); }}>{p.l}</button>)}
                </div>
              </div>
            )}
            {step === 2 && (
              <div className="diag-step diag-res" key="s2">
                <p className="k">{pk.l} · {sym.t}</p>
                <h2>{sym.head}</h2>
                <dl>
                  <div><dt>예상 원인</dt><dd>{sym.cause}</dd></div>
                  <div><dt>이렇게 고쳐요 · {svc.t}</dt><dd><ol>{sym.act.map((t, i) => <li key={t}><i>{i + 1}</i>{t}</li>)}</ol></dd></div>
                </dl>
                {rcase && (
                  <Link href={`/cases/${rcase.id}/`} className="case-mini">
                    <span className="th"><img src={rcase.img} alt={`${rcase.place} ${rcase.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                    <span className="tx"><span className="k" style={{ display: 'block' }}>{exact ? '비슷한 시공사례' : `참고 시공사례 · ${rcase.area}`}</span><span className="t" style={{ display: 'block' }}>{rcase.place} · {rcase.title}</span></span>
                    <Icon name="chevron-right" className="ch" />
                  </Link>
                )}
                {!pk.c && <div className="diag-warn"><Icon name="info" />지역을 알려주시면 출장 가능 여부를 바로 확인해 드려요.</div>}
                <div className="diag-actions">
                  <a href={tel} className="btn btn-primary" {...holdProps}><Icon name="phone" size={18} />지금 전화로 상담하기</a>
                  <div className="two">
                    <Link href="/contact/" className="btn btn-outline">문의 남기기</Link>
                    {pk.c ? <Link href={regionHref[pk.c] || '/areas/'} className="btn btn-outline">{pk.l} 안내</Link> : <Link href="/areas/" className="btn btn-outline">출장 지역 보기</Link>}
                  </div>
                  <Link href={svc.route} className="btn btn-outline" style={{ height: 48 }}>{svc.t} 서비스 자세히</Link>
                  <button type="button" className="restart" onClick={() => { setStep(0); setSym(null); setPick(null); }}>처음부터 다시 진단하기</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

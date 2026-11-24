import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { CONSULT_PHONES, INFO } from '@/lib/site';
import { CITIES, type Case } from '@/content/site-data';
import { REGION_PAGES } from '@/content/regions';
import { SERVICE_IDS, SERVICE_BLOCKS, composeRegionPage, type GeneratedPage } from '@/content/gen/compose';
import { SERVICES } from '@/content/services';
import { pinIndex, isPublicPath, ops, isPreview } from '@/lib/registry';
import { regionPath } from '@/lib/links';
import { publicCases } from '@/lib/gate';
import { JsonLd } from '@/lib/seo';
import { abs } from '@/lib/site';
import { handbookArticle, handbookPath } from '@/content/handbook';
import consultationData from '@/content/region-consultation.json';

/** 지역 상세: 고정 지역 키(rNN) 해시로 상담번호 1개 배정 → 헤더·모바일바·본문 CTA 모두 같은 번호 */
export function pinnedPhone(rid: string) {
  const phones = isPreview || ops.phonesVerified ? [...CONSULT_PHONES] : [CONSULT_PHONES[0]];
  return phones[pinIndex(rid, phones.length)];
}

export default function RegionPageView({ g, draft = false }: { g: GeneratedPage; draft?: boolean }) {
  const hand = REGION_PAGES.find((r) => r.path === g.path);
  const city = CITIES.find((c) => c.regionId === g.rid);
  const pinned = pinnedPhone(g.rid);
  const pool = publicCases();
  const exact: Case[] = pool.filter((c) => c.regionId === g.rid && (g.service === 'install' ? c.kind === 'install' : g.service === 'repair' ? true : c.svc === g.service));
  const svc = SERVICES.find((s) => s.id === g.service);
  const provName = g.province === 'seoul' ? '서울' : '경기';
  const siblings = SERVICE_IDS.filter((s) => s !== g.service).map((s) => ({ s, p: regionPath(g.province, g.rid, s) })).filter((x) => x.p.split('#')[0] !== g.path && isPublicPath(x.p.split('#')[0]));
  const dongs = [...new Set([...g.region.dongs, ...(city?.gus.flatMap(x => x.d) || [])])];
  const kind = g.service === 'install' ? 'install' : 'repair';
  const consultation = g.service === 'repair' || g.service === 'install'
    ? consultationData[g.rid as keyof typeof consultationData]?.[kind]
    : undefined;
  const guideSlugs = consultation?.guides ?? (g.service === 'sensor'
    ? ['sensor-identification', 'sensor-after-service'] : g.service === 'motor'
      ? ['motor-quote', 'repeat-impact'] : []);
  const articles = guideSlugs.map(handbookArticle).filter(a => !!a);
  const installation = g.service === 'repair' ? composeRegionPage(g.rid, 'install') : null;
  const installNote = installation ? consultationData[g.rid as keyof typeof consultationData]?.install : undefined;
  const installHand = installation && REGION_PAGES.find(r => r.path === installation.path);
  const installArticles = (installNote?.guides ?? []).map(handbookArticle).filter(a => !!a);
  const questions = [...(hand?.faq || []), ...(installHand?.faq || [])].filter((f, i, all) => all.findIndex(x => x.q === f.q) === i);
  const preparation = [...new Set(articles.flatMap(a => a.handoff))];
  // A handbook's recorded case is evidence of that operation, not a local project.
  const referenceIds = new Set(articles.flatMap(a => a.fieldCase ? [a.fieldCase.id] : []));
  const comparison = pool.filter(c => referenceIds.has(c.id)).slice(0, 1);
  const referenceCases = [...new Map([...exact, ...comparison].map(c => [c.id, c])).values()];
  const localEvidence = exact.length > 0;
  const sections = [...g.sections.slice(0, 3), ...(installation ? [{ id: 'install', n: '03-1', h2: `${g.region.short} 자동문 설치 준비` }] : []), ...g.sections.slice(3)].filter(s => (s.id !== 's-faq' || questions.length) && (s.id !== 's-case' || referenceCases.length))
    .map(s => s.id === 's-case' ? { ...s, h2: localEvidence ? '이 지역 작업 기록과 비교 사례' : '작업 범위를 비교할 다른 지역 사례' } : s);
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: questions.map(f => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
  const serviceLd = { '@context': 'https://schema.org', '@type': 'Service', name: g.h1, serviceType: g.label, areaServed: { '@type': 'AdministrativeArea', name: `${provName} ${g.region.name}` }, provider: { '@id': abs('/#org') }, url: abs(g.path), availableChannel: { '@type': 'ServiceChannel', serviceUrl: abs('/contact/'), servicePhone: { '@type': 'ContactPoint', telephone: '+82-' + pinned, availableLanguage: ['ko'] } } };
  return (
    <PublicShell pinned={pinned}>
      {draft && <div className="draft-banner"><span>검수 대기 초안 · 공개 전</span><span>{g.pageId}</span><span>상담번호 고정 배정: {pinned}</span></div>}
      <main>
        <section className="rd-hero">
          <div className="wrap">
            <Breadcrumb dark items={[{ name: '홈', path: '/' }, { name: '출장 지역', path: '/areas/' }, { name: provName, path: `/areas/${g.province}/` }, { name: g.h1, path: g.path }]} />
            <div className="grid">
              <div>
                <p className="k"><i className="ln" /><span>{g.region.name}</span><span className="sl">/</span><span>{city?.tag && city.tag !== '출장' ? `${city.tag} · ` : ''}출장 지역</span></p>
                <h1>{g.h1}</h1>
                <p className="lede">{g.lead}</p>
                <div className="acts">
                  <a href={'tel:' + pinned} className="btn btn-primary"><Icon name="phone" />전화 상담 {pinned}</a>
                  <Link href="/contact/#inquiry" className="btn ghost">문의 남기기</Link>
                </div>
              </div>
              <dl>
                <div><dt>출장 범위</dt><dd>{g.region.name} 전체{g.aliases.length ? ` · ${g.aliases.slice(0, 4).join('·')}${g.aliases.length > 4 ? ' 등' : ''}` : ''}</dd></div>
                <div><dt>상담 시간</dt><dd>{INFO.hours}</dd></div>
                <div><dt>출장비</dt><dd>{INFO.fee}</dd></div>
                <div><dt>본사</dt><dd>경기 평택</dd></div>
              </dl>
            </div>
          </div>
        </section>
        <div className="rd-body">
          <aside className="rd-toc">
            <p className="k">이 페이지에서</p>
            <nav aria-label="목차"><ol>{sections.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.h2.replace(`${g.region.short} `, '').replace(`${g.region.name} `, '')}</a></li>)}</ol></nav>
          </aside>
          <div style={{ minWidth: 0 }}>
            {sections.map((s) => (
              <section key={s.id} id={s.id} className={`rd-sec${s.id === 's-faq' ? ' rd-faq' : ''}`}>
                <div className="h"><span className="n">{s.n}</span><h2>{s.h2}</h2></div>
                {s.id === 'install' && installation && <>
                  <p className="b">{installation.lead}</p><p className="b">{installNote?.note}</p>
                  {installHand && <><p className="b">{installHand.lead}</p><ul className="b">{[...installHand.siteNotes, ...installHand.prepare, ...installHand.quoteFactors].map((x, i) => <li key={i}>{x}</li>)}</ul></>}
                  <div className="case-list-sm">{installArticles.map(a => <Link className="case-sm" key={a.slug} href={handbookPath(a.slug)}><span className="tx"><strong>{a.title}</strong></span><Icon name="chevron-right" /></Link>)}</div>
                  <h3>설치 상담에 함께 전달할 자료</h3><ul className="b">{[...new Set(installArticles.flatMap(a => a.handoff))].map(x => <li key={x}>{x}</li>)}</ul>
                  <p className="b">확정 견적은 출입구 실측 후 안내합니다. 기존 문 철거와 바닥 복구, 전원·출입통제 연결의 포함 범위를 확인하세요.</p><Link href="/services/install/">자동문 설치 작업 절차와 범위 보기</Link>
                </>}
                {s.id === 's-service' && consultation
                  ? <p className="b">{consultation.note}</p>
                  : s.paras?.map((p, i) => <p key={i} className="b">{p}</p>)}
                {s.id === 's-scope' && (
                  <>
                    {hand && <p className="b">{hand.lead}</p>}
                    <div className="dong-chips">{dongs.map((x) => <span key={x}>{x}</span>)}</div>
                    {hand && hand.siteNotes.length > 0 && <ul className="b">{hand.siteNotes.map((e) => <li key={e}>{e}</li>)}</ul>}
                  </>
                )}
                {s.id === 's-service' && !exact.length && <p className="ref-note">{svc && <><Link href={svc.path}>{svc.h1} 작업 절차</Link> · </>}<Link href="/cases/">다른 지역의 시공 사진과 작업 결과</Link></p>}
                {s.items && <ul className="b">{s.items.map((it) => <li key={it}>{it}</li>)}</ul>}
                                {s.id === 's-sym' && <div className="case-list-sm">{articles.map(a =>
                  <Link key={a.slug} href={handbookPath(a.slug)} className="case-sm"><span className="tx"><strong>{a.title}</strong></span><Icon name="chevron-right" /></Link>
                )}</div>}
                {s.id === 's-parts' && <div className="related"><Link href="/services/sensor/">감지센서와 안전센서 점검</Link><Link href="/services/motor/">모터·컨트롤러 교체 판단</Link><Link href="/services/switch/">스위치·수신기 점검</Link></div>}
                {hand?.prepare.length && s.id === 's-cost' && (<><h3 style={{ margin: '24px 0 8px', fontSize: 'var(--fs-b)', fontWeight: 800 }}>상담 때 알려주시면 빨라요</h3><ul className="b">{hand.prepare.map(item => <li key={item}>{item}</li>)}</ul></>)}
                {s.id === 's-cost' && !hand && preparation.length > 0 && <><h3 style={{ margin: '24px 0 8px', fontSize: 'var(--fs-b)', fontWeight: 800 }}>위 상황을 상담할 때 준비할 자료</h3><ul className="b">{preparation.map(item => <li key={item}>{item}</li>)}</ul><p className="ref-note">외부에서 확인할 수 있는 자료만 준비해 주세요. 장치를 열어야 알 수 있는 정보는 미확인으로 남겨도 됩니다.</p></>}
                {s.id === 's-cost' && hand && hand.quoteFactors.length > 0 && <ul className="b">{hand.quoteFactors.map((e) => <li key={e}>{e}</li>)}</ul>}
                {s.id === 's-case' && (
                  <>
                    {!localEvidence && <p className="b">아래는 표시된 지역에서 작업한 공개 기록입니다. 사진과 작업 범위를 비교하는 참고 사례이며, {g.region.name} 현장의 원인이나 견적은 현장 확인 후 안내합니다.</p>}
                    <div className="case-grid">
                      {referenceCases.map(c => (
                        <Link key={c.id} href={`/cases/${c.id}/`} className="case-card">
                          <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                          <span><span className="s" style={{display:'block'}}>{c.regionId === g.rid ? `${g.region.name} 작업 기록` : '다른 지역의 비교 사례'}</span><span className="k" style={{ display: 'block' }}>{c.place}</span><h3>{c.title}</h3><span className="s" style={{ display: 'block' }}>{c.kind === 'install' ? '설치 요청' : '증상'} · {c.sym}</span><span className="s" style={{display:'block'}}>{c.res}</span></span>
                        </Link>
                      ))}
                    </div>
                    {svc && <p className="b" style={{ marginTop: 16 }}>작업 절차와 판단 기준의 전체 안내는 <Link href={svc.path} style={{ fontWeight: 700 }}>{svc.h1}</Link>에서 볼 수 있어요.</p>}
                  </>
                )}
                {s.id === 's-faq' && questions.map(f => <article key={f.q}><h3>{f.q}</h3><p>{f.a}</p></article>)}
                {s.id === 's-near' && (
                  <div className="near-grid">
                    {siblings.map((x) => <Link key={x.p} href={x.p} className="near">{g.region.short} {SERVICE_BLOCKS[x.s].label}<Icon name="arrow-up-right" /></Link>)}
                    <Link href={`/areas/${g.province}/`} className="near">{provName} 전체 지역<Icon name="arrow-up-right" /></Link>
                  </div>
                )}
              </section>
            ))}
            <div className="rd-cta">
              <div><p className="t">{g.region.short} 출장 상담</p><p className="d">{kind === 'install' ? '설치할 출입구와 실측 가능 시간을 알려 주세요.' : '고장 난 위치와 증상을 알려 주세요.'}</p></div>
              <a href={'tel:' + pinned} className="tel"><Icon name="phone" />{pinned}</a>
            </div>
          </div>
        </div>
      </main>
      <JsonLd data={questions.length ? [serviceLd, faqLd] : serviceLd} />
    </PublicShell>
  );
}

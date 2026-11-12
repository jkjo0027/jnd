import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { CONSULT_PHONES, INFO } from '@/lib/site';
import { CITIES, type Case } from '@/content/site-data';
import { REGION_PAGES } from '@/content/regions';
import { REGIONS, SERVICE_IDS, SERVICE_BLOCKS, type GeneratedPage } from '@/content/gen/compose';
import { SERVICES } from '@/content/services';
import { pinIndex, isPublicPath, ops, isPreview } from '@/lib/registry';
import { regionPath } from '@/lib/links';
import { publicCases } from '@/lib/gate';
import { JsonLd } from '@/lib/seo';
import { abs } from '@/lib/site';

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
  const exact: Case[] = pool.filter((c) => c.regionId === g.rid && (g.service === 'install' ? c.kind === 'install' : g.service === 'repair' ? c.kind === 'repair' : c.svc === g.service || c.kind === 'repair'));
  const ref: Case[] = exact.length ? [] : pool.filter((c) => c.kind === (g.service === 'install' ? 'install' : 'repair')).slice(0, 3);
  const svc = SERVICES.find((s) => s.id === g.service);
  const provName = g.province === 'seoul' ? '서울' : '경기';
  const siblings = SERVICE_IDS.filter((s) => s !== g.service).map((s) => ({ s, p: regionPath(g.province, g.rid, s) })).filter((x) => isPublicPath(x.p));
  const near = REGIONS.filter((r) => r.province === g.province && r.rid !== g.rid)
    .map((r) => ({ t: r.short, href: regionPath(g.province, r.rid, g.service) })).filter((x) => isPublicPath(x.href)).slice(0, 8);
  const dongs = city ? city.gus.flatMap((x) => x.d) : g.region.dongs;
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: (g.sections.find((s) => s.id === 's-faq')?.faq || []).map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })) };
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
                <p className="k"><i className="ln" /><span>{g.region.name}</span><span className="sl">/</span><span>{city?.tag || '출장'} 출장 지역</span></p>
                <h1>{g.h1}</h1>
                <p className="lede">{hand?.lead || g.lead}</p>
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
            <nav aria-label="목차"><ol>{g.sections.map((s) => <li key={s.id}><a href={'#' + s.id}>{s.h2.replace(`${g.region.short} `, '').replace(`${g.region.name} `, '')}</a></li>)}</ol></nav>
          </aside>
          <div style={{ minWidth: 0 }}>
            {g.sections.map((s) => (
              <section key={s.id} id={s.id} className={`rd-sec${s.id === 's-faq' ? ' rd-faq' : ''}`}>
                <div className="h"><span className="n">{s.n}</span><h2>{s.h2}</h2></div>
                {s.paras?.map((p, i) => <p key={i} className="b">{p}</p>)}
                {s.id === 's-scope' && (
                  <>
                    <div className="dong-chips">{dongs.map((x) => <span key={x}>{x}</span>)}</div>
                    {hand && hand.evidence.length > 0 && (<><h3 style={{ margin: '24px 0 8px', fontSize: 'var(--fs-b)', fontWeight: 800 }}>이 지역 근거</h3><ul className="b">{hand.evidence.map((e) => <li key={e}>{e}</li>)}</ul></>)}
                    {hand && hand.siteNotes.length > 0 && <ul className="b">{hand.siteNotes.map((e) => <li key={e}>{e}</li>)}</ul>}
                  </>
                )}
                {s.items && <ul className="b">{s.items.map((it) => <li key={it}>{it}</li>)}</ul>}
                {s.symptoms && (
                  <div className="sym-acc">
                    {s.symptoms.map((y, i) => (
                      <div key={y.t}><details open={i === 0}>
                        <summary><Icon name={y.icon} className="ic" /><span className="t">{y.t}</span><Icon name="plus" className="plus" /><Icon name="minus" className="minus" /></summary>
                        <dl><div><dt>원인</dt><dd>{y.cause}</dd></div><div><dt>조치</dt><dd>{y.action}</dd></div></dl>
                      </details></div>
                    ))}
                  </div>
                )}
                {s.steps && s.id === 's-proc' && <ol className="proc" style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', gap: 8 }}>{s.steps.map((st, i) => <li key={st.t} style={{ display: 'grid', gridTemplateColumns: '40px 1fr', gap: 12, padding: 16, borderRadius: 'var(--r-m)', background: 'var(--g50)' }}><i style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--blue)', color: 'var(--on-accent)', display: 'grid', placeItems: 'center', fontSize: 13, fontWeight: 800, fontStyle: 'normal' }}>{i + 1}</i><div><p style={{ margin: '0 0 4px', fontWeight: 700 }}>{st.t}</p><p style={{ margin: 0, fontSize: 'var(--fs-s)', lineHeight: 1.6, color: 'var(--g600)' }}>{st.d}</p></div></li>)}</ol>}
                {s.cards && <div className="decide" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,260px),1fr))', gap: 8 }}>{s.cards.map((c) => <div key={c.t} style={{ padding: 20, borderRadius: 'var(--r-m)', border: '1px solid var(--line)' }}><p style={{ margin: '0 0 8px', fontWeight: 800 }}>{c.t}</p><p style={{ margin: 0, fontSize: 'var(--fs-s)', lineHeight: 1.6, color: 'var(--g600)' }}>{c.d}</p></div>)}</div>}
                {s.steps && s.id === 's-cost' && (<><h3 style={{ margin: '24px 0 8px', fontSize: 'var(--fs-b)', fontWeight: 800 }}>상담 때 알려주시면 빨라요</h3><ul className="b">{s.steps.map((st) => <li key={st.d}>{st.d}</li>)}</ul></>)}
                {s.id === 's-site' && hand && hand.prepare.length > 0 && <ul className="b">{hand.quoteFactors.map((e) => <li key={e}>{e}</li>)}</ul>}
                {s.id === 's-case' && (
                  <>
                    {exact.length === 0 && ref.length > 0 && <p className="ref-note">아직 {g.region.short} 사례가 공개되지 않아 다른 지역의 참고 사례를 보여드려요. 지역은 각 사례에 표기돼 있어요.</p>}
                    {exact.length === 0 && ref.length === 0 && <p className="ref-note">아직 공개된 사례가 없어요. 증상을 말씀해 주시면 전화로 바로 안내해 드려요.</p>}
                    <div className="case-grid">
                      {(exact.length ? exact : ref).map((c) => (
                        <Link key={c.id} href={`/cases/${c.id}/`} className="case-card">
                          <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                          <span><span className="k" style={{ display: 'block' }}>{exact.length ? c.place : `참고 사례 · ${c.place}`}</span><h3>{c.title}</h3><span className="s" style={{ display: 'block' }}>증상 · {c.sym}</span></span>
                        </Link>
                      ))}
                    </div>
                    {svc && <p className="b" style={{ marginTop: 16 }}>작업 절차와 판단 기준의 전체 안내는 <Link href={svc.path} style={{ fontWeight: 700 }}>{svc.h1}</Link>에서 볼 수 있어요.</p>}
                  </>
                )}
                {s.faq && <>{(hand?.faq || []).map((f) => <article key={f.q}><h3>{f.q}</h3><p>{f.a}</p></article>)}{s.faq.map((f) => <article key={f.q}><h3>{f.q}</h3><p>{f.a}</p></article>)}</>}
                {s.id === 's-near' && (
                  <div className="near-grid">
                    {siblings.map((x) => <Link key={x.p} href={x.p} className="near">{g.region.short} {SERVICE_BLOCKS[x.s].label}<Icon name="arrow-up-right" /></Link>)}
                    {near.map((n) => <Link key={n.t} href={n.href} className="near">{n.t} {g.label}<Icon name="arrow-up-right" /></Link>)}
                    <Link href={`/areas/${g.province}/`} className="near">{provName} 전체 지역<Icon name="arrow-up-right" /></Link>
                  </div>
                )}
              </section>
            ))}
            <div className="rd-cta">
              <div><p className="t">{g.region.short} 출장 상담</p><p className="d">증상만 말씀해 주시면 원인을 먼저 짚어드려요.</p></div>
              <a href={'tel:' + pinned} className="tel"><Icon name="phone" />{pinned}</a>
            </div>
          </div>
        </div>
      </main>
      <JsonLd data={[serviceLd, faqLd]} />
    </PublicShell>
  );
}

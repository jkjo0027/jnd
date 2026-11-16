import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { CONSULT_PHONES, INFO } from '@/lib/site';
import { CITIES, type Case } from '@/content/site-data';
import { REGION_PAGES } from '@/content/regions';
import { SERVICE_IDS, SERVICE_BLOCKS, type GeneratedPage } from '@/content/gen/compose';
import { SERVICES } from '@/content/services';
import { pinIndex, isPublicPath, ops, isPreview } from '@/lib/registry';
import { regionPath } from '@/lib/links';
import { publicCases } from '@/lib/gate';
import { JsonLd } from '@/lib/seo';
import { abs } from '@/lib/site';
import { handbookArticle, handbookPath } from '@/content/handbook';
import type { Tag } from '@/content/gen/types';

const buildingGuides: Record<Tag, { install: string; repair: string }> = {
  office: { install: 'office-lobby', repair: 'access-log-time' },
  commercial: { install: 'business-hours', repair: 'time-pattern' },
  apartment: { install: 'shared-entrance', repair: 'intercom-link' },
  villa: { install: 'visitor-entry', repair: 'exit-request' },
  factory: { install: 'delivery-route', repair: 'parts-on-floor' },
  hospital: { install: 'clinic-reception', repair: 'accessible-button-request' },
  school: { install: 'children-route', repair: 'queue-position' },
  rural: { install: 'weather-exposure', repair: 'wind-pressure' },
  tourism: { install: 'event-crowd', repair: 'handover-shifts' },
  hotel: { install: 'delivery-cart', repair: 'multiple-doors' },
  newtown: { install: 'work-sequence', repair: 'after-cleaning' },
  logistics: { install: 'warehouse-entry', repair: 'after-collision' },
  church: { install: 'elderly-route', repair: 'out-of-service-sign' },
};

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
  const exact: Case[] = pool.filter((c) => c.regionId === g.rid && (g.service === 'install' ? c.kind === 'install' : g.service === 'repair' ? c.kind === 'repair' : c.svc === g.service));
  const svc = SERVICES.find((s) => s.id === g.service);
  const provName = g.province === 'seoul' ? '서울' : '경기';
  const siblings = SERVICE_IDS.filter((s) => s !== g.service).map((s) => ({ s, p: regionPath(g.province, g.rid, s) })).filter((x) => isPublicPath(x.p));
  const dongs = [...new Set([...g.region.dongs, ...(city?.gus.flatMap(x => x.d) || [])])];
  const kind = g.service === 'install' ? 'install' : 'repair';
  const guideSlugs = g.service === 'sensor' ? ['sensor-identification', 'sensor-after-service']
    : g.service === 'motor' ? ['motor-quote', 'repeat-impact']
    : g.region.tags.slice(0, 2).map(tag => buildingGuides[tag][kind]);
  const articles = guideSlugs.map(handbookArticle).filter(a => !!a);
  const questions = hand?.faq || [];
  const sections = g.sections.filter(s => (s.id !== 's-faq' || questions.length) && (s.id !== 's-case' || exact.length));
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
                {s.paras?.map((p, i) => <p key={i} className="b">{p}</p>)}
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
                {s.id === 's-cost' && hand && hand.quoteFactors.length > 0 && <ul className="b">{hand.quoteFactors.map((e) => <li key={e}>{e}</li>)}</ul>}
                {s.id === 's-case' && (
                  <>
                    
                    <div className="case-grid">
                      {exact.map(c => (
                        <Link key={c.id} href={`/cases/${c.id}/`} className="case-card">
                          <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                          <span><span className="k" style={{ display: 'block' }}>{c.place}</span><h3>{c.title}</h3><span className="s" style={{ display: 'block' }}>{c.kind === 'install' ? '설치 요청' : '증상'} · {c.sym}</span><span className="s" style={{display:'block'}}>{c.res}</span></span>
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

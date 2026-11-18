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

// Follow the specific observation in visitNotes, rather than only the broad building tag.
const repairFollowup: Record<string, { slugs: string[]; note: string }> = {
  r49: { slugs: ['multiple-doors', 'service-history'], note: '문이 여러 대인 시설은 층·출입 방향·주변 표지로 고장 문을 특정하고 정상 문과의 차이를 따로 기록해 주세요. 정상 문의 부품을 옮겨 시험하지 말고, 두 문의 모델이 같은지는 미확인으로 남겨도 됩니다.' },
  r32: { slugs: ['fault-vs-mode', 'delivery-cart'], note: '상하차 중의 개방 고정 상태와 평소 운전 상태를 구분해 전달해 주세요. 현재 모드 표시와 변경한 시점을 적고, 카트 통행 계획은 관리자와 협의합니다. 통행 중 설정을 바꾸어 고장을 재현하지 않습니다.' },
  r47: { slugs: ['all-cards', 'card-one-user'], note: '세대 문의를 모을 때는 같은 동·같은 출입문인지 먼저 확인해 주세요. 한 사람의 카드만 반응하지 않는 경우와 여러 사용자가 같은 문에서 겪는 경우를 구분하고 카드번호·비밀번호는 보내지 않습니다.' },
  r29: { slugs: ['after-collision', 'bottom-scrape'], note: '카트 통행 뒤 생긴 흔적은 발생 위치와 발견 시각을 안전한 거리에서 기록해 주세요. 바닥 끌림이나 문 기울어짐이 보이면 억지로 여닫지 말고 현장 관리자에게 알립니다. 통행 직후라는 이유만으로 충돌을 확정하지 않습니다.' },
  r50: { slugs: ['decorations', 'sensor-identification'], note: '옮긴 입간판·장식물의 이전 위치와 현재 위치를 출입구 사진에 표시해 주세요. 상부 감지센서와 측면 안전센서 중 어느 장치 주변이 달라졌는지 구분하되 센서를 가리거나 감도를 임의로 낮추지 않습니다.' },
  r06: { slugs: ['two-door-lobby', 'queue-position'], note: '연속된 출입문은 바깥문·안쪽문을 구분하고 대기 좌석과 문의 위치를 간단히 그려 주세요. 사람이 대기하는 동안의 열림과 사람이 없어도 반복되는 동작을 나누어 전달하면 동선 조정과 장비 점검을 함께 상담할 수 있습니다.' },
  r05: { slugs: ['keypad-response', 'access-service-boundary'], note: '번호 입력의 반응, 잠금 해제음, 문 움직임을 각각 구분해 적어 주세요. 실제 비밀번호는 제외하고 공동현관 관리 담당자와 장비 외부 모델 표시를 준비합니다. 잠금과 자동문 구동 중 어디까지 확인됐는지 상담 때 전달하세요.' },
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
  const followup = g.service === 'repair' ? repairFollowup[g.rid] : undefined;
  const guideSlugs = followup?.slugs ?? (g.service === 'sensor' ? ['sensor-identification', 'sensor-after-service']
    : g.service === 'motor' ? ['motor-quote', 'repeat-impact']
    : g.region.tags.slice(0, 2).map(tag => buildingGuides[tag][kind]));
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
                {s.id === 's-sym' && followup && <p className="b">{followup.note}</p>}
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

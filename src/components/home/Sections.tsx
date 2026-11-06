import Link from 'next/link';
import Icon from '@/components/Icon';
import { BRAND, INFO } from '@/lib/site';
import { BUILDINGS, BRANDS, CITIES, CLIENTS, FAQ, PHOTO, STEPS, SVCS, type Case } from '@/content/site-data';
import type { ReviewImage } from '@/content/review-images';
import { cityLink, guLink } from '@/lib/links';

export function Targets() {
  return (
    <section aria-label="시공 대상" className="targets">
      <div className="wrap">
        <div className="row"><span className="k">시공 현장</span>{BUILDINGS.map((b) => <span key={b} className="chip">{b}</span>)}</div>
        <div className="row"><span className="k">호환 제조사</span>{BRANDS.map((b) => <span key={b} className="chip-line">{b}</span>)}</div>
      </div>
    </section>
  );
}
export function Overview() {
  return (
    <section aria-label="회사 개요" className="overview">
      <div className="wrap">
        <div className="cell"><p className="k">설립</p><p className="v">2018<small>년</small></p></div>
        <div className="cell"><p className="k">전국 대리점</p><p className="v">{INFO.agencies}<small>곳</small></p></div>
        <div className="cell"><p className="k">SD 시리즈 스위치</p><p className="v">16<small>종</small></p></div>
        <div className="cell"><p className="k">설치 후 무상 A/S</p><p className="v">1<small>년</small></p></div>
        <div className="cell"><p className="k">자체 브랜드</p><p className="v brand">스피드자동문<small>상표·디자인특허 등록</small></p></div>
      </div>
    </section>
  );
}
export function ServicesGrid() {
  return (
    <section className="sec sec-g50" aria-label="부품별 수리">
      <div className="wrap">
        <div className="sec-head">
          <div><p className="sec-num">02</p><h2 className="sec-h2">부품별 수리</h2></div>
          <p className="sec-lede">부품마다 점검 순서와 교체 기준이 달라요. 작업 내용과 관련 시공사례를 확인하세요.</p>
        </div>
        <div className="svc-grid">
          {SVCS.map((v, i) => (
            <Link key={v.id} href={v.route} className="svc-card">
              <span className="ph">{v.img ? <img src={v.img} alt={`${v.t} 수리 현장`} loading="lazy" width={800} height={600} className="img-cover" /> : <span className="noimg" aria-hidden="true"><Icon name={v.icon} /></span>}</span>
              <span className="row"><span className="n">{String(i + 1).padStart(2, '0')}</span><Icon name={v.icon} /></span>
              <span className="t">{v.t}</span>
              <span className="d">{v.d}</span>
              <span className="more">자세히 보기<Icon name="arrow-right" /></span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Steps() {
  return (
    <section className="sec" aria-label="처리 6단계">
      <div className="wrap">
        <div className="sec-head">
          <div><p className="sec-num">03</p><h2 className="sec-h2">실측부터 A/S까지, 6단계</h2></div>
          <p className="sec-lede">설치는 현장 실측부터 1년 무상 A/S까지 같은 담당 기사가 책임지고 진행해요.</p>
        </div>
        <ol className="steps">
          {STEPS.map((st) => <li key={st.n}><p className="k"><i>{st.n}</i>STEP</p><h3>{st.t}</h3><p className="d">{st.d}</p></li>)}
        </ol>
      </div>
    </section>
  );
}
export function CasesSection({ cases }: { cases: Case[] }) {
  const cols = [
    { t: '자동문 설치', icon: 'square-plus', items: cases.filter((c) => c.kind === 'install').slice(0, 7) },
    { t: '자동문 수리', icon: 'wrench', items: cases.filter((c) => c.kind === 'repair').slice(0, 7) },
  ].filter((c) => c.items.length > 0);
  if (!cols.length) return null;
  return (
    <section className="sec sec-g50" aria-label="최근 시공사례">
      <div className="wrap">
        <div className="sec-head cases-head">
          <div><p className="sec-num">04</p><h2 className="sec-h2">최근 시공사례</h2></div>
          <div className="more"><Link href="/cases/" className="btn">시공사례 전체 보기<Icon name="arrow-right" /></Link></div>
        </div>
        <div className="case-cols">
          {cols.map((col) => (
            <div key={col.t} className="case-col">
              <div className="head"><h3><Icon name={col.icon} />{col.t}</h3><span className="n">{col.items.length}건</span></div>
              {col.items.map((c) => (
                <Link key={c.id} href={`/cases/${c.id}/`} className="case-row">
                  <span className="th"><img src={c.img} alt={`${c.place} ${c.title}`} loading="lazy" width={800} height={600} className="img-cover" /></span>
                  <span className="tx"><span className="k" style={{ display: 'block' }}>{c.place}</span><h4>{c.title}</h4><span className="s" style={{ display: 'block' }}>{c.sym}</span></span>
                </Link>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
export function Reviews({ reviews }: { reviews: ReviewImage[] }) {
  if (reviews.length < 4) return null;
  return <section id="reviews" aria-label="베스트 리뷰" className="sec"><div className="wrap">
    <div className="sec-head"><div><p className="sec-num">05</p><h2 className="sec-h2">베스트 리뷰</h2></div></div>
    <div className="review-images">{reviews.slice(0, 5).map(r => <figure key={r.id}><img src={r.src} alt={r.alt} width={r.width} height={r.height} loading="lazy" /></figure>)}</div>
  </div></section>;
}
const short = (c: string) => c.replace(/(특별시|광역시|시)$/, '');
export function Areas() {
  return (
    <section className="sec areas-sec" aria-label="출장 지역">
      <div className="wrap">
        <div className="sec-head">
          <div><p className="sec-num">06</p><h2 className="sec-h2">출장 지역</h2></div>
          <p className="sec-lede">평택 본사에서 화성·수원·용인을 주로 다니고, 서울·경기 수도권과 충청권까지 출장 가요. 경기도권은 당일·긴급 출장이 가능해요. 지역을 누르면 해당 지역 안내로 이동해요.</p>
        </div>
        <div className="areas-cols">
          {CITIES.map((c) => {
            const cl = cityLink(c);
            return (
              <div key={c.c} className="city">
                <Link href={cl.href} className="city-h">{c.c}<small>{c.tag}</small></Link>
                {c.gus.map((g) => {
                  const gl = guLink(c, g.g);
                  const label = g.g === '전체' ? short(c.c) + ' 전체' : g.g;
                  return (
                    <div key={g.g} className="gu">
                      {gl.href !== cl.href ? <Link href={gl.href} className="gu-h">{label}</Link> : <span className="gu-h">{label}</span>}
                      <div className="dongs">{g.d.slice(0, 6).map((d) => <span key={d}>{d}</span>)}</div>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
export function Clients({ clients }: { clients: typeof CLIENTS }) {
  if (!clients.length) return null;
  return (
    <section id="clients" aria-label="대표실적 현황" className="sec">
      <div className="wrap">
        <div className="sec-head">
          <div><p className="sec-num">07</p><h2 className="sec-h2">대표실적 현황</h2></div>
          <p className="sec-lede">대기업 매장과 공공기관, 대단지 아파트 현장에서 자동문을 설치하고 관리해 왔어요.</p>
        </div>
        <ul className="clients">{clients.map((c) => <li key={c.n}>{c.f ? <img src={`/logos/${c.f.includes('.') ? c.f : c.f + '.png'}`} alt={c.n} title={c.n} loading="lazy" /> : <span className="client-name">{c.n}</span>}</li>)}</ul>
      </div>
    </section>
  );
}
export function FaqTop() {
  return (
    <section className="sec sec-g50 faq-sec" aria-label="자주 묻는 질문">
      <div className="wrap">
        <div>
          <p className="sec-num">08</p>
          <h2 className="t">자주 묻는 질문</h2>
          <p className="lede">출장비, 출장 지역, 수리 가능한 제품을 정리했어요.</p>
          <Link href="/faq/" className="btn btn-primary all">전체 질문 보기<Icon name="arrow-right" /></Link>
        </div>
        <div>{FAQ.slice(0, 4).map((f) => <article key={f.q} className="faq-item"><h3>{f.q}</h3><p>{f.a}</p></article>)}</div>
      </div>
    </section>
  );
}
export function AboutBand() {
  return (
    <section className="about-band" aria-label="회사 소개">
      <img src={PHOTO.about} alt={`${BRAND} 자동문 시공 현장`} loading="lazy" />
      <div aria-hidden="true" className="shade" />
      <div className="wrap">
        <p className="k">SINCE 2018 · PYEONGTAEK</p>
        <h2>자동문을 이해하는 기술력,<br />믿고 맡길 수 있는 전문가</h2>
        <p className="d">평택 본사와 전국 {INFO.agencies}개 대리점이 함께 움직여 출장 대응이 빠르고, 국내 제조사 자동문 대부분을 직접 수리합니다.</p>
        <Link href="/about/" className="btn">회사 소개 보기<Icon name="arrow-right" /></Link>
      </div>
    </section>
  );
}

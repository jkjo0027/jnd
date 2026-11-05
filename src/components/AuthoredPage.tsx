import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { JsonLd } from '@/lib/seo';
import { abs, MAIN_PHONE } from '@/lib/site';
import { parseBody, FIELDS, TYPE_LABEL } from '@/lib/content-body';
import { pinnedPhone } from '@/components/RegionPage';
import { srcset, srcOf } from '@/lib/server/uploads';
import { searchPublicPaths, type AuthoredPage as P, STATUS_LABEL } from '@/lib/server/content';
import { SERVICES } from '@/content/services';
import { baseRegions } from '@/lib/registry';

const HUB_NAME: Record<string, string> = { '/cases/': '시공사례', '/guides/': '증상 가이드', '/services/': '서비스', '/areas/seoul/': '서울', '/areas/gyeonggi/': '경기' };
const lines = (s: string) => (s || '').split(/\n/).map((x) => x.replace(/^[-•·]\s*/, '').trim()).filter(Boolean);

function Body({ src }: { src: string }) {
  return (
    <>
      {parseBody(src).map((b, i) => b.t === 'h2' ? <h2 key={i}>{b.text}</h2> : b.t === 'ul' ? <ul key={i} className="b">{b.items.map((it, j) => <li key={j}>{it}</li>)}</ul> : <p key={i} className="b">{b.text}</p>)}
    </>
  );
}
function Photos({ photos, skipCover }: { photos: P['photos']; skipCover?: boolean }) {
  const list = skipCover ? photos.filter((p) => !p.cover) : photos;
  if (!list.length) return null;
  return (
    <div className="au-photos">
      {list.map((ph) => (
        <figure key={ph.id}>
          <img src={srcOf(ph)} srcSet={srcset(ph)} sizes="(max-width: 720px) 100vw, 720px" alt={ph.alt} width={ph.w} height={ph.h} loading="lazy" />
          {ph.caption && <figcaption>{ph.caption}</figcaption>}
        </figure>
      ))}
    </div>
  );
}

/** 운영자가 관리자에서 작성한 페이지의 공개 화면(사례·가이드·서비스·지역). 미리보기(draft)는 같은 화면에 배너만 추가 */
export default function AuthoredPageView({ p, draft = false }: { p: P; draft?: boolean }) {
  const cover = p.photos.find((x) => x.cover) || p.photos[0] || null;
  const region = p.region ? baseRegions.find((b) => b.regionId === p.region!.rid) : null;
  const svc = p.service ? SERVICES.find((s) => s.id === p.service) : null;
  const pinned = p.type === 'region' && p.region ? pinnedPhone(p.region.rid) : null;
  const related = p.related.map((r) => searchPublicPaths(r, 1).find((x) => x.path === r)).filter(Boolean) as { path: string; label: string }[];
  const crumbs = [{ name: '홈', path: '/' }, ...(p.hub.startsWith('/areas/') ? [{ name: '출장 지역', path: '/areas/' }] : []), { name: HUB_NAME[p.hub] || p.hub, path: p.hub }, { name: p.title, path: p.path }];
  const ld: object[] = [];
  if (p.type === 'guide' && p.fields.answer) ld.push({ '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{ '@type': 'Question', name: p.title, acceptedAnswer: { '@type': 'Answer', text: p.fields.answer } }] });
  if (p.type === 'region' && region && svc) ld.push({ '@context': 'https://schema.org', '@type': 'Service', name: p.title, serviceType: svc.h1, areaServed: { '@type': 'AdministrativeArea', name: `${region.province === 'seoul' ? '서울' : '경기'} ${region.name}` }, provider: { '@id': abs('/#org') }, url: abs(p.path), telephone: '+82-' + (pinned || MAIN_PHONE) });
  const metaLine = p.showMeta ? `작성 ${p.createdAt.slice(0, 10)}${p.reviewedAt ? ` · 검토 ${p.reviewedAt.slice(0, 10)}` : ''}` : null;
  return (
    <PublicShell pinned={pinned}>
      {draft && <div className="draft-banner"><span>미리보기 · {STATUS_LABEL[p.status]}</span><span>{p.id}</span><span>{p.path || '주소 미정'}</span></div>}
      <main className={`page-narrow au au-${p.type}${p.type === 'case' ? ' cased' : ''}`}>
        <Breadcrumb items={crumbs} />
        <p className="k">{TYPE_LABEL[p.type]}{p.type === 'case' && p.fields.place ? ` · ${p.fields.place}` : ''}{region ? ` · ${region.name}` : ''}{svc && p.type === 'region' ? ` · ${svc.h1}` : ''}</p>
        <h1>{p.title}</h1>
        <p className="lede">{p.summary}</p>
        {metaLine && <p className="au-meta">{metaLine}</p>}
        {cover && <div className="photo"><img src={srcOf(cover, 1600)} srcSet={srcset(cover)} sizes="(max-width: 720px) 100vw, 720px" alt={cover.alt} width={cover.w} height={cover.h} className="img-cover" /></div>}
        {p.type === 'case' && (
          <ol className="steps4">
            {[['증상', 'sym', 'circle-alert'], ['확인한 원인', 'check', 'search'], ['실제 조치', 'act', 'wrench'], ['작동 확인 결과', 'res', 'circle-check']].map(([k, f, icon], i) => (
              <li key={f}><span className="ic"><Icon name={icon} /></span><div><p className="kk">0{i + 1} {k}</p><p className="v">{p.fields[f]}</p></div></li>
            ))}
          </ol>
        )}
        {p.type === 'guide' && (
          <>
            <h2>바로 답하면</h2><p className="b">{p.fields.answer}</p>
            <h2>안전하게 볼 수 있는 항목</h2><ul className="b">{lines(p.fields.safe).map((x) => <li key={x}>{x}</li>)}</ul>
            <h2>여기서 멈추고 연락하세요</h2><p className="b">{p.fields.stop}</p>
            <h2>전문가가 하는 진단</h2><p className="b">{p.fields.pro}</p>
          </>
        )}
        {p.type === 'service' && (
          <>
            <h2>작업 범위</h2><ul className="checks">{lines(p.fields.scope).map((x) => <li key={x}><Icon name="check" />{x}</li>)}</ul>
            <h2>수리와 교체 판단</h2><p className="b">{p.fields.decision}</p>
          </>
        )}
        {p.type === 'region' && (
          <>
            <h2>실제 출장 범위</h2><p className="b">{p.fields.coverage}</p>
            <h2>이 지역 작업 근거</h2><ul className="b">{lines(p.fields.evidence).map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        )}
        <Body src={p.body} />
        <Photos photos={p.photos} skipCover />
        {p.type === 'service' && (
          <>
            <h2>견적에 영향을 주는 조건</h2><ul className="b">{lines(p.fields.quote).map((x) => <li key={x}>{x}</li>)}</ul>
            <h2>문의 때 알려 주시면 빨라요</h2><ul className="b">{lines(p.fields.prepare).map((x) => <li key={x}>{x}</li>)}</ul>
          </>
        )}
        {p.type === 'case' && (
          <dl className="meta">
            <dt>현장 유형</dt><dd>{p.fields.place}</dd>
            {region && <><dt>지역</dt><dd>{region.name} (익명화)</dd></>}
            {svc && <><dt>서비스</dt><dd>{svc.h1}</dd></>}
            {p.keyword && <><dt>관련 검색</dt><dd>{p.keyword.keyword}</dd></>}
          </dl>
        )}
        {related.length > 0 && (<><h2>관련 안내</h2><div className="related">{related.map((r) => <Link key={r.path} href={r.path}>{r.label.replace(/\s\(.*\)$/, '')}<Icon name="arrow-right" size={14} /></Link>)}</div></>)}
        <div className="cta-box">
          <p className="q">{p.type === 'case' ? '같은 증상으로 고민 중이세요?' : '증상을 말씀해 주시면 원인을 먼저 짚어드려요.'}</p>
          {pinned ? <a href={'tel:' + pinned} className="btn btn-primary"><Icon name="phone" size={20} />전화 상담 {pinned}</a> : <TelLink className="btn btn-primary"><Icon name="phone" size={20} />전화 상담 <RollingPhone h={24} /></TelLink>}
          <Link href="/contact/" className="btn btn-outline">문의 남기기</Link>
          <Link href={p.hub} className="btn btn-outline">{HUB_NAME[p.hub] || '목록'} 더 보기</Link>
        </div>
        {FIELDS[p.type].length > 0 && null}
      </main>
      {ld.length > 0 && <JsonLd data={ld} />}
    </PublicShell>
  );
}

import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import TelLink from '@/components/TelLink';
import { RollingPhone } from '@/components/PhoneProvider';
import { pageMeta } from '@/lib/seo';
import { publicCases, caseById } from '@/lib/gate';
import { SVCS } from '@/content/site-data';
import { SERVICES } from '@/content/services';
import { isPublicPath } from '@/lib/registry';
import { handbookArticle, handbookPath } from '@/content/handbook';
import { regionLink } from '@/lib/links';
import AuthoredPageView from '@/components/AuthoredPage';
import { liveByPath } from '@/lib/server/content';
const caseNotes: Record<string, { description: string; guide: string }> = {
    c1: { description: '용인 양지면 빌라에서 문이 간헐적으로 열리지 않았습니다. 구동장치를 점검한 뒤 무선터치 스위치만 교체하고 반복 작동을 확인했습니다.', guide: 'switch-replacement-record' },
    c2: { description: '서울 시흥동 빌라에서 닫히던 문이 반복해서 열렸습니다. 안전빔 계통을 점검하고 센서 렌즈를 교체해 문이 끝까지 닫히는지 확인했습니다.', guide: 'sensor-identification' },
    c3: { description: '서울 용산 쇼핑몰 주차장에서 자동문이 충격음을 내며 저절로 열렸습니다. 컨트롤러를 교체한 뒤 반복 개폐 시험으로 동작을 확인했습니다.', guide: 'repeat-impact' },
    c4: { description: '화성 동탄 지식산업센터에서 기존 방화문을 유지하고 안쪽에 편개형 자동문을 설치했습니다. 카드리더기와 안팎의 무선터치 스위치를 연동했습니다.', guide: 'visitor-entry' },
    c5: { description: '성남 지식산업센터 사무실에서 방화문 입구의 폭을 실측하고 블랙스텐 프레임과 투명유리로 이중슬라이딩 자동문을 설치했습니다.', guide: 'sliding-space' },
    c6: { description: '안양 신규 입점 상가의 여닫이 유리문을 편개형 자동문으로 교체했습니다. 유리 안팎에 무선터치 스위치를 부착해 별도 타공 없이 마감했습니다.', guide: 'demolition-scope' },
    c7: { description: '경기광주 주택상가의 인테리어 공사 중 출입구를 실측하고 스테인리스 프레임과 투명유리로 자동문을 새로 설치했습니다.', guide: 'opening-measure' },
    c8: { description: '화성 교회에서 어르신들이 열기 힘들었던 강화도어 두 짝을 편개형 자동문으로 교체하고 기존 바닥 힌지 자리를 마감했습니다.', guide: 'elderly-route' },
};
/** 레지스트리 사례는 빌드 시 생성, 운영자가 관리자에서 발행한 사례는 요청 시 저장소에서 찾는다(없으면 404) */
export const dynamicParams = true;
export function generateStaticParams() { return publicCases().map((c) => ({ id: c.id })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        id: string;
    }>;
}): Promise<Metadata> {
    const { id } = await params;
    const c = caseById(id);
    if (!c) {
        const a = (await liveByPath(`/cases/${id}/`));
        return a ? pageMeta({ title: a.seoTitle || `${a.title} | 제이앤디시스템`, description: a.seoDesc || a.summary, path: a.path, image: a.photos[0] ? `/uploads/${a.photos[0].id}-${a.photos[0].sizes[a.photos[0].sizes.length - 1]}.webp` : undefined }) : {};
    }
    return pageMeta({ title: `${c.place} ${c.title} 시공사례 | 제이앤디시스템`, description: caseNotes[id]?.description ?? `${c.place} · ${c.title}. ${c.res}`, path: `/cases/${c.id}/`, image: c.img });
}
export default async function CaseDetail({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { id } = await params;
    const c = caseById(id);
    if (!c) {
        const a = (await liveByPath(`/cases/${id}/`));
        if (a)
            return <AuthoredPageView p={a}/>;
        notFound();
    }
    const guide = caseNotes[id] && handbookArticle(caseNotes[id].guide);
    const svcCard = SVCS.find((v) => v.id === c.svc);
    const svcPage = SERVICES.find((s) => s.id === c.svc && isPublicPath(s.path));
    const others = publicCases().filter((x) => x.id !== c.id && x.kind === c.kind).slice(0, 3);
    const rl = regionLink(c.province, c.regionId);
    const steps = [{ k: c.kind === 'repair' ? '증상' : '설치 요청', v: c.sym, icon: 'circle-alert', n: '01' }, { k: '점검', v: c.check, icon: 'search', n: '02' }, { k: '조치', v: c.act, icon: 'wrench', n: '03' }, { k: '결과', v: c.res, icon: 'circle-check', n: '04' }];
    return (<PublicShell>
      <main className="page-narrow cased">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '시공사례', path: '/cases/' }, { name: c.title, path: `/cases/${c.id}/` }]}/>
        <p className="k">{c.place} · {svcCard?.t || c.svcT}</p>
        <h1>{c.title}</h1>
        <div className="photo"><img src={c.img} alt={`${c.place} ${c.title}`} width={800} height={600} className="img-cover"/></div>
        <ol className="steps4">{steps.map((t) => <li key={t.k}><span className="ic"><Icon name={t.icon}/></span><div><p className="kk">{t.n} {t.k}</p><p className="v">{t.v}</p></div></li>)}</ol>
        <h2>현장 정보</h2>
        <dl className="meta">
          <dt>현장 유형</dt><dd>{c.place}</dd>
          <dt>지역</dt><dd>{c.city}{c.gu !== '전체' ? ' ' + c.gu : ''} (익명화)</dd>
          <dt>제품·부품</dt><dd>{c.brand} · {c.svcT}</dd>
          <dt>작업 구분</dt><dd>{c.kind === 'repair' ? '수리' : '설치·교체'}</dd>
          {guide && <><dt>관련 안내</dt><dd><Link href={handbookPath(guide.slug)}>{guide.title}</Link></dd></>}
        </dl>
        <div className="cta-box">
          <p className="q">{c.kind === 'repair' ? '같은 증상으로 고민 중이세요?' : '비슷한 출입구에 자동문 설치를 알아보고 계세요?'}</p>
          <TelLink className="btn btn-primary"><Icon name="phone" size={20}/>전화 상담 <RollingPhone h={24}/></TelLink>
          {svcPage && <Link href={svcPage.path} className="btn btn-outline">{svcPage.h1} 안내</Link>}
          <Link href={rl.href} className="btn btn-outline">{c.area} 지역 안내 보기</Link>
        </div>
        {others.length > 0 && (<>
            <h2>다른 사례</h2>
            <div className="case-list-sm">
              {others.map((o) => (<Link key={o.id} href={`/cases/${o.id}/`} className="case-sm">
                  <span className="th" style={{ width: 56, height: 56 }}><img src={o.img} alt={`${o.place} ${o.title}`} loading="lazy" width={800} height={600} className="img-cover"/></span>
                  <span className="tx"><span className="k" style={{ display: 'block' }}>{o.place}</span><span className="t" style={{ display: 'block' }}>{o.title}</span></span>
                </Link>))}
            </div>
          </>)}
      </main>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

import type { Metadata } from 'next';
import Link from 'next/link';
import PublicShell from '@/components/PublicShell';
import Breadcrumb from '@/components/Breadcrumb';
import Icon from '@/components/Icon';
import { pageMeta } from '@/lib/seo';
import { SVCS } from '@/content/site-data';
import { isPublicPath } from '@/lib/registry';
import AuthoredList from '@/components/AuthoredList';
import { liveByType } from '@/lib/server/content';
export const metadata: Metadata = pageMeta({
    title: '자동문 서비스 안내 | 부품별 수리·설치·교체 | 제이앤디시스템',
    description: '센서·스위치·컨트롤러·모터·번호키·설치·교체·비상배터리·기계·장애인 스위치까지, 자동문 부품별 수리와 설치 서비스 범위를 안내합니다. 증상을 모르셔도 괜찮아요.',
    path: '/services/',
});
export default async function Services() {
    return (<PublicShell>
      <main className="page svcs">
        <Breadcrumb items={[{ name: '홈', path: '/' }, { name: '서비스', path: '/services/' }]}/>
        <h1>어떤 부품이 문제인가요?</h1>
        <p className="lede">잘 모르셔도 괜찮아요. <Link href="/#diagnose">증상으로 진단하기</Link></p>
        <div className="svc-list">
          {SVCS.map((v) => {
            const detail = v.route.startsWith('/services/') && !v.route.includes('#') && isPublicPath(v.route) ? v.route : null;
            const body = (<>
                <span className="ic"><Icon name={v.icon}/></span>
                <span className="tx">
                  <span className="t">{v.f || v.t}</span>
                  <span className="d">{v.d}</span>
                  <span className="items">{v.items.map((it) => <span key={it} className="tag">{it}</span>)}</span>
                </span>
                {detail && <Icon name="chevron-right" className="ch"/>}
              </>);
            return detail
                ? <Link key={v.id} id={v.id} href={detail} className="svc-item">{body}</Link>
                : <div key={v.id} id={v.id} className="svc-item">{body}</div>;
        })}
        </div>
        <AuthoredList pages={(await liveByType('service'))} heading="추가 서비스 안내"/>
      </main>
    </PublicShell>);
}

export const dynamic = 'force-dynamic';

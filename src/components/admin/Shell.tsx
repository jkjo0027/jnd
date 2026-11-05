import Link from 'next/link';
import Icon from '@/components/Icon';
import { BRAND } from '@/lib/site';
import type { User } from '@/lib/server/auth';

const NAV = [
  ['/admin/', '대시보드', 'layout-dashboard'], ['/admin/new/', '새 페이지 작성', 'square-pen'], ['/admin/content/', '작성한 페이지', 'file-text'], ['/admin/pages/', '페이지 대장', 'map-pin'], ['/admin/cases/', '시공사례', 'images'],
] as const;
export default function AdminShell({ user, current, children }: { user: User; current: string; children: React.ReactNode }) {
  const nav = (cls: string) => NAV.map(([h, t, i]) => (
    <Link key={h} href={h} className={`${cls}${current === h ? ' on' : ''}`}><Icon name={i} /><span className="t">{t}</span></Link>
  ));
  return (
    <div className="adm">
      <aside className="adm-side">
        <p className="brand">{BRAND} <small>관리자</small></p>
        {nav('adm-nav')}
        <span style={{ flex: 1 }} />
        <p style={{ margin: '0 12px 8px', fontSize: 'var(--fs-c)', color: 'var(--g500)' }}>{user.id} · {user.role}</p>
        <form action="/api/admin/logout" method="post"><button type="submit" className="adm-nav" style={{ width: '100%', color: 'var(--g600)' }}><Icon name="log-out" />로그아웃</button></form>
      </aside>
      <div className="adm-main">
        <div className="adm-topbar">{nav('adm-nav')}</div>
        <div className="adm-body">{children}</div>
      </div>
    </div>
  );
}

import Link from 'next/link';
import Icon from './Icon';
import { JsonLd, breadcrumbJsonLd } from '@/lib/seo';

export default function Breadcrumb({ items, dark = false }: { items: { name: string; path: string }[]; dark?: boolean }) {
  return (
    <nav aria-label="현재 위치" className={`crumbs${dark ? ' dark' : ''}`}>
      <ol>
        {items.map((it, i) => (
          <li key={it.path}>
            {i > 0 && <Icon name="chevron-right" size={14} className="sep" />}
            {i === items.length - 1 ? <span aria-current="page">{it.name}</span> : <Link href={it.path}>{it.name}</Link>}
          </li>
        ))}
      </ol>
      <JsonLd data={breadcrumbJsonLd(items)} />
    </nav>
  );
}

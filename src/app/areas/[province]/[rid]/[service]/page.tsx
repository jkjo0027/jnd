import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import RegionPageView from '@/components/RegionPage';
import { pageMeta } from '@/lib/seo';
import { allRegionPages, regionPageByPath } from '@/content/gen/compose';
import { isPublicPath } from '@/lib/registry';
import AuthoredPageView from '@/components/AuthoredPage';
import { liveByPath } from '@/lib/server/content';

export const dynamicParams = true;
export const revalidate = 60;
export function generateStaticParams() {
  return allRegionPages().filter((g) => isPublicPath(g.path)).map((g) => ({ province: g.province, rid: g.rid, service: g.service }));
}
export async function generateMetadata({ params }: { params: Promise<{ province: string; rid: string; service: string }> }): Promise<Metadata> {
  const { province, rid, service } = await params;
  const g = regionPageByPath(`/areas/${province}/${rid}/${service}/`);
  if (g) return pageMeta({ title: g.title, description: g.description, path: g.path });
  const a = liveByPath(`/areas/${province}/${rid}/${service}/`); return a ? pageMeta({ title: a.seoTitle || `${a.title} | 제이앤디시스템`, description: a.seoDesc || a.summary, path: a.path }) : {};
}
export default async function RegionRoute({ params }: { params: Promise<{ province: string; rid: string; service: string }> }) {
  const { province, rid, service } = await params;
  const g = regionPageByPath(`/areas/${province}/${rid}/${service}/`);
  if (!g) { const a = liveByPath(`/areas/${province}/${rid}/${service}/`); if (a) return <AuthoredPageView p={a} />; notFound(); }
  if (!isPublicPath(g.path)) notFound();
  return <RegionPageView g={g} />;
}

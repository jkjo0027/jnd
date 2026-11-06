import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import GuidePageView from '@/components/GuidePage';
import { pageMeta } from '@/lib/seo';
import { ALL_GUIDES, guideById } from '@/content/guides';
import { isPublicPath } from '@/lib/registry';
import AuthoredPageView from '@/components/AuthoredPage';
import { liveByPath } from '@/lib/server/content';
export const dynamicParams = true;
export function generateStaticParams() { return ALL_GUIDES.filter((g) => isPublicPath(g.path)).map((g) => ({ gid: g.id })); }
export async function generateMetadata({ params }: {
    params: Promise<{
        gid: string;
    }>;
}): Promise<Metadata> {
    const { gid } = await params;
    const g = guideById(gid);
    if (g)
        return pageMeta({ title: g.title, description: g.description, path: g.path });
    const a = (await liveByPath(`/guides/${gid}/`));
    return a ? pageMeta({ title: a.seoTitle || `${a.title} | 제이앤디시스템`, description: a.seoDesc || a.summary, path: a.path }) : {};
}
export default async function GuideRoute({ params }: {
    params: Promise<{
        gid: string;
    }>;
}) {
    const { gid } = await params;
    const g = guideById(gid);
    if (!g) {
        const a = (await liveByPath(`/guides/${gid}/`));
        if (a)
            return <AuthoredPageView p={a}/>;
        notFound();
    }
    if (!isPublicPath(g.path))
        notFound();
    return <GuidePageView g={g}/>;
}

export const dynamic = 'force-dynamic';

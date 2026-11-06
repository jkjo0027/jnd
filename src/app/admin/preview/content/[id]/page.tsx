import { notFound } from 'next/navigation';
import { requireUser } from '@/lib/server/admin';
import { getPage } from '@/lib/server/content';
import AuthoredPageView from '@/components/AuthoredPage';
export const dynamic = 'force-dynamic';
/** 운영자 페이지 미리보기(초안 포함). 인증 필요, noindex(프록시 헤더). 공개 화면과 같은 컴포넌트 */
export default async function PreviewContent({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    await requireUser();
    const p = (await getPage((await params).id));
    if (!p)
        notFound();
    return <AuthoredPageView p={p} draft/>;
}

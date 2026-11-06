import { notFound } from 'next/navigation';
import AdminShell from '@/components/admin/Shell';
import Editor from '@/components/admin/Editor';
import { requireUser } from '@/lib/server/admin';
import { can } from '@/lib/server/auth';
import { getPage, validatePage, listSnapshots, hubOptions, regionOptions, verifiedServices } from '@/lib/server/content';
import { MAX_MB, ALLOWED } from '@/lib/server/uploads';
export const dynamic = 'force-dynamic';
export default async function EditPage({ params }: {
    params: Promise<{
        id: string;
    }>;
}) {
    const { user } = await requireUser();
    const p = (await getPage((await params).id));
    if (!p)
        notFound();
    return (<AdminShell user={user} current="/admin/content/">
      <Editor initial={p} validation={(await validatePage(p))} snapshots={(await listSnapshots(p.id))} canEdit={can(user, 'edit-drafts')} canPublish={can(user, 'manage')} options={{ hubs: hubOptions(), regions: regionOptions(), services: verifiedServices(), upload: { maxMb: MAX_MB, allowed: ALLOWED } }}/>
    </AdminShell>);
}

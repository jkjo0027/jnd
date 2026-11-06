import { NextResponse } from 'next/server';
import { webFile } from '@/lib/server/uploads';
import { livePages } from '@/lib/server/content';
import { currentUser, can } from '@/lib/server/auth';
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  if (!/^[a-f0-9]{12}-\d{1,4}\.webp$/.test(file)) return new NextResponse('not found', { status: 404 });
  const publicPhoto = (await livePages()).some((p) => p.photos.some((ph) => ph.sizes.some((w) => file === `${ph.id}-${w}.webp`)));
  if (!publicPhoto && !can(await currentUser(), 'edit-drafts')) return new NextResponse('not found', { status: 404 });
  const buf = await webFile(file);
  if (!buf) return new NextResponse('not found', { status: 404 });
  return new NextResponse(new Uint8Array(buf), { status: 200, headers: { 'content-type': 'image/webp', 'content-length': String(buf.length), 'cache-control': 'private, no-store', 'x-content-type-options': 'nosniff' } });
}

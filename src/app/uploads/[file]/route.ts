import fs from 'node:fs';
import { NextResponse } from 'next/server';
import { webFile } from '@/lib/server/uploads';
export const dynamic = 'force-dynamic';
/** 운영자가 올린 공개용 사진. 인증 없이 200, 장기 캐시(파일명에 고유 ID 포함). 원본·비공개 파일은 이 경로로 나가지 않는다 */
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const p = webFile(file);
  if (!p) return new NextResponse('not found', { status: 404 });
  const buf = fs.readFileSync(p);
  return new NextResponse(new Uint8Array(buf), { status: 200, headers: { 'content-type': 'image/webp', 'content-length': String(buf.length), 'cache-control': 'public, max-age=31536000, immutable', 'x-content-type-options': 'nosniff' } });
}

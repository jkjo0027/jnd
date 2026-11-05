import { NextResponse } from 'next/server';
/**
 * IndexNow 키 파일. INDEXNOW_KEY 환경변수(8~128자, 영숫자·-)가 설정된 경우에만 /indexnow/{key}.txt 로 키를 그대로 응답한다.
 * 키는 공개되어도 되는 값(IndexNow 규격)이지만 저장소에는 넣지 않고 운영 환경변수로만 둔다. 제출 스크립트: scripts/indexnow.mjs
 */
export const dynamic = 'force-dynamic';
export async function GET(_req: Request, ctx: { params: Promise<{ file: string }> }) {
  const { file } = await ctx.params;
  const key = process.env.INDEXNOW_KEY || '';
  if (!key || !/^[A-Za-z0-9-]{8,128}$/.test(key) || file !== `${key}.txt`) return new NextResponse('not found', { status: 404, headers: { 'X-Robots-Tag': 'noindex' } });
  return new NextResponse(key, { status: 200, headers: { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'public, max-age=3600', 'X-Robots-Tag': 'noindex' } });
}

import { livePages } from '@/lib/server/content';
import { renderRss } from '@/lib/rss';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  return new Response(renderRss(await livePages()), { headers: {
    'Content-Type': 'application/rss+xml; charset=utf-8',
    // Publication and unpublication must be visible on the next feed request.
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  } });
}

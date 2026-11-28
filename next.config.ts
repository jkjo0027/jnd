import type { NextConfig } from 'next';
import ledger from './data/registry/publication-ledger.json';
import handbookGroups from './src/content/handbook-groups.json';

/** 품질 감사에서 통합(C/HOLD) 판정된 지역 센서·모터 URL → 지역 수리 페이지로 영구 리디렉션. D(사실 미확인) 페이지는 리디렉션 없이 404 */
const mergeRedirects = ledger.records
  .filter((r) => r.contentStatus === 'HOLD' && r.qualityClass === 'C' && r.mergeTarget)
  .map((r) => ({
    source: r.path,
    destination: r.mergeTarget + (r.type === 'handbook' && handbookGroups.some(g => g.topics.includes(r.path.split('/')[2]))
      ? `#${r.path.split('/')[2]}` : r.type === 'region-service' && r.path.endsWith('/install/') ? '#install' : ''),
    permanent: true,
  }));

// Region IDs are unique across provinces. Old URLs using the other province
// used to serve the same HTML as the published region.
const provinceRedirects = ledger.records
  .filter(r => r.type === 'region-service' && ((r.contentStatus === 'PUBLISHED' && r.indexEligibility) || (r.status === 'merged' && r.path.endsWith('/install/'))))
  .map(r => ({
    source: r.path.replace(/^\/areas\/(seoul|gyeonggi)\//, (_, province) =>
      province === 'seoul' ? '/areas/gyeonggi/' : '/areas/seoul/'),
    destination: r.status === 'merged' && r.mergeTarget ? `${r.mergeTarget}#install` : r.path,
    permanent: true,
  }));

// Reuse anonymous HTML for deployment-owned details. CMS-only pages keep their live responses.
const publicDetailPaths = ledger.records
  .filter(r => r.contentStatus === 'PUBLISHED' && r.indexEligibility &&
    /^(?:\/areas\/[^/]+\/r\d+\/[^/]+|\/guides\/g\d+|\/cases\/c\d+|\/services\/[^/]+)\/$/.test(r.path))
  .map(r => r.path);
const requestVariants = ['authorization', 'rsc', 'next-router-state-tree', 'next-router-prefetch', 'next-router-segment-prefetch'];
const privateCookies = ['jnd_admin', '__prerender_bypass'];

// 운영 호스트는 https://jndsystem.kr 하나로 고정한다. (src/lib/site.ts)
const nextConfig: NextConfig = {
  trailingSlash: true,
  poweredByHeader: false,
  reactStrictMode: true,
  images: { unoptimized: true },
  async redirects() {
    return [
      {
        source: '/:path(.*)',
        has: [{ type: 'host', value: 'jndsystem-kr.netlify.app' }],
        destination: 'https://jndsystem.kr/:path',
        permanent: true,
      },
      ...mergeRedirects,
      ...provinceRedirects,
    ];
  },
  async headers() {
    return [
      ...publicDetailPaths.map(source => ({
        source,
        missing: [
          ...requestVariants.map(key => ({ type: 'header' as const, key })),
          ...privateCookies.map(key => ({ type: 'cookie' as const, key })),
        ],
        headers: [
          { key: 'Netlify-CDN-Cache-Control', value: 'public, durable, s-maxage=300' },
          { key: 'Netlify-Vary', value: `query, header=${requestVariants.join('|')}, cookie=${privateCookies.join('|')}` },
        ],
      })),
      {
        // 관리자·미리보기·API 는 색인 금지 (robots.txt 차단은 noindex 대용이 아니다)
        source: '/(admin|api|preview)(.*)',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        ],
      },
    ];
  },
};

export default nextConfig;

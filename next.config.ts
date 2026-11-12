import type { NextConfig } from 'next';
import ledger from './data/registry/publication-ledger.json';

/** 품질 감사에서 통합(C/HOLD) 판정된 지역 센서·모터 URL → 지역 수리 페이지로 영구 리디렉션. D(사실 미확인) 페이지는 리디렉션 없이 404 */
const mergeRedirects = ledger.records
  .filter((r) => r.contentStatus === 'HOLD' && r.qualityClass === 'C' && r.mergeTarget)
  .map((r) => ({ source: r.path, destination: r.mergeTarget as string, permanent: true }));

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
    ];
  },
  async headers() {
    return [
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

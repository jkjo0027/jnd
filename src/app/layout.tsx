import type { Metadata, Viewport } from 'next';
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css';
import 'lucide-static/font/lucide.css';
import './globals.css';
import './home.css';
import './pages.css';
import { SITE_URL, BRAND } from '@/lib/site';
import NavigationScroll from '@/components/NavigationScroll';
import { MotionProvider } from '@/components/MotionContext';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: `자동문 설치·수리 전문 | ${BRAND}`, template: `%s | ${BRAND}` },
  applicationName: BRAND,
  icons: {
    icon: { url: `${SITE_URL}/favicon-96x96.png`, type: 'image/png', sizes: '96x96' },
    shortcut: { url: `${SITE_URL}/favicon.ico`, type: 'image/x-icon' },
    apple: { url: `${SITE_URL}/apple-touch-icon.png`, type: 'image/png', sizes: '180x180' },
  },
  robots: { index: true, follow: true },
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.NAVER_SITE_VERIFICATION ? { 'naver-site-verification': process.env.NAVER_SITE_VERIFICATION } : undefined,
  },
  openGraph: { siteName: BRAND, locale: 'ko_KR', type: 'website' },
};
export const viewport: Viewport = { width: 'device-width', initialScale: 1, themeColor: '#FED91B' };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <MotionProvider><NavigationScroll />{children}</MotionProvider>
      </body>
    </html>
  );
}

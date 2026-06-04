import './globals.css'
import Script from 'next/script'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import { SidebarAdLeft, SidebarAdRight } from '@/components/SidebarAds'
import { auth } from '@/lib/auth'

export const metadata = {
  metadataBase: new URL('https://myloa.app'),
  title: {
    default: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
    template: '%s - myloa',
  },
  description: '로스트아크 레이드 숙제를 캐릭터별로 관리하고 골드를 계산하세요. 길드·그룹원과 레이드 진행 현황을 실시간으로 공유할 수 있습니다.',
  keywords: ['로스트아크', '로스트아크 숙제', '레이드 숙제', '숙제 관리', '골드 계산', '로아 숙제', '로아 레이드', '레이드 체크리스트', '길드 레이드 현황', 'lost ark', 'raid tracker'],
  authors: [{ name: 'myloa', url: 'https://myloa.app' }],
  creator: 'myloa',
  publisher: 'myloa',
  openGraph: {
    type: 'website',
    locale: 'ko_KR',
    url: 'https://myloa.app',
    siteName: 'myloa',
    title: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
    description: '로스트아크 레이드 숙제를 캐릭터별로 관리하고 골드를 계산하세요. 길드·그룹원과 레이드 진행 현황을 실시간으로 공유할 수 있습니다.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
    description: '로스트아크 레이드 숙제를 캐릭터별로 관리하고 골드를 계산하세요. 길드·그룹원과 레이드 진행 현황을 실시간으로 공유할 수 있습니다.',
  },
  icons: { icon: '/icon.svg' },
  verification: {
    google: 'XkrTtOH9OlbQnHmkUGOcJZJ7b06HFsRbdzX5prlVksM',
    other: {
      // 네이버 서치어드바이저: 등록 후 발급받은 코드로 교체
      // 'naver-site-verification': 'YOUR_NAVER_VERIFICATION_CODE',
      'google-adsense-account': 'ca-pub-7505734558280029',
    },
  },
}

export default async function RootLayout({ children }) {
  const session = await auth()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'myloa',
    url: 'https://myloa.app',
    description: '로스트아크 레이드 숙제를 캐릭터별로 관리하고 골드를 계산하세요. 길드·그룹원과 레이드 진행 현황을 실시간으로 공유할 수 있습니다.',
    applicationCategory: 'GameApplication',
    operatingSystem: 'Web',
    inLanguage: 'ko',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'KRW' },
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <SessionProvider session={session}>
          <ThemeProvider>
            <Navbar />
            {/* 전체 레이아웃: 2xl(1536px+)에서 좌우 사이드바 포함 데스크탑 레이아웃 */}
            <div className="2xl:flex 2xl:items-start 2xl:gap-4 2xl:px-4">
              {/* 좌측 사이드바 — 2xl only (160×600 sticky) */}
              <aside className="hidden 2xl:flex w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden items-start justify-center" style={{ minHeight: '600px' }}>
                <SidebarAdLeft />
              </aside>
              {/* 본문 */}
              <main className="flex-1 min-w-0 px-4 py-6 min-h-[calc(100dvh-82px)]">
                {children}
                <footer className="mt-12 pt-6 border-t border-gray-200 dark:border-white/[0.06] text-center">
                  <Link href="/privacy" className="text-[11px] text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors">
                    개인정보처리방침
                  </Link>
                </footer>
              </main>
              {/* 우측 사이드바 — 2xl only (160×600 sticky) */}
              <aside className="hidden 2xl:flex w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden items-start justify-center" style={{ minHeight: '600px' }}>
                <SidebarAdRight />
              </aside>
            </div>
          </ThemeProvider>
        </SessionProvider>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7505734558280029"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </body>
    </html>
  )
}

import './globals.css'
import Script from 'next/script'
import Link from 'next/link'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import { SidebarAdLeft, SidebarAdRight } from '@/components/SidebarAds'
import FeedbackButton from '@/components/FeedbackButton'
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
            <div className="xl:flex xl:items-start xl:gap-4 xl:px-4">
              <SidebarAdLeft />
              <main className="flex-1 min-w-0 px-4 py-6 min-h-[calc(100dvh-82px)]">
                {children}
                <footer className="mt-12 pt-8 pb-2 border-t border-gray-200 dark:border-white/[0.06] text-center space-y-3">
                  <div className="space-y-1">
                    <div className="text-lg font-bold tracking-tight text-[var(--accent-400)] ns-extrabold">myloa</div>
                    <p className="text-[12px] text-gray-400 dark:text-zinc-500">로스트아크 레이드 숙제 관리 & 공유</p>
                  </div>
                  <div className="flex items-center justify-center gap-3 text-[11px]">
                    <Link href="/guide" className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors">
                      사용 가이드
                    </Link>
                    {session?.user?.id && (
                      <>
                        <span className="text-gray-300 dark:text-zinc-700">|</span>
                        <FeedbackButton />
                      </>
                    )}
                    <span className="text-gray-300 dark:text-zinc-700">|</span>
                    <Link href="/privacy" className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors">
                      개인정보처리방침
                    </Link>
                    <span className="text-gray-300 dark:text-zinc-700">|</span>
                    <span className="text-gray-400 dark:text-zinc-600">© 2026 myloa</span>
                  </div>
                </footer>
              </main>
              <SidebarAdRight />
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

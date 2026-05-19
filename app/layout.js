import './globals.css'
import Script from 'next/script'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import AdSense from '@/components/AdSense'
import { auth } from '@/lib/auth'

const AD_SLOT_SIDEBAR_L = '7996518124'
const AD_SLOT_SIDEBAR_R = '7746939400'

export const metadata = {
  title: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
  description: '로스트아크 레이드 숙제를 관리하고 지인들과 공유해보세요.',
  icons: { icon: '/icon.svg' },
  verification: {
    other: { 'google-adsense-account': 'ca-pub-7505734558280029' },
  },
}

export default async function RootLayout({ children }) {
  const session = await auth()

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
      </head>
      <body>
        <SessionProvider session={session}>
          <ThemeProvider>
            <Navbar />
            {/* 전체 레이아웃: 2xl(1536px+)에서 좌우 사이드바 포함 데스크탑 레이아웃 */}
            <div className="2xl:flex 2xl:items-start 2xl:gap-4 2xl:px-4">
              {/* 좌측 사이드바 — 2xl only (160×600 sticky) */}
              <aside className="hidden 2xl:flex w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden items-start justify-center" style={{ minHeight: '600px' }}>
                <AdSense slot={AD_SLOT_SIDEBAR_L} sidebar />
              </aside>
              {/* 본문 */}
              <main className="flex-1 min-w-0 px-4 py-6">
                {children}
              </main>
              {/* 우측 사이드바 — 2xl only (160×600 sticky) */}
              <aside className="hidden 2xl:flex w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden items-start justify-center" style={{ minHeight: '600px' }}>
                <AdSense slot={AD_SLOT_SIDEBAR_R} sidebar />
              </aside>
            </div>
          </ThemeProvider>
        </SessionProvider>
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-7505734558280029"
          crossOrigin="anonymous"
          strategy="lazyOnload"
        />
      </body>
    </html>
  )
}

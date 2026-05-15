import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import AdSense from '@/components/AdSense'
import { auth } from '@/lib/auth'

export const metadata = {
  title: 'myloa - 로스트아크 레이드 숙제 관리',
  description: '로스트아크 레이드 숙제를 관리하고 원정대원들과 공유하세요.',
  icons: { icon: '/icon.svg' },
}

export default async function RootLayout({ children }) {
  const session = await auth()

  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-XXXXXXXXXXXXXXXX"
          crossOrigin="anonymous"
        />
      </head>
      <body>
        <SessionProvider session={session}>
          <ThemeProvider>
            <Navbar />
            {/* 외부 컨테이너: lg(1024px+)에서 우측 광고 슬롯 포함 최대 1600px */}
            <div className="mx-auto max-w-[1600px]">
              <div className="flex items-start">
                {/* 본문: 모바일 전체폭 / lg 이상에서 사이드바 확보 후 남은 영역 */}
                <main className="flex-1 min-w-0 px-4 py-6">
                  {children}
                </main>

                {/* 우측 광고 슬롯 — lg(1024px) 이상에서만 표시, 300px 고정 */}
                <aside className="hidden lg:flex lg:w-[300px] flex-shrink-0 flex-col items-center sticky top-[50px] pt-6 px-3 min-h-[calc(100vh-50px)]">
                  <div className="w-full max-w-[280px]">
                    <AdSense slot="XXXXXXXXXX" client="ca-pub-XXXXXXXXXXXXXXXX" />
                  </div>
                </aside>
              </div>
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

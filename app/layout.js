import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import { auth } from '@/lib/auth'

export const metadata = {
  title: '로아숙제 - 로스트아크 레이드 숙제 관리',
  description: '로스트아크 레이드 숙제를 관리하고 원정대원들과 공유하세요.',
}

export default async function RootLayout({ children }) {
  const session = await auth()

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <SessionProvider session={session}>
          <ThemeProvider>
            <Navbar />
            {/* 외부 컨테이너: 2xl(1536px+)에서 광고 사이드 슬롯 포함 최대 1600px */}
            <div className="mx-auto max-w-[1600px]">
              <div className="flex items-start">
                {/* 좌측 광고 슬롯 — 2xl 이상에서만 표시 */}
                <aside className="hidden 2xl:flex 2xl:w-[160px] flex-shrink-0 items-start justify-center sticky top-12 pt-6 min-h-[calc(100vh-3rem)]">
                  {/* AdSense 160×600 */}
                </aside>

                {/* 본문 */}
                <main className="flex-1 min-w-0 px-4 py-6">
                  {children}
                </main>

                {/* 우측 광고 슬롯 — 2xl 이상에서만 표시 */}
                <aside className="hidden 2xl:flex 2xl:w-[160px] flex-shrink-0 items-start justify-center sticky top-12 pt-6 min-h-[calc(100vh-3rem)]">
                  {/* AdSense 160×600 */}
                </aside>
              </div>
            </div>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

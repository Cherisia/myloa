import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import SessionProvider from '@/components/SessionProvider'
import Navbar from '@/components/Navbar'
import { auth } from '@/lib/auth'

export const metadata = {
  title: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
  description: '로스트아크 레이드 숙제를 관리하고 지인들과 공유해보세요.',
  icons: { icon: '/icon.svg' },
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
            <main className="px-4 py-6">
              {children}
            </main>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

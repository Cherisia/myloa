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
            <main className="mx-auto max-w-5xl px-4 py-6">
              {children}
            </main>
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  )
}

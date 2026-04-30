import './globals.css'
import { ThemeProvider } from '@/components/ThemeProvider'
import Navbar from '@/components/Navbar'

export const metadata = {
  title: '로아숙제 - 로스트아크 레이드 숙제 관리',
  description: '로스트아크 레이드 숙제를 관리하고 원정대원들과 공유하세요.',
}

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <Navbar />
          <main className="mx-auto max-w-5xl px-4 py-6">
            {children}
          </main>
        </ThemeProvider>
      </body>
    </html>
  )
}

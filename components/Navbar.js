'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'

export default function Navbar() {
  const { theme, toggle } = useTheme()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navLinks = [
    { href: '/dashboard', label: '원정대' },
    { href: '/group', label: '그룹' },
  ]

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#161b22] border-b border-gray-200 dark:border-[#30363d]">
      <div className="mx-auto max-w-5xl px-4 flex h-12 items-center justify-between">

        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center gap-2">
          <div className="h-6 w-6 rounded bg-yellow-400 flex items-center justify-center">
            <span className="text-xs ns-extrabold text-gray-900">L</span>
          </div>
          <span className="ns-bold text-sm text-gray-900 dark:text-white">
            로아<span className="text-yellow-500">숙제</span>
          </span>
        </Link>

        {/* 데스크탑 Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded text-sm transition-colors duration-100
                ${isActive(href)
                  ? 'ns-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#21262d]'
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 우측 버튼들 */}
        <div className="flex items-center gap-2">
          {/* 다크모드 토글 */}
          <button
            onClick={toggle}
            className="h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors"
            aria-label="테마 전환"
          >
            {theme === 'dark' ? (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
              </svg>
            ) : (
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
              </svg>
            )}
          </button>

          {/* 카카오 로그인 */}
          <button className="hidden sm:flex items-center gap-1.5 rounded bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 text-xs ns-bold text-gray-900 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3C6.477 3 2 6.477 2 10.8c0 2.7 1.6 5.08 4.05 6.56l-1.04 3.84a.3.3 0 0 0 .44.33L9.7 19.1A11.1 11.1 0 0 0 12 19.4c5.523 0 10-3.477 10-7.6S17.523 3 12 3z"/>
            </svg>
            카카오 로그인
          </button>

          {/* 모바일 메뉴 */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-[#21262d] transition-colors"
          >
            {mobileOpen ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className="sm:hidden border-t border-gray-200 dark:border-[#30363d] px-4 py-2 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded text-sm transition-colors
                ${isActive(href)
                  ? 'ns-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#21262d]'
                }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 pb-1 border-t border-gray-200 dark:border-[#30363d]">
            <button className="w-full flex items-center justify-center gap-1.5 rounded bg-yellow-400 px-3 py-2 text-sm ns-bold text-gray-900">
              카카오 로그인
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

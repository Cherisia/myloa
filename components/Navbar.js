'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'
import { signIn, signOut, useSession } from 'next-auth/react'

// ── 테마 정의 ─────────────────────────────────────────────────────────────────
const THEMES = [
  {
    key: 'yellow',
    label: '☀️ 오후의 햇살',
    bg: '#facc15',
  },
  {
    key: 'pink',
    label: '🌸 벚꽃 왈츠',
    bg: '#f9a8d4',
  },
  {
    key: 'dark',
    label: '🌙 별 헤는 밤',
    bg: 'linear-gradient(135deg, #1e2433 50%, #181818 100%)',
    isGradient: true,
  },
]

export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [themeOpen, setThemeOpen] = useState(false)
  const { data: session } = useSession()

  const navLinks = [
    { href: '/dashboard', label: '원정대' },
    { href: '/group', label: '그룹' },
  ]

  const isActive = (href) => pathname === href || pathname.startsWith(href + '/')

  const currentTheme = THEMES.find(t => t.key === theme) || THEMES[0]

  const ThemePicker = ({ mobile = false }) => (
    <div className="relative">
      {/* 현재 테마 버튼 */}
      <button
        onClick={() => setThemeOpen(v => !v)}
        className={`flex items-center gap-1.5 h-8 px-2 rounded transition-colors
          text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]
          ${mobile ? 'w-full justify-start' : ''}`}
        aria-label="테마 선택"
      >
        <span className="text-xs text-gray-500 dark:text-gray-400">{currentTheme.label}</span>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${themeOpen ? 'rotate-180' : ''}`}>
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </button>

      {/* 드롭다운 */}
      {themeOpen && (
        <>
          {/* 배경 닫기 오버레이 */}
          <div className="fixed inset-0 z-40" onClick={() => setThemeOpen(false)} />
          <div className={`absolute z-50 mt-1 p-1.5 rounded-xl border border-gray-200 dark:border-[#383838]
            bg-white dark:bg-[#222222] shadow-lg w-max
            ${mobile ? 'left-0' : 'right-0'}`}
          >
            {THEMES.map(t => (
              <button
                key={t.key}
                onClick={() => { setTheme(t.key); setThemeOpen(false) }}
                className={`w-full flex items-center px-2.5 py-1.5 rounded-lg text-xs transition-colors
                  ${theme === t.key
                    ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-800 dark:text-gray-100 ns-bold'
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-[#141414] border-b border-gray-200 dark:border-[#2e2e2e]">
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
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                }`}
            >
              {label}
            </Link>
          ))}
        </nav>

        {/* 우측 버튼들 */}
        <div className="flex items-center gap-1">
          {/* 테마 선택 */}
          <div className="hidden sm:block">
            <ThemePicker />
          </div>

          {/* 로그인 / 유저 */}
          {session ? (
            <div className="hidden sm:flex items-center gap-2">
              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt={session.user?.name || ''}
                  className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                />
              ) : (
                <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-[#383838] flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] ns-bold text-gray-500 dark:text-gray-400">
                    {(session.user?.name || '?')[0].toUpperCase()}
                  </span>
                </div>
              )}
              <span className="text-xs text-gray-500 dark:text-gray-400 max-w-[80px] truncate">
                {session.user?.name || session.user?.email}
              </span>
              <button
                onClick={() => signOut()}
                className="rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
              >
                로그아웃
              </button>
            </div>
          ) : (
            <button
              onClick={() => signIn('discord')}
              className="hidden sm:flex items-center gap-1.5 rounded bg-yellow-200 hover:bg-yellow-300 px-3 py-1.5 text-xs ns-bold text-yellow-900 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.002.022.015.043.031.055a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
              </svg>
              디스코드 로그인
            </button>
          )}

          {/* 모바일 메뉴 버튼 */}
          <button
            onClick={() => setMobileOpen(v => !v)}
            className="sm:hidden h-8 w-8 flex items-center justify-center rounded text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors"
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
        <div className="sm:hidden border-t border-gray-200 dark:border-[#383838] px-4 py-2 space-y-1">
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded text-sm transition-colors
                ${isActive(href)
                  ? 'ns-bold text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'
                }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-2 pb-1 border-t border-gray-200 dark:border-[#383838]">
            {/* 모바일 테마 선택 */}
            <div className="px-1 pb-2">
              <ThemePicker mobile />
            </div>
            {session ? (
              <div className="space-y-1">
                <div className="px-3 flex items-center gap-2">
                  {session.user?.image ? (
                    <img
                      src={session.user.image}
                      alt={session.user?.name || ''}
                      className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-[#383838] flex items-center justify-center flex-shrink-0">
                      <span className="text-[10px] ns-bold text-gray-500 dark:text-gray-400">
                        {(session.user?.name || '?')[0].toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {session.user?.name || session.user?.email}
                  </p>
                </div>
                <button
                  onClick={() => signOut()}
                  className="w-full flex items-center justify-center rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm ns-bold text-gray-600 dark:text-gray-300"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <button
                onClick={() => signIn('discord')}
                className="w-full flex items-center justify-center gap-1.5 rounded bg-yellow-400 px-3 py-2 text-sm ns-bold text-gray-900"
              >
                디스코드 로그인
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  )
}

'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import DiscordIcon from './DiscordIcon'

// Discord 공식 브랜드 컬러
const DISCORD_BG   = '#5865F2'
const DISCORD_HOVER= '#4752C4'

const THEMES = [
  { key: 'yellow', label: '오후의 햇살', color: '#fbbf24' },
  { key: 'pink',   label: '벚꽃 왈츠',  color: '#f472b6' },
  { key: 'sky',    label: '맑은 하늘',  color: '#38bdf8' },
  { key: 'dark',   label: '별 헤는 밤', color: '#52525b' },
]

const THEME_STYLE = {
  yellow: {
    header:       'bg-white/90 border-gray-200/70',
    logo:         'text-gray-900',
    logoMy:       'text-gray-400',
    logoAccent:   'text-yellow-500',
    logoMark:     'bg-yellow-400',
    navBase:      'text-gray-500 hover:text-gray-900',
    navActive:    'text-gray-900 ns-bold',
    navUnderline: 'bg-yellow-400',
    divider:      'bg-gray-200',
    dotRing:      'ring-yellow-400 ring-offset-white',
    userText:     'text-gray-600',
    logoutText:   'text-gray-400 hover:text-gray-700',
  },
  pink: {
    header:       'bg-white/90 border-pink-100',
    logo:         'text-gray-900',
    logoMy:       'text-gray-400',
    logoAccent:   'text-pink-400',
    logoMark:     'bg-pink-400',
    navBase:      'text-gray-500 hover:text-pink-600',
    navActive:    'text-pink-600 ns-bold',
    navUnderline: 'bg-pink-400',
    divider:      'bg-pink-100',
    dotRing:      'ring-pink-400 ring-offset-white',
    userText:     'text-gray-600',
    logoutText:   'text-gray-400 hover:text-gray-700',
  },
  sky: {
    header:       'bg-white/90 border-sky-100',
    logo:         'text-gray-900',
    logoMy:       'text-gray-400',
    logoAccent:   'text-sky-500',
    logoMark:     'bg-sky-400',
    navBase:      'text-gray-500 hover:text-sky-600',
    navActive:    'text-sky-500 ns-bold',
    navUnderline: 'bg-sky-400',
    divider:      'bg-sky-100',
    dotRing:      'ring-sky-400 ring-offset-white',
    userText:     'text-gray-600',
    logoutText:   'text-gray-400 hover:text-gray-700',
  },
  dark: {
    header:       'bg-[#111111]/95 border-white/[0.06]',
    logo:         'text-white',
    logoMy:       'text-zinc-600',
    logoAccent:   'text-zinc-100',
    logoMark:     'bg-zinc-600',
    navBase:      'text-zinc-500 hover:text-zinc-100',
    navActive:    'text-white ns-bold',
    navUnderline: 'bg-zinc-400',
    divider:      'bg-white/[0.07]',
    dotRing:      'ring-zinc-400 ring-offset-[#111111]',
    userText:     'text-zinc-400',
    logoutText:   'text-zinc-600 hover:text-zinc-300',
  },
}


export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const pathname            = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session } = useSession()

  const s = THEME_STYLE[theme] || THEME_STYLE.yellow

  const navLinks = [
    { href: '/dashboard', label: '원정대' },
    ...(session ? [{ href: '/group', label: '공격대' }] : []),
    ...(session ? [{ href: '/friends', label: '친구' }] : []),
  ]
  const isActive = (href) => href && (pathname === href || pathname.startsWith(href + '/'))

  const ThemeDots = () => (
    <div className="flex items-center gap-2">
      {THEMES.map(t => (
        <button
          key={t.key}
          type="button"
          onClick={() => setTheme(t.key)}
          className={`w-3.5 h-3.5 rounded-full transition-all duration-200 ${
            theme === t.key
              ? `ring-2 ring-offset-2 scale-110 ${s.dotRing}`
              : 'opacity-40 hover:opacity-75 hover:scale-110'
          }`}
          style={{ backgroundColor: t.color }}
          aria-label={t.label}
        />
      ))}
    </div>
  )

  const displayNickname = session?.user?.nickname || session?.user?.name || session?.user?.email || ''

  const UserArea = ({ mobile = false }) => session ? (
    <div className={`flex items-center gap-1 ${mobile ? 'w-full justify-between' : ''}`}>
      {/* 아바타 + 닉네임 → 설정 페이지 */}
      <Link
        href="/settings"
        className={`flex items-center gap-2 rounded-xl px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${mobile ? 'flex-1' : ''}`}
      >
        {session.user?.image ? (
          <Image
            src={session.user.image} alt=""
            width={24} height={24}
            className="h-6 w-6 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
          />
        ) : (
          <div className="h-6 w-6 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-[10px] ns-bold text-gray-600 dark:text-zinc-300">
              {(displayNickname || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
        <span className={`text-[11px] max-w-[80px] truncate ${s.userText}`}>
          {displayNickname}
        </span>
      </Link>

    </div>
  ) : (
    <button
      onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
      className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] ns-bold text-white transition-all active:scale-95 ${mobile ? 'w-full justify-center py-2 text-xs' : ''}`}
      style={{ backgroundColor: DISCORD_BG }}
      onMouseEnter={e => e.currentTarget.style.backgroundColor = DISCORD_HOVER}
      onMouseLeave={e => e.currentTarget.style.backgroundColor = DISCORD_BG}
    >
      <DiscordIcon size={12} />
      디스코드 로그인
    </button>
  )

  return (
    <>
    <header className={`sticky top-0 z-50 border-b backdrop-blur-md ${s.header}`}>
      <div className="mx-auto max-w-[1600px] px-5 flex items-center gap-6" style={{ height: 50 }}>

        {/* 로고 */}
        <Link href="/dashboard" className="flex items-center flex-shrink-0">
          <span className="inline-flex items-baseline tracking-tight select-none gap-px">
            <span className={`text-[17px] ns-bold ${s.logoMy}`}>my</span>
            <span className={`text-[22px] ns-extrabold leading-none ${s.logoAccent}`}>loa</span>
          </span>
        </Link>

        {/* 구분선 */}
        <div className={`hidden sm:block h-3.5 w-px ${s.divider}`} />

        {/* 데스크탑 Nav */}
        <nav className="hidden sm:flex items-center gap-1">
          {navLinks.map(({ href, label, onClick }) => onClick ? (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`relative px-2.5 py-1 text-xs transition-colors duration-150 ${s.navBase}`}
            >
              {label}
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={`relative px-2.5 py-1 text-xs transition-colors duration-150 ${
                isActive(href) ? s.navActive : s.navBase
              }`}
            >
              {label}
              {isActive(href) && (
                <span className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-full ${s.navUnderline}`} />
              )}
            </Link>
          ))}
        </nav>

        <div className="flex-1" />

        {/* 우측 — 데스크탑 */}
        <div className="hidden sm:flex items-center gap-4">
          <ThemeDots />
          <div className={`h-3.5 w-px ${s.divider}`} />
          <UserArea />
        </div>

        {/* 모바일 버튼 */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className={`sm:hidden ml-auto h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${s.navBase}`}
        >
          {mobileOpen ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 메뉴 */}
      {mobileOpen && (
        <div className={`sm:hidden border-t px-4 py-3 space-y-0.5 ${s.header.replace('bg-white/90', 'bg-white').replace('bg-\\[#111111\\]\\/95', 'bg-[#111111]')}`}
          style={theme === 'dark' ? { backgroundColor: '#111111' } : { backgroundColor: '#ffffff' }}
        >
          {navLinks.map(({ href, label, onClick }) => onClick ? (
            <button
              key={label}
              type="button"
              onClick={() => { setMobileOpen(false); onClick() }}
              className={`block w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${s.navBase}`}
            >
              {label}
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive(href) ? s.navActive : s.navBase
              }`}
            >
              {label}
            </Link>
          ))}
          <div className="pt-3 pb-1 flex flex-col gap-3 border-t mt-2" style={{ borderColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f0f0f0' }}>
            <ThemeDots />
            <UserArea mobile />
          </div>
        </div>
      )}
    </header>

</>
  )
}

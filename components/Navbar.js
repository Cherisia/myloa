'use client'

import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useTheme } from './ThemeProvider'
import { useState, useEffect, useRef, useCallback } from 'react'
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
    header:       'bg-[#111116]/95 border-white/[0.08]',
    logo:         'text-white',
    logoMy:       'text-zinc-500',
    logoAccent:   'text-zinc-100',
    logoMark:     'bg-zinc-500',
    navBase:      'text-zinc-400 hover:text-white',
    navActive:    'text-white ns-bold',
    navUnderline: 'bg-zinc-400',
    divider:      'bg-white/[0.08]',
    dotRing:      'ring-zinc-400 ring-offset-[#111116]',
    userText:     'text-zinc-300',
    logoutText:   'text-zinc-500 hover:text-zinc-200',
  },
}


export default function Navbar() {
  const { theme, setTheme } = useTheme()
  const pathname            = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)
  const { data: session, update: updateSession } = useSession()
  const [pendingFriendCount, setPendingFriendCount] = useState(0)
  const [avatarSrc, setAvatarSrc] = useState(null)
  const avatarRefreshedRef = useRef(false)

  useEffect(() => {
    setAvatarSrc(session?.user?.image || null)
    avatarRefreshedRef.current = false
  }, [session?.user?.image])

  const handleAvatarError = useCallback(async () => {
    if (avatarRefreshedRef.current) { setAvatarSrc(null); return }
    avatarRefreshedRef.current = true
    try {
      const res = await fetch('/api/user/refresh-avatar', { method: 'POST' })
      if (res.ok) {
        const { image } = await res.json()
        setAvatarSrc(image)
        await updateSession()
      } else {
        setAvatarSrc(null)
      }
    } catch {
      setAvatarSrc(null)
    }
  }, [updateSession])

  useEffect(() => {
    if (!session?.user?.id) { setPendingFriendCount(0); return }
    fetch('/api/group/pending-count')
      .then(r => r.json())
      .then(d => setPendingFriendCount(d.count || 0))
      .catch(() => {})
  }, [session?.user?.id])

  const s = THEME_STYLE[theme] || THEME_STYLE.yellow

  const navLinks = [
    { href: '/', label: '홈' },
    { href: '/dashboard', label: '대시보드' },
    { href: '/guild', label: '길드' },
    { href: '/group', label: '그룹', badge: session ? pendingFriendCount : 0 },
    { href: '/dictionary', label: '로아 사전' },
    { href: '/tools', label: '도구' },
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

  useEffect(() => {
    if (mobileOpen) {
      document.documentElement.style.overflow = 'hidden'
      document.body.style.overflow = 'hidden'
      document.body.style.position = 'fixed'
      document.body.style.width = '100%'
    } else {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
    return () => {
      document.documentElement.style.overflow = ''
      document.body.style.overflow = ''
      document.body.style.position = ''
      document.body.style.width = ''
    }
  }, [mobileOpen])

  const UserArea = ({ mobile = false }) => session ? (
    <div className={`flex items-center gap-1 ${mobile ? 'w-full justify-between' : ''}`}>
      {/* 아바타 + 닉네임 → 설정 페이지 */}
      <Link
        href="/settings"
        className={`flex items-center gap-2 rounded-xl px-2 py-1 -mx-2 -my-1 transition-colors hover:bg-black/5 dark:hover:bg-white/5 ${mobile ? 'flex-1' : ''}`}
      >
        {avatarSrc ? (
          <Image
            src={avatarSrc} alt=""
            width={28} height={28}
            className="h-7 w-7 rounded-full object-cover ring-1 ring-black/10 dark:ring-white/10"
            onError={handleAvatarError}
          />
        ) : (
          <div className="h-7 w-7 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center">
            <span className="text-[11px] ns-bold text-gray-600 dark:text-zinc-300">
              {(displayNickname || '?')[0].toUpperCase()}
            </span>
          </div>
        )}
        <span className={`text-xs max-w-[96px] truncate ${s.userText}`}>
          {displayNickname}
        </span>
      </Link>

    </div>
  ) : (
    <button
      onClick={() => signIn('discord', { callbackUrl: '/' })}
      className={`flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs ns-bold text-white transition-all active:scale-95 ${mobile ? 'w-full justify-center py-2 text-xs' : ''}`}
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
    <header
      className={`z-50 border-b ${s.header} ${
        mobileOpen
          ? 'sm:sticky sm:top-0 fixed inset-0 flex flex-col'
          : 'sticky top-0 backdrop-blur-md'
      }`}
      style={mobileOpen ? { backgroundColor: theme === 'dark' ? '#111116' : '#ffffff' } : undefined}
    >
      {/* 상단 바 */}
      <div className="px-4 2xl:pl-52 2xl:pr-52 flex items-center gap-6 flex-shrink-0" style={{ height: 61 }}>

        {/* 로고 */}
        <Link href="/" onClick={() => setMobileOpen(false)} className="flex items-center flex-shrink-0">
          <span className="inline-flex items-baseline tracking-tight select-none gap-px">
            <span className={`text-[17px] sm:text-[21px] ns-bold ${s.logoMy}`}>my</span>
            <span className={`text-[22px] sm:text-[30px] ns-extrabold leading-none ${s.logoAccent}`}>loa</span>
          </span>
        </Link>

        {/* 구분선 */}
        <div className={`hidden sm:block h-3.5 w-px ${s.divider}`} />

        {/* 데스크탑 Nav */}
        <nav className="hidden sm:flex items-center gap-5">
          {navLinks.map(({ href, label, onClick, badge }) => onClick ? (
            <button
              key={label}
              type="button"
              onClick={onClick}
              className={`relative px-3 py-1 text-sm sm:text-[15px] transition-colors duration-150 ${s.navBase}`}
            >
              {label}
            </button>
          ) : (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1 px-3 py-1 text-sm sm:text-[15px] transition-colors duration-150 ${
                isActive(href) ? s.navActive : s.navBase
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="inline-flex items-center justify-center min-w-[14px] h-3.5 px-1 text-[9px] ns-bold rounded-full bg-red-500 text-white leading-none">
                  {badge}
                </span>
              )}
              {isActive(href) && (
                <span className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-full ${s.navUnderline}`} />
              )}
            </Link>
          ))}

        </nav>

        <div className="flex-1" />

        {/* 우측 — 데스크탑 */}
        <div className="hidden sm:flex items-center gap-4">
          <div className="hidden md:flex items-center gap-4">
            <ThemeDots />
            <div className={`h-3.5 w-px ${s.divider}`} />
          </div>
          <UserArea />
        </div>

        {/* 모바일 햄버거 / 닫기 버튼 */}
        <button
          onClick={() => setMobileOpen(v => !v)}
          className={`sm:hidden ml-auto h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${s.navBase}`}
          aria-label={mobileOpen ? '메뉴 닫기' : '메뉴'}
        >
          {mobileOpen ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          )}
        </button>
      </div>

      {/* 모바일 풀스크린 메뉴 — 헤더 확장 */}
      {mobileOpen && (
        <nav className="sm:hidden flex-1 overflow-y-auto overscroll-contain px-4 pt-4 pb-6">
          <div className="space-y-1">
            {navLinks.map(({ href, label, onClick, badge }) => onClick ? (
              <button
                key={label}
                type="button"
                onClick={() => { setMobileOpen(false); onClick() }}
                className={`flex w-full items-center px-4 py-4 rounded-2xl text-base transition-colors ${s.navBase}`}
              >
                {label}
              </button>
            ) : (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center justify-between px-4 py-4 rounded-2xl text-base transition-colors ${
                  isActive(href)
                    ? `bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 ${s.navActive}`
                    : s.navBase
                }`}
              >
                <span className="flex items-center gap-2">
                  {label}
                  {badge > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[11px] ns-bold rounded-full bg-red-500 text-white leading-none">
                      {badge}
                    </span>
                  )}
                </span>
                {isActive(href) && (
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
                )}
              </Link>
            ))}

          </div>

          {/* 구분선 */}
          <div className="my-5 h-px" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f0f0f0' }} />

          {/* 테마 선택 */}
          <div className="px-4">
            <p className={`text-xs ns-bold mb-3 ${theme === 'dark' ? 'text-zinc-500' : 'text-gray-400'}`}>테마</p>
            <div className="flex items-center gap-4">
              {THEMES.map(t => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTheme(t.key)}
                  aria-label={t.label}
                  className="flex items-center justify-center"
                >
                  <span
                    className={`w-8 h-8 rounded-full transition-all duration-200 ${
                      theme === t.key
                        ? `ring-2 ring-offset-2 scale-110 ${s.dotRing}`
                        : 'opacity-50 hover:opacity-80'
                    }`}
                    style={{ backgroundColor: t.color }}
                  />
                </button>
              ))}
            </div>
          </div>

          {/* 구분선 */}
          <div className="my-5 h-px" style={{ backgroundColor: theme === 'dark' ? 'rgba(255,255,255,0.07)' : '#f0f0f0' }} />

          {/* 유저 영역 */}
          <div className="px-4">
            {session ? (
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-3 rounded-2xl py-2 transition-colors hover:bg-black/5 dark:hover:bg-white/5 active:bg-black/10"
              >
                {avatarSrc ? (
                  <Image
                    src={avatarSrc} alt=""
                    width={40} height={40}
                    className="h-10 w-10 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0"
                    onError={handleAvatarError}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm ns-bold text-gray-600 dark:text-zinc-300">
                      {(displayNickname || '?')[0].toUpperCase()}
                    </span>
                  </div>
                )}
                <span className={`text-base ns-bold truncate ${s.userText}`}>{displayNickname}</span>
              </Link>
            ) : (
              <button
                onClick={() => { setMobileOpen(false); signIn('discord', { callbackUrl: '/' }) }}
                className="flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm ns-bold text-white transition-all active:scale-95"
                style={{ backgroundColor: DISCORD_BG }}
                onMouseEnter={e => e.currentTarget.style.backgroundColor = DISCORD_HOVER}
                onMouseLeave={e => e.currentTarget.style.backgroundColor = DISCORD_BG}
              >
                <DiscordIcon size={16} />
                디스코드 로그인
              </button>
            )}
          </div>
        </nav>
      )}
    </header>
</>
  )
}

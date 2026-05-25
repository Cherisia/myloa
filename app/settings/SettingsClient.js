'use client'

import Image from 'next/image'
import { signOut } from 'next-auth/react'
import { useState, useCallback, useRef } from 'react'

const IconCheck = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconEye = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
)
const IconEyeOff = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
)
const IconLogout = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none disabled:opacity-50 ${
        checked ? 'bg-[var(--accent-400)]' : 'bg-gray-200 dark:bg-zinc-700'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white dark:bg-[#1e1e1e] rounded-2xl border border-gray-100 dark:border-white/[0.06] overflow-hidden">
      {title && (
        <div className="px-5 py-3 border-b border-gray-100 dark:border-white/[0.06]">
          <p className="text-[11px] ns-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wider">{title}</p>
        </div>
      )}
      {children}
    </div>
  )
}

export default function SettingsClient({ user, session }) {
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [raidPublic, setRaidPublic]               = useState(user?.raidPublic ?? true)
  const [raidPublicFriends, setRaidPublicFriends] = useState(user?.raidPublicFriends ?? true)
  const [nickSaving, setNickSaving]               = useState(false)
  const [nickSaved, setNickSaved]                 = useState(false)
  const [raidSaving, setRaidSaving]               = useState(false)
  const [raidFriendsSaving, setRaidFriendsSaving] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)

  const displayName = session?.user?.name || session?.user?.email || ''
  const discordUser = user?.discordUsername

  const saveNickname = useCallback(async () => {
    setNickSaving(true)
    setNickSaved(false)
    setError('')
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      if (res.ok) {
        setNickSaved(true)
        setTimeout(() => setNickSaved(false), 2000)
      } else {
        setError('저장에 실패했습니다.')
      }
    } catch {
      setError('저장에 실패했습니다.')
    } finally {
      setNickSaving(false)
    }
  }, [nickname])

  const saveRaidPublic = useCallback(async (val) => {
    setRaidPublic(val)
    setRaidSaving(true)
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidPublic: val }),
      })
    } finally {
      setRaidSaving(false)
    }
  }, [])

  const saveRaidPublicFriends = useCallback(async (val) => {
    setRaidPublicFriends(val)
    setRaidFriendsSaving(true)
    try {
      await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ raidPublicFriends: val }),
      })
    } finally {
      setRaidFriendsSaving(false)
    }
  }, [])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#111111]">
      <div className="mx-auto max-w-lg px-4 py-10 space-y-4">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-xl ns-bold text-gray-900 dark:text-white">설정</h1>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">개인 정보 및 공격대 설정</p>
        </div>

        {/* 프로필 */}
        <Section>
          <div className="px-5 py-4 flex items-center gap-4">
            {session?.user?.image ? (
              <Image
                src={session.user.image}
                alt=""
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0"
              />
            ) : (
              <div className="h-13 w-13 rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0" style={{ width: 52, height: 52 }}>
                <span className="text-lg ns-bold text-gray-600 dark:text-zinc-300">
                  {(displayName || '?')[0].toUpperCase()}
                </span>
              </div>
            )}
            <div className="min-w-0">
              <p className="text-sm ns-bold text-gray-900 dark:text-white truncate">{displayName}</p>
              {discordUser && (
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">@{discordUser}</p>
              )}
              <p className="text-[10px] text-gray-300 dark:text-zinc-600 mt-0.5">Discord 계정</p>
            </div>
          </div>
        </Section>

        {/* 공격대 설정 */}
        <Section title="공격대">
          {/* 닉네임 */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-zinc-200">공격대 닉네임</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">다른 멤버에게 표시되는 이름</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nickname}
                onChange={e => { setNickname(e.target.value); setNickSaved(false) }}
                onKeyDown={e => e.key === 'Enter' && saveNickname()}
                maxLength={12}
                placeholder={displayName}
                className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-[var(--accent-400)] transition-colors"
              />
              <button
                type="button"
                onClick={saveNickname}
                disabled={nickSaving}
                className="px-4 py-2 rounded-xl text-xs ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all disabled:opacity-50 flex-shrink-0 flex items-center gap-1.5"
              >
                {nickSaved ? <><IconCheck />저장됨</> : nickSaving ? '저장 중' : '저장'}
              </button>
            </div>
            {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
          </div>

          {/* 공격대원에게 레이드 현황 공개 */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={raidPublic ? 'text-[var(--accent-500)]' : 'text-gray-400 dark:text-zinc-500'}>
                  {raidPublic ? <IconEye /> : <IconEyeOff />}
                </span>
                <div>
                  <p className="text-sm ns-bold text-gray-800 dark:text-zinc-200">공격대원에게 레이드 현황 공개</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {raidPublic ? '공격대 멤버에게 레이드 현황이 공개됩니다' : '공격대 멤버에게 레이드 현황이 숨겨집니다'}
                  </p>
                </div>
              </div>
              <Toggle checked={raidPublic} onChange={saveRaidPublic} disabled={raidSaving} />
            </div>
          </div>

          {/* 친구에게 레이드 현황 공개 */}
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={raidPublicFriends ? 'text-[var(--accent-500)]' : 'text-gray-400 dark:text-zinc-500'}>
                  {raidPublicFriends ? <IconEye /> : <IconEyeOff />}
                </span>
                <div>
                  <p className="text-sm ns-bold text-gray-800 dark:text-zinc-200">친구에게 레이드 현황 공개</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {raidPublicFriends ? '즐겨찾기한 친구에게 레이드 현황이 공개됩니다' : '친구에게 레이드 현황이 숨겨집니다'}
                  </p>
                </div>
              </div>
              <Toggle checked={raidPublicFriends} onChange={saveRaidPublicFriends} disabled={raidFriendsSaving} />
            </div>
          </div>
        </Section>

        {/* 계정 */}
        <Section title="계정">
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/dashboard' })}
              className="flex items-center gap-2 text-sm text-red-400 hover:text-red-500 dark:text-red-400 dark:hover:text-red-300 transition-colors py-1"
            >
              <IconLogout />
              로그아웃
            </button>
          </div>
        </Section>

      </div>
    </div>
  )
}

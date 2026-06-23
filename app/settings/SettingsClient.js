'use client'

import Image from 'next/image'
import { signOut, useSession } from 'next-auth/react'
import { useState, useCallback, useRef, useEffect } from 'react'
import { IconEye, IconEyeOff, IconCheck, IconLogout, IconSpinner } from '@/app/dashboard/_icons'
import dynamic from 'next/dynamic'

const FeedbackModal = dynamic(() => import('@/components/FeedbackModal'), { ssr: false })

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

const NICKNAME_ALLOWED = /^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]*$/
const NICKNAME_STRIP   = /[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/g

export default function SettingsClient({ user, session }) {
  const { update: updateSession } = useSession()
  const [nickname, setNickname] = useState(user?.nickname || '')
  const [avatarSrc, setAvatarSrc] = useState(session?.user?.image || null)
  const avatarRefreshedRef = useRef(false)
  const [feedbackOpen, setFeedbackOpen] = useState(false)

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
    setError('')
    if (nickname && !NICKNAME_ALLOWED.test(nickname)) {
      setError('한글, 영어, 숫자만 사용 가능합니다.')
      return
    }
    setNickSaving(true)
    setNickSaved(false)
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname }),
      })
      if (res.ok) {
        setNickSaved(true)
        setTimeout(() => setNickSaved(false), 2000)
        await updateSession()
      } else {
        const json = await res.json().catch(() => ({}))
        setError(json.error || '저장에 실패했습니다.')
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
    <div className="min-h-screen">
      <div className="mx-auto max-w-lg px-4 py-10 space-y-4">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-xl ns-bold text-gray-900 dark:text-white">설정</h1>
        </div>

        {/* 프로필 */}
        <Section>
          <div className="px-5 py-4 flex items-center gap-4">
            {avatarSrc ? (
              <Image
                src={avatarSrc}
                alt=""
                width={52}
                height={52}
                className="h-13 w-13 rounded-full object-cover ring-2 ring-black/10 dark:ring-white/10 flex-shrink-0"
                onError={handleAvatarError}
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

        {/* 길드 설정 */}
        <Section>
          {/* 닉네임 */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-zinc-200">원정대 이름</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">다른 멤버에게 표시되는 이름</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                ref={inputRef}
                type="text"
                value={nickname}
                onChange={e => {
                  const filtered = e.target.value.replace(NICKNAME_STRIP, '')
                  setNickname(filtered)
                  setNickSaved(false)
                  setError('')
                }}
                onKeyDown={e => e.key === 'Enter' && saveNickname()}
                maxLength={12}
                placeholder={displayName}
                className="flex-1 min-w-0 text-sm px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#2a2a2a] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-[var(--accent-400)] transition-colors"
              />
              <button
                type="button"
                onClick={saveNickname}
                disabled={nickSaving}
                className="w-[5.5rem] h-10 rounded-xl text-xs ns-bold flex-shrink-0 relative overflow-hidden transition-all duration-200 disabled:pointer-events-none"
                style={{
                  background: nickSaved
                    ? 'var(--accent-100)'
                    : 'var(--accent-400)',
                }}
                aria-busy={nickSaving}
              >
                <span
                  className="absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-150"
                  style={{ opacity: nickSaved ? 1 : 0 }}
                  aria-hidden={!nickSaved}
                >
                  <span className="text-[var(--accent-600)]"><IconCheck size={13} strokeWidth={2.5} /></span>
                  <span className="text-[var(--accent-700)]">저장됨</span>
                </span>
                <span
                  className="absolute inset-0 flex items-center justify-center gap-1.5 transition-opacity duration-150"
                  style={{ opacity: nickSaved ? 0 : 1 }}
                  aria-hidden={nickSaved}
                >
                  {nickSaving
                    ? <span className="text-gray-900 dark:text-gray-900"><IconSpinner /></span>
                    : <span className="text-gray-900">저장</span>}
                </span>
              </button>
            </div>
            <div className="flex items-center justify-between mt-1.5">
              {error
                ? <p className="text-xs text-red-400">{error}</p>
                : <p className="text-xs text-gray-300 dark:text-zinc-600">한글, 영어, 숫자만 사용 가능</p>
              }
              <p className="text-xs text-gray-300 dark:text-zinc-600 ml-auto">{nickname.length}/12</p>
            </div>
          </div>

          {/* 길드원에게 레이드 현황 공개 */}
          <div className="px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className={raidPublic ? 'text-[var(--accent-500)]' : 'text-gray-400 dark:text-zinc-500'}>
                  {raidPublic ? <IconEye /> : <IconEyeOff />}
                </span>
                <div>
                  <p className="text-sm ns-bold text-gray-800 dark:text-zinc-200">길드원에게 레이드 현황 공개</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                    {raidPublic ? '길드원에게 레이드 현황이 공개됩니다' : '속해있는 모든 길드에서 레이드 현황이 공개되지 않습니다'}
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
                    {raidPublicFriends ? '친구에게 레이드 현황이 공개됩니다' : '친구에게 레이드 현황이 공개되지 않습니다'}
                  </p>
                </div>
              </div>
              <Toggle checked={raidPublicFriends} onChange={saveRaidPublicFriends} disabled={raidFriendsSaving} />
            </div>
          </div>
        </Section>

        {/* 문의 */}
        <Section title="지원">
          <div className="px-5 py-3">
            <button
              type="button"
              onClick={() => setFeedbackOpen(true)}
              className="flex items-center gap-2 text-sm text-gray-600 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-zinc-200 transition-colors py-1"
            >
              <span className="text-base">💬</span>
              문의하기 / 건의사항
            </button>
            <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1 ml-7">버그 신고, 기능 건의를 보내주세요</p>
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

      {feedbackOpen && <FeedbackModal onClose={() => setFeedbackOpen(false)} />}
    </div>
  )
}

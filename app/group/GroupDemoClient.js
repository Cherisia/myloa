'use client'

import { useMemo, useState } from 'react'
import { signIn } from 'next-auth/react'

const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconGlobe = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" />
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
  </svg>
)
const IconLock = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
  </svg>
)
const IconChevron = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconSearch = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

function DemoLoginModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div
        className="w-full max-w-xs rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-6 py-6 text-center space-y-3">
          <p className="ns-bold text-gray-900 dark:text-white text-base">로그인이 필요해요</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
            그룹 만들기·참가는 디스코드 로그인 후 이용할 수 있어요.
            <br />
            지금 보시는 목록은 UI 미리보기입니다.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <button
              type="button"
              onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
              className="w-full rounded-lg py-2.5 text-sm ns-bold text-white transition-colors"
              style={{ backgroundColor: '#5865F2' }}
            >
              디스코드 로그인
            </button>
            <button type="button" onClick={onClose} className="w-full rounded-lg py-2.5 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function MyGroupCard({ group, onNeedLogin }) {
  return (
    <button
      type="button"
      onClick={onNeedLogin}
      className="w-full text-left rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3 hover:border-yellow-400/60 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ns-bold text-sm text-gray-900 dark:text-white truncate">{group.name}</span>
            {group.pendingCount > 0 && (
              <span className="text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 px-1.5 py-0.5 rounded-full">
                신청 {group.pendingCount}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <IconUsers /> {group.memberCount}/{group.maxMembers}명<span className="mx-1">·</span>
            {group.isPublic ? (
              <>
                <IconGlobe /> 공개
              </>
            ) : (
              <>
                <IconLock /> 비공개
              </>
            )}
          </p>
        </div>
        <IconChevron />
      </div>
    </button>
  )
}

function PublicGroupCard({ group, onNeedLogin }) {
  return (
    <div className="rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3 flex flex-col gap-2">
      <div className="min-w-0">
        <span className="ns-bold text-sm text-gray-900 dark:text-white">{group.name}</span>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{group.description}</p>
        <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
          <IconUsers /> {group.memberCount}/{group.maxMembers} · 리더 {group.leader?.name}
        </p>
      </div>
      <button
        type="button"
        onClick={onNeedLogin}
        className="w-full rounded-lg py-2 text-xs ns-bold bg-yellow-400 hover:bg-yellow-300 text-gray-900 transition-colors"
      >
        참가 신청 (미리보기)
      </button>
    </div>
  )
}

export default function GroupDemoClient({ myGroups, publicGroups }) {
  const [searchQ, setSearchQ] = useState('')
  const [sort, setSort] = useState('members')
  const [showLoginModal, setShowLoginModal] = useState(false)

  const filteredPublic = useMemo(() => {
    return publicGroups
      .filter(
        g =>
          !searchQ ||
          g.name.toLowerCase().includes(searchQ.toLowerCase()) ||
          g.description?.toLowerCase().includes(searchQ.toLowerCase()),
      )
      .sort((a, b) =>
        sort === 'members'
          ? b.memberCount - a.memberCount
          : sort === 'newest'
            ? new Date(b.createdAt) - new Date(a.createdAt)
            : a.name.localeCompare(b.name, 'ko'),
      )
  }, [publicGroups, searchQ, sort])

  return (
    <div className="mx-auto max-w-[1600px] px-5 py-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-lg ns-extrabold text-gray-900 dark:text-white">그룹</h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">미리보기 — 실제 그룹 기능은 로그인 후 이용할 수 있어요.</p>
        </div>

        <div className="rounded-xl border border-yellow-200 dark:border-yellow-900/30 bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/10 dark:to-amber-900/5 px-4 py-3">
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0 leading-none mt-0.5">🎮</span>
            <div className="min-w-0">
              <p className="text-xs ns-bold text-yellow-800 dark:text-yellow-300">샘플 데이터</p>
              <p className="text-[11px] text-yellow-700/80 dark:text-yellow-400/70 mt-0.5 leading-relaxed">
                아래 목록은 UI 예시입니다. 버튼을 누르면 로그인 안내가 떠요.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">내 그룹 (예시)</p>
          <div className="grid sm:grid-cols-1 gap-2">
            {myGroups.map(g => (
              <MyGroupCard key={g.id} group={g} onNeedLogin={() => setShowLoginModal(true)} />
            ))}
          </div>
        </div>

        <div className="border-t border-gray-100 dark:border-[#383838] pt-6 space-y-3">
          <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">공개 그룹 탐색 (예시)</p>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <IconSearch />
              </span>
              <input
                value={searchQ}
                onChange={e => setSearchQ(e.target.value)}
                placeholder="그룹 이름 검색"
                className="w-full pl-8 pr-3 py-2 rounded border border-gray-200 dark:border-[#383838] text-sm bg-white dark:bg-[#222222] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
            <div className="flex rounded border border-gray-200 dark:border-[#383838] overflow-hidden">
              {[
                ['인원순', 'members'],
                ['최신순', 'newest'],
                ['이름순', 'name'],
              ].map(([label, val]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setSort(val)}
                  className={`px-2.5 py-2 text-xs ns-bold transition-colors ${
                    sort === val
                      ? 'bg-yellow-400 text-gray-900'
                      : 'bg-white dark:bg-[#222222] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-2">
            {filteredPublic.map(g => (
              <PublicGroupCard key={g.id} group={g} onNeedLogin={() => setShowLoginModal(true)} />
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 pt-2">
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="rounded-lg border border-gray-200 dark:border-[#383838] px-4 py-2 text-xs ns-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            그룹 만들기
          </button>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="rounded-lg border border-gray-200 dark:border-[#383838] px-4 py-2 text-xs ns-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
          >
            초대 코드로 들어가기
          </button>
        </div>
      </div>

      {showLoginModal && <DemoLoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}

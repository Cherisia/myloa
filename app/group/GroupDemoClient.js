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
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)
const IconSearch = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)

function DemoLoginModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm">
      <div
        className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>
        <div className="px-6 pt-5 pb-6 text-center space-y-5">
          <div className="space-y-1.5">
            <p className="text-lg ns-extrabold text-gray-900 dark:text-white">로그인이 필요해요</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
              공격대 만들기·참가는 디스코드 로그인 후<br />이용할 수 있어요
            </p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button
              type="button"
              onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
              className="w-full rounded-2xl py-3.5 text-sm ns-bold text-white transition-all hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: '#5865F2' }}
            >
              디스코드로 로그인
            </button>
            <button type="button" onClick={onClose}
              className="w-full rounded-2xl py-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
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
      className="w-full text-left rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md active:shadow-sm hover:-translate-y-0.5 active:translate-y-0 px-5 py-4 transition-all duration-150"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ns-bold text-[15px] text-gray-900 dark:text-white truncate">{group.name}</span>
            {group.pendingCount > 0 && (
              <span className="text-[10px] ns-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">
                신청 {group.pendingCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
            <span className="flex items-center gap-1">
              <IconUsers />
              <span className="ns-bold text-gray-600 dark:text-gray-400">{group.memberCount}명</span>
            </span>
            <span>·</span>
            <span className="flex items-center gap-1">
              {group.isPublic ? <><IconGlobe /> 공개</> : <><IconLock /> 비공개</>}
            </span>
          </div>
        </div>
        <span className="text-gray-300 dark:text-gray-600 flex-shrink-0"><IconChevron /></span>
      </div>
    </button>
  )
}

function PublicGroupCard({ group, onNeedLogin }) {
  return (
    <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm p-5 flex flex-col gap-3">
      <div className="min-w-0 space-y-1">
        <span className="ns-bold text-[15px] text-gray-900 dark:text-white block">{group.name}</span>
        {group.description && (
          <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">{group.description}</p>
        )}
        <p className="text-[11px] text-gray-400 flex items-center gap-1 pt-0.5">
          <IconUsers />
          <span className="ns-bold">{group.memberCount}명</span>
          · 리더 {group.leader?.name}
        </p>
      </div>
      <button
        type="button"
        onClick={onNeedLogin}
        className="w-full rounded-xl py-2.5 text-xs ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all"
      >
        참가 신청하기
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
    <div className="mx-auto max-w-2xl px-4 py-8 space-y-8">
      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-2.5 mb-1">
          <h1 className="text-2xl ns-extrabold text-gray-900 dark:text-white">공격대</h1>
          <span className="text-[10px] ns-bold px-2.5 py-1 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-400)]">미리보기</span>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">로그인하면 실제 공격대 기능을 이용할 수 있어요</p>
      </div>

      {/* 내 공격대 섹션 */}
      <div className="space-y-3">
        <p className="text-[11px] ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">내 공격대 예시</p>
        <div className="space-y-2.5">
          {myGroups.map(g => (
            <MyGroupCard key={g.id} group={g} onNeedLogin={() => setShowLoginModal(true)} />
          ))}
        </div>
      </div>

      {/* 공개 그룹 탐색 섹션 */}
      <div className="space-y-4">
        <p className="text-[11px] ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">공개 공격대 탐색</p>

        {/* 검색 + 정렬 */}
        <div className="space-y-2">
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
              <IconSearch />
            </span>
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="공격대 이름으로 검색"
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm text-sm dark:text-white outline-none focus:shadow-md transition-all"
            />
          </div>
          <div className="flex gap-2">
            {[
              ['인원순', 'members'],
              ['최신순', 'newest'],
              ['이름순', 'name'],
            ].map(([label, val]) => (
              <button
                key={val}
                type="button"
                onClick={() => setSort(val)}
                className={`px-4 py-2 rounded-xl text-xs ns-bold transition-all ${
                  sort === val
                    ? 'bg-[var(--accent-400)] text-gray-900 shadow-sm'
                    : 'bg-white dark:bg-[#1e1e1e] text-gray-500 dark:text-gray-400 shadow-sm hover:shadow-md'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {filteredPublic.map(g => (
            <PublicGroupCard key={g.id} group={g} onNeedLogin={() => setShowLoginModal(true)} />
          ))}
        </div>
      </div>

      {/* 하단 CTA 카드 */}
      <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-sm px-6 py-8 text-center space-y-4">
        <div className="space-y-1">
          <p className="text-base ns-extrabold text-gray-900 dark:text-white">지금 바로 시작해보세요</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">디스코드로 로그인하면 공격대를 만들거나 참가할 수 있어요</p>
        </div>
        <div className="flex flex-col gap-2.5 max-w-[220px] mx-auto">
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="rounded-2xl py-3 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all"
          >공격대 만들기</button>
          <button
            type="button"
            onClick={() => setShowLoginModal(true)}
            className="rounded-2xl py-3 text-sm ns-bold border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
          >초대 코드로 참가</button>
        </div>
      </div>

      {showLoginModal && <DemoLoginModal onClose={() => setShowLoginModal(false)} />}
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconKey = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="7.5" cy="15.5" r="5.5" /><path d="M21 2L13 10M21 2v6M21 2h-6" />
  </svg>
)
const IconUsers = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconChevron = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
)

function CreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function submit() {
    if (!name.trim()) { setError('길드 이름을 입력하세요'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/expedition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '오류가 발생했습니다'); return }
      onCreated(data)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:border sm:border-gray-200/50 dark:sm:border-[#2d2d2d]" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>
        <div className="px-6 pt-5 pb-6 space-y-5">
          <div>
            <h2 className="text-lg ns-extrabold text-gray-900 dark:text-white">길드 만들기</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">팀원들과 레이드 현황을 공유해요</p>
          </div>
          <div>
            <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 block mb-1.5">길드 이름</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="레이드 같이 갈 사람!!"
              maxLength={30}
              autoFocus
              className="w-full px-4 py-3 rounded-2xl bg-gray-50 dark:bg-[#252525] border border-transparent focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1a1a1a] text-sm dark:text-white outline-none transition-all"
              onKeyDown={e => e.key === 'Enter' && submit()}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <button type="button" onClick={onClose}
              className="rounded-2xl py-3.5 text-sm ns-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
            >취소</button>
            <button type="button" onClick={submit} disabled={loading}
              className="rounded-2xl py-3.5 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all disabled:opacity-60"
            >
              {loading ? '생성 중...' : '만들기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function JoinModal({ onClose }) {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function submit() {
    if (!code.trim()) { setError('초대 코드를 입력하세요'); return }
    setLoading(true); setError('')
    try {
      const res = await fetch('/api/expedition/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '오류가 발생했습니다'); return }
      setSuccess(data.autoAccepted
        ? `"${data.expeditionName}"에 바로 가입됐어요!`
        : `"${data.expeditionName}"에 참가 신청했습니다.\n길드장 수락 후 입장할 수 있어요.`
      )
      setTimeout(() => { onClose(); router.refresh() }, 2500)
    } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:border sm:border-gray-200/50 dark:sm:border-[#2d2d2d]" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>
        <div className="px-6 pt-5 pb-6 space-y-5">
          <div>
            <h2 className="text-lg ns-extrabold text-gray-900 dark:text-white">초대 코드로 참가</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">길드장에게 받은 8자리 코드를 입력하세요</p>
          </div>
          {success ? (
            <div className="py-5 text-center space-y-2">
              <p className="text-3xl">🎉</p>
              <p className="text-sm ns-bold text-gray-900 dark:text-white whitespace-pre-line leading-relaxed">{success}</p>
            </div>
          ) : (
            <>
              <div>
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder="XXXXXXXX"
                  maxLength={8}
                  autoFocus
                  className="w-full px-4 py-4 rounded-2xl bg-gray-50 dark:bg-[#252525] border border-transparent focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1a1a1a] text-xl ns-extrabold tracking-[0.5em] text-center dark:text-white outline-none transition-all"
                  onKeyDown={e => e.key === 'Enter' && submit()}
                />
                {error && <p className="text-xs text-red-500 mt-2 text-center">{error}</p>}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <button type="button" onClick={onClose}
                  className="rounded-2xl py-3.5 text-sm ns-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-[#252525] hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
                >취소</button>
                <button type="button" onClick={submit} disabled={loading}
                  className="rounded-2xl py-3.5 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all disabled:opacity-60"
                >
                  {loading ? '확인 중...' : '신청하기'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default function GuildClient({ initialGroups }) {
  const router = useRouter()
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)

  useEffect(() => {
    document.body.style.overflow = (showCreate || showJoin) ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [showCreate, showJoin])

  function handleCreated(newGroup) {
    setShowCreate(false)
    router.push(`/guild/${newGroup.id}`)
  }

  return (
    <div className="mx-auto max-w-lg px-4 py-8 space-y-6">
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl ns-extrabold text-gray-900 dark:text-white">길드</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">팀원과 레이드 현황을 함께 확인해요</p>
        </div>
        <div className="flex gap-2 flex-shrink-0 pt-1">
          <button
            type="button"
            onClick={() => setShowJoin(true)}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#2a2a2a] px-3.5 py-2 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
          >
            <IconKey /> 코드 입력
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] px-3.5 py-2 text-xs ns-bold text-gray-900 transition-all"
          >
            <IconPlus /> 만들기
          </button>
        </div>
      </div>

      {/* 길드 목록 */}
      {initialGroups.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#2a2a2a] shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-6 py-16 text-center space-y-4">
          <p className="text-4xl">🏰</p>
          <div className="space-y-1">
            <p className="text-sm ns-extrabold text-gray-900 dark:text-white">아직 참여 중인 길드가 없어요</p>
            <p className="text-xs text-gray-400 dark:text-gray-500">길드를 만들거나 초대 코드로 참가해보세요</p>
          </div>
          <div className="flex flex-col gap-2.5 pt-2 max-w-[200px] mx-auto">
            <button type="button" onClick={() => setShowCreate(true)}
              className="rounded-2xl py-3 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all"
            >길드 만들기</button>
            <button type="button" onClick={() => setShowJoin(true)}
              className="rounded-2xl py-3 text-sm ns-bold border border-gray-200 dark:border-[#2a2a2a] text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
            >코드로 참가</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2.5">
          {initialGroups.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => router.push(`/guild/${g.id}`)}
              className="w-full text-left rounded-2xl bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#2a2a2a] shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.58)] hover:-translate-y-0.5 active:translate-y-0 px-5 py-4 transition-all duration-150"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="ns-bold text-[15px] text-gray-900 dark:text-white">{g.name}</span>
                    {g.myRole === 'leader' && (
                      <span className="text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-2 py-0.5 rounded-full">길드장</span>
                    )}
                    {g.myRole === 'officer' && (
                      <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부길드장</span>
                    )}
                    {g.pendingCount > 0 && (
                      <span className="text-[10px] ns-bold bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded-full">신청 {g.pendingCount}</span>
                    )}
                  </div>
                  {g.description && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 truncate">{g.description}</p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500">
                    <IconUsers />
                    <span className="ns-bold text-gray-600 dark:text-gray-400">{g.memberCount}명</span>
                  </div>
                </div>
                <span className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                  <IconChevron />
                </span>
              </div>
            </button>
          ))}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin   && <JoinModal   onClose={() => setShowJoin(false)} />}
    </div>
  )
}

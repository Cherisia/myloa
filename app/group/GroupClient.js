'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useTheme } from '@/components/ThemeProvider'

const ROLE_BADGE = {
  leader:  { label: '그룹장',   cls: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' },
  officer: { label: '부그룹장', cls: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  member:  { label: '멤버',     cls: 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400' },
}

function CreateModal({ onClose, onCreated }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/expedition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '오류가 발생했습니다'); return }
      onCreated(data)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">새 그룹 만들기</h3>
        <div>
          <input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="그룹 이름"
            maxLength={40}
            className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500"
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200">취소</button>
          <button type="submit" disabled={loading || !name.trim()} className="px-4 py-2 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold disabled:opacity-40">
            {loading ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </form>
    </div>
  )
}

function JoinModal({ onClose, onJoined }) {
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!code.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/expedition/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || '오류가 발생했습니다'); return }
      onJoined(data.expeditionName)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <form
        className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4"
        onClick={e => e.stopPropagation()}
        onSubmit={handleSubmit}
      >
        <h3 className="text-sm font-bold text-gray-900 dark:text-white">초대 코드로 가입</h3>
        <p className="text-xs text-gray-400 dark:text-zinc-500">그룹장에게 초대 코드를 받아 입력하세요.</p>
        <div>
          <input
            autoFocus
            value={code}
            onChange={e => setCode(e.target.value.toUpperCase())}
            placeholder="초대 코드 8자리"
            maxLength={8}
            className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-400 dark:focus:border-zinc-500 font-mono tracking-widest text-center uppercase"
          />
          {error && <p className="mt-1.5 text-xs text-red-500">{error}</p>}
        </div>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-4 py-2 text-xs text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-200">취소</button>
          <button type="submit" disabled={loading || code.length < 4} className="px-4 py-2 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold disabled:opacity-40">
            {loading ? '신청 중…' : '가입 신청'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default function GroupClient({ groups: initialGroups, isLoggedIn }) {
  const router = useRouter()
  const [groups, setGroups] = useState(initialGroups)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [toast, setToast] = useState('')

  function showMsg(msg) {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  function handleCreated(expedition) {
    setShowCreate(false)
    router.push(`/group/${expedition.id}`)
  }

  function handleJoined(expeditionName) {
    setShowJoin(false)
    showMsg(`「${expeditionName}」 가입 신청이 완료됐어요. 그룹장 수락을 기다려주세요.`)
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">그룹</h1>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">멤버들의 주간 레이드 현황을 함께 관리해요</p>
        </div>
        {isLoggedIn && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowJoin(true)}
              className="px-3 py-1.5 text-xs border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              코드 입력
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="px-3 py-1.5 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold hover:bg-gray-700 dark:hover:bg-white transition-colors"
            >
              + 그룹 만들기
            </button>
          </div>
        )}
      </div>

      {/* 비로그인 배너 */}
      {!isLoggedIn && (
        <div className="mb-6 p-4 rounded-2xl border border-dashed border-gray-200 dark:border-white/10 text-center">
          <p className="text-sm text-gray-500 dark:text-zinc-400 mb-3">로그인하면 그룹을 만들거나 초대 코드로 가입할 수 있어요</p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => signIn('discord', { callbackUrl: '/group' })}
              className="px-4 py-2 text-xs bg-[#5865F2] text-white rounded-xl font-semibold"
            >
              디스코드 로그인
            </button>
            <Link
              href="/group/demo"
              className="px-4 py-2 text-xs border border-gray-200 dark:border-white/10 text-gray-600 dark:text-zinc-300 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              데모 미리보기
            </Link>
          </div>
        </div>
      )}

      {/* 그룹 목록 */}
      {isLoggedIn && groups.length === 0 ? (
        <div className="text-center py-16 text-gray-400 dark:text-zinc-500">
          <p className="text-sm mb-1">아직 가입한 그룹이 없어요</p>
          <p className="text-xs">그룹을 만들거나 초대 코드로 가입해보세요</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {groups.map(g => {
            const rb = ROLE_BADGE[g.myRole] || ROLE_BADGE.member
            return (
              <Link
                key={g.id}
                href={`/group/${g.id}`}
                className="block p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-2xl hover:shadow-md dark:hover:border-white/10 transition-all"
              >
                <div className="flex items-start justify-between mb-2">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">{g.name}</h2>
                  <span className={`ml-2 flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ${rb.cls}`}>{rb.label}</span>
                </div>
                {g.description && (
                  <p className="text-xs text-gray-400 dark:text-zinc-500 mb-2 line-clamp-2">{g.description}</p>
                )}
                <div className="flex items-center justify-between text-xs text-gray-400 dark:text-zinc-500">
                  <span>그룹장: {g.leader?.discordUsername || g.leader?.name}</span>
                  <span>{g.memberCount}/{g.maxMembers}명</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-xl shadow-lg max-w-sm text-center">
          {toast}
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreated={handleCreated} />}
      {showJoin   && <JoinModal   onClose={() => setShowJoin(false)}   onJoined={handleJoined} />}
    </div>
  )
}

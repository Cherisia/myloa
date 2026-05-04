'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// ── 아이콘 ─────────────────────────────────────────────────────────────────────
const IconPlus     = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
const IconSearch   = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
const IconShield   = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconLock     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const IconGlobe    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
const IconUsers    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconChevron  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>

// ── 그룹 만들기 모달 ───────────────────────────────────────────────────────────
function CreateModal({ onClose, onCreate }) {
  const [name,       setName]       = useState('')
  const [desc,       setDesc]       = useState('')
  const [isPublic,   setIsPublic]   = useState(true)
  const [maxMembers, setMaxMembers] = useState(30)
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState(null)

  const handleCreate = async () => {
    if (!name.trim()) { setError('그룹 이름을 입력하세요'); return }
    setLoading(true); setError(null)
    try {
      const res = await fetch('/api/groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), description: desc.trim() || null, isPublic, maxMembers }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onCreate(data)
      onClose()
    } catch { setError('오류가 발생했습니다') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">그룹 만들기</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded px-3 py-2">{error}</p>}
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">그룹 이름 <span className="text-red-400">*</span></label>
            <input
              value={name} onChange={e => setName(e.target.value)} maxLength={30}
              placeholder="예: 카제로스 주민들"
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
            />
          </div>
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">그룹 소개</label>
            <textarea
              value={desc} onChange={e => setDesc(e.target.value)} maxLength={100} rows={2}
              placeholder="그룹을 간단히 소개해주세요"
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors resize-none"
            />
          </div>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">최대 인원</label>
              <select
                value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))}
                className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              >
                {[8, 10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n}명</option>)}
              </select>
            </div>
            <div className="flex-1">
              <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">공개 설정</label>
              <div className="flex rounded border border-gray-200 dark:border-[#383838] overflow-hidden">
                {[['공개', true], ['비공개', false]].map(([label, val]) => (
                  <button key={label} onClick={() => setIsPublic(val)}
                    className={`flex-1 py-2 text-xs ns-bold transition-colors ${isPublic === val ? 'bg-yellow-400 text-gray-900' : 'bg-white dark:bg-[#181818] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#383838]">
          <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">취소</button>
          <button onClick={handleCreate} disabled={loading}
            className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 disabled:opacity-60 transition-colors">
            {loading ? '만드는 중…' : '만들기'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 초대 코드 참가 모달 ────────────────────────────────────────────────────────
function JoinCodeModal({ onClose, onJoined }) {
  const [code,    setCode]    = useState('')
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)
  const router = useRouter()

  const handleJoin = async () => {
    if (code.length < 6) { setError('코드를 입력하세요'); return }
    setLoading(true); setError(null)
    // 모든 그룹에서 코드 매칭 — 서버에서 처리
    try {
      const res = await fetch('/api/groups/join-by-code', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inviteCode: code.trim().toUpperCase() }),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error); return }
      onClose()
      router.push(`/group/${data.groupId}`)
    } catch { setError('오류가 발생했습니다') } finally { setLoading(false) }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-xs rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">초대 코드로 참가</span>
          <button onClick={onClose} className="text-gray-400 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          {error && <p className="text-xs text-red-500 bg-red-50 dark:bg-red-900/10 rounded px-3 py-2">{error}</p>}
          <input
            value={code} onChange={e => setCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            maxLength={8} placeholder="초대 코드 입력"
            className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-3 text-lg ns-extrabold text-center tracking-widest bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
          />
          <p className="text-xs text-center text-gray-400">그룹장에게 초대 코드를 받아 입력하세요</p>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#383838]">
          <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">취소</button>
          <button onClick={handleJoin} disabled={loading}
            className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 disabled:opacity-60 transition-colors">
            {loading ? '참가 중…' : '참가'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 공개 그룹 카드 ─────────────────────────────────────────────────────────────
function PublicGroupCard({ group, onApply }) {
  const [applied, setApplied] = useState(group.hasPending)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleApply = async (e) => {
    e.stopPropagation()
    if (applied || loading) return
    setLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      })
      if (res.ok) { setApplied(true); onApply?.(group.id) }
    } finally { setLoading(false) }
  }

  return (
    <div
      onClick={() => router.push(`/group/${group.id}`)}
      className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] p-4 cursor-pointer hover:border-yellow-400/60 dark:hover:border-yellow-600/40 transition-colors"
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-xl flex-shrink-0">🏰</div>
          <div className="min-w-0">
            <p className="ns-bold text-sm text-gray-800 dark:text-gray-100 truncate">{group.name}</p>
            <div className="flex items-center gap-1.5 mt-0.5 text-[10px] text-gray-400">
              <span className="flex items-center gap-0.5">
                {group.isPublic ? <IconGlobe /> : <IconLock />}
                {group.isPublic ? '공개' : '비공개'}
              </span>
              <span>·</span>
              <span className="flex items-center gap-0.5"><IconUsers /> {group.memberCount}/{group.maxMembers}명</span>
              <span>·</span>
              <span>{group.leader?.name || '—'}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleApply}
          disabled={applied || loading || group.memberCount >= group.maxMembers}
          className={`flex-shrink-0 text-xs ns-bold px-3 py-1.5 rounded transition-colors ${
            applied
              ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 cursor-default'
              : group.memberCount >= group.maxMembers
                ? 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 cursor-default'
                : 'bg-yellow-400 hover:bg-yellow-300 text-gray-900'
          }`}
        >
          {loading ? '…' : applied ? '신청 중' : group.memberCount >= group.maxMembers ? '인원 마감' : '참가 신청'}
        </button>
      </div>
      {group.description && (
        <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 mt-1">{group.description}</p>
      )}
    </div>
  )
}

// ── 내 그룹 카드 ───────────────────────────────────────────────────────────────
function MyGroupCard({ group }) {
  const router = useRouter()
  return (
    <div
      onClick={() => router.push(`/group/${group.id}`)}
      className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] p-4 cursor-pointer hover:border-yellow-400/60 dark:hover:border-yellow-600/40 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-2xl flex-shrink-0">🏰</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="ns-bold text-gray-800 dark:text-gray-100">{group.name}</span>
            {group.myRole === 'leader' && (
              <span className="inline-flex items-center gap-0.5 text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                <IconShield /> 그룹장
              </span>
            )}
            {group.myRole === 'officer' && (
              <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">부그룹장</span>
            )}
            {group.pendingCount > 0 && (
              <span className="text-[10px] ns-bold bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 px-1.5 py-0.5 rounded-full">
                신청 {group.pendingCount}
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
            <IconUsers /> {group.memberCount}/{group.maxMembers}명
            <span className="mx-1">·</span>
            {group.isPublic ? <><IconGlobe /> 공개</> : <><IconLock /> 비공개</>}
          </p>
        </div>
        <IconChevron />
      </div>
    </div>
  )
}

// ── 메인 ───────────────────────────────────────────────────────────────────────
export default function GroupClient({ initialMyGroups, initialPublicGroups, userId, userName }) {
  const [myGroups,      setMyGroups]      = useState(initialMyGroups)
  const [publicGroups,  setPublicGroups]  = useState(initialPublicGroups)
  const [showCreate,    setShowCreate]    = useState(false)
  const [showJoinCode,  setShowJoinCode]  = useState(false)
  const [browseMode,    setBrowseMode]    = useState(myGroups.length === 0) // 그룹 없으면 탐색 모드
  const [searchQ,       setSearchQ]       = useState('')
  const [sort,          setSort]          = useState('members')

  const filteredPublic = publicGroups
    .filter(g => !searchQ || g.name.toLowerCase().includes(searchQ.toLowerCase()) || g.description?.toLowerCase().includes(searchQ.toLowerCase()))
    .sort((a, b) =>
      sort === 'members' ? b.memberCount - a.memberCount :
      sort === 'newest'  ? new Date(b.createdAt) - new Date(a.createdAt) :
      a.name.localeCompare(b.name, 'ko')
    )

  const handleCreated = (group) => {
    setMyGroups(prev => [group, ...prev])
    setBrowseMode(false)
  }

  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <p className="text-gray-400 dark:text-gray-500 text-sm mb-1">로그인이 필요한 기능입니다</p>
        <p className="text-xs text-gray-300 dark:text-gray-600">로그인 후 그룹에 참가하거나 만들 수 있습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">그룹</h1>
          <p className="text-xs text-gray-400 mt-0.5">
            {myGroups.length > 0 ? `${myGroups.length}개 그룹 참여 중` : '아직 참여한 그룹이 없습니다'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowJoinCode(true)}
            className="rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            코드로 참가
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 text-xs ns-bold text-gray-900 transition-colors">
            <IconPlus /> 그룹 만들기
          </button>
        </div>
      </div>

      {/* 내 그룹 섹션 */}
      {myGroups.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">내 그룹</p>
            <button
              onClick={() => setBrowseMode(v => !v)}
              className="text-xs text-yellow-500 dark:text-yellow-400 hover:underline">
              {browseMode ? '탐색 닫기' : '공개 그룹 탐색'}
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-2">
            {myGroups.map(g => <MyGroupCard key={g.id} group={g} />)}
          </div>
        </div>
      )}

      {/* 공개 그룹 탐색 */}
      {browseMode && (
        <div className="space-y-3">
          {myGroups.length > 0 && <div className="border-t border-gray-100 dark:border-[#383838]" />}
          <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">공개 그룹 탐색</p>

          {/* 검색 + 정렬 */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><IconSearch /></span>
              <input
                value={searchQ} onChange={e => setSearchQ(e.target.value)}
                placeholder="그룹 이름 검색"
                className="w-full pl-8 pr-3 py-2 rounded border border-gray-200 dark:border-[#383838] text-sm bg-white dark:bg-[#222222] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              />
            </div>
            <div className="flex rounded border border-gray-200 dark:border-[#383838] overflow-hidden">
              {[['인원순','members'],['최신순','newest'],['이름순','name']].map(([label, val]) => (
                <button key={val} onClick={() => setSort(val)}
                  className={`px-2.5 py-2 text-xs ns-bold transition-colors ${sort === val ? 'bg-yellow-400 text-gray-900' : 'bg-white dark:bg-[#222222] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* 그룹 목록 */}
          {filteredPublic.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] py-14 text-center">
              <p className="text-gray-400 dark:text-gray-500 text-sm">
                {searchQ ? '검색 결과가 없습니다' : '공개 그룹이 없습니다'}
              </p>
              {!searchQ && <p className="text-xs text-gray-300 dark:text-gray-600 mt-1">새 그룹을 만들어보세요!</p>}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {filteredPublic.map(g => (
                <PublicGroupCard key={g.id} group={g} onApply={() => {}} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* 모달 */}
      {showCreate   && <CreateModal  onClose={() => setShowCreate(false)}   onCreate={handleCreated} />}
      {showJoinCode && <JoinCodeModal onClose={() => setShowJoinCode(false)} onJoined={() => {}} />}
    </div>
  )
}

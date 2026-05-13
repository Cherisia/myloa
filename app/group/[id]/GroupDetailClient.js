'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { RAIDS } from '@/lib/raidData'
import { getGroupRaidList, raidStatusOf, getMemberRaidStatus } from '@/lib/groupRaidShare'
import { getClassIcon, DIFF_LABEL, DIFF_COLOR } from '@/app/dashboard/_constants'

// ── 상수 ──────────────────────────────────────────────────────────────────────

const ROLE_LABEL = { leader: '그룹장', officer: '부그룹장', member: '멤버' }
const ROLE_COLOR = {
  leader:  'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  officer: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  member:  'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400',
}

// ── 공통 모달 ─────────────────────────────────────────────────────────────────

function Modal({ onClose, children, maxW = 'max-w-md' }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 pt-14 overflow-y-auto" onClick={onClose}>
      <div className={`bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-xl w-full ${maxW} flex flex-col`} onClick={e => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ image, name, size = 7 }) {
  const sz = `w-${size} h-${size}`
  return image ? (
    <img src={image} alt="" className={`${sz} rounded-full object-cover flex-shrink-0`} />
  ) : (
    <div className={`${sz} rounded-full bg-gray-200 dark:bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-gray-500 dark:text-zinc-300 flex-shrink-0`}>
      {(name || '?')[0].toUpperCase()}
    </div>
  )
}

// ── RaidMembersModal ──────────────────────────────────────────────────────────

function RaidMembersModal({ raidId, difficulty, allMembers, favSet, onClose }) {
  const raidInfo = RAIDS.find(r => r.id === raidId)
  const [search, setSearch] = useState('')

  const memberGroups = useMemo(() => {
    const groups = []
    for (const m of allMembers) {
      if (m.visibility === 'none') continue
      const incompleteChars = []
      for (const exp of m.expeditions || []) {
        for (const c of exp.characters) {
          const entry = c.raids.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry || entry.gateClears.every(Boolean)) continue
          incompleteChars.push({ id: c.id, name: c.name, class: c.class, itemLevel: c.itemLevel })
        }
      }
      if (incompleteChars.length === 0) continue
      groups.push({
        userId: m.userId,
        name: m.discordUsername || m.name,
        image: m.image,
        isFavorite: favSet.has(m.userId),
        chars: incompleteChars,
      })
    }
    return groups.sort((a, b) => {
      if (a.isFavorite !== b.isFavorite) return a.isFavorite ? -1 : 1
      return 0
    })
  }, [allMembers, raidId, difficulty, favSet])

  const filtered = search
    ? memberGroups.filter(g => g.name.toLowerCase().includes(search.toLowerCase()))
    : memberGroups

  return (
    <Modal onClose={onClose}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div>
          <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-1.5">
            {raidInfo?.name || raidId}
            <span className={`text-[10px] px-1.5 py-0.5 rounded ${DIFF_COLOR[difficulty]}`}>{DIFF_LABEL[difficulty] || difficulty}</span>
          </h3>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
            미완료 {memberGroups.length}명
          </p>
        </div>
        <button onClick={onClose} className="text-gray-300 dark:text-zinc-600 hover:text-gray-500 text-lg leading-none">✕</button>
      </div>
      {memberGroups.length > 5 && (
        <div className="px-4 pt-3">
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="이름 검색…"
            className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-400"
          />
        </div>
      )}
      <div className="overflow-y-auto max-h-[60vh] p-4 space-y-2.5">
        {filtered.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-400 dark:text-zinc-500">
            {memberGroups.length === 0 ? '이번 주 모두 완료했어요 🎉' : '검색 결과 없음'}
          </p>
        ) : filtered.map(g => (
          <div key={g.userId} className="flex gap-3 items-start py-1">
            <div className="flex-shrink-0 mt-0.5">
              <Avatar image={g.image} name={g.name} size={7} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 mb-1">
                {g.isFavorite && <span className="text-yellow-400 text-[10px]">★</span>}
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100">{g.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 ml-auto">{g.chars.length}캐릭터</span>
              </div>
              <div className="space-y-0.5">
                {g.chars.map(c => {
                  const icon = getClassIcon(c.class)
                  return (
                    <div key={c.id} className="flex items-center gap-1.5 px-2 py-1 bg-gray-50 dark:bg-zinc-800/60 rounded-lg">
                      {icon && <img src={icon} alt="" className="w-3 h-3 opacity-50 flex-shrink-0" />}
                      <span className="text-[11px] text-gray-600 dark:text-zinc-300 truncate">{c.name}</span>
                      <span className="text-[10px] text-gray-400 dark:text-zinc-500 ml-auto flex-shrink-0">{c.itemLevel.toFixed(2)}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  )
}

// ── MemberChecklistModal ──────────────────────────────────────────────────────

function MemberChecklistModal({ member, onClose }) {
  const [activeExpIdx, setActiveExpIdx] = useState(0)
  const exp = member.expeditions[activeExpIdx] || { characters: [] }

  // 전체 완료 통계
  const stats = useMemo(() => {
    let done = 0, total = 0
    for (const e of member.expeditions) {
      for (const c of e.characters) {
        for (const r of c.raids) {
          total++
          if (r.gateClears.length > 0 && r.gateClears.every(Boolean)) done++
        }
      }
    }
    return { done, total }
  }, [member])

  return (
    <Modal onClose={onClose} maxW="max-w-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.06]">
        <div className="flex items-center gap-2.5">
          <Avatar image={member.image} name={member.name} size={8} />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-gray-900 dark:text-white">{member.name}</span>
              {member.discordUsername && member.discordUsername !== member.name && (
                <span className="text-xs text-gray-400 dark:text-zinc-500">@{member.discordUsername}</span>
              )}
            </div>
            {stats.total > 0 && (
              <p className="text-[11px] text-gray-400 dark:text-zinc-500">
                레이드 완료 {stats.done}/{stats.total}
              </p>
            )}
          </div>
        </div>
        <button onClick={onClose} className="text-gray-300 dark:text-zinc-600 hover:text-gray-500 text-lg leading-none">✕</button>
      </div>

      {member.expeditions.length > 1 && (
        <div className="flex gap-1.5 px-4 pt-3 flex-wrap">
          {member.expeditions.map((e, i) => (
            <button
              key={e.id}
              onClick={() => setActiveExpIdx(i)}
              className={`px-3 py-1 text-xs rounded-full transition-colors ${
                activeExpIdx === i
                  ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >{e.name}</button>
          ))}
        </div>
      )}

      <div className="overflow-y-auto max-h-[65vh] p-4 space-y-2">
        {exp.characters.length === 0 ? (
          <p className="text-center py-8 text-sm text-gray-400 dark:text-zinc-500">등록된 캐릭터가 없어요</p>
        ) : exp.characters.map(c => {
          const icon = getClassIcon(c.class)
          const charDone = c.raids.filter(r => r.gateClears.length > 0 && r.gateClears.every(Boolean)).length
          const charTotal = c.raids.length
          return (
            <div key={c.id} className="border border-gray-100 dark:border-white/[0.06] rounded-xl p-3">
              <div className="flex items-center gap-2 mb-2.5">
                {icon && <img src={icon} alt="" className="w-4 h-4 opacity-60 flex-shrink-0" />}
                <span className="text-xs font-semibold text-gray-800 dark:text-zinc-100 truncate">{c.name}</span>
                <span className="text-[11px] text-gray-400 dark:text-zinc-500 ml-auto flex-shrink-0">{c.itemLevel.toFixed(2)}</span>
                {charTotal > 0 && (
                  <span className={`text-[10px] font-medium flex-shrink-0 ${charDone === charTotal ? 'text-green-500' : 'text-gray-400 dark:text-zinc-500'}`}>
                    {charDone}/{charTotal}
                  </span>
                )}
              </div>
              {c.raids.length === 0 ? (
                <p className="text-xs text-gray-300 dark:text-zinc-600">이번 주 등록된 레이드 없음</p>
              ) : (
                <div className="space-y-1.5">
                  {c.raids.map((r, ri) => {
                    const rd = RAIDS.find(x => x.id === r.raidId)
                    const diff = rd?.difficulties.find(d => d.key === r.difficulty)
                    const gates = diff?.gates ?? r.gateClears.length
                    const allDone = gates > 0 && r.gateClears.slice(0, gates).every(Boolean)
                    return (
                      <div key={ri} className={`flex items-center gap-2 px-2.5 py-1.5 rounded-lg ${allDone ? 'bg-green-50 dark:bg-green-900/15' : 'bg-gray-50 dark:bg-zinc-800/60'}`}>
                        <span className="text-xs text-gray-600 dark:text-zinc-300 flex-1 truncate">{rd?.name || r.raidId}</span>
                        <span className={`text-[10px] px-1 py-0.5 rounded flex-shrink-0 ${DIFF_COLOR[r.difficulty]}`}>{DIFF_LABEL[r.difficulty] || r.difficulty}</span>
                        <div className="flex gap-0.5 flex-shrink-0">
                          {Array.from({ length: gates }).map((_, gi) => (
                            <span
                              key={gi}
                              className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-[8px] font-bold ${
                                r.gateClears[gi] ? 'bg-green-400 text-white' : 'bg-gray-200 dark:bg-zinc-600'
                              }`}
                            >{r.gateClears[gi] ? '✓' : ''}</span>
                          ))}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </Modal>
  )
}

// ── HomeworkTab ───────────────────────────────────────────────────────────────

function RaidCard({ raidId, difficulty, members, favSet, onClick }) {
  const rd = RAIDS.find(r => r.id === raidId)

  const { complete, partial, incomplete, total, incompleteList } = useMemo(() => {
    let complete = 0, partial = 0, incomplete = 0
    const inc = []
    for (const m of members) {
      const s = getMemberRaidStatus(m, raidId, difficulty)
      if (s === 'complete') complete++
      else if (s === 'partial') { partial++; inc.push(m) }
      else if (s === 'incomplete') { incomplete++; inc.push(m) }
      // 'none' → 이 레이드 없는 캐릭터 — 카운트 제외
    }
    // 즐겨찾기 우선 정렬
    inc.sort((a, b) => {
      if (favSet.has(a.userId) !== favSet.has(b.userId)) return favSet.has(a.userId) ? -1 : 1
      return 0
    })
    return { complete, partial, incomplete, total: complete + partial + incomplete, incompleteList: inc }
  }, [members, raidId, difficulty, favSet])

  const pct = total > 0 ? Math.round((complete / total) * 100) : 0
  const shown = incompleteList.slice(0, 10)
  const more  = Math.max(0, incompleteList.length - 10)

  return (
    <div
      className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-2xl cursor-pointer hover:border-gray-300 dark:hover:border-white/[0.12] transition-colors active:scale-[0.995]"
      onClick={onClick}
    >
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className="text-sm font-semibold text-gray-800 dark:text-zinc-100 truncate">{rd?.name || raidId}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${DIFF_COLOR[difficulty]}`}>{DIFF_LABEL[difficulty] || difficulty}</span>
        </div>
        <div className="flex items-center gap-2 text-[11px] flex-shrink-0 ml-2">
          <span className="text-green-500 dark:text-green-400 font-medium">{complete}완료</span>
          {partial > 0 && <span className="text-yellow-500 dark:text-yellow-400">{partial}진행</span>}
          {incomplete > 0 && <span className="text-gray-400 dark:text-zinc-500">{incomplete}미완료</span>}
        </div>
      </div>

      {/* 완료율 바 */}
      {total > 0 ? (
        <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden mb-3">
          <div className="h-full flex rounded-full overflow-hidden">
            <div className="bg-green-400 transition-all" style={{ width: `${(complete / total) * 100}%` }} />
            <div className="bg-yellow-300 transition-all" style={{ width: `${(partial / total) * 100}%` }} />
          </div>
        </div>
      ) : (
        <div className="h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full mb-3" />
      )}

      {/* 미완료 멤버 아바타 미리보기 */}
      {incompleteList.length === 0 && total > 0 ? (
        <p className="text-xs text-green-500 dark:text-green-400 font-medium">모두 완료 🎉</p>
      ) : incompleteList.length === 0 ? (
        <p className="text-xs text-gray-300 dark:text-zinc-600">등록된 멤버 없음</p>
      ) : (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-gray-400 dark:text-zinc-500 flex-shrink-0">미완료</span>
          <div className="flex items-center -space-x-1.5">
            {shown.map(m => (
              <div key={m.userId} className="relative" title={m.name}>
                <Avatar image={m.image} name={m.name} size={6} />
                {favSet.has(m.userId) && (
                  <span className="absolute -top-1 -right-0.5 text-[7px] text-yellow-400 leading-none">★</span>
                )}
              </div>
            ))}
          </div>
          {more > 0 && (
            <span className="text-[11px] text-gray-400 dark:text-zinc-500">+{more}명</span>
          )}
          <span className="ml-auto text-[11px] text-gray-300 dark:text-zinc-600">{pct}%</span>
        </div>
      )}
    </div>
  )
}

function HomeworkTab({ members, favSet, onRaidClick, onMemberClick }) {
  const sharingMembers = useMemo(() => members.filter(m => m.visibility === 'all'), [members])
  const raidList = useMemo(() => getGroupRaidList(sharingMembers), [sharingMembers])
  const [search, setSearch] = useState('')

  const filtered = search
    ? raidList.filter(({ raidId }) => {
        const rd = RAIDS.find(r => r.id === raidId)
        return rd?.name.toLowerCase().includes(search.toLowerCase())
      })
    : raidList

  if (sharingMembers.length === 0) {
    return <div className="text-center py-16 text-sm text-gray-400 dark:text-zinc-500">공개된 멤버가 없어요</div>
  }
  if (raidList.length === 0) {
    return <div className="text-center py-16 text-sm text-gray-400 dark:text-zinc-500">공개된 레이드 현황이 없어요</div>
  }

  return (
    <div>
      {/* 요약 + 검색 */}
      <div className="flex items-center justify-between mb-4 gap-3">
        <p className="text-xs text-gray-400 dark:text-zinc-500 flex-shrink-0">
          레이드 {raidList.length}종 · 공개 멤버 {sharingMembers.length}명 · 레이드 클릭 시 미완료 멤버 확인
        </p>
        {raidList.length > 6 && (
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="레이드 검색…"
            className="w-36 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-400 flex-shrink-0"
          />
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtered.map(({ raidId, difficulty }) => (
          <RaidCard
            key={`${raidId}-${difficulty}`}
            raidId={raidId}
            difficulty={difficulty}
            members={sharingMembers}
            favSet={favSet}
            onClick={() => onRaidClick(raidId, difficulty)}
          />
        ))}
      </div>
    </div>
  )
}

// ── MembersTab ────────────────────────────────────────────────────────────────

function MemberRow({ member, isFav, isMe, myRole, isDemo, onClick, onToggleFav, onVisibilityChange, onRoleChange, onKick }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const icon = member.repChar ? getClassIcon(member.repChar.class) : null
  const isLeader  = myRole === 'leader'
  const isOfficer = isLeader || myRole === 'officer'
  const canManage = isOfficer && !isMe && member.role !== 'leader'

  const { doneRaids, totalRaids } = useMemo(() => {
    let done = 0, total = 0
    for (const exp of member.expeditions) {
      for (const c of exp.characters) {
        for (const r of c.raids) {
          total++
          if (r.gateClears.length > 0 && r.gateClears.every(Boolean)) done++
        }
      }
    }
    return { doneRaids: done, totalRaids: total }
  }, [member])

  return (
    <div className="flex items-center gap-3 px-3.5 py-2.5 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors group/row"
      onClick={onClick}
    >
      {/* 아바타 */}
      <Avatar image={member.image} name={member.name} size={8} />

      {/* 이름 + 대표 캐릭터 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-0.5">
          <span className="text-xs font-semibold text-gray-900 dark:text-white truncate">{member.name}</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ${ROLE_COLOR[member.role] || ROLE_COLOR.member}`}>
            {ROLE_LABEL[member.role] || '멤버'}
          </span>
        </div>
        {member.repChar ? (
          <div className="flex items-center gap-1">
            {icon && <img src={icon} alt="" className="w-3 h-3 opacity-50 flex-shrink-0" />}
            <span className="text-[11px] text-gray-400 dark:text-zinc-500 truncate">{member.repChar.name} · {member.repChar.itemLevel.toFixed(2)}</span>
          </div>
        ) : (
          <span className="text-[11px] text-gray-300 dark:text-zinc-600">캐릭터 없음</span>
        )}
      </div>

      {/* 레이드 완료율 */}
      {member.visibility === 'all' && totalRaids > 0 ? (
        <div className="flex-shrink-0 text-right hidden sm:block">
          <div className="flex items-baseline gap-0.5 justify-end">
            <span className={`text-xs font-semibold ${doneRaids === totalRaids ? 'text-green-500' : 'text-gray-700 dark:text-zinc-200'}`}>{doneRaids}</span>
            <span className="text-[11px] text-gray-300 dark:text-zinc-600">/{totalRaids}</span>
          </div>
          <p className="text-[10px] text-gray-300 dark:text-zinc-600">레이드</p>
        </div>
      ) : member.visibility === 'none' ? (
        <span className="flex-shrink-0 text-xs text-gray-300 dark:text-zinc-600 hidden sm:block">🔒</span>
      ) : null}

      {/* 즐겨찾기 */}
      <button
        onClick={e => { e.stopPropagation(); if (!isDemo) onToggleFav(member.userId) }}
        className={`flex-shrink-0 transition-all ${isDemo ? 'cursor-default' : 'hover:scale-110'}`}
        title={isFav ? '즐겨찾기 해제' : '즐겨찾기'}
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill={isFav ? '#facc15' : 'none'} stroke={isFav ? '#facc15' : '#d1d5db'} strokeWidth="2">
          <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
        </svg>
      </button>

      {/* 내 공개 설정 (자신) */}
      {isMe && !isDemo && (
        <button
          onClick={e => { e.stopPropagation(); onVisibilityChange(member.userId, member.visibility === 'all' ? 'none' : 'all') }}
          className={`flex-shrink-0 text-[10px] px-2 py-0.5 rounded-lg transition-colors ${
            member.visibility === 'all'
              ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
              : 'bg-gray-100 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500'
          }`}
          title="공개 설정 전환"
        >
          {member.visibility === 'all' ? '공개' : '비공개'}
        </button>
      )}

      {/* 관리 메뉴 (officer+) */}
      {canManage && !isDemo && (
        <div className="relative flex-shrink-0" onClick={e => e.stopPropagation()}>
          <button
            onClick={() => setMenuOpen(v => !v)}
            className="p-1 text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 rounded-lg opacity-0 group-hover/row:opacity-100 transition-opacity"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <circle cx="12" cy="5" r="1.5"/><circle cx="12" cy="12" r="1.5"/><circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-1 bg-white dark:bg-zinc-800 border border-gray-100 dark:border-white/10 rounded-xl shadow-lg overflow-hidden z-20 min-w-[100px]">
                {isLeader && member.role === 'member' && (
                  <button onClick={() => { onRoleChange(member.userId, 'promote'); setMenuOpen(false) }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300">부그룹장 임명</button>
                )}
                {isLeader && member.role === 'officer' && (
                  <button onClick={() => { onRoleChange(member.userId, 'demote'); setMenuOpen(false) }} className="w-full px-3 py-2 text-xs text-left hover:bg-gray-50 dark:hover:bg-zinc-700 text-gray-600 dark:text-zinc-300">멤버로 강등</button>
                )}
                <button onClick={() => { onKick(member.userId); setMenuOpen(false) }} className="w-full px-3 py-2 text-xs text-left hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500">강퇴</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function MembersTab({ members, favSet, myRole, myUserId, isDemo, onMemberClick, onToggleFav, onVisibilityChange, onRoleChange, onKick }) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('all')

  const sorted = useMemo(() => {
    const roleOrder = { leader: 0, officer: 1, member: 2 }
    return [...members]
      .filter(m => {
        if (filter === 'fav' && !favSet.has(m.userId)) return false
        if (filter === 'hidden' && m.visibility !== 'none') return false
        if (search) {
          const q = search.toLowerCase()
          return m.name.toLowerCase().includes(q) || (m.discordUsername?.toLowerCase().includes(q))
        }
        return true
      })
      .sort((a, b) => {
        const fa = favSet.has(a.userId) ? 0 : 1
        const fb = favSet.has(b.userId) ? 0 : 1
        if (fa !== fb) return fa - fb
        return (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3)
      })
  }, [members, favSet, search, filter])

  const filters = [
    { key: 'all',    label: `전체 ${members.length}` },
    { key: 'fav',    label: `★ ${[...favSet].length}` },
    { key: 'hidden', label: `🔒 ${members.filter(m => m.visibility === 'none').length}` },
  ]

  return (
    <div>
      {/* 검색 + 필터 */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="이름 검색…"
          className="flex-1 min-w-[120px] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-xs bg-white dark:bg-zinc-800 text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-zinc-600 focus:outline-none focus:border-gray-400"
        />
        <div className="flex gap-1">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-2 text-xs rounded-xl transition-colors ${
                filter === f.key
                  ? 'bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
              }`}
            >{f.label}</button>
          ))}
        </div>
      </div>

      {/* 멤버 리스트 */}
      {sorted.length === 0 ? (
        <div className="text-center py-12 text-sm text-gray-400 dark:text-zinc-500">해당하는 멤버가 없어요</div>
      ) : (
        <div className="space-y-1.5">
          {sorted.map(m => (
            <MemberRow
              key={m.userId}
              member={m}
              isFav={favSet.has(m.userId)}
              isMe={m.userId === myUserId}
              myRole={myRole}
              isDemo={isDemo}
              onClick={() => onMemberClick(m)}
              onToggleFav={onToggleFav}
              onVisibilityChange={onVisibilityChange}
              onRoleChange={onRoleChange}
              onKick={onKick}
            />
          ))}
        </div>
      )}
      <p className="mt-3 text-right text-[11px] text-gray-300 dark:text-zinc-600">
        {sorted.length}/{members.length}명 표시 중
      </p>
    </div>
  )
}

// ── PendingTab ────────────────────────────────────────────────────────────────

function PendingTab({ pendingMembers, isDemo, onAccept, onReject }) {
  if (pendingMembers.length === 0) {
    return <div className="text-center py-16 text-sm text-gray-400 dark:text-zinc-500">대기 중인 가입 신청이 없어요</div>
  }
  return (
    <div className="space-y-2">
      {pendingMembers.map(m => (
        <div key={m.userId} className="flex items-center gap-3 px-3.5 py-3 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-xl">
          <Avatar image={m.image} name={m.name} size={8} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-gray-900 dark:text-white truncate">{m.name}</p>
            {m.discordUsername && <p className="text-[11px] text-gray-400 dark:text-zinc-500">@{m.discordUsername}</p>}
          </div>
          {!isDemo && (
            <div className="flex gap-1.5 flex-shrink-0">
              <button onClick={() => onReject(m.userId)} className="px-2.5 py-1.5 text-xs border border-gray-200 dark:border-white/10 text-gray-500 dark:text-zinc-400 rounded-xl hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">거절</button>
              <button onClick={() => onAccept(m.userId)} className="px-2.5 py-1.5 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold hover:bg-gray-700 transition-colors">수락</button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ── SettingsTab ───────────────────────────────────────────────────────────────

function SettingsTab({ group, myRole, isDemo, onSave, onLeave, onDelete }) {
  const [name, setName] = useState(group.name)
  const [description, setDescription] = useState(group.description || '')
  const [notice, setNotice] = useState(group.notice || '')
  const [copied, setCopied] = useState(false)
  const [saving, setSaving] = useState(false)
  const isLeader = myRole === 'leader'

  async function handleSave() {
    setSaving(true)
    await onSave({ name, description, notice })
    setSaving(false)
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-2xl">
        <h3 className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide mb-3">초대 코드</h3>
        <div className="flex items-center gap-2">
          <span className="flex-1 font-mono text-lg font-bold text-gray-900 dark:text-white tracking-[0.25em] text-center py-2.5 bg-gray-50 dark:bg-zinc-800 rounded-xl">
            {group.inviteCode}
          </span>
          <button
            onClick={() => { navigator.clipboard?.writeText(group.inviteCode); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
            className="px-3 py-2.5 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold"
          >
            {copied ? '복사됨!' : '복사'}
          </button>
        </div>
      </div>

      {isLeader && (
        <div className="p-4 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-white/[0.06] rounded-2xl space-y-3">
          <h3 className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">그룹 정보</h3>
          {[
            { label: '이름', value: name, set: setName, max: 40, type: 'input' },
            { label: '소개', value: description, set: setDescription, max: 200, type: 'textarea' },
            { label: '공지사항', value: notice, set: setNotice, max: 400, type: 'textarea' },
          ].map(({ label, value, set, max, type }) => (
            <div key={label}>
              <label className="text-xs text-gray-400 dark:text-zinc-500 mb-1 block">{label}</label>
              {type === 'input' ? (
                <input value={value} onChange={e => set(e.target.value)} maxLength={max} disabled={isDemo}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 disabled:opacity-60" />
              ) : (
                <textarea value={value} onChange={e => set(e.target.value)} maxLength={max} rows={3} disabled={isDemo}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm bg-white dark:bg-zinc-800 text-gray-900 dark:text-white focus:outline-none focus:border-gray-400 resize-none disabled:opacity-60" />
              )}
            </div>
          ))}
          {!isDemo && (
            <button onClick={handleSave} disabled={saving || !name.trim()}
              className="px-4 py-2 text-xs bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold disabled:opacity-40">
              {saving ? '저장 중…' : '저장'}
            </button>
          )}
        </div>
      )}

      {!isDemo && (
        <div className="p-4 border border-red-100 dark:border-red-900/30 rounded-2xl space-y-2">
          <h3 className="text-[11px] font-semibold text-red-400 uppercase tracking-wide mb-3">위험 구역</h3>
          {myRole !== 'leader' && (
            <button onClick={onLeave}
              className="w-full py-2.5 text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              그룹 탈퇴
            </button>
          )}
          {isLeader && (
            <button onClick={onDelete}
              className="w-full py-2.5 text-xs text-red-500 dark:text-red-400 border border-red-200 dark:border-red-900/40 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
              그룹 삭제
            </button>
          )}
        </div>
      )}
    </div>
  )
}

// ── GroupDetailClient (메인) ──────────────────────────────────────────────────

const TABS = [
  { key: 'homework', label: '레이드 현황' },
  { key: 'members',  label: '멤버' },
  { key: 'pending',  label: '대기 중', officerOnly: true },
  { key: 'settings', label: '설정' },
]

export default function GroupDetailClient({ group: initialGroup, isDemo = false, userId }) {
  const router = useRouter()

  const [group, setGroup]             = useState(initialGroup)
  const [members, setMembers]         = useState(initialGroup.members || [])
  const [pendingMembers, setPending]  = useState(initialGroup.pendingMembers || [])
  const [favSet, setFavSet]           = useState(new Set(initialGroup.favoritedUserIds || []))
  const [myRole, setMyRole]           = useState(initialGroup.myRole || 'member')
  const [tab, setTab]                 = useState('homework')
  const [raidModal, setRaidModal]     = useState(null)
  const [checklistModal, setChecklist] = useState(null)
  const [toast, setToast]             = useState('')

  const myUserId  = isDemo ? null : userId
  const isLeader  = myRole === 'leader'
  const isOfficer = isLeader || myRole === 'officer'

  function showMsg(msg) { setToast(msg); setTimeout(() => setToast(''), 3000) }

  async function handleToggleFav(targetUserId) {
    const wasFav = favSet.has(targetUserId)
    setFavSet(prev => { const n = new Set(prev); wasFav ? n.delete(targetUserId) : n.add(targetUserId); return n })
    await fetch(`/api/expedition/${group.id}/favorites`, {
      method: wasFav ? 'DELETE' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
  }

  async function handleVisibilityChange(targetUserId, visibility) {
    setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, visibility } : m))
    await fetch(`/api/expedition/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, visibility }),
    })
  }

  async function handleRoleChange(targetUserId, action) {
    const res = await fetch(`/api/expedition/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, action }),
    })
    if (res.ok) {
      const newRole = action === 'promote' ? 'officer' : 'member'
      setMembers(prev => prev.map(m => m.userId === targetUserId ? { ...m, role: newRole } : m))
    }
  }

  async function handleKick(targetUserId) {
    if (!confirm('정말 강퇴하시겠어요?')) return
    const res = await fetch(`/api/expedition/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, action: 'kick' }),
    })
    if (res.ok) setMembers(prev => prev.filter(m => m.userId !== targetUserId))
  }

  async function handleAccept(targetUserId) {
    const res = await fetch(`/api/expedition/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, action: 'accept' }),
    })
    if (res.ok) {
      const m = pendingMembers.find(x => x.userId === targetUserId)
      if (m) {
        setPending(prev => prev.filter(x => x.userId !== targetUserId))
        setMembers(prev => [...prev, {
          id: m.id, userId: m.userId, role: 'member', status: 'active',
          visibility: 'all', name: m.name, discordUsername: m.discordUsername,
          image: m.image, repChar: null, expeditions: [],
        }])
        showMsg(`${m.name}님을 수락했어요`)
      }
    }
  }

  async function handleReject(targetUserId) {
    const res = await fetch(`/api/expedition/${group.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: targetUserId, action: 'reject' }),
    })
    if (res.ok) setPending(prev => prev.filter(x => x.userId !== targetUserId))
  }

  async function handleSave(data) {
    const res = await fetch(`/api/expedition/${group.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
    if (res.ok) { const u = await res.json(); setGroup(p => ({ ...p, ...u })); showMsg('저장됐어요') }
  }

  async function handleLeave() {
    if (!confirm('정말 그룹을 탈퇴하시겠어요?')) return
    const res = await fetch(`/api/expedition/${group.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    })
    if (res.ok) router.push('/group')
  }

  async function handleDelete() {
    if (!confirm(`「${group.name}」 그룹을 삭제하시겠어요? 되돌릴 수 없어요.`)) return
    const res = await fetch(`/api/expedition/${group.id}`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    if (res.ok) router.push('/group')
  }

  const visibleTabs = TABS.filter(t => !t.officerOnly || isOfficer)

  return (
    <div className="mx-auto max-w-5xl px-4 py-6">
      {/* 헤더 */}
      <div className="mb-5">
        <Link href="/group" className="text-xs text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 inline-block mb-2">← 그룹 목록</Link>
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl font-extrabold text-gray-900 dark:text-white">{group.name}</h1>
              {isDemo && (
                <span className="text-[10px] px-2 py-0.5 bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 rounded-full">데모</span>
              )}
            </div>
            {group.description && <p className="text-xs text-gray-400 dark:text-zinc-500">{group.description}</p>}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-semibold text-gray-700 dark:text-zinc-200">{members.length}<span className="text-xs text-gray-400 dark:text-zinc-500 font-normal">/{group.maxMembers}명</span></p>
            <p className="text-[11px] text-gray-400 dark:text-zinc-500">그룹장: {group.leader?.discordUsername || group.leader?.name}</p>
          </div>
        </div>
        {group.notice && (
          <div className="mt-3 px-3.5 py-2.5 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/20 rounded-xl">
            <p className="text-xs text-yellow-700 dark:text-yellow-400">{group.notice}</p>
          </div>
        )}
      </div>

      {/* 탭 */}
      <div className="flex gap-0.5 border-b border-gray-100 dark:border-white/[0.06] mb-5">
        {visibleTabs.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-3.5 py-2 text-xs font-medium transition-colors relative ${
              tab === t.key ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300'
            }`}
          >
            {t.label}
            {t.key === 'pending' && pendingMembers.length > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-400 text-white text-[9px] font-bold">{pendingMembers.length}</span>
            )}
            {tab === t.key && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-gray-900 dark:bg-zinc-100 rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* 탭 콘텐츠 */}
      {tab === 'homework' && (
        <HomeworkTab members={members} favSet={favSet}
          onRaidClick={(raidId, difficulty) => setRaidModal({ raidId, difficulty })}
          onMemberClick={m => setChecklist(m)}
        />
      )}
      {tab === 'members' && (
        <MembersTab members={members} favSet={favSet} myRole={myRole} myUserId={myUserId} isDemo={isDemo}
          onMemberClick={m => setChecklist(m)}
          onToggleFav={handleToggleFav}
          onVisibilityChange={handleVisibilityChange}
          onRoleChange={handleRoleChange}
          onKick={handleKick}
        />
      )}
      {tab === 'pending' && isOfficer && (
        <PendingTab pendingMembers={pendingMembers} isDemo={isDemo} onAccept={handleAccept} onReject={handleReject} />
      )}
      {tab === 'settings' && (
        <SettingsTab group={group} myRole={myRole} isDemo={isDemo} onSave={handleSave} onLeave={handleLeave} onDelete={handleDelete} />
      )}

      {/* 모달 */}
      {raidModal && (
        <RaidMembersModal raidId={raidModal.raidId} difficulty={raidModal.difficulty}
          allMembers={members} favSet={favSet} onClose={() => setRaidModal(null)} />
      )}
      {checklistModal && (
        <MemberChecklistModal member={checklistModal} onClose={() => setChecklist(null)} />
      )}

      {/* 토스트 */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs rounded-xl shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}
    </div>
  )
}

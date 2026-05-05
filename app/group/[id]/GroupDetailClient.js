'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { RAIDS } from '@/lib/raidData'

const HIDDEN_RAID_IDS = new Set(['abrel-ex'])

// ── 아이콘 ─────────────────────────────────────────────────────────────────────
const IconBack     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
const IconShield   = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
const IconLock     = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
const IconGlobe    = () => <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
const IconUsers    = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
const IconCopy     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
const IconRefresh  = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
const IconCheck    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>
const IconX        = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
const IconTrash    = () => <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
const IconPin      = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="white"/></svg>
const IconChevron  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
const IconEye      = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
const IconEyeOff   = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>

// ── 유틸 ───────────────────────────────────────────────────────────────────────
function raidStatusOf(entry) {
  if (!entry) return 'none'
  const c = entry.gateClears
  if (!Array.isArray(c) || c.length === 0) return 'none'
  if (c.every(Boolean))  return 'complete'
  if (c.some(Boolean))   return 'partial'
  return 'empty'
}

function getRaidLabel(raidId, diffKey) {
  const r = RAIDS.find(x => x.id === raidId)
  const d = r?.difficulties.find(x => x.key === diffKey)
  return { raidName: r?.name ?? raidId, diffLabel: d?.label ?? diffKey, gates: d?.gates ?? 0 }
}

// ── 레이드별 공대원 모달 ───────────────────────────────────────────────────────
function RaidMembersModal({ raidId, diffKey, members, onClose }) {
  const { raidName, diffLabel, gates } = getRaidLabel(raidId, diffKey)

  const entries = useMemo(() => {
    const result = []
    for (const m of members) {
      for (const c of m.characters) {
        const re = c.raids.find(r => r.raidId === raidId && r.difficulty === diffKey)
        if (!re) continue
        result.push({
          memberName: m.name,
          charName:   c.name,
          charClass:  c.class,
          itemLevel:  c.itemLevel,
          gateClears: re.gateClears,
          status:     raidStatusOf(re),
        })
      }
    }
    const order = { empty: 0, partial: 1, complete: 2 }
    return result.sort((a, b) => order[a.status] - order[b.status])
  }, [members, raidId, diffKey])

  const incomplete = entries.filter(e => e.status !== 'complete')
  const complete   = entries.filter(e => e.status === 'complete')

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl max-h-[80vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <div>
            <p className="ns-bold text-gray-900 dark:text-white">{raidName}</p>
            <p className="text-xs text-gray-400 mt-0.5">{diffLabel} · {gates}관문</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 내용 */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {entries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">이 레이드를 등록한 공대원이 없습니다</p>
          )}

          {incomplete.length > 0 && (
            <div>
              <p className="text-[11px] ns-bold text-red-500 dark:text-red-400 mb-2">
                미완료 · {incomplete.length}명
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1">
                {incomplete.map((e, i) => {
                  const partialCount = e.gateClears.filter(Boolean).length
                  return (
                    <div key={i} className="flex items-center gap-1">
                      <span className="text-xs ns-bold text-gray-700 dark:text-gray-200">{e.charName}</span>
                      <span className="text-[11px] text-gray-400">{e.memberName}</span>
                      {partialCount > 0 && (
                        <span className="text-[9px] text-gray-400 dark:text-gray-500">
                          ({partialCount}/{e.gateClears.length})
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {complete.length > 0 && (
            <div>
              <p className="text-[11px] ns-bold text-green-500 dark:text-green-400 mb-2">
                완료 · {complete.length}명
              </p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 opacity-50">
                {complete.map((e, i) => (
                  <div key={i} className="flex items-center gap-1">
                    <span className="text-xs ns-bold text-gray-700 dark:text-gray-200 line-through">{e.charName}</span>
                    <span className="text-[11px] text-gray-400">{e.memberName}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 숙제 현황 탭 ──────────────────────────────────────────────────────────────
function HomeworkTab({ members }) {
  const [viewRaid, setViewRaid] = useState(null) // { raidId, diffKey }

  // 그룹 전체에 등록된 고유 레이드 목록
  const allRaids = useMemo(() => {
    const seen = new Map()
    for (const m of members) {
      for (const c of m.characters) {
        for (const r of c.raids) {
          if (HIDDEN_RAID_IDS.has(r.raidId)) continue
          const key = `${r.raidId}:${r.difficulty}`
          if (!seen.has(key)) {
            const { raidName, diffLabel } = getRaidLabel(r.raidId, r.difficulty)
            seen.set(key, { raidId: r.raidId, diffKey: r.difficulty, raidName, diffLabel, total: 0, incomplete: 0 })
          }
          const entry = seen.get(key)
          entry.total++
          if (raidStatusOf(r) !== 'complete') entry.incomplete++
        }
      }
    }
    return [...seen.values()].sort((a, b) => {
      const ai = RAIDS.findIndex(r => r.id === a.raidId)
      const bi = RAIDS.findIndex(r => r.id === b.raidId)
      return ai - bi
    })
  }, [members])

  return (
    <div className="space-y-5">
      {/* 레이드 요약 — 클릭 시 공대원 모달 */}
      {allRaids.length > 0 && (
        <div>
          <p className="text-[11px] ns-bold text-gray-400 mb-2">
            레이드 현황 — 레이드를 클릭하면 공대원 목록을 확인할 수 있어요
          </p>
          <div className="flex flex-wrap gap-2">
            {allRaids.map(r => (
              <button
                key={`${r.raidId}:${r.diffKey}`}
                onClick={() => setViewRaid({ raidId: r.raidId, diffKey: r.diffKey })}
                className="flex items-center gap-2.5 rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-3 py-2 hover:border-yellow-400/60 dark:hover:border-yellow-600/40 transition-colors text-left"
              >
                <div>
                  <p className="text-xs ns-bold text-gray-800 dark:text-gray-100">{r.raidName}</p>
                  <p className="text-[10px] text-gray-400">{r.diffLabel}</p>
                </div>
                <div className="flex flex-col items-end">
                  <span className={`text-[11px] ns-bold ${r.incomplete > 0 ? 'text-red-500 dark:text-red-400' : 'text-green-500 dark:text-green-400'}`}>
                    {r.incomplete > 0 ? `${r.incomplete}명 미완` : '전원 완료'}
                  </span>
                  <span className="text-[10px] text-gray-400">{r.total}명 등록</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* 멤버별 상세 */}
      <div className="space-y-2.5">
        <p className="text-[11px] ns-bold text-gray-400">멤버별 상세</p>
        {members.map(m => (
          <div
            key={m.userId}
            className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden"
          >
            {/* 멤버 헤더 */}
            <div className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-[#2a2a2a]">
              <div className="w-6 h-6 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-[11px] ns-bold text-yellow-700 dark:text-yellow-400 flex-shrink-0">
                {m.image
                  ? <img src={m.image} className="w-6 h-6 rounded-full object-cover" alt="" />
                  : (m.name?.[0] ?? '?')}
              </div>
              <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{m.name}</span>
              {m.role === 'leader' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                  <IconShield /> 그룹장
                </span>
              )}
              {m.role === 'officer' && (
                <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  부그룹장
                </span>
              )}
            </div>

            {/* 캐릭터 목록 */}
            {m.characters.length === 0 ? (
              <p className="text-[11px] text-gray-400 dark:text-gray-500 px-4 py-3">숙제 정보가 비공개입니다</p>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-[#252525]">
                {m.characters.map(c => {
                  const visibleRaids = c.raids
                    .filter(r => !HIDDEN_RAID_IDS.has(r.raidId))
                    .sort((a, b) =>
                      RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId)
                    )

                  return (
                    <div key={c.id} className="px-4 py-3">
                      <div className="flex items-baseline gap-1.5 mb-2">
                        <span className="text-xs ns-bold text-gray-700 dark:text-gray-200">{c.name}</span>
                        <span className="text-[10px] text-gray-400">{c.class}</span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">
                          {c.itemLevel != null ? `Lv.${Number(c.itemLevel).toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : ''}
                        </span>
                      </div>
                      {visibleRaids.length === 0 ? (
                        <p className="text-[11px] text-gray-300 dark:text-gray-600">등록된 레이드 없음</p>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {visibleRaids.map(r => {
                            const status = raidStatusOf(r)
                            const { raidName, diffLabel } = getRaidLabel(r.raidId, r.difficulty)
                            const colorCls =
                              status === 'complete'
                                ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-900/40'
                                : status === 'partial'
                                  ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-500 border-yellow-200 dark:border-yellow-900/40'
                                  : 'bg-gray-50 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 border-gray-200 dark:border-[#383838]'
                            return (
                              <button
                                key={`${r.raidId}:${r.difficulty}`}
                                onClick={() => setViewRaid({ raidId: r.raidId, diffKey: r.difficulty })}
                                className={`text-[10px] ns-bold px-2 py-1 rounded border transition-colors hover:opacity-75 ${colorCls}`}
                              >
                                {raidName} {diffLabel}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        ))}
      </div>

      {viewRaid && (
        <RaidMembersModal
          raidId={viewRaid.raidId}
          diffKey={viewRaid.diffKey}
          members={members}
          onClose={() => setViewRaid(null)}
        />
      )}
    </div>
  )
}

// ── 멤버 탭 ───────────────────────────────────────────────────────────────────
function MembersTab({ members, myRole, myUserId, groupId, onKick, onRoleChange, onLeave }) {
  const canManage   = myRole === 'leader' || myRole === 'officer'
  const isLeader    = myRole === 'leader'
  const [confirm, setConfirm] = useState(null) // userId to kick

  return (
    <div className="space-y-2">
      {members.map(m => (
        <div
          key={m.userId}
          className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3 flex items-center gap-3"
        >
          {/* 아바타 */}
          <div className="w-9 h-9 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-sm ns-bold text-yellow-700 dark:text-yellow-400 flex-shrink-0 overflow-hidden">
            {m.image
              ? <img src={m.image} className="w-9 h-9 object-cover" alt="" />
              : (m.name?.[0] ?? '?')}
          </div>

          {/* 정보 */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{m.name}</span>
              {m.role === 'leader' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                  <IconShield /> 그룹장
                </span>
              )}
              {m.role === 'officer' && (
                <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">
                  부그룹장
                </span>
              )}
              {m.userId === myUserId && (
                <span className="text-[10px] text-gray-400 dark:text-gray-500">(나)</span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5 flex items-center gap-1">
              캐릭터 {m.characters.length}개
              {m.visibility === 'none' && m.userId !== myUserId && (
                <><span className="mx-0.5">·</span><IconEyeOff /><span>비공개</span></>
              )}
            </p>
          </div>

          {/* 액션 */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 역할 변경 (그룹장만, 상대가 그룹장이 아닐 때) */}
            {isLeader && m.userId !== myUserId && m.role !== 'leader' && (
              <select
                value={m.role}
                onChange={e => onRoleChange(m.userId, e.target.value)}
                className="text-[11px] rounded border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300 px-2 py-1 outline-none"
              >
                <option value="member">일반</option>
                <option value="officer">부그룹장</option>
              </select>
            )}

            {/* 추방 (그룹장/부그룹장, 상대가 그룹장이 아닐 때) */}
            {canManage && m.userId !== myUserId && m.role !== 'leader' && (
              confirm === m.userId ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { onKick(m.userId); setConfirm(null) }}
                    className="text-[11px] ns-bold text-white bg-red-500 hover:bg-red-400 px-2 py-1 rounded transition-colors"
                  >
                    추방
                  </button>
                  <button
                    onClick={() => setConfirm(null)}
                    className="text-[11px] text-gray-400 hover:text-gray-600 px-1 py-1"
                  >
                    취소
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm(m.userId)}
                  className="text-[11px] ns-bold text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  추방
                </button>
              )
            )}

            {/* 탈퇴 (본인이고 그룹장이 아닐 때) */}
            {m.userId === myUserId && myRole !== 'leader' && (
              confirm === 'leave' ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => { onLeave(); setConfirm(null) }}
                    className="text-[11px] ns-bold text-white bg-red-500 hover:bg-red-400 px-2 py-1 rounded transition-colors"
                  >
                    탈퇴
                  </button>
                  <button onClick={() => setConfirm(null)} className="text-[11px] text-gray-400 px-1 py-1">취소</button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirm('leave')}
                  className="text-[11px] ns-bold text-gray-400 hover:text-red-500 px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                >
                  탈퇴
                </button>
              )
            )}
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 대기중 탭 ──────────────────────────────────────────────────────────────────
function PendingTab({ requests, onAccept, onReject }) {
  if (requests.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] py-14 text-center">
        <p className="text-sm text-gray-400">대기 중인 신청이 없습니다</p>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {requests.map(r => (
        <div
          key={r.id}
          className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3"
        >
          <div className="flex items-center gap-3">
            {/* 아바타 */}
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-sm ns-bold text-gray-500 dark:text-gray-400 flex-shrink-0 overflow-hidden">
              {r.image
                ? <img src={r.image} className="w-9 h-9 object-cover" alt="" />
                : (r.name?.[0] ?? '?')}
            </div>

            {/* 정보 */}
            <div className="flex-1 min-w-0">
              <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">{r.name}</p>
              {r.topChar && (
                <p className="text-[11px] text-gray-400 mt-0.5">
                  {r.topChar.name} · {r.topChar.class}
                  {r.topChar.itemLevel != null && ` · Lv.${Number(r.topChar.itemLevel).toFixed(0)}`}
                </p>
              )}
              {r.message && (
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 italic">"{r.message}"</p>
              )}
            </div>

            {/* 수락 / 거절 */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                onClick={() => onAccept(r.id)}
                className="flex items-center gap-0.5 rounded bg-green-500 hover:bg-green-400 px-2.5 py-1.5 text-xs ns-bold text-white transition-colors"
              >
                <IconCheck /> 수락
              </button>
              <button
                onClick={() => onReject(r.id)}
                className="flex items-center gap-0.5 rounded bg-gray-100 dark:bg-[#2a2a2a] hover:bg-gray-200 dark:hover:bg-[#383838] px-2.5 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 transition-colors"
              >
                <IconX /> 거절
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── 설정 탭 ───────────────────────────────────────────────────────────────────
function SettingsTab({ group, myRole, myUserId, myVisibility, onUpdate, onDelete, onLeave, onVisibilityChange }) {
  const isLeader = myRole === 'leader'

  // 그룹 설정 폼 (리더 전용)
  const [name,        setName]        = useState(group.name)
  const [desc,        setDesc]        = useState(group.description ?? '')
  const [notice,      setNotice]      = useState(group.notice ?? '')
  const [isPublic,    setIsPublic]    = useState(group.isPublic)
  const [maxMembers,  setMaxMembers]  = useState(group.maxMembers)
  const [saveLoading, setSaveLoading] = useState(false)
  const [saved,       setSaved]       = useState(false)

  // 초대 코드
  const [inviteCode,    setInviteCode]    = useState(group.inviteCode ?? '')
  const [codeLoading,   setCodeLoading]   = useState(false)
  const [codeCopied,    setCodeCopied]    = useState(false)

  // 그룹 삭제 확인
  const [showDelete, setShowDelete] = useState(false)
  const [delInput,   setDelInput]   = useState('')

  // 내 공개 설정
  const [visibility, setVisibility] = useState(myVisibility)
  const [visLoading, setVisLoading] = useState(false)

  const handleSave = async () => {
    setSaveLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(), description: desc.trim() || null,
          notice: notice.trim() || null, isPublic, maxMembers,
        }),
      })
      if (res.ok) {
        onUpdate({ name: name.trim(), description: desc.trim() || null, notice: notice.trim() || null, isPublic, maxMembers })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } finally { setSaveLoading(false) }
  }

  const handleRotateCode = async () => {
    setCodeLoading(true)
    try {
      const res = await fetch(`/api/groups/${group.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rotateCode: true }),
      })
      const data = await res.json()
      if (res.ok) setInviteCode(data.inviteCode)
    } finally { setCodeLoading(false) }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(inviteCode).then(() => {
      setCodeCopied(true)
      setTimeout(() => setCodeCopied(false), 1500)
    })
  }

  const handleVisibility = async (val) => {
    setVisLoading(true)
    setVisibility(val)
    try {
      await fetch(`/api/groups/${group.id}/members/${myUserId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visibility: val }),
      })
      onVisibilityChange(val)
    } finally { setVisLoading(false) }
  }

  const handleDelete = async () => {
    await fetch(`/api/groups/${group.id}`, { method: 'DELETE' })
    onDelete()
  }

  const inputCls = 'w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors'
  const labelCls = 'block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5'

  return (
    <div className="space-y-4">
      {/* 내 숙제 공개 설정 */}
      <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
        <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2a2a2a]">
          <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">내 숙제 공개 설정</p>
          <p className="text-[11px] text-gray-400 mt-0.5">그룹원에게 내 레이드 숙제 현황을 보여줄지 설정합니다</p>
        </div>
        <div className="px-5 py-4">
          <div className="flex rounded border border-gray-200 dark:border-[#383838] overflow-hidden w-fit">
            {[['공개', 'all'], ['비공개', 'none']].map(([label, val]) => (
              <button
                key={val}
                disabled={visLoading}
                onClick={() => handleVisibility(val)}
                className={`flex items-center gap-1.5 px-4 py-2 text-xs ns-bold transition-colors ${
                  visibility === val
                    ? 'bg-yellow-400 text-gray-900'
                    : 'bg-white dark:bg-[#222222] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                }`}
              >
                {val === 'all' ? <IconEye /> : <IconEyeOff />} {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 그룹 정보 (리더 전용) */}
      {isLeader && (
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2a2a2a]">
            <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">그룹 정보</p>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div>
              <label className={labelCls}>그룹 이름</label>
              <input value={name} onChange={e => setName(e.target.value)} maxLength={30} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>그룹 소개</label>
              <textarea
                value={desc} onChange={e => setDesc(e.target.value)} maxLength={100} rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
            <div>
              <label className={labelCls}>공지사항</label>
              <textarea
                value={notice} onChange={e => setNotice(e.target.value)} maxLength={200} rows={2}
                placeholder="그룹원에게 전달할 공지사항을 입력하세요"
                className={`${inputCls} resize-none`}
              />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className={labelCls}>최대 인원</label>
                <select value={maxMembers} onChange={e => setMaxMembers(Number(e.target.value))} className={inputCls}>
                  {[8, 10, 15, 20, 30, 50].map(n => <option key={n} value={n}>{n}명</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className={labelCls}>공개 설정</label>
                <div className="flex rounded border border-gray-200 dark:border-[#383838] overflow-hidden">
                  {[['공개', true], ['비공개', false]].map(([label, val]) => (
                    <button
                      key={String(val)}
                      onClick={() => setIsPublic(val)}
                      className={`flex-1 py-2 text-xs ns-bold transition-colors ${
                        isPublic === val
                          ? 'bg-yellow-400 text-gray-900'
                          : 'bg-white dark:bg-[#181818] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end pt-1">
              <button
                onClick={handleSave}
                disabled={saveLoading}
                className="rounded bg-yellow-400 hover:bg-yellow-300 px-4 py-2 text-sm ns-bold text-gray-900 disabled:opacity-60 transition-colors min-w-[80px]"
              >
                {saved ? '저장됨 ✓' : saveLoading ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 초대 코드 (리더) */}
      {isLeader && inviteCode && (
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-[#2a2a2a]">
            <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">초대 코드</p>
            <p className="text-[11px] text-gray-400 mt-0.5">비공개 그룹에 참가할 때 사용합니다</p>
          </div>
          <div className="px-5 py-4">
            <div className="flex items-center justify-between gap-3 rounded-lg bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#383838] px-4 py-3">
              <span className="text-xl ns-extrabold tracking-widest text-gray-800 dark:text-gray-100">
                {inviteCode}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="flex items-center gap-1 text-xs ns-bold text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors px-2 py-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/10"
                >
                  <IconCopy /> {codeCopied ? '복사됨!' : '복사'}
                </button>
                <button
                  onClick={handleRotateCode}
                  disabled={codeLoading}
                  className="flex items-center gap-1 text-xs ns-bold text-gray-500 dark:text-gray-400 hover:text-yellow-500 transition-colors px-2 py-1.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/10 disabled:opacity-50"
                >
                  <IconRefresh /> 재발급
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 위험 구역 */}
      <div className="rounded-lg border border-red-200 dark:border-red-900/30 bg-white dark:bg-[#222222] overflow-hidden">
        <div className="px-5 py-3.5 bg-red-50 dark:bg-red-900/10 border-b border-red-200 dark:border-red-900/30">
          <p className="text-sm ns-bold text-red-600 dark:text-red-400">위험 구역</p>
        </div>
        <div className="px-5 py-4 space-y-2">
          {myRole !== 'leader' && (
            <button
              onClick={onLeave}
              className="text-sm ns-bold text-red-500 hover:text-red-600 transition-colors"
            >
              그룹 탈퇴
            </button>
          )}
          {isLeader && !showDelete && (
            <button
              onClick={() => setShowDelete(true)}
              className="text-sm ns-bold text-red-500 hover:text-red-600 transition-colors"
            >
              그룹 삭제
            </button>
          )}
          {isLeader && showDelete && (
            <div className="space-y-2">
              <p className="text-xs text-red-500">
                그룹을 삭제하면 모든 멤버 정보와 기록이 영구 삭제됩니다.
                확인하려면 그룹 이름 <strong>{group.name}</strong>을 입력하세요.
              </p>
              <input
                value={delInput} onChange={e => setDelInput(e.target.value)}
                placeholder={group.name}
                className="w-full rounded border border-red-300 dark:border-red-900/50 px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-red-400"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={delInput !== group.name}
                  className="rounded bg-red-500 hover:bg-red-400 px-3 py-1.5 text-xs ns-bold text-white disabled:opacity-40 transition-colors"
                >
                  삭제
                </button>
                <button
                  onClick={() => { setShowDelete(false); setDelInput('') }}
                  className="rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 메인 ──────────────────────────────────────────────────────────────────────
export default function GroupDetailClient({ group: initialGroup, userId }) {
  const router = useRouter()
  const [group,     setGroup]     = useState(initialGroup)
  const [activeTab, setActiveTab] = useState('homework')
  const [toastMsg,  setToastMsg]  = useState(null)

  const isLeader    = group.myRole === 'leader'
  const canManage   = group.myRole === 'leader' || group.myRole === 'officer'
  const pendingCount = group.requests.length

  const showToast = (msg) => {
    setToastMsg(msg)
    setTimeout(() => setToastMsg(null), 2500)
  }

  // ── 멤버 액션 ──────────────────────────────────────────────────────────────
  const handleKick = async (targetUserId) => {
    const res = await fetch(`/api/groups/${group.id}/members/${targetUserId}`, { method: 'DELETE' })
    if (res.ok) {
      setGroup(prev => ({ ...prev, members: prev.members.filter(m => m.userId !== targetUserId) }))
      showToast('멤버를 추방했습니다')
    }
  }

  const handleRoleChange = async (targetUserId, role) => {
    const res = await fetch(`/api/groups/${group.id}/members/${targetUserId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    if (res.ok) {
      setGroup(prev => ({
        ...prev,
        members: prev.members.map(m => m.userId === targetUserId ? { ...m, role } : m),
      }))
    }
  }

  const handleLeave = async () => {
    const res = await fetch(`/api/groups/${group.id}/join`, { method: 'DELETE' })
    if (res.ok) router.push('/group')
  }

  // ── 신청 액션 ──────────────────────────────────────────────────────────────
  const handleAccept = async (reqId) => {
    const res = await fetch(`/api/groups/${group.id}/requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'accept' }),
    })
    if (res.ok) {
      showToast('신청을 수락했습니다')
      router.refresh() // 멤버 목록을 서버에서 다시 받아옴
    }
  }

  const handleReject = async (reqId) => {
    const res = await fetch(`/api/groups/${group.id}/requests/${reqId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reject' }),
    })
    if (res.ok) {
      setGroup(prev => ({
        ...prev,
        requests: prev.requests.filter(r => r.id !== reqId),
      }))
      showToast('신청을 거절했습니다')
    }
  }

  // ── 설정 액션 ──────────────────────────────────────────────────────────────
  const handleUpdate = (data) => {
    setGroup(prev => ({ ...prev, ...data }))
  }

  const handleDelete = () => {
    router.push('/group')
  }

  const handleVisibilityChange = (visibility) => {
    setGroup(prev => ({
      ...prev,
      members: prev.members.map(m => m.userId === userId ? { ...m, visibility } : m),
      myVisibility: visibility,
    }))
  }

  // ── 탭 목록 ────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'homework', label: '숙제 현황' },
    { key: 'members',  label: '멤버' },
    ...(canManage ? [{ key: 'pending', label: '대기중', badge: pendingCount }] : []),
    { key: 'settings', label: '설정' },
  ]

  return (
    <div className="space-y-5">
      {/* ── 헤더 ── */}
      <div>
        <button
          onClick={() => router.push('/group')}
          className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 mb-3 transition-colors"
        >
          <IconBack /> 그룹 목록
        </button>

        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-2xl flex-shrink-0">
            🏰
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white leading-tight">{group.name}</h1>
              {group.isPublic
                ? <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400"><IconGlobe /> 공개</span>
                : <span className="inline-flex items-center gap-0.5 text-[10px] text-gray-400"><IconLock /> 비공개</span>
              }
              {group.myRole === 'leader' && (
                <span className="inline-flex items-center gap-0.5 text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                  <IconShield /> 그룹장
                </span>
              )}
              {group.myRole === 'officer' && (
                <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">부그룹장</span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
              <IconUsers /> {group.members.length}/{group.maxMembers}명
              {group.leader && <><span className="mx-0.5">·</span><span>{group.leader.name}</span></>}
            </p>
            {group.description && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{group.description}</p>
            )}
          </div>
        </div>

        {/* 공지사항 */}
        {group.notice && (
          <div className="mt-3 flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 px-3.5 py-2.5">
            <span className="mt-0.5 flex-shrink-0 text-yellow-500"><IconPin /></span>
            <p className="text-xs text-yellow-800 dark:text-yellow-300 whitespace-pre-wrap">{group.notice}</p>
          </div>
        )}
      </div>

      {/* ── 탭 네비게이션 ── */}
      <div className="flex gap-1 border-b border-gray-100 dark:border-[#383838]">
        {tabs.map(t => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`relative flex items-center gap-1 px-3 py-2 text-sm ns-bold transition-colors border-b-2 -mb-px ${
              activeTab === t.key
                ? 'border-yellow-400 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
            }`}
          >
            {t.label}
            {t.badge > 0 && (
              <span className="ml-0.5 rounded-full bg-red-500 text-white text-[10px] ns-bold w-4 h-4 flex items-center justify-center">
                {t.badge}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 탭 콘텐츠 ── */}
      {activeTab === 'homework' && (
        <HomeworkTab members={group.members} />
      )}
      {activeTab === 'members' && (
        <MembersTab
          members={group.members}
          myRole={group.myRole}
          myUserId={userId}
          groupId={group.id}
          onKick={handleKick}
          onRoleChange={handleRoleChange}
          onLeave={handleLeave}
        />
      )}
      {activeTab === 'pending' && canManage && (
        <PendingTab
          requests={group.requests}
          onAccept={handleAccept}
          onReject={handleReject}
        />
      )}
      {activeTab === 'settings' && (
        <SettingsTab
          group={group}
          myRole={group.myRole}
          myUserId={userId}
          myVisibility={group.myVisibility}
          onUpdate={handleUpdate}
          onDelete={handleDelete}
          onLeave={handleLeave}
          onVisibilityChange={handleVisibilityChange}
        />
      )}

      {/* ── 토스트 ── */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-gray-900 dark:bg-gray-700 text-white text-xs ns-bold px-4 py-2.5 shadow-lg pointer-events-none">
          {toastMsg}
        </div>
      )}
    </div>
  )
}

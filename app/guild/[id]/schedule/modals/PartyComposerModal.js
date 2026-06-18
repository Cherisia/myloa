'use client'

import { useState, useRef, useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, SUPPORT_CLASSES, getClassIcon } from '@/app/dashboard/_constants'
import { IconX, IconCrown } from '@/app/dashboard/_icons'

// 레이드 정원 → 파티창 수
function getPartyCount(post) {
  const raid = RAID_MAP[post.raidId]
  const maxPlayers = raid?.maxPlayers || (post.totalSlots + 1)
  if (maxPlayers <= 4) return 1
  if (maxPlayers <= 8) return 2
  return 4
}

// 슬롯 1 = 서포터, 2~4 = 딜러
function isSupporter(slotNumber) { return slotNumber === 1 }

export default function PartyComposerModal({ post, userId, members, onClose, onSave, showToast }) {
  const partyCount = getPartyCount(post)
  const raidName = RAID_MAP[post.raidId]?.name || post.raidId
  const isCreator = post.creatorId === userId

  // 초기 슬롯: 기존 저장된 슬롯 or 빈 슬롯
  const initSlots = useMemo(() => {
    const result = {}
    for (let p = 1; p <= partyCount; p++) {
      for (let s = 1; s <= 4; s++) {
        result[`${p}-${s}`] = null
      }
    }
    for (const slot of post.partySlots || []) {
      if (slot.partyNumber <= partyCount) {
        result[`${slot.partyNumber}-${slot.slotNumber}`] = slot
      }
    }
    return result
  }, [post.partySlots, partyCount])

  const [slots, setSlots] = useState(initSlots)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [warnings, setWarnings] = useState([])
  const [saving, setSaving] = useState(false)
  const dragRef = useRef(null) // { userId, characterId, role, fromKey }

  // 수락된 참가자 목록
  const accepted = post.participants?.filter(p => p.status === 'accepted') || []

  // 멤버 맵
  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) m.set(mem.userId || mem.user?.id, mem)
    return m
  }, [members])

  // 배치된 userId Set
  const placedUserIds = useMemo(() => {
    const s = new Set()
    for (const v of Object.values(slots)) {
      if (v?.userId) s.add(v.userId)
    }
    return s
  }, [slots])

  // 미배치 참가자
  const unplaced = useMemo(() =>
    accepted.filter(p => !placedUserIds.has(p.userId)),
    [accepted, placedUserIds]
  )

  function getParticipant(uid) {
    return accepted.find(p => p.userId === uid)
  }

  function getUserName(uid) {
    const mem = memberMap.get(uid)
    const user = mem?.user
    return user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
  }

  function getCharInfo(uid, characterId) {
    const mem = memberMap.get(uid)
    for (const exp of mem?.user?.loaExpeditions || []) {
      const char = exp.characters?.find(c => c.id === characterId)
      if (char) return char
    }
    return null
  }

  // 역할 토글
  function toggleRole(slotKey) {
    if (!isCreator) return
    setSlots(prev => {
      const s = prev[slotKey]
      if (!s) return prev
      return { ...prev, [slotKey]: { ...s, role: s.role === 'support' ? 'dealer' : 'support' } }
    })
  }

  // 슬롯에서 제거
  function removeFromSlot(slotKey) {
    if (!isCreator) return
    setSlots(prev => ({ ...prev, [slotKey]: null }))
  }

  // 드래그 시작 (슬롯에서 or 미배치 풀에서)
  function handleDragStart(e, data) {
    dragRef.current = data
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e, slotKey) {
    e.preventDefault()
    const drag = dragRef.current
    if (!drag) return
    const slotNum = parseInt(slotKey.split('-')[1])
    const needsSupport = isSupporter(slotNum)
    const dragIsSupport = drag.role === 'support'
    if (needsSupport !== dragIsSupport) {
      e.dataTransfer.dropEffect = 'none'
    } else {
      e.dataTransfer.dropEffect = 'move'
    }
  }

  function handleDrop(e, slotKey, slotNum) {
    e.preventDefault()
    if (!isCreator) return
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null

    const needsSupport = isSupporter(slotNum)
    const dragIsSupport = drag.role === 'support'
    if (needsSupport !== dragIsSupport) {
      showToast(
        needsSupport
          ? '서포터 슬롯에는 서포터 역할만 배치할 수 있습니다'
          : '딜러 슬롯에는 딜러 역할만 배치할 수 있습니다',
        'error'
      )
      return
    }

    setSlots(prev => {
      const next = { ...prev }
      // 기존 위치에서 제거
      if (drag.fromKey) next[drag.fromKey] = null
      // 목표 슬롯에 있던 것 → 기존 위치로 스왑 (있으면)
      if (next[slotKey] && drag.fromKey) {
        next[drag.fromKey] = next[slotKey]
      }
      next[slotKey] = { userId: drag.userId, characterId: drag.characterId, role: drag.role }
      return next
    })
  }

  // 빈 슬롯 클릭 → 미배치 중 역할 맞는 것 팝오버 대신 첫 번째 자동 배치
  function handleEmptySlotClick(slotKey, slotNum) {
    if (!isCreator) return
    const needsSupport = isSupporter(slotNum)
    const candidate = unplaced.find(p => needsSupport ? p.role === 'support' : p.role === 'dealer')
    if (!candidate) return
    setSlots(prev => ({
      ...prev,
      [slotKey]: { userId: candidate.userId, characterId: candidate.characterId, role: candidate.role },
    }))
  }

  function collectWarnings() {
    const warns = []
    for (let p = 1; p <= partyCount; p++) {
      const supportSlot = slots[`${p}-1`]
      if (!supportSlot) warns.push(`${p}번 파티 서포터 슬롯이 비어있습니다`)
    }
    if (unplaced.length > 0) warns.push(`미배치 멤버 ${unplaced.length}명이 있습니다`)
    return warns
  }

  async function handleSaveRequest() {
    const w = collectWarnings()
    if (w.length > 0) {
      setWarnings(w)
      setShowWarningModal(true)
    } else {
      await doSave()
    }
  }

  async function doSave() {
    setSaving(true)
    const slotsArr = []
    for (const [key, val] of Object.entries(slots)) {
      if (!val?.userId) continue
      const [partyNumber, slotNumber] = key.split('-').map(Number)
      slotsArr.push({ partyNumber, slotNumber, userId: val.userId, characterId: val.characterId })
    }
    const ok = await onSave(slotsArr)
    setSaving(false)
    if (ok) setShowWarningModal(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <div>
            <h2 className="ns-bold text-gray-800 dark:text-gray-100">파티 구성 — {raidName}</h2>
            {!isCreator && <p className="text-xs text-gray-400 mt-0.5">읽기 전용</p>}
          </div>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="p-5">
          {/* 파티창 그리드 */}
          <div className={`grid gap-4 mb-6 ${partyCount === 1 ? 'grid-cols-1 max-w-xs' : partyCount === 2 ? 'grid-cols-2' : 'grid-cols-2'}`}>
            {Array.from({ length: partyCount }, (_, pi) => {
              const partyNum = pi + 1
              return (
                <div key={partyNum} className="border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
                  <div className="px-3 py-2 bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-[#2a2a2a]">
                    <span className="text-xs ns-bold text-gray-600 dark:text-gray-400">{partyNum}번 파티</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                    {[1,2,3,4].map(slotNum => {
                      const slotKey = `${partyNum}-${slotNum}`
                      const slot = slots[slotKey]
                      const isSupport = isSupporter(slotNum)
                      const isFirst = slotNum === 1

                      return (
                        <div
                          key={slotNum}
                          className={`flex items-center gap-2 px-3 py-2.5 min-h-[44px] transition-colors
                            ${!slot && isCreator ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525]' : ''}
                          `}
                          onDragOver={(e) => isCreator && handleDragOver(e, slotKey)}
                          onDrop={(e) => isCreator && handleDrop(e, slotKey, slotNum)}
                          onClick={() => !slot && handleEmptySlotClick(slotKey, slotNum)}
                        >
                          {/* 슬롯 번호 & 파티장 아이콘 */}
                          <div className="w-6 flex-shrink-0 text-center">
                            {isFirst
                              ? <IconCrown className="text-[var(--accent-500)] w-4 h-4 mx-auto" />
                              : <span className="text-[10px] text-gray-400">{slotNum}</span>
                            }
                          </div>

                          {/* 역할 뱃지 */}
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ns-bold flex-shrink-0
                            ${isSupport
                              ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                              : 'bg-gray-100 dark:bg-[#333] text-gray-400'}`}>
                            {isSupport ? 'S' : 'D'}
                          </span>

                          {slot ? (
                            <>
                              {/* 배치된 멤버 */}
                              <div
                                className="flex items-center gap-1.5 flex-1 min-w-0"
                                draggable={isCreator}
                                onDragStart={(e) => handleDragStart(e, {
                                  userId: slot.userId,
                                  characterId: slot.characterId,
                                  role: slot.role,
                                  fromKey: slotKey,
                                })}
                              >
                                {(() => {
                                  const char = getCharInfo(slot.userId, slot.characterId)
                                  return (
                                    <>
                                      {char && getClassIcon(char.class) && (
                                        // eslint-disable-next-line @next/next/no-img-element
                                        <img src={getClassIcon(char.class)} alt={char.class} className="w-4 h-4 flex-shrink-0" />
                                      )}
                                      <span className="text-xs text-gray-700 dark:text-gray-200 truncate">
                                        {getUserName(slot.userId)}
                                      </span>
                                    </>
                                  )
                                })()}
                              </div>

                              {/* 역할 토글 (서포터 직업만) */}
                              {isCreator && (() => {
                                const char = getCharInfo(slot.userId, slot.characterId)
                                return char && SUPPORT_CLASSES.has(char.class)
                              })() && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); toggleRole(slotKey) }}
                                  className="text-[9px] px-1.5 py-0.5 rounded border border-gray-200 dark:border-[#333] text-gray-400 hover:bg-gray-100 dark:hover:bg-[#333] transition-colors flex-shrink-0">
                                  전환
                                </button>
                              )}

                              {isCreator && (
                                <button type="button"
                                  onClick={(e) => { e.stopPropagation(); removeFromSlot(slotKey) }}
                                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 transition-colors flex-shrink-0">
                                  <IconX size={10} />
                                </button>
                              )}
                            </>
                          ) : (
                            <span className="text-[10px] text-gray-300 dark:text-gray-600 flex-1">
                              {isCreator ? `${isSupport ? '서포터' : '딜러'} 추가` : '—'}
                            </span>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 미배치 멤버 풀 */}
          {unplaced.length > 0 && (
            <div className="mb-4">
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2">미배치 멤버 {unplaced.length}명</p>
              <div className="flex flex-wrap gap-2">
                {unplaced.map(p => {
                  const char = getCharInfo(p.userId, p.characterId)
                  const name = getUserName(p.userId)
                  return (
                    <div
                      key={p.userId}
                      draggable={isCreator}
                      onDragStart={(e) => handleDragStart(e, {
                        userId: p.userId,
                        characterId: p.characterId,
                        role: p.role,
                        fromKey: null,
                      })}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#252525] text-xs
                        ${isCreator ? 'cursor-grab active:cursor-grabbing' : ''}`}
                    >
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ns-bold flex-shrink-0
                        ${p.role === 'support'
                          ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                          : 'bg-gray-100 dark:bg-[#333] text-gray-400'}`}>
                        {p.role === 'support' ? 'S' : 'D'}
                      </span>
                      {char && getClassIcon(char.class) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getClassIcon(char.class)} alt={char.class} className="w-4 h-4" />
                      )}
                      <span className="text-gray-700 dark:text-gray-200">{name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {isCreator && (
            <div className="flex gap-2">
              <button type="button" onClick={onClose}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                취소
              </button>
              <button type="button" onClick={handleSaveRequest} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? '저장 중...' : '파티 구성 저장'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 저장 전 경고 모달 */}
      {showWarningModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40" onClick={() => setShowWarningModal(false)}>
          <div
            className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-sm p-5"
            onClick={e => e.stopPropagation()}
          >
            <h3 className="ns-bold text-gray-800 dark:text-gray-100 mb-3">파티 구성 문제</h3>
            <ul className="space-y-1.5 mb-4">
              {warnings.map((w, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <span className="text-amber-500 flex-shrink-0">⚠️</span>
                  {w}
                </li>
              ))}
            </ul>
            <p className="text-xs text-gray-400 mb-4">그대로 저장하시겠습니까?</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => setShowWarningModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                돌아가기
              </button>
              <button type="button" onClick={doSave} disabled={saving}
                className="flex-1 py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-50">
                {saving ? '저장 중...' : '그대로 저장'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

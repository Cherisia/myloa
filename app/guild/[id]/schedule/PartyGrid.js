'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { SUPPORT_CLASSES, getClassIcon, defaultRole } from '@/app/dashboard/_constants'
import { IconX, IconCrown } from '@/app/dashboard/_icons'

function getPartyCount(post) {
  const raid = RAID_MAP[post.raidId]
  const max = raid?.maxPlayers || (post.totalSlots + 1)
  if (max <= 4) return 1
  if (max <= 8) return 2
  return 4
}

function isSupporter(slotNumber) { return slotNumber === 1 }

function buildSlotMap(partySlots, partyCount) {
  const result = {}
  for (let p = 1; p <= partyCount; p++) {
    for (let s = 1; s <= 4; s++) result[`${p}-${s}`] = null
  }
  for (const slot of partySlots || []) {
    if (slot.partyNumber <= partyCount) {
      result[`${slot.partyNumber}-${slot.slotNumber}`] = slot
    }
  }
  return result
}

export default function PartyGrid({ post, userId, members, isCreator, onSave }) {
  const partyCount = useMemo(() => getPartyCount(post), [post])

  const [slots, setSlots] = useState(() => buildSlotMap(post.partySlots, partyCount))
  const [changed, setChanged] = useState(false)
  const [pickerSlot, setPickerSlot] = useState(null)
  const [saving, setSaving] = useState(false)
  const dragRef = useRef(null)

  // 파티 저장 후 fetchPosts()로 post.partySlots 업데이트되면 재동기화
  useEffect(() => {
    setSlots(buildSlotMap(post.partySlots, partyCount))
    setChanged(false)
  }, [post.partySlots, partyCount]) // eslint-disable-line

  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) m.set(mem.userId || mem.user?.id, mem)
    return m
  }, [members])

  const accepted = useMemo(() =>
    post.participants?.filter(p => p.status === 'accepted') || [], [post.participants])

  // 픽커에 표시할 후보: 모든 길드 멤버 (수락된 참가자 우선)
  const candidates = useMemo(() => {
    const acceptedMap = new Map(accepted.map(p => [p.userId, p]))
    const list = []
    for (const mem of members || []) {
      const uid = mem.userId || mem.user?.id
      if (!uid) continue
      const user = mem.user
      const chars = []
      for (const exp of user?.loaExpeditions || []) {
        for (const c of exp.characters || []) {
          if (c.isActive !== false) chars.push(c)
        }
      }
      if (chars.length === 0) continue
      chars.sort((a, b) => b.itemLevel - a.itemLevel)
      const ap = acceptedMap.get(uid)
      const char = ap ? (chars.find(c => c.id === ap.characterId) || chars[0]) : chars[0]
      list.push({
        userId: uid,
        name: user?.nickname || user?.name || user?.discordUsername || '알 수 없음',
        image: user?.image,
        char,
        role: ap?.role || defaultRole(char?.class),
        isAccepted: !!ap,
      })
    }
    list.sort((a, b) => (b.isAccepted ? 1 : 0) - (a.isAccepted ? 1 : 0))
    return list
  }, [members, accepted])

  const placedUserIds = useMemo(() => {
    const s = new Set()
    for (const v of Object.values(slots)) if (v?.userId) s.add(v.userId)
    return s
  }, [slots])

  function getUserName(uid) {
    const mem = memberMap.get(uid)
    const user = mem?.user
    return user?.nickname || user?.name || user?.discordUsername || '?'
  }

  function getCharInfo(uid, characterId) {
    const mem = memberMap.get(uid)
    for (const exp of mem?.user?.loaExpeditions || []) {
      const char = exp.characters?.find(c => c.id === characterId)
      if (char) return char
    }
    return null
  }

  function modify(key, val) {
    setSlots(prev => ({ ...prev, [key]: val }))
    setChanged(true)
  }

  function handleSlotClick(slotKey) {
    if (!isCreator) return
    setPickerSlot(k => k === slotKey ? null : slotKey)
  }

  function handlePick(candidate) {
    if (!pickerSlot) return
    modify(pickerSlot, {
      userId: candidate.userId,
      characterId: candidate.char?.id || '',
      role: candidate.role,
    })
    setPickerSlot(null)
  }

  function removeSlot(slotKey, e) {
    e.stopPropagation()
    if (!isCreator) return
    modify(slotKey, null)
    if (pickerSlot === slotKey) setPickerSlot(null)
  }

  function handleDragStart(e, data) {
    dragRef.current = data
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDrop(e, slotKey) {
    e.preventDefault()
    if (!isCreator) return
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    setSlots(prev => {
      const next = { ...prev }
      if (drag.fromKey) next[drag.fromKey] = null
      if (next[slotKey] && drag.fromKey) next[drag.fromKey] = next[slotKey]
      next[slotKey] = { userId: drag.userId, characterId: drag.characterId, role: drag.role }
      return next
    })
    setChanged(true)
    setPickerSlot(null)
  }

  async function handleSave() {
    setSaving(true)
    const slotsArr = []
    for (const [key, val] of Object.entries(slots)) {
      if (!val?.userId) continue
      const [partyNumber, slotNumber] = key.split('-').map(Number)
      slotsArr.push({ partyNumber, slotNumber, userId: val.userId, characterId: val.characterId })
    }
    const ok = await onSave(slotsArr)
    setSaving(false)
    if (ok) setChanged(false)
  }

  // 픽커에 표시할 후보: 이미 다른 슬롯에 배치된 멤버 제외 (현재 슬롯 멤버는 포함)
  const pickerCandidates = pickerSlot
    ? candidates.filter(c => !placedUserIds.has(c.userId) || slots[pickerSlot]?.userId === c.userId)
    : []

  return (
    <div>
      {/* 섹션 헤더 */}
      <div className="flex items-center justify-between mb-2">
        <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">파티 구성</p>
        {isCreator && changed && (
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1 text-xs ns-bold rounded-lg bg-[var(--accent-400)] text-[var(--accent-900)] hover:bg-[var(--accent-300)] transition-colors disabled:opacity-50"
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        )}
      </div>

      {/* 파티 그리드 */}
      <div className={`grid gap-2 ${partyCount === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {Array.from({ length: partyCount }, (_, pi) => {
          const partyNum = pi + 1
          return (
            <div key={partyNum} className="border border-gray-200 dark:border-[#2a2a2a] rounded-xl overflow-hidden">
              <div className="px-3 py-1.5 bg-gray-50 dark:bg-[#252525] border-b border-gray-200 dark:border-[#2a2a2a]">
                <span className="text-[11px] ns-bold text-gray-500 dark:text-gray-400">{partyNum}번 파티</span>
              </div>
              <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                {[1, 2, 3, 4].map(slotNum => {
                  const slotKey = `${partyNum}-${slotNum}`
                  const slot = slots[slotKey]
                  const isFirst = slotNum === 1
                  const isSupport = isSupporter(slotNum)
                  const isPicker = pickerSlot === slotKey

                  return (
                    <div
                      key={slotNum}
                      className={`flex items-center gap-2 px-2.5 py-2 min-h-[40px] transition-colors
                        ${isCreator ? 'cursor-pointer' : ''}
                        ${isPicker
                          ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10'
                          : isCreator ? 'hover:bg-gray-50 dark:hover:bg-[#252525]' : ''}`}
                      onClick={() => handleSlotClick(slotKey)}
                      onDragOver={isCreator ? handleDragOver : undefined}
                      onDrop={isCreator ? (e) => handleDrop(e, slotKey) : undefined}
                    >
                      {/* 슬롯 번호 / 왕관 */}
                      <div className="w-5 flex-shrink-0 flex items-center justify-center">
                        {isFirst
                          ? <IconCrown className="text-[var(--accent-500)]" />
                          : <span className="text-[10px] text-gray-400">{slotNum}</span>
                        }
                      </div>

                      {/* 역할 뱃지 */}
                      <span className={`text-[9px] px-1 py-0.5 rounded-full ns-bold flex-shrink-0
                        ${isSupport
                          ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                          : 'bg-gray-100 dark:bg-[#333] text-gray-400'}`}>
                        {isSupport ? 'S' : 'D'}
                      </span>

                      {slot ? (
                        <>
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                            draggable={isCreator}
                            onDragStart={isCreator ? (e) => {
                              e.stopPropagation()
                              handleDragStart(e, {
                                userId: slot.userId,
                                characterId: slot.characterId,
                                role: slot.role,
                                fromKey: slotKey,
                              })
                            } : undefined}
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
                          {isCreator && (
                            <button
                              type="button"
                              onClick={(e) => removeSlot(slotKey, e)}
                              className="p-0.5 rounded hover:bg-gray-100 dark:hover:bg-[#333] text-gray-400 transition-colors flex-shrink-0"
                            >
                              <IconX size={10} />
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[10px] flex-1">
                          {isCreator
                            ? <span className="text-[var(--accent-300)] dark:text-[var(--accent-700)]">
                                + {isSupport ? '서포터' : '딜러'}
                              </span>
                            : <span className="text-gray-300 dark:text-gray-600">—</span>
                          }
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

      {/* 멤버 픽커 패널 */}
      {pickerSlot && isCreator && (
        <div className="mt-2 rounded-xl border border-[var(--accent-200)] dark:border-[var(--accent-900)]/40 overflow-hidden">
          <div className="px-3 py-2 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 border-b border-[var(--accent-200)] dark:border-[var(--accent-900)]/40 flex items-center justify-between">
            <span className="text-xs ns-bold text-[var(--accent-700)] dark:text-[var(--accent-300)]">멤버 선택</span>
            <button type="button" onClick={() => setPickerSlot(null)}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors">
              <IconX size={12} />
            </button>
          </div>
          <div className="max-h-44 overflow-y-auto">
            {pickerCandidates.length === 0 ? (
              <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">배치 가능한 멤버가 없습니다</p>
            ) : pickerCandidates.map(c => (
              <button
                key={c.userId}
                type="button"
                onClick={() => handlePick(c)}
                className="w-full flex items-center gap-2.5 px-3 py-2 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors text-left"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={c.image || '/default-avatar.svg'}
                  alt={c.name}
                  className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  onError={e => { e.currentTarget.src = '/default-avatar.svg' }}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-800 dark:text-gray-100 truncate">{c.name}</span>
                    {c.isAccepted && (
                      <span className="text-[9px] px-1 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] ns-bold flex-shrink-0">참가</span>
                    )}
                  </div>
                  {c.char && (
                    <div className="flex items-center gap-1 text-[10px] text-gray-400">
                      {getClassIcon(c.char.class) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getClassIcon(c.char.class)} alt={c.char.class} className="w-3.5 h-3.5" />
                      )}
                      <span>{c.char.name}</span>
                      <span>· {Number(c.char.itemLevel).toFixed(0)}</span>
                    </div>
                  )}
                </div>
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full ns-bold flex-shrink-0
                  ${c.role === 'support'
                    ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                    : 'bg-gray-100 dark:bg-[#333] text-gray-400'}`}>
                  {c.role === 'support' ? 'S' : 'D'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

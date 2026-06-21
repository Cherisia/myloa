'use client'

import { useState, useMemo, useRef, useEffect } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { SUPPORT_CLASSES, getClassIcon, defaultRole, CLASS_ICON } from '@/app/dashboard/_constants'
import { IconX, IconBack } from '@/app/dashboard/_icons'
import { raidStatusOf } from '@/lib/groupRaidShare'

function getPartyCount(post) {
  const raid = RAID_MAP[post.raidId]
  const max = raid?.maxPlayers || (post.totalSlots + 1)
  if (max <= 4) return 1
  if (max <= 8) return 2
  return 4
}

function isSupporter(slotNumber) { return slotNumber === 4 }

function resolveRole(participant, memberMap) {
  if (!participant.userId) {
    return participant.customClass && SUPPORT_CLASSES.has(participant.customClass) ? 'support' : 'dealer'
  }
  const mem = memberMap?.get(participant.userId)
  for (const exp of mem?.user?.loaExpeditions || []) {
    const char = exp.characters?.find(c => c.id === participant.characterId)
    if (char) return SUPPORT_CLASSES.has(char.class) ? 'support' : 'dealer'
  }
  return participant.role
}

function buildSlotMap(partySlots, accepted, partyCount, memberMap) {
  const result = {}
  for (let p = 1; p <= partyCount; p++) {
    for (let s = 1; s <= 4; s++) result[`${p}-${s}`] = null
  }
  if (partySlots && partySlots.length > 0) {
    for (const slot of partySlots) {
      if (slot.partyNumber <= partyCount) {
        result[`${slot.partyNumber}-${slot.slotNumber}`] = slot
      }
    }
    return result
  }
  const dealers    = (accepted || []).filter(p => resolveRole(p, memberMap) !== 'support')
  const supporters = (accepted || []).filter(p => resolveRole(p, memberMap) === 'support')
  for (let p = 1; p <= partyCount; p++) {
    for (const [si, slot] of [1, 2, 3].entries()) {
      const d = dealers[(p - 1) * 3 + si]
      if (d) result[`${p}-${slot}`] = { userId: d.userId, characterId: d.characterId, role: d.role }
    }
    const s = supporters[p - 1]
    if (s) result[`${p}-4`] = { userId: s.userId, characterId: s.characterId, role: s.role }
  }
  return result
}

function ClassIcon({ cls, size = 'w-6 h-6' }) {
  const icon = getClassIcon(cls)
  if (!icon) return null
  return (
    <div className={`relative flex-shrink-0 ${size}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={icon} alt={cls} className={size} />
      {SUPPORT_CLASSES.has(cls) && (
        <span className="absolute -bottom-1 -left-1 text-[13px] ns-bold leading-none text-green-400">+</span>
      )}
    </div>
  )
}

const ALL_CLASSES = Object.keys(CLASS_ICON)

export default function PartyGrid({ post, userId, members, isCreator, onSave }) {
  const partyCount = useMemo(() => getPartyCount(post), [post])

  const accepted = useMemo(() =>
    post.participants?.filter(p => p.status === 'accepted') || [], [post.participants])

  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) m.set(mem.userId || mem.user?.id, mem)
    return m
  }, [members])

  const [slots, setSlots] = useState(() => buildSlotMap(post.partySlots, accepted, partyCount, memberMap))
  const [changed, setChanged] = useState(false)
  const [pickerSlot, setPickerSlot] = useState(null)
  const [pickerTab, setPickerTab] = useState('guild')   // 'guild' | 'custom'
  const [pickerMember, setPickerMember] = useState(null) // { userId, name, image, chars[] }
  const [customName, setCustomName] = useState('')
  const [customClass, setCustomClass] = useState('')
  const [customRole, setCustomRole] = useState('dealer') // 'dealer' | 'support'
  const [saving, setSaving] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dragRef = useRef(null)

  useEffect(() => {
    setSlots(buildSlotMap(post.partySlots, accepted, partyCount, memberMap))
    setChanged(false)
  }, [post.partySlots, accepted, partyCount, memberMap]) // eslint-disable-line

  const candidates = useMemo(() => {
    const acceptedMap = new Map(accepted.map(p => [p.userId, p]))
    const list = []
    for (const mem of members || []) {
      const uid = mem.userId || mem.user?.id
      if (!uid) continue
      const user = mem.user
      const name = user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
      const tokens = new Set()
      if (user?.nickname)        tokens.add(user.nickname.toLowerCase())
      if (user?.name)            tokens.add(user.name.toLowerCase())
      if (user?.discordUsername) tokens.add(user.discordUsername.toLowerCase())
      for (const exp of user?.loaExpeditions || []) {
        if (exp.repCharName) tokens.add(exp.repCharName.toLowerCase())
        if (exp.customName)  tokens.add(exp.customName.toLowerCase())
        for (const c of exp.characters || []) {
          if (c.name) tokens.add(c.name.toLowerCase())
        }
      }
      list.push({
        userId: uid,
        name,
        image: user?.image,
        isAccepted: acceptedMap.has(uid),
        searchTokens: [...tokens],
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

  function closePicker() {
    setPickerSlot(null)
    setPickerTab('guild')
    setPickerMember(null)
    setCustomName('')
    setCustomClass('')
    setCustomRole('dealer')
    setSearchQuery('')
  }

  function handleSlotClick(slotKey) {
    if (!isCreator) return
    if (pickerSlot === slotKey) { closePicker(); return }
    setPickerSlot(slotKey)
    setPickerTab('guild')
    setPickerMember(null)
    setCustomName('')
    setCustomClass('')
    setCustomRole('dealer')
    setSearchQuery('')
  }

  function handlePickMember(candidate) {
    const mem = memberMap.get(candidate.userId)
    const allChars = []
    for (const exp of mem?.user?.loaExpeditions || []) {
      for (const c of exp.characters || []) {
        if (c.isActive !== false) allChars.push(c)
      }
    }
    // 정렬: 적합+미완료 → 적합+완료 → 부적합
    const sorted = allChars.map(c => {
      const eligible = (!post.minItemLevel || c.itemLevel >= post.minItemLevel) &&
        (!post.allowedClasses?.length || post.allowedClasses.includes(c.class))
      const entry = c.characterRaids?.find(r => r.raidId === post.raidId && r.difficulty === post.difficulty)
      const complete = entry ? raidStatusOf(entry) === 'complete' : false
      return { ...c, eligible, complete }
    }).sort((a, b) => {
      if (a.eligible !== b.eligible) return a.eligible ? -1 : 1
      if (a.complete !== b.complete) return a.complete ? 1 : -1
      return b.itemLevel - a.itemLevel
    })
    setPickerMember({ ...candidate, chars: sorted })
  }

  function handlePickChar(char) {
    if (!pickerSlot || !pickerMember) return
    modify(pickerSlot, {
      userId: pickerMember.userId,
      characterId: char.id,
      role: defaultRole(char.class),
    })
    closePicker()
  }

  function handleAddCustom() {
    if (!pickerSlot || !customName.trim() || !customClass) return
    modify(pickerSlot, {
      userId: null,
      characterId: null,
      customName: customName.trim(),
      customClass,
      role: customRole,
    })
    closePicker()
  }

  function removeSlot(slotKey, e) {
    e.stopPropagation()
    if (!isCreator) return
    modify(slotKey, null)
    if (pickerSlot === slotKey) closePicker()
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
      next[slotKey] = { userId: drag.userId, characterId: drag.characterId, role: drag.role, customName: drag.customName, customClass: drag.customClass }
      return next
    })
    setChanged(true)
    closePicker()
  }

  async function handleSave() {
    setSaving(true)
    const slotsArr = []
    for (const [key, val] of Object.entries(slots)) {
      if (!val?.userId && !val?.customName) continue
      const [partyNumber, slotNumber] = key.split('-').map(Number)
      slotsArr.push({
        partyNumber, slotNumber,
        userId: val.userId || null,
        characterId: val.characterId || null,
        customName: val.customName || null,
        customClass: val.customClass || null,
      })
    }
    const ok = await onSave(slotsArr)
    setSaving(false)
    if (ok) setChanged(false)
  }

  const pickerCandidates = pickerSlot
    ? candidates.filter(c => !placedUserIds.has(c.userId) || slots[pickerSlot]?.userId === c.userId)
    : []

  const filteredCandidates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return pickerCandidates
    return pickerCandidates.filter(c => c.searchTokens.some(t => t.includes(q)))
  }, [pickerCandidates, searchQuery])

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
              <div className="divide-y divide-gray-200 dark:divide-[#2e2e2e] bg-white dark:bg-[#1a1a1a]">
                {[1, 2, 3, 4].map(slotNum => {
                  const slotKey = `${partyNum}-${slotNum}`
                  const slot = slots[slotKey]
                  const isSupport = isSupporter(slotNum)
                  const isPicker = pickerSlot === slotKey
                  const isOwnSlot = slot?.userId === userId

                  return (
                    <div
                      key={slotNum}
                      className={`flex items-center gap-2 px-2.5 py-2 min-h-[40px] transition-colors
                        ${isCreator ? 'cursor-pointer' : ''}
                        ${isPicker
                          ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20'
                          : isOwnSlot
                            ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/25'
                            : isCreator ? 'hover:bg-gray-100 dark:hover:bg-[#252525]' : ''}`}
                      onClick={() => handleSlotClick(slotKey)}
                      onDragOver={isCreator ? handleDragOver : undefined}
                      onDrop={isCreator ? (e) => handleDrop(e, slotKey) : undefined}
                    >
                      <div className="w-5 flex-shrink-0 flex items-center justify-center">
                        <span className={`text-[10px] ${isOwnSlot ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)] ns-bold' : 'text-gray-400'}`}>{slotNum}</span>
                      </div>

                      {slot ? (
                        <>
                          <div
                            className="flex items-center gap-1.5 flex-1 min-w-0"
                            draggable={isCreator && !isOwnSlot}
                            onDragStart={isCreator && !isOwnSlot ? (e) => {
                              e.stopPropagation()
                              handleDragStart(e, {
                                userId: slot.userId, characterId: slot.characterId,
                                role: slot.role, customName: slot.customName, customClass: slot.customClass,
                                fromKey: slotKey,
                              })
                            } : undefined}
                          >
                            {slot.userId
                              ? (() => {
                                  const char = getCharInfo(slot.userId, slot.characterId)
                                  return (
                                    <>
                                      {char && <ClassIcon cls={char.class} />}
                                      <span className={`text-xs truncate ${isOwnSlot ? 'text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold' : 'text-gray-700 dark:text-gray-200'}`}>
                                        {char?.name || getUserName(slot.userId)}
                                      </span>
                                      {isOwnSlot && (
                                        <span className="text-[9px] px-1 py-0.5 rounded bg-[var(--accent-200)] dark:bg-[var(--accent-900)]/40 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold flex-shrink-0">나</span>
                                      )}
                                    </>
                                  )
                                })()
                              : (
                                <>
                                  {slot.customClass && <ClassIcon cls={slot.customClass} />}
                                  <span className="text-xs text-gray-700 dark:text-gray-200 truncate">
                                    {slot.customName || '?'}
                                  </span>
                                  <span className="text-[9px] text-gray-400 flex-shrink-0">외부</span>
                                </>
                              )
                            }
                          </div>
                          {isCreator && !isOwnSlot && (
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

      {/* 픽커 패널 */}
      {pickerSlot && isCreator && (
        <div className="mt-2 rounded-xl border border-gray-200 dark:border-[#303030] overflow-hidden shadow-sm">

          {/* 헤더 */}
          <div className="px-3 py-2.5 bg-gray-100 dark:bg-[#272727] border-b border-gray-200 dark:border-[#303030] flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              {pickerMember && (
                <button
                  type="button"
                  onClick={() => setPickerMember(null)}
                  className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                >
                  <IconBack size={14} />
                </button>
              )}
              <span className="text-xs ns-bold text-gray-700 dark:text-gray-200">
                {pickerMember ? pickerMember.name : '멤버 선택'}
              </span>
            </div>
            <button type="button" onClick={closePicker}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              <IconX size={13} />
            </button>
          </div>

          {/* 탭 (멤버 목록 단계에서만 표시) */}
          {!pickerMember && (
            <div className="grid grid-cols-2 bg-gray-50 dark:bg-[#222] border-b border-gray-200 dark:border-[#303030]">
              {[['guild', '길드원'], ['custom', '사용자 지정']].map(([tab, label]) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => { setPickerTab(tab); setSearchQuery('') }}
                  className={`py-2 text-xs ns-bold transition-all border-b-2
                    ${pickerTab === tab
                      ? 'text-gray-900 dark:text-gray-100 bg-white dark:bg-[#1e1e1e] border-[var(--accent-400)]'
                      : 'text-gray-400 dark:text-gray-500 bg-gray-50 dark:bg-[#222] border-transparent hover:text-gray-600 dark:hover:text-gray-300'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* 고정 높이 콘텐츠 영역 — 탭 전환 시 레이아웃 흔들림 방지 */}
          <div className="h-56 flex flex-col bg-white dark:bg-[#1e1e1e]">

            {/* 길드원 탭 — 검색 + 멤버 목록 */}
            {pickerTab === 'guild' && !pickerMember && (
              <>
                <div className="flex-shrink-0 px-2.5 py-2 border-b border-gray-100 dark:border-[#2a2a2a]">
                  <div className="relative">
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                      placeholder="닉네임, 캐릭터명, 원정대명..."
                      className="w-full pl-2.5 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#252525] text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1e1e1e] transition-colors"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery('')}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        <IconX size={11} />
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto min-h-0">
                  {filteredCandidates.length === 0 ? (
                    <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">
                      {searchQuery ? '검색 결과가 없습니다' : '배치 가능한 멤버가 없습니다'}
                    </p>
                  ) : filteredCandidates.map(c => (
                    <button
                      key={c.userId}
                      type="button"
                      onClick={() => handlePickMember(c)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors text-left border-b border-gray-100 dark:border-[#2a2a2a] last:border-0"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={c.image || '/default-avatar.svg'}
                        alt={c.name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        onError={e => { e.currentTarget.src = '/default-avatar.svg' }}
                      />
                      <span className="text-xs text-gray-800 dark:text-gray-100 flex-1 truncate">{c.name}</span>
                      {c.isAccepted && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold flex-shrink-0">참가</span>
                      )}
                      <IconBack size={12} className="text-gray-300 dark:text-gray-600 rotate-180 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 길드원 탭 — 캐릭터 목록 */}
            {pickerTab === 'guild' && pickerMember && (
              <div className="flex-1 overflow-y-auto min-h-0">
                {pickerMember.chars.length === 0 ? (
                  <p className="px-3 py-4 text-xs text-gray-400 dark:text-gray-500 text-center">캐릭터가 없습니다</p>
                ) : pickerMember.chars.map(char => (
                  <button
                    key={char.id}
                    type="button"
                    disabled={!char.eligible}
                    onClick={() => handlePickChar(char)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 transition-colors text-left border-b border-gray-100 dark:border-[#2a2a2a] last:border-0
                      ${char.eligible
                        ? 'hover:bg-gray-50 dark:hover:bg-[#252525]'
                        : 'opacity-40 cursor-not-allowed'}`}
                  >
                    <ClassIcon cls={char.class} size="w-5 h-5" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                        {char.complete && (
                          <span className="text-[9px] px-1 py-0.5 rounded bg-gray-100 dark:bg-[#333] text-gray-400 ns-bold flex-shrink-0">완료</span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">{char.class} · {Number(char.itemLevel).toFixed(0)}</div>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* 사용자 지정 탭 */}
            {pickerTab === 'custom' && (
              <div className="flex-1 overflow-y-auto min-h-0">
                <div className="p-3 space-y-3">
                  {/* 이름 입력 */}
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 ns-bold">이름</label>
                    <input
                      type="text"
                      value={customName}
                      onChange={e => setCustomName(e.target.value)}
                      placeholder="이름을 입력하세요"
                      maxLength={20}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 placeholder-gray-300 dark:placeholder-gray-600 focus:outline-none focus:border-[var(--accent-400)] transition-colors"
                    />
                  </div>

                  {/* 역할 토글 */}
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1 ns-bold">역할</label>
                    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#333] text-xs">
                      {[['dealer', '딜러'], ['support', '서포터']].map(([r, label]) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => { setCustomRole(r); setCustomClass('') }}
                          className={`flex-1 py-1.5 transition-colors ns-bold
                            ${customRole === r
                              ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
                              : 'bg-white dark:bg-[#252525] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 직업 선택 */}
                  <div>
                    <label className="block text-[10px] text-gray-500 dark:text-gray-400 mb-1.5 ns-bold">직업</label>
                    {customRole === 'support' ? (
                      <div className="grid grid-cols-4 gap-1">
                        {[...SUPPORT_CLASSES].map(cls => {
                          const icon = getClassIcon(cls)
                          const selected = customClass === cls
                          return (
                            <button
                              key={cls}
                              type="button"
                              title={cls}
                              onClick={() => setCustomClass(cls)}
                              className={`relative flex flex-col items-center gap-1 p-2 rounded-lg transition-all
                                ${selected
                                  ? 'ring-2 ring-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                                  : 'hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}
                            >
                              <div className="relative">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {icon && <img src={icon} alt={cls} className="w-8 h-8" />}
                                <span className="absolute -bottom-1 -left-1 text-[13px] ns-bold leading-none text-green-400">+</span>
                              </div>
                              <span className="text-[9px] text-gray-500 dark:text-gray-400 truncate w-full text-center">{cls}</span>
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="grid grid-cols-7 gap-1">
                        {ALL_CLASSES.map(cls => {
                          const icon = getClassIcon(cls)
                          const selected = customClass === cls
                          return (
                            <button
                              key={cls}
                              type="button"
                              title={cls}
                              onClick={() => setCustomClass(cls)}
                              className={`relative flex items-center justify-center p-1 rounded-lg transition-all
                                ${selected
                                  ? 'ring-2 ring-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                                  : 'hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}
                            >
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              {icon && <img src={icon} alt={cls} className="w-7 h-7" />}
                            </button>
                          )
                        })}
                      </div>
                    )}
                    {customClass && (
                      <p className="mt-1.5 text-[10px] text-[var(--accent-600)] dark:text-[var(--accent-300)] ns-bold">{customClass} 선택됨</p>
                    )}
                  </div>

                  <button
                    type="button"
                    disabled={!customName.trim() || !customClass}
                    onClick={handleAddCustom}
                    className="w-full py-2 rounded-lg bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-xs ns-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    추가
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

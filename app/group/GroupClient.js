'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { signIn } from 'next-auth/react'
import Image from 'next/image'
import { RAIDS, RAID_MAP, RAID_ORDER_MAP } from '@/lib/raidData'
import { HIDDEN_RAID_IDS, EX_RAID_IDS, DIFF_LABEL, DIFF_COLOR, getClassIcon } from '@/app/dashboard/_constants'
import { raidStatusOf } from '@/lib/groupRaidShare'
import { saveRaidCompletion } from '@/app/dashboard/_raidHelpers'
import RaidDetailModal, { CharChip } from '@/app/components/RaidDetailModal'
import DemoLoginModal from '@/app/components/DemoLoginModal'
import { IconCrown, IconTrophy, IconX, IconPlus, IconGrip, IconSearch, IconTrash, IconStar, IconUserCheck, IconEmptyGroup, IconEmptyFriends } from '@/app/dashboard/_icons'

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ src, name, size = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || '/default-avatar.svg'}
      alt={name}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-cover flex-shrink-0 bg-gray-100 dark:bg-zinc-800"
      onError={e => { e.currentTarget.src = '/default-avatar.svg' }}
    />
  )
}

const MAX_GROUP_SIZE = 8

// 난이도 정렬 순서 (하드/악몽 → 노말 순). 같은 그룹의 난이도는 동일 가중치.
const DIFF_SORT_ORDER = { nightmare: 0, hard: 1, stage3: 0, stage2: 1, stage1: 2, normal: 2 }

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDisplayName(user) {
  return user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
}

function getRepChar(user) {
  let rep = null
  for (const exp of user?.loaExpeditions || []) {
    for (const char of exp.characters || []) {
      if (!rep || char.itemLevel > rep.itemLevel) rep = char
    }
  }
  return rep
}

function hasIncompleteChar(friend, raidId, difficulty) {
  if (!friend.raidPublicFriends) return false
  for (const exp of friend.loaExpeditions || []) {
    for (const char of exp.characters || []) {
      const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      if (raidStatusOf(entry) !== 'complete') return true
    }
  }
  return false
}

function getIncompleteChars(friend, raidId, difficulty) {
  if (!friend.raidPublicFriends) return []
  const result = []
  for (const exp of friend.loaExpeditions || []) {
    for (const char of exp.characters || []) {
      const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      if (raidStatusOf(entry) !== 'complete') result.push(char)
    }
  }
  return result
}

function computeGroupRaids(groupFriends, me) {
  const mePublic = me ? { ...me, raidPublicFriends: true } : null
  const allParticipants = mePublic ? [mePublic, ...groupFriends] : groupFriends
  if (allParticipants.length === 0) return []

  const allKeys = new Set()
  for (const friend of allParticipants) {
    if (!friend.raidPublicFriends) continue
    for (const exp of friend.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        for (const raid of char.characterRaids || []) {
          if (!HIDDEN_RAID_IDS.has(raid.raidId)) {
            allKeys.add(`${raid.raidId}__${raid.difficulty}`)
          }
        }
      }
    }
  }

  // 그룹 인원이 레이드 최대 인원을 초과하는 경우 해당 레이드 제외
  const groupSize = allParticipants.length
  const raidMaxPlayers = Object.fromEntries(RAIDS.filter(r => r.maxPlayers).map(r => [r.id, r.maxPlayers]))

  // 모든 참여자(나 포함)가 미완료 캐릭터를 보유한 레이드만 표시
  const intersection = [...allKeys].filter(key => {
    const [raidId, difficulty] = key.split('__')
    if (raidMaxPlayers[raidId] && groupSize > raidMaxPlayers[raidId]) return false
    return allParticipants.every(friend => hasIncompleteChar(friend, raidId, difficulty))
  })

  return intersection
    .map(key => { const [raidId, difficulty] = key.split('__'); return { raidId, difficulty } })
    .sort((a, b) => {
      const ro = (RAID_ORDER_MAP[a.raidId] ?? 99) - (RAID_ORDER_MAP[b.raidId] ?? 99)
      if (ro !== 0) return ro
      return (DIFF_SORT_ORDER[a.difficulty] ?? 9) - (DIFF_SORT_ORDER[b.difficulty] ?? 9)
    })
}

function getRaidInfo(raidId, difficulty) {
  const raid = RAID_MAP[raidId]
  if (!raid) return { name: raidId, diffLabel: difficulty, image: null }
  const diff = raid.difficulties?.find(d => d.key === difficulty)
  return { name: raid.name, diffLabel: diff?.label || difficulty, image: raid.image }
}

// ── Friend Raid Modal ──────────────────────────────────────────────────────────
const DIFF_TEXT_COLOR = {
  nightmare: 'text-violet-500 dark:text-violet-400',
  hard:      'text-red-500 dark:text-red-400',
  normal:    'text-sky-500 dark:text-sky-400',
  stage3:    'text-violet-500 dark:text-violet-400',
  stage2:    'text-red-500 dark:text-red-400',
  stage1:    'text-sky-500 dark:text-sky-400',
}

// ── FriendRaidModal — RaidDetailModal 어댑터 ─────────────────────────────────
function FriendRaidModal({ friend, me, persistedToggles = {}, onCharToggle, onClose, isDemo = false }) {
  const { incompleteRaids, completedRaids, togetherRaids } = useMemo(() => {
    const raidKeys = new Set()
    for (const exp of friend.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        for (const raid of char.characterRaids || []) {
          if (!HIDDEN_RAID_IDS.has(raid.raidId) && !EX_RAID_IDS.has(raid.raidId) && RAID_MAP[raid.raidId]) raidKeys.add(`${raid.raidId}__${raid.difficulty}`)
        }
      }
    }

    const sortedKeys = [...raidKeys].sort((a, b) => {
      const [aId, aDiff] = a.split('__'), [bId, bDiff] = b.split('__')
      const ro = (RAID_ORDER_MAP[aId] ?? 99) - (RAID_ORDER_MAP[bId] ?? 99)
      return ro !== 0 ? ro : (DIFF_SORT_ORDER[aDiff] ?? 9) - (DIFF_SORT_ORDER[bDiff] ?? 9)
    })

    const raidData = sortedKeys.map(key => {
      const [raidId, difficulty] = key.split('__')
      const chars = []
      for (const exp of friend.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry) continue
          chars.push({ ...char, charClass: char.class, status: raidStatusOf(entry) })
        }
      }
      return { raidId, difficulty, chars }
    }).filter(r => r.chars.length > 0)

    const incompleteRaids = raidData
      .map(r => ({ ...r, chars: r.chars.filter(c => c.status !== 'complete') }))
      .filter(r => r.chars.length > 0)

    const completedRaids = raidData
      .map(r => ({ ...r, chars: r.chars.filter(c => c.status === 'complete') }))
      .filter(r => r.chars.length > 0)

    const togetherRaids = incompleteRaids.filter(({ raidId, difficulty }) => {
      for (const exp of me?.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (entry && raidStatusOf(entry) !== 'complete') return true
        }
      }
      return false
    })

    return { incompleteRaids, completedRaids, togetherRaids }
  }, [friend, me])

  function myCharsForRaid(raidId, difficulty) {
    if (!me) return []
    const result = []
    for (const exp of me.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (entry && raidStatusOf(entry) !== 'complete') {
          result.push({ ...char, charClass: char.class })
        }
      }
    }
    return result
  }

  const repChar = getRepChar(friend)

  return (
    <RaidDetailModal
      name={getDisplayName(friend)}
      image={friend.image}
      discordUsername={friend.discordUsername}
      repChar={repChar ? { name: repChar.name } : null}
      togetherRaids={togetherRaids}
      incompleteRaids={incompleteRaids}
      completedRaids={completedRaids}
      myUser={{ name: '나', image: me?.image }}
      myCharsForRaid={myCharsForRaid}
      persistedToggles={persistedToggles}
      onCharToggle={onCharToggle}
      onClose={onClose}
      isDemo={isDemo}
    />
  )
}

// ── Raid Members Modal ────────────────────────────────────────────────────────
function RaidMembersModal({ modal, me, persistedToggles = {}, onCharToggle, onClose, isDemo = false }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const [localDone, setLocalDone] = useState({})
  const { groupFriends, raidId, difficulty } = modal

  function handleMyCharToggle(char) {
    const key = `${char.id}:${raidId}:${difficulty}`
    const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
    if (!entry) return
    const currentDone = key in localDone ? localDone[key] : (persistedToggles[key] ?? false)
    const newDone = !currentDone
    setLocalDone(prev => ({ ...prev, [key]: newDone }))
    onCharToggle?.(key, newDone)
    if (isDemo) return
    saveRaidCompletion(char.id, entry, newDone)
  }
  const { name, image } = getRaidInfo(raidId, difficulty)
  const mePublic = me ? { ...me, raidPublicFriends: true } : null
  const participants = [mePublic, ...groupFriends].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl shadow-border w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">

        {/* 헤더 */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] flex-shrink-0">
          {image && (
            <Image src={image} alt="" width={26} height={26} className="rounded-lg object-cover flex-shrink-0" unoptimized />
          )}
          <span className="flex-1 text-sm ns-bold text-gray-800 dark:text-zinc-100 truncate">{name}</span>
          <span className={`text-[11px] px-2 py-0.5 rounded-md flex-shrink-0 ns-bold ${DIFF_COLOR[difficulty] || 'bg-gray-100 text-gray-600'}`}>
            {DIFF_LABEL[difficulty] || difficulty}
          </span>
          <button type="button" onClick={onClose}
            className="flex-shrink-0 p-1 rounded-lg text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 transition-colors ml-1">
            <IconX size={14} />
          </button>
        </div>

        {/* 참여자 목록 */}
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-white/[0.04]">
          {participants.map((participant, idx) => {
            const isMe = idx === 0 && mePublic !== null
            const chars = getIncompleteChars(participant, raidId, difficulty)
            const friendName = getDisplayName(participant)
            return (
              <div key={participant.id} className="px-5 py-4">
                <div className="flex items-center gap-2 mb-3">
                  <Avatar src={participant.image} name={friendName} size={22} />
                  <span className="text-[12px] ns-bold text-gray-700 dark:text-zinc-300">{friendName}</span>
                  {isMe && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold">나</span>
                  )}
                </div>
                {chars.length === 0 ? (
                  <p className="text-[11px] text-gray-300 dark:text-zinc-700 ml-7">미완료 캐릭터 없음</p>
                ) : (
                  <div className="ml-7 flex flex-col gap-1.5">
                    {chars.map(char => {
                      const classIcon = getClassIcon(char.class)
                      const charKey = `${char.id}:${raidId}:${difficulty}`
                      const effectiveDone = isMe ? (charKey in localDone ? localDone[charKey] : (persistedToggles[charKey] ?? false)) : false
                      return (
                        <div key={char.id}
                          onClick={isMe ? () => handleMyCharToggle(char) : undefined}
                          className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-colors ${
                            effectiveDone
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-400 dark:border-emerald-600 cursor-pointer'
                              : isMe
                              ? 'bg-gray-50 dark:bg-zinc-900/60 border-gray-100 dark:border-white/[0.05] cursor-pointer hover:bg-gray-100 dark:hover:bg-zinc-800/60'
                              : 'bg-gray-50 dark:bg-zinc-900/60 border-gray-100 dark:border-white/[0.05]'
                          }`}>
                          {classIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={classIcon} alt={char.class} width={18} height={18}
                              className="flex-shrink-0 class-icon"
                            />
                          ) : (
                            <div className="w-[18px] h-[18px] flex-shrink-0" />
                          )}
                          <span className={`text-[12px] ns-bold flex-1 truncate min-w-0 ${effectiveDone ? 'text-emerald-700 dark:text-emerald-400' : 'text-gray-700 dark:text-zinc-200'}`}>{char.name}</span>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
                            {effectiveDone && (
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 flex-shrink-0">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            <div className="flex items-center gap-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                              <IconTrophy />
                              <span>{Number(char.itemLevel).toFixed(2)}</span>
                            </div>
                            {char.combatPower != null && (
                              <div className="flex items-center gap-0.5 text-[11px] text-gray-500 dark:text-zinc-400">
                                <Image src="/combat-power.svg" alt="전투력" width={12} height={12} unoptimized />
                                <span>{Math.round(Number(char.combatPower)).toLocaleString('ko-KR')}</span>
                              </div>
                            )}
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
      </div>
    </div>
  )
}

// ── Friend Picker Modal (모바일 그룹 추가용) ──────────────────────────────────
function FriendPickerModal({ groupId, groups, friends, onAdd, onClose }) {
  const group = groups.find(g => g.id === groupId)
  const alreadyIn = new Set(group?.memberIds || [])
  const isFull = (group?.memberIds?.length || 0) >= MAX_GROUP_SIZE
  const groupIdx = groups.findIndex(g => g.id === groupId)

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-t-2xl sm:rounded-2xl shadow-xl w-full sm:max-w-sm flex flex-col overflow-hidden max-h-[75vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/[0.08] flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-sm ns-bold text-gray-800 dark:text-zinc-100">그룹 {groupIdx + 1}에 친구 추가</span>
            {isFull && (
              <span className="text-[11px] px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-500/10 text-red-400 ns-bold">{MAX_GROUP_SIZE}명 꽉 참</span>
            )}
          </div>
          <button type="button" onClick={onClose}
            className="p-1 rounded-lg text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 transition-colors">
            <IconX size={14} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 divide-y divide-gray-50 dark:divide-white/[0.03]">
          {friends.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-xs text-gray-400 dark:text-zinc-600">친구가 없습니다</p>
              <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1">친구 탭에서 친구를 먼저 추가하세요</p>
            </div>
          ) : friends.map(friend => {
            const inGroup = alreadyIn.has(friend.id)
            const name = getDisplayName(friend)
            const repChar = getRepChar(friend)
            return (
              <div key={friend.id} className="flex items-center gap-3 px-4 py-3">
                <Avatar src={friend.image} name={name} size={36} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">{name}</div>
                  {friend.discordUsername && (
                    <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">@{friend.discordUsername}</div>
                  )}
                  {repChar && (
                    <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                      <span className="text-[var(--accent-400)] flex-shrink-0"><IconCrown /></span>
                      <span className="truncate">{repChar.name}</span>
                      <span className="flex-shrink-0 mx-0.5">·</span>
                      <span className="text-gray-400 dark:text-gray-500 flex-shrink-0"><IconTrophy /></span>
                      <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
                    </div>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {inGroup ? (
                    <span className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ns-bold">추가됨</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { onAdd(groupId, friend.id) }}
                      disabled={isFull}
                      className="flex items-center gap-1 text-[12px] px-3 py-1.5 rounded-lg ns-bold
                        bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)]
                        text-gray-900 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <IconPlus size={10} />
                      추가
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onConfirm, onCancel }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])
  const name = getDisplayName(modal.target)

  const config = {
    unfriend: {
      icon: <IconTrash size={20} />,
      iconBg: 'bg-red-50 dark:bg-red-500/10 text-red-400',
      title: '친구 삭제',
      message: `님을 친구 목록에서 삭제할까요?`,
      confirmLabel: '삭제',
      confirmClass: 'bg-red-500 hover:bg-red-600 active:bg-red-700 text-white',
    },
    accept: {
      icon: <IconUserCheck size={20} />,
      iconBg: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500',
      title: '친구 요청 수락',
      message: `님의 친구 요청을 수락할까요?`,
      confirmLabel: '수락',
      confirmClass: 'bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white',
    },
    reject: {
      icon: <IconX size={18} />,
      iconBg: 'bg-gray-50 dark:bg-zinc-800 text-gray-400 dark:text-zinc-500',
      title: '친구 요청 거절',
      message: `님의 친구 요청을 거절할까요?`,
      confirmLabel: '거절',
      confirmClass: 'bg-gray-700 hover:bg-gray-800 dark:bg-zinc-700 dark:hover:bg-zinc-600 text-white',
    },
  }[modal.type]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl shadow-border w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${config.iconBg}`}>
            {config.icon}
          </div>
          <h3 className="text-base ns-bold text-gray-900 dark:text-white mb-1">{config.title}</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            <span className="ns-bold text-gray-800 dark:text-zinc-200">{name}</span>{config.message}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-2.5 text-sm ns-bold rounded-xl border border-gray-200 dark:border-white/[0.1]
              text-gray-600 dark:text-zinc-400 hover:bg-gray-50 dark:hover:bg-white/[0.04] transition-colors"
          >
            취소
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-2.5 text-sm ns-bold rounded-xl transition-colors ${config.confirmClass}`}
          >
            {config.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Search Result Card ─────────────────────────────────────────────────────────
function SearchResultCard({ user, onSendRequest, sending }) {
  const name = getDisplayName(user)
  const repChar = getRepChar(user)

  const statusBadge = {
    friend:   <span className="text-[11px] px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 ns-bold">친구</span>,
    sent:     <span className="text-[11px] px-2 py-1 rounded-lg bg-gray-50 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400">요청 중</span>,
    received: <span className="text-[11px] px-2 py-1 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold">받은 요청</span>,
    none: (
      <button
        type="button"
        onClick={() => onSendRequest(user.id)}
        disabled={sending === user.id}
        className="flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg ns-bold
          bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)]
          text-gray-900 transition-colors disabled:opacity-50"
      >
        <IconPlus size={10} />
        친구 추가
      </button>
    ),
  }[user.relationStatus] || null

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors">
      <Avatar src={user.image} name={name} size={34} />
      <div className="flex-1 min-w-0">
        <div className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">{name}</div>
        {user.discordUsername && (
          <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">
            @{user.discordUsername}
          </div>
        )}
        {repChar && (
          <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
            <span className="text-[var(--accent-400)] flex-shrink-0">
              <IconCrown />
            </span>
            <span className="truncate">{repChar.name}</span>
            <span className="flex-shrink-0 mx-0.5">·</span>
            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0">
              <IconTrophy />
            </span>
            <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
          </div>
        )}
      </div>
      <div className="flex-shrink-0">{statusBadge}</div>
    </div>
  )
}

// ── Raid Lookup Panel ────────────────────────────────────────────────────────
function RaidLookupPanel({ me, friends, isDemo = false }) {
  const [selectedRaid, setSelectedRaid] = useState(null)
  const [localDone, setLocalDone] = useState({})

  function handleMyCharToggle(char) {
    if (!selectedRaid) return
    const { raidId, difficulty } = selectedRaid
    const key = `${char.id}:${raidId}:${difficulty}`
    const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
    if (!entry) return
    const currentDone = key in localDone ? localDone[key] : char.done
    const newDone = !currentDone
    setLocalDone(prev => ({ ...prev, [key]: newDone }))
    if (isDemo) return
    saveRaidCompletion(char.id, entry, newDone)
  }

  const myRaids = useMemo(() => {
    const seen = new Set()
    const list = []
    for (const exp of me?.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        for (const raid of char.characterRaids || []) {
          if (HIDDEN_RAID_IDS.has(raid.raidId)) continue
          const key = `${raid.raidId}__${raid.difficulty}`
          if (!seen.has(key)) {
            seen.add(key)
            list.push({ raidId: raid.raidId, difficulty: raid.difficulty })
          }
        }
      }
    }
    list.sort((a, b) => {
      const ro = (RAID_ORDER_MAP[a.raidId] ?? 99) - (RAID_ORDER_MAP[b.raidId] ?? 99)
      if (ro !== 0) return ro
      return (DIFF_SORT_ORDER[a.difficulty] ?? 9) - (DIFF_SORT_ORDER[b.difficulty] ?? 9)
    })
    return list
  }, [me])

  const myRaidAllDone = useMemo(() => {
    const result = {}
    for (const { raidId, difficulty } of myRaids) {
      const key = `${raidId}__${difficulty}`
      let hasChar = false
      let allDone = true
      for (const exp of me?.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry) continue
          hasChar = true
          const charKey = `${char.id}:${raidId}:${difficulty}`
          const done = charKey in localDone ? localDone[charKey] : raidStatusOf(entry) === 'complete'
          if (!done) allDone = false
        }
      }
      result[key] = hasChar && allDone
    }
    return result
  }, [myRaids, me, localDone])

  const raidResults = useMemo(() => {
    if (!selectedRaid) return null
    const { raidId, difficulty } = selectedRaid

    const myChars = []
    for (const exp of me?.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (entry) myChars.push({ ...char, done: raidStatusOf(entry) === 'complete' })
      }
    }

    const friendEntries = []
    for (const friend of friends) {
      if (!friend.raidPublicFriends) continue
      let hasRaid = false
      const chars = []
      for (const exp of friend.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry) continue
          hasRaid = true
          chars.push({ ...char, done: raidStatusOf(entry) === 'complete' })
        }
      }
      if (hasRaid) friendEntries.push({ friend, chars })
    }

    return { myChars, friendEntries }
  }, [selectedRaid, me, friends])

  return (
    <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl overflow-hidden
      shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)]">

      <div className="px-4 pt-3 pb-3 border-b border-gray-50 dark:border-white/[0.04]">
        <span className="text-[11px] ns-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">레이드별 친구 현황</span>
      </div>

      {myRaids.length === 0 ? (
        <div className="px-4 py-14 text-center">
          <p className="text-sm text-gray-400 dark:text-zinc-600">등록된 레이드가 없습니다</p>
          <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1.5">대시보드에서 레이드를 설정하면 친구들의 현황을 확인할 수 있어요</p>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row">

          {/* 레이드 버튼 목록 — 모바일: 상단 가로 스크롤, 데스크탑: 좌측 세로 목록 */}
          <div className="md:w-44 md:flex-shrink-0 md:border-r border-b md:border-b-0 border-gray-50 dark:border-white/[0.04] overflow-x-auto md:overflow-x-hidden">
            <div className="flex md:flex-col min-w-max md:min-w-0 px-2 py-2 md:px-0 md:py-0 gap-1.5 md:gap-0">
            {myRaids.map(({ raidId, difficulty }) => {
              const { name, diffLabel, image } = getRaidInfo(raidId, difficulty)
              const raidKey = `${raidId}__${difficulty}`
              const isSelected = selectedRaid?.raidId === raidId && selectedRaid?.difficulty === difficulty
              return (
                <button
                  key={raidKey}
                  type="button"
                  onClick={() => setSelectedRaid(isSelected ? null : { raidId, difficulty })}
                  className={`flex items-center gap-1.5 md:gap-2 md:w-full md:px-3 md:py-2.5 px-2.5 py-2 md:rounded-none rounded-xl text-left flex-shrink-0 md:flex-shrink transition-colors
                    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-400)]
                    active:bg-[var(--accent-200)] dark:active:bg-[var(--accent-900)]/30
                    ${isSelected
                      ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20'
                      : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                    }`}
                >
                  {image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={image} alt="" className="w-5 h-5 rounded-md object-cover flex-shrink-0 opacity-80" />
                  )}
                  <div className="min-w-0">
                    <div className={`text-[12px] ns-bold leading-tight flex items-center gap-1 ${
                      isSelected ? 'text-[var(--accent-700)] dark:text-[var(--accent-300)]' : 'text-gray-700 dark:text-zinc-300'
                    }`}>
                      <span className="truncate max-w-[80px] md:max-w-none">{name}</span>
                      {myRaidAllDone[raidKey] && (
                        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 text-emerald-500 dark:text-emerald-400">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      )}
                    </div>
                    <div className={`text-[10px] mt-0.5 ${
                      isSelected
                        ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)]'
                        : (DIFF_TEXT_COLOR[difficulty] || 'text-gray-400 dark:text-zinc-600')
                    }`}>{diffLabel}</div>
                  </div>
                  {isSelected && <div className="hidden md:block w-0.5 h-5 rounded-full bg-[var(--accent-400)] flex-shrink-0 ml-auto" />}
                </button>
              )
            })}
            </div>
          </div>

          {/* 결과 패널 */}
          <div className="flex-1 min-w-0">
            {!selectedRaid ? (
              <div className="flex flex-col items-center justify-center h-full min-h-[200px] text-center px-4 py-10">
                <p className="text-xs text-gray-300 dark:text-zinc-700">레이드를 선택하면<br />친구들의 남은 캐릭터를 볼 수 있어요</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-50 dark:divide-white/[0.04]">

                {/* 나 */}
                <div className="px-4 py-3">
                  <div className="flex items-center gap-2 mb-1.5">
                    <Avatar src={me?.image} name={getDisplayName(me)} size={22} />
                    <div className="flex items-center gap-1.5 flex-1 min-w-0">
                      <span className="text-[12px] ns-bold text-gray-800 dark:text-zinc-100 truncate">{getDisplayName(me)}</span>
                      <span className="flex-shrink-0 text-[10px] px-1.5 py-0.5 rounded ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]">나</span>
                    </div>
                  </div>
                  {raidResults?.myChars.length === 0 ? (
                    <p className="text-[11px] text-gray-400 dark:text-zinc-600 ml-7">등록된 캐릭터 없음</p>
                  ) : (
                    <div className="ml-7 flex flex-wrap gap-1">
                      {[...raidResults.myChars].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((char, i) => {
                        const charKey = `${char.id}:${selectedRaid.raidId}:${selectedRaid.difficulty}`
                        const effectiveDone = charKey in localDone ? localDone[charKey] : char.done
                        const icon = getClassIcon(char.class)
                        return (
                          <CharChip key={i} itemLevel={char.itemLevel} combatPower={char.combatPower}
                            onClick={() => handleMyCharToggle(char)}
                            className={effectiveDone
                              ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                              : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}>
                            {effectiveDone && (
                              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            )}
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />}
                            <span>{char.name}</span>
                          </CharChip>
                        )
                      })}
                    </div>
                  )}
                </div>

                {/* 친구들 */}
                {raidResults?.friendEntries.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-gray-400 dark:text-zinc-600">이 레이드가 등록된 친구가 없습니다</p>
                  </div>
                ) : (
                  raidResults.friendEntries.map(({ friend, chars }) => {
                    const name = getDisplayName(friend)
                    return (
                      <div key={friend.id} className="px-4 py-3">
                        <div className="flex items-center gap-2 mb-1.5">
                          <Avatar src={friend.image} name={name} size={22} />
                          <span className="text-[12px] ns-bold text-gray-800 dark:text-zinc-100 flex-1 truncate min-w-0">{name}</span>
                          {friend.isFavorite && (
                            <span className="text-[var(--accent-500)] dark:text-[var(--accent-400)] flex-shrink-0">
                              <IconStar filled size={10} />
                            </span>
                          )}
                        </div>
                        <div className="ml-7 flex flex-wrap gap-1">
                          {[...chars].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0)).map((char, i) => {
                            const icon = getClassIcon(char.class)
                            return (
                              <CharChip key={i} itemLevel={char.itemLevel} combatPower={char.combatPower}
                                className={char.done
                                  ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                                  : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}>
                                {char.done && (
                                  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />}
                                <span>{char.name}</span>
                              </CharChip>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function GroupClient({ initialFriends, initialRequests, me, isDemo = false }) {
  const [friends, setFriends]     = useState(initialFriends)
  const [requests, setRequests]   = useState(initialRequests)
  const [dragging, setDragging]   = useState(null)
  const [dragOver, setDragOver]   = useState(null)
  const [activeTab, setActiveTab] = useState('friends')
  const [confirmModal, setConfirmModal] = useState(null)
  const [raidModal, setRaidModal] = useState(null) // { groupFriends, raidId, difficulty }
  const [friendModal, setFriendModal] = useState(null) // { friend }
  const [myCharToggles, setMyCharToggles] = useState({})
  const handleCharToggle = (key, val) => setMyCharToggles(prev => ({ ...prev, [key]: val }))
  const [addToGroupModal, setAddToGroupModal] = useState(null) // groupId | null
  const [showDemoLogin, setShowDemoLogin] = useState(false)
  const requireLogin = () => setShowDemoLogin(true)

  // 그룹 — localStorage 영속화
  const [groups, setGroupsRaw] = useState([])
  useEffect(() => {
    try {
      const saved = localStorage.getItem('myloa_groups')
      if (saved) setGroupsRaw(JSON.parse(saved))
    } catch {}
  }, [])
  const setGroups = useCallback((updater) => {
    setGroupsRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      try { localStorage.setItem('myloa_groups', JSON.stringify(next)) } catch {}
      return next
    })
  }, [])

  // 검색
  const [searchQ, setSearchQ]           = useState('')
  const [searchResults, setSearchResults] = useState(null) // null = 검색 안 함
  const [searching, setSearching]       = useState(false)
  const [sending, setSending]           = useState(null) // userId being sent request
  const [sendError, setSendError]       = useState('')   // 친구추가 에러 메시지
  const debounceRef = useRef(null)

  const pendingCount = requests.length

  // 검색 (디바운스)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (!searchQ.trim() || searchQ.trim().length < 2) {
      setSearchResults(null)
      return
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await fetch(`/api/group/search?q=${encodeURIComponent(searchQ.trim())}`)
        const data = await res.json()
        setSearchResults(data.users || [])
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(debounceRef.current)
  }, [searchQ])

  // ── Actions ────────────────────────────────────────────────────────────────
  const sendRequest = useCallback(async (receiverId) => {
    if (isDemo) { requireLogin(); return }
    setSending(receiverId)
    setSendError('')
    try {
      const res = await fetch('/api/group/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setSendError(data.error || '오류가 발생했습니다')
        return
      }
      if (data.autoAccepted) {
        // 자동 수락 — 그룹원 목록 갱신
        const friendRes = await fetch('/api/group')
        const friendData = await friendRes.json()
        setFriends(friendData.friends || [])
        setRequests(prev => prev.filter(r => r.sender.id !== receiverId))
      }
      // 검색 결과에서 상태 업데이트
      setSearchResults(prev => prev?.map(u =>
        u.id === receiverId ? { ...u, relationStatus: data.autoAccepted ? 'friend' : 'sent' } : u
      ))
    } finally {
      setSending(null)
    }
  }, [])

  const handleAccept = useCallback((req) => {
    if (isDemo) { requireLogin(); return }
    setConfirmModal({ type: 'accept', target: req.sender, requestId: req.id })
  }, [isDemo])

  const handleReject = useCallback((req) => {
    if (isDemo) { requireLogin(); return }
    setConfirmModal({ type: 'reject', target: req.sender, requestId: req.id })
  }, [isDemo])

  const handleUnfriend = useCallback((friend) => {
    if (isDemo) { requireLogin(); return }
    setConfirmModal({ type: 'unfriend', target: friend })
  }, [isDemo])

  const handleConfirm = useCallback(async () => {
    if (!confirmModal) return
    const { type, target, requestId } = confirmModal
    setConfirmModal(null)

    if (type === 'accept') {
      // 즉시 그룹원 목록에 추가 (target = req.sender, 이미 loaExpeditions 포함)
      const newFriend = { ...target, isFavorite: false }
      setFriends(prev =>
        [...prev, newFriend].sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
      )
      setRequests(prev => prev.filter(r => r.id !== requestId))
      fetch(`/api/group/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'accept' }),
      })
    }

    if (type === 'reject') {
      setRequests(prev => prev.filter(r => r.id !== requestId))
      await fetch(`/api/group/requests/${requestId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject' }),
      })
    }

    if (type === 'unfriend') {
      setFriends(prev => prev.filter(f => f.id !== target.id))
      setGroups(prev => prev.map(g => ({ ...g, memberIds: g.memberIds.filter(id => id !== target.id) })))
      await fetch('/api/group', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId: target.id }),
      })
    }
  }, [confirmModal])

  const toggleFavorite = useCallback(async (friend) => {
    if (isDemo) { requireLogin(); return }
    const nowFav = !friend.isFavorite
    setFriends(prev =>
      prev
        .map(f => f.id === friend.id ? { ...f, isFavorite: nowFav } : f)
        .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
    )
    await fetch('/api/group/favorites', {
      method: nowFav ? 'POST' : 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId: friend.id }),
    })
  }, [])

  // ── Groups ────────────────────────────────────────────────────────────────
  const addGroup    = () => setGroups(prev => [...prev, { id: crypto.randomUUID(), memberIds: [] }])
  const deleteGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id))
  const addToGroup = (groupId, friendId) => setGroups(prev => prev.map(g =>
    g.id === groupId && !g.memberIds.includes(friendId) && g.memberIds.length < MAX_GROUP_SIZE
      ? { ...g, memberIds: [...g.memberIds, friendId] }
      : g
  ))
  const removeFromGroup = (groupId, friendId) => setGroups(prev => prev.map(g =>
    g.id === groupId ? { ...g, memberIds: g.memberIds.filter(id => id !== friendId) } : g
  ))
  const onDragStart = (e, friendId) => { e.dataTransfer.effectAllowed = 'copy'; setDragging(friendId) }
  const onDragEnd   = () => { setDragging(null); setDragOver(null) }
  const onDragOver  = (e, groupId) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; setDragOver(groupId) }
  const onDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOver(null) }
  const onDrop      = (e, groupId) => { e.preventDefault(); if (dragging) addToGroup(groupId, dragging); setDragging(null); setDragOver(null) }

  // ── Tabs ──────────────────────────────────────────────────────────────────
  const tabs = [
    { key: 'friends', label: '친구', count: friends.length },
    { key: 'groups', label: '그룹' },
    { key: 'requests', label: '받은 요청', count: pendingCount, badge: true },
  ]

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f]">
      {confirmModal && (
        <ConfirmModal
          modal={confirmModal}
          onConfirm={handleConfirm}
          onCancel={() => setConfirmModal(null)}
        />
      )}
      {raidModal && (
        <RaidMembersModal
          modal={raidModal}
          me={me}
          persistedToggles={myCharToggles}
          onCharToggle={handleCharToggle}
          onClose={() => setRaidModal(null)}
          isDemo={isDemo}
        />
      )}
      {friendModal && (
        <FriendRaidModal
          friend={friendModal.friend}
          me={me}
          persistedToggles={myCharToggles}
          onCharToggle={handleCharToggle}
          onClose={() => setFriendModal(null)}
          isDemo={isDemo}
        />
      )}
      {addToGroupModal && (
        <FriendPickerModal
          groupId={addToGroupModal}
          groups={groups}
          friends={friends}
          onAdd={(groupId, friendId) => { addToGroup(groupId, friendId) }}
          onClose={() => setAddToGroupModal(null)}
        />
      )}

      {/* ── 미리보기 배너 ────────────────────────────────────────────────── */}
      {isDemo && (
        <div className="flex items-center gap-3 mx-4 sm:mx-8 mt-4 mb-4 rounded-lg shadow-border-md bg-white dark:bg-[#222222] px-3.5 py-2.5 text-xs">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
          <span className="text-gray-500 dark:text-gray-400">
            <span className="ns-bold text-gray-700 dark:text-gray-200">미리보기 모드</span>
            {' '}· 샘플 데이터가 표시되고 있어요. 그룹 기능은 로그인 후 이용할 수 있어요.
          </span>
          <button
            onClick={() => signIn('discord', { callbackUrl: '/group' })}
            className="ml-auto flex-shrink-0 flex items-center gap-1 ns-bold text-[var(--accent-500)] hover:text-[var(--accent-600)] transition-colors"
          >
            로그인하기 →
          </button>
        </div>
      )}
      {/* ── 페이지 헤더 ─────────────────────────────────────────────────── */}
      <div className="mx-4 sm:mx-8 py-5 border-b border-gray-100 dark:border-white/[0.05] bg-white dark:bg-[#111] rounded-t-xl px-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg ns-bold text-gray-900 dark:text-white">그룹</h1>
              {isDemo && (
                <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-400)]">미리보기</span>
              )}
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              친구와 함께 갈 수 있는 레이드를 확인하세요
            </p>
          </div>
          {activeTab === 'groups' && (
            <button
              type="button"
              onClick={addGroup}
              className="flex items-center gap-1.5 px-4 py-2 text-sm ns-bold rounded-xl
                bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)]
                text-gray-900 transition-colors shadow-sm"
            >
              <IconPlus size={13} />
              새 그룹
            </button>
          )}
        </div>

        {/* ── 탭 ─────────────────────────────────────────────────────────── */}
        <div className="mt-4 flex gap-1 w-full lg:w-1/2">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative flex-1 text-center px-4 py-1.5 text-sm ns-bold rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--accent-400)] text-gray-900'
                  : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
              {/* 그룹원 수 뱃지 */}
              {tab.count != null && tab.count > 0 && !tab.badge && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-black/10 text-gray-900'
                    : 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                }`}>
                  {tab.count}
                </span>
              )}
              {/* 요청 알림 뱃지 */}
              {tab.badge && tab.count > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[10px] ns-bold rounded-full bg-red-500 text-white">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-6">

        {/* ── 친구 탭 ──────────────────────────────────────────────────────── */}
        {activeTab === 'friends' && (
          <div className="flex gap-4 items-start flex-col xl:flex-row">
            <div className="w-full xl:w-96 flex-shrink-0 space-y-4">

            {/* 친구 추가 검색 */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] overflow-hidden">
              <div className="px-4 pt-4 pb-4">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-sm ns-bold text-gray-700 dark:text-zinc-200">친구 추가</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600 pointer-events-none">
                    <IconSearch size={15} />
                  </span>
                  <input
                    type="text"
                    value={searchQ}
                    onChange={e => !isDemo && setSearchQ(e.target.value)}
                    onFocus={() => isDemo && requireLogin()}
                    readOnly={isDemo}
                    placeholder={isDemo ? '로그인 후 친구를 추가할 수 있어요' : '닉네임 또는 대표캐릭터 이름으로 검색'}
                    className={`w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/[0.1]
                      bg-gray-50 dark:bg-[#111] text-gray-800 dark:text-zinc-100 placeholder-gray-300 dark:placeholder-zinc-600
                      focus:outline-none focus:border-[var(--accent-400)] dark:focus:border-[var(--accent-400)] transition-colors
                      ${isDemo ? 'cursor-pointer' : ''}`}
                  />
                  {searching && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 animate-spin text-sm leading-none">⟳</span>
                  )}
                  {!searching && searchQ && (
                    <button
                      type="button"
                      onClick={() => { setSearchQ(''); setSearchResults(null) }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 transition-colors"
                    >
                      <IconX size={13} />
                    </button>
                  )}
                </div>

                {sendError && (
                  <p className="mt-2 text-xs text-red-500 dark:text-red-400 px-1">{sendError}</p>
                )}

                {searchResults !== null && (
                  <div className="mt-2 rounded-xl shadow-border overflow-hidden bg-white dark:bg-[#111] shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
                    {searchResults.length === 0 ? (
                      <p className="px-4 py-4 text-sm text-center text-gray-400 dark:text-zinc-600">
                        검색 결과가 없습니다
                      </p>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-white/[0.03]">
                        {searchResults.map(user => (
                          <SearchResultCard
                            key={user.id}
                            user={user}
                            onSendRequest={sendRequest}
                            sending={sending}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {searchResults === null && !searching && (
                  <p className="text-[11px] text-gray-400 dark:text-zinc-600 mt-2">
                    원정대 닉네임 또는 대표캐릭터 이름 2글자 이상 입력하면 검색됩니다
                  </p>
                )}
              </div>
            </div>

            {/* 친구 목록 */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] overflow-hidden">
              <div className="px-4 pt-3 pb-2 border-b border-gray-50 dark:border-white/[0.04] flex items-center gap-2">
                <span className="text-[11px] ns-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">친구</span>
                {friends.length > 0 && (
                  <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                    {friends.length}
                  </span>
                )}
              </div>
              {friends.length === 0 ? (
                <div className="px-4 py-12 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                    <IconEmptyFriends />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">아직 친구가 없습니다</p>
                  <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1">
                    위 검색창에서 닉네임으로 검색해 친구를 추가해 보세요
                  </p>
                </div>
              ) : (
                <>
                  {friends.map((friend, idx) => {
                    const repChar = getRepChar(friend)
                    const name = getDisplayName(friend)
                    const showSection = !friend.isFavorite && idx > 0 && friends[idx - 1]?.isFavorite
                    return (
                      <div key={friend.id}>
                        {showSection && (
                          <div className="px-4 pt-3 pb-1 border-t border-gray-50 dark:border-white/[0.03]">
                            <span className="text-[10px] ns-bold text-gray-400 dark:text-zinc-600 uppercase tracking-wider">전체 친구</span>
                          </div>
                        )}
                        <div
                          className="flex items-center gap-3 px-4 py-3
                            border-b border-gray-50 dark:border-white/[0.03] last:border-b-0
                            hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors cursor-pointer"
                          onClick={() => setFriendModal({ friend })}
                        >
                          <Avatar src={friend.image} name={name} size={36} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">
                                {name}
                              </span>
                              {friend.isFavorite && (
                                <span className="text-[var(--accent-500)] dark:text-[var(--accent-400)] flex-shrink-0">
                                  <IconStar filled size={10} />
                                </span>
                              )}
                            </div>
                            {friend.discordUsername && (
                              <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">
                                @{friend.discordUsername}
                              </div>
                            )}
                            {repChar && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                                <span className="text-[var(--accent-400)] flex-shrink-0"><IconCrown /></span>
                                <span className="truncate">{repChar.name}</span>
                                <span className="flex-shrink-0 mx-0.5">·</span>
                                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0"><IconTrophy /></span>
                                <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => toggleFavorite(friend)}
                              title={friend.isFavorite ? '즐겨찾기 해제' : '즐겨찾기'}
                              className={`p-1.5 rounded-lg transition-colors ${
                                friend.isFavorite
                                  ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
                                  : 'text-gray-300 dark:text-zinc-600 hover:text-[var(--accent-500)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
                              }`}
                            >
                              <IconStar filled={friend.isFavorite} size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUnfriend(friend)}
                              title="친구 삭제"
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs
                                text-gray-400 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                                transition-all"
                            >
                              <IconTrash size={12} />
                              삭제
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </>
              )}
            </div>
            </div>
            <div className="w-full xl:flex-1 sticky top-4">
              <RaidLookupPanel me={me} friends={friends} isDemo={isDemo} />
            </div>
          </div>
        )}

        {/* ── 요청 탭 ──────────────────────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] overflow-hidden">
              {requests.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                    <IconUserCheck size={24} />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">받은 친구 요청이 없습니다</p>
                </div>
              ) : (
                requests.map(req => {
                  const name = getDisplayName(req.sender)
                  const repChar = getRepChar(req.sender)
                  return (
                    <div
                      key={req.id}
                      className="flex items-center gap-3 px-4 py-3
                        border-b border-gray-50 dark:border-white/[0.03] last:border-b-0"
                    >
                      <Avatar src={req.sender.image} name={name} size={36} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">
                          {name}
                        </div>
                        {req.sender.discordUsername && (
                          <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">
                            @{req.sender.discordUsername}
                          </div>
                        )}
                        {repChar && (
                          <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                            <span className="text-[var(--accent-400)] flex-shrink-0"><IconCrown /></span>
                            <span className="truncate">{repChar.name}</span>
                            <span className="flex-shrink-0 mx-0.5">·</span>
                            <span className="text-gray-400 dark:text-gray-500 flex-shrink-0"><IconTrophy /></span>
                            <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => handleAccept(req)}
                          className="px-3 py-1.5 text-xs ns-bold rounded-lg
                            bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700
                            text-white transition-colors"
                        >
                          수락
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(req)}
                          className="px-3 py-1.5 text-xs ns-bold rounded-lg
                            border border-red-200 dark:border-red-500/20
                            text-red-400 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10
                            transition-colors"
                        >
                          거절
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {/* ── 그룹 탭 ──────────────────────────────────────────────────────── */}
        {activeTab === 'groups' && (
          <div className="flex gap-6 items-start flex-col lg:flex-row">

            {/* ── 그룹원 사이드바 — 데스크탑 전용 ──────────────────────────── */}
            <div className="hidden lg:block lg:w-64 flex-shrink-0 sticky top-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-zinc-100">친구</span>
                    <span className="min-w-[20px] text-center text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-1.5 py-0.5 rounded-full">
                      {friends.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-600">
                    드래그해서 그룹에 추가하세요
                  </p>
                </div>

                <div className="border-t border-gray-50 dark:border-white/[0.04] max-h-[calc(100vh-220px)] overflow-y-auto">
                  {friends.length === 0 ? (
                    <div className="px-4 py-10 text-center">
                      <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                        <IconEmptyFriends />
                      </div>
                      <p className="text-xs text-gray-400 dark:text-zinc-600">친구가 없습니다</p>
                      <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1">
                        친구 탭에서 친구를 추가하세요
                      </p>
                    </div>
                  ) : friends.map(friend => {
                    const repChar = getRepChar(friend)
                    const name = getDisplayName(friend)
                    const isDragging = dragging === friend.id
                    return (
                      <div
                        key={friend.id}
                        draggable
                        onDragStart={e => onDragStart(e, friend.id)}
                        onDragEnd={onDragEnd}
                        className={`group relative flex items-center gap-3 px-4 py-3 cursor-grab active:cursor-grabbing select-none
                          border-b border-gray-50 dark:border-white/[0.03] last:border-b-0 transition-colors ${
                          isDragging
                            ? 'opacity-40 bg-gray-50 dark:bg-white/[0.02]'
                            : 'hover:bg-gray-50 dark:hover:bg-white/[0.02]'
                        }`}
                      >
                        <span className="flex-shrink-0 text-gray-200 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity -ml-1">
                          <IconGrip />
                        </span>
                        <Avatar src={friend.image} name={name} size={36} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">{name}</span>
                            {friend.isFavorite && (
                              <span className="text-[var(--accent-500)] dark:text-[var(--accent-400)] flex-shrink-0">
                                <IconStar filled size={10} />
                              </span>
                            )}
                          </div>
                          {friend.discordUsername && (
                            <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate leading-tight">
                              @{friend.discordUsername}
                            </div>
                          )}
                          {repChar && (
                            <div className="flex items-center gap-1 text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5">
                              <span className="text-[var(--accent-400)] flex-shrink-0"><IconCrown /></span>
                              <span className="truncate">{repChar.name}</span>
                              <span className="flex-shrink-0 mx-0.5">·</span>
                              <span className="text-gray-400 dark:text-gray-500 flex-shrink-0"><IconTrophy /></span>
                              <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* ── 그룹 영역 ─────────────────────────────────────────────── */}
            <div className="flex-1 min-w-0 w-full">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]
                  rounded-2xl border-2 border-dashed border-gray-200 dark:border-[#2a2a2a]
                  py-20 text-center shadow-[0_2px_8px_rgba(0,0,0,0.07)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
                  <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-4">
                    <IconEmptyGroup />
                  </div>
                  <p className="text-sm ns-bold text-gray-600 dark:text-zinc-400">그룹이 없습니다</p>
                  <p className="text-xs text-gray-400 dark:text-zinc-600 mt-1 mb-4">
                    그룹을 만들어 함께 갈 수 있는 레이드를 확인하세요
                  </p>
                  <button
                    type="button"
                    onClick={addGroup}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm ns-bold rounded-xl
                      bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)]
                      text-gray-900 transition-colors"
                  >
                    <IconPlus size={13} />
                    첫 번째 그룹 만들기
                  </button>
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {groups.map((group, idx) => {
                    const groupFriends = group.memberIds
                      .map(id => friends.find(f => f.id === id))
                      .filter(Boolean)
                    const raids  = computeGroupRaids(groupFriends, me)
                    const isFull = groupFriends.length >= MAX_GROUP_SIZE
                    const isOver = dragOver === group.id && !isFull

                    return (
                      <div
                        key={group.id}
                        onDragOver={e => onDragOver(e, group.id)}
                        onDragLeave={onDragLeave}
                        onDrop={e => onDrop(e, group.id)}
                        className={`bg-white dark:bg-[#1a1a1a] rounded-2xl border
                          flex flex-col overflow-hidden transition-all duration-150 ${
                          isOver
                            ? 'border-[var(--accent-400)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-400)_15%,transparent)]'
                            : 'border-gray-200 dark:border-[#2a2a2a] shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)]'
                        }`}
                      >
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-50 dark:border-white/[0.04]">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30
                              flex items-center justify-center text-[10px] ns-bold
                              text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                              {idx + 1}
                            </span>
                            <span className="text-sm ns-bold text-gray-700 dark:text-zinc-200">그룹 {idx + 1}</span>
                            {groupFriends.length > 0 && (
                              <span className="text-[10px] text-gray-400 dark:text-zinc-600">{groupFriends.length}/{MAX_GROUP_SIZE}명</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            {!isFull && (
                              <button
                                type="button"
                                onClick={() => setAddToGroupModal(group.id)}
                                title="친구 추가"
                                className="flex items-center gap-1 px-2 py-1.5 rounded-lg text-[11px] ns-bold
                                  text-[var(--accent-700)] dark:text-[var(--accent-300)]
                                  hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20 transition-colors"
                              >
                                <IconPlus size={11} />
                                <span className="hidden sm:inline">친구 추가</span>
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => deleteGroup(group.id)}
                              className="p-1.5 rounded-lg text-gray-300 dark:text-zinc-700
                                hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                            >
                              <IconX size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="px-4 py-3">
                          <div className={`min-h-[56px] rounded-xl border-2 border-dashed p-2.5 transition-all ${
                            isOver
                              ? 'border-[var(--accent-400)] bg-[var(--accent-400)]/5'
                              : 'border-gray-100 dark:border-zinc-800/80'
                          }`}>
                            {group.memberIds.length === 0 ? (
                              <div className="flex items-center justify-center h-8">
                                <span className={`text-[11px] transition-colors ${
                                  isOver
                                    ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)]'
                                    : 'text-gray-300 dark:text-zinc-700'
                                }`}>
                                  <span className="hidden lg:inline">친구를 여기에 드래그하거나 위 + 버튼을 누르세요</span>
                                  <span className="lg:hidden">위 + 버튼으로 친구를 추가하세요</span>
                                </span>
                              </div>
                            ) : isFull ? (
                              <div className="flex flex-col gap-1.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {groupFriends.map(friend => (
                                    <div
                                      key={friend.id}
                                      className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5
                                        bg-gray-50 dark:bg-zinc-800/80 rounded-lg border border-gray-100 dark:border-white/[0.05]"
                                    >
                                      <Avatar src={friend.image} name={getDisplayName(friend)} size={18} />
                                      <span className="text-[11px] ns-bold text-gray-700 dark:text-zinc-300">
                                        {getDisplayName(friend)}
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => removeFromGroup(group.id, friend.id)}
                                        className="text-gray-300 dark:text-zinc-600 hover:text-red-400 transition-colors ml-0.5"
                                      >
                                        <IconX size={9} />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                                <span className="text-[10px] text-gray-400 dark:text-zinc-600 text-center">최대 {MAX_GROUP_SIZE}명 (꽉 참)</span>
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1.5">
                                {groupFriends.map(friend => (
                                  <div
                                    key={friend.id}
                                    className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5
                                      bg-gray-50 dark:bg-zinc-800/80 rounded-lg border border-gray-100 dark:border-white/[0.05]"
                                  >
                                    <Avatar src={friend.image} name={getDisplayName(friend)} size={18} />
                                    <span className="text-[11px] ns-bold text-gray-700 dark:text-zinc-300">
                                      {getDisplayName(friend)}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => removeFromGroup(group.id, friend.id)}
                                      className="text-gray-300 dark:text-zinc-600 hover:text-red-400 transition-colors ml-0.5"
                                    >
                                      <IconX size={9} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        {groupFriends.length > 0 && (
                          <div className="px-4 pb-4 flex-1">
                            <div className="flex items-center gap-1.5 mb-2">
                              <div className="h-px flex-1 bg-gray-50 dark:bg-white/[0.04]" />
                              <span className="text-[10px] ns-bold text-gray-400 dark:text-zinc-600 whitespace-nowrap">
                                {raids.length > 0
                                  ? `함께 갈 수 있는 레이드 ${raids.length}개`
                                  : '함께 갈 수 있는 레이드 없음'}
                              </span>
                              <div className="h-px flex-1 bg-gray-50 dark:bg-white/[0.04]" />
                            </div>

                            {raids.length > 0 && (
                              <div className="space-y-1">
                                {raids.map(({ raidId, difficulty }) => {
                                  const { name, diffLabel, image } = getRaidInfo(raidId, difficulty)
                                  const raidKey = `${raidId}__${difficulty}`
                                  return (
                                    <button
                                      key={raidKey}
                                      type="button"
                                      onClick={() => setRaidModal({ groupFriends, raidId, difficulty })}
                                      className="w-full flex items-center gap-2 px-2.5 py-2 rounded-xl text-left
                                        bg-gray-50 dark:bg-zinc-900/60 hover:bg-gray-100 dark:hover:bg-zinc-800/60
                                        transition-colors cursor-pointer"
                                    >
                                      {image && (
                                        <Image src={image} alt="" width={22} height={22}
                                          className="rounded-lg object-cover flex-shrink-0" unoptimized />
                                      )}
                                      <span className="flex-1 text-[12px] text-gray-700 dark:text-zinc-300 truncate min-w-0">{name}</span>
                                      <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                        DIFF_COLOR[difficulty] || 'bg-gray-100 text-gray-500'
                                      }`}>
                                        {DIFF_LABEL[difficulty] || diffLabel}
                                      </span>
                                    </button>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
      {showDemoLogin && (
        <DemoLoginModal
          onClose={() => setShowDemoLogin(false)}
          callbackUrl="/group"
          description={<>친구 추가 & 관리 기능은<br />디스코드 로그인 후 이용할 수 있어요</>}
        />
      )}
    </div>
  )
}

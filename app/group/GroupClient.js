'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { RAIDS } from '@/lib/raidData'
import { HIDDEN_RAID_IDS, DIFF_LABEL, DIFF_COLOR, getClassIcon } from '@/app/dashboard/_constants'
import { raidStatusOf } from '@/lib/groupRaidShare'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconTrash = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="3 6 5 6 21 6" />
    <path d="M19 6l-1 14H6L5 6" />
    <path d="M10 11v6M14 11v6" />
    <path d="M9 6V4h6v2" />
  </svg>
)
const IconX = ({ size = 12 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconPlus = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
  </svg>
)
const IconGrip = () => (
  <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
    <circle cx="3" cy="2.5" r="1.2"/><circle cx="7" cy="2.5" r="1.2"/>
    <circle cx="3" cy="7" r="1.2"/><circle cx="7" cy="7" r="1.2"/>
    <circle cx="3" cy="11.5" r="1.2"/><circle cx="7" cy="11.5" r="1.2"/>
  </svg>
)
const IconSearch = ({ size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
)
const IconCrown = () => (
  <svg width="12" height="11" viewBox="0 0 24 22" fill="currentColor">
    <path d="M2 19h20v2H2zM22 3.27l-5.5 6.5L12 2 7.5 9.77 2 3.27V18h20V3.27z"/>
  </svg>
)
const IconTrophy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconStar = ({ filled, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IconUserCheck = ({ size = 18 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="8.5" cy="7" r="4" />
    <polyline points="17 11 19 13 23 9" />
  </svg>
)
const IconEmptyGroup = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-zinc-700">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
)
const IconEmptyFriends = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-zinc-700">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <line x1="23" y1="11" x2="17" y2="11" />
    <line x1="20" y1="8" x2="20" y2="14" />
  </svg>
)

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

  // 모든 참여자(나 포함)가 미완료 캐릭터를 보유한 레이드만 표시
  const intersection = [...allKeys].filter(key => {
    const [raidId, difficulty] = key.split('__')
    return allParticipants.every(friend => hasIncompleteChar(friend, raidId, difficulty))
  })

  const raidOrder = Object.fromEntries(RAIDS.map((r, i) => [r.id, i]))
  const DIFF_SORT_MAP = { nightmare: 0, hard: 1, stage3: 0, stage2: 1, stage1: 2, normal: 2 }

  return intersection
    .map(key => { const [raidId, difficulty] = key.split('__'); return { raidId, difficulty } })
    .sort((a, b) => {
      const ro = (raidOrder[a.raidId] ?? 99) - (raidOrder[b.raidId] ?? 99)
      if (ro !== 0) return ro
      return (DIFF_SORT_MAP[a.difficulty] ?? 9) - (DIFF_SORT_MAP[b.difficulty] ?? 9)
    })
}

function getFriendRaidStatus(friend, raidId, difficulty) {
  if (!friend.raidPublicFriends) return 'hidden'
  let hasComplete = false, hasIncomplete = false, hasEntry = false
  for (const exp of friend.loaExpeditions || []) {
    for (const char of exp.characters || []) {
      const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      hasEntry = true
      const s = raidStatusOf(entry)
      if (s === 'complete') hasComplete = true
      else hasIncomplete = true
    }
  }
  if (!hasEntry) return 'none'
  if (!hasIncomplete) return 'complete'
  if (hasComplete) return 'partial'
  return 'incomplete'
}

function getRaidInfo(raidId, difficulty) {
  const raid = RAIDS.find(r => r.id === raidId)
  if (!raid) return { name: raidId, diffLabel: difficulty, image: null }
  const diff = raid.difficulties?.find(d => d.key === difficulty)
  return { name: raid.name, diffLabel: diff?.label || difficulty, image: raid.image }
}

const STATUS_DOT = {
  complete:   'bg-emerald-400',
  partial:    'bg-amber-400',
  incomplete: 'bg-gray-300 dark:bg-zinc-600',
  none:       'bg-gray-200 dark:bg-zinc-700',
  hidden:     'bg-gray-100 dark:bg-zinc-800',
}
const STATUS_LABEL = {
  complete: '완료', partial: '일부완료', incomplete: '미완료', none: '없음', hidden: '비공개',
}

// ── Raid Members Modal ────────────────────────────────────────────────────────
function RaidMembersModal({ modal, me, onClose }) {
  const { groupFriends, raidId, difficulty } = modal
  const { name, image } = getRaidInfo(raidId, difficulty)
  const mePublic = me ? { ...me, raidPublicFriends: true } : null
  const participants = [mePublic, ...groupFriends].filter(Boolean)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.08] w-full max-w-md max-h-[80vh] flex flex-col overflow-hidden">

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
                      return (
                        <div key={char.id}
                          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-gray-50 dark:bg-zinc-900/60 border border-gray-100 dark:border-white/[0.05]">
                          {classIcon ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={classIcon} alt={char.class} width={18} height={18}
                              className="flex-shrink-0 class-icon"
                            />
                          ) : (
                            <div className="w-[18px] h-[18px] flex-shrink-0" />
                          )}
                          <span className="text-[12px] ns-bold text-gray-700 dark:text-zinc-200 flex-1 truncate min-w-0">{char.name}</span>
                          <div className="flex items-center gap-2.5 flex-shrink-0">
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

// ── Confirm Modal ──────────────────────────────────────────────────────────────
function ConfirmModal({ modal, onConfirm, onCancel }) {
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
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.08] w-full max-w-sm p-6">
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
            <span className="text-yellow-400 flex-shrink-0">
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

// ── Component ─────────────────────────────────────────────────────────────────
export default function GroupClient({ initialFriends, initialRequests, me }) {
  const [friends, setFriends]     = useState(initialFriends)
  const [requests, setRequests]   = useState(initialRequests)
  const [dragging, setDragging]   = useState(null)
  const [dragOver, setDragOver]   = useState(null)
  const [activeTab, setActiveTab] = useState('friends')
  const [confirmModal, setConfirmModal] = useState(null)
  const [raidModal, setRaidModal] = useState(null) // { groupFriends, raidId, difficulty }

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
    setSending(receiverId)
    try {
      const res = await fetch('/api/group/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiverId }),
      })
      const data = await res.json()
      if (res.ok) {
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
      }
    } finally {
      setSending(null)
    }
  }, [])

  const handleAccept = useCallback((req) => {
    setConfirmModal({ type: 'accept', target: req.sender, requestId: req.id })
  }, [])

  const handleReject = useCallback((req) => {
    setConfirmModal({ type: 'reject', target: req.sender, requestId: req.id })
  }, [])

  const handleUnfriend = useCallback((friend) => {
    setConfirmModal({ type: 'unfriend', target: friend })
  }, [])

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
          onClose={() => setRaidModal(null)}
        />
      )}

      {/* ── 페이지 헤더 ─────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-white/[0.05] bg-white dark:bg-[#111] px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div>
            <h1 className="text-lg ns-bold text-gray-900 dark:text-white">친구</h1>
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
        <div className="mx-auto max-w-[1400px] mt-4 flex gap-1">
          {tabs.map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-1.5 text-sm ns-bold rounded-lg transition-colors ${
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
          <div className="max-w-lg space-y-4">

            {/* 친구 추가 검색 */}
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
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
                    onChange={e => setSearchQ(e.target.value)}
                    placeholder="원정대 닉네임 또는 대표캐릭터 이름으로 검색"
                    className="w-full pl-9 pr-9 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-white/[0.1]
                      bg-gray-50 dark:bg-[#111] text-gray-800 dark:text-zinc-100 placeholder-gray-300 dark:placeholder-zinc-600
                      focus:outline-none focus:border-[var(--accent-400)] dark:focus:border-[var(--accent-400)] transition-colors"
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

                {searchResults !== null && (
                  <div className="mt-2 rounded-xl border border-gray-100 dark:border-white/[0.06] overflow-hidden bg-white dark:bg-[#111]">
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
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
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
                            hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
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
                                <span className="text-yellow-400 flex-shrink-0"><IconCrown /></span>
                                <span className="truncate">{repChar.name}</span>
                                <span className="flex-shrink-0 mx-0.5">·</span>
                                <span className="text-gray-400 dark:text-gray-500 flex-shrink-0"><IconTrophy /></span>
                                <span className="flex-shrink-0">{Number(repChar.itemLevel).toFixed(0)}</span>
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
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
        )}

        {/* ── 요청 탭 ──────────────────────────────────────────────────────── */}
        {activeTab === 'requests' && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
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
                            <span className="text-yellow-400 flex-shrink-0"><IconCrown /></span>
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

            {/* ── 그룹원 사이드바 ──────────────────────────────────────────── */}
            <div className="w-full lg:w-64 flex-shrink-0 sticky top-4">
              <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
                <div className="px-4 pt-4 pb-3">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-zinc-100">친구</span>
                    <span className="min-w-[20px] text-center text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-1.5 py-0.5 rounded-full">
                      {friends.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 dark:text-zinc-600">
                    카드를 드래그해서 그룹에 추가하세요
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
                              <span className="text-yellow-400 flex-shrink-0"><IconCrown /></span>
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
            <div className="flex-1 min-w-0">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]
                  rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.06]
                  py-20 text-center shadow-sm">
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
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
                        className={`bg-white dark:bg-[#1a1a1a] rounded-2xl border shadow-sm
                          flex flex-col overflow-hidden transition-all duration-150 ${
                          isOver
                            ? 'border-[var(--accent-400)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-400)_15%,transparent)]'
                            : 'border-gray-100 dark:border-white/[0.06]'
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
                          <button
                            type="button"
                            onClick={() => deleteGroup(group.id)}
                            className="p-1.5 rounded-lg text-gray-300 dark:text-zinc-700
                              hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"
                          >
                            <IconX size={12} />
                          </button>
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
                                  친구를 여기에 드래그하세요
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
    </div>
  )
}

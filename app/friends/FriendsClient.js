'use client'

import { useState, useCallback } from 'react'
import Image from 'next/image'
import { RAIDS } from '@/lib/raidData'
import { HIDDEN_RAID_IDS, DIFF_LABEL, DIFF_COLOR } from '@/app/dashboard/_constants'
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
const IconEmptyGroup = () => (
  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" className="text-gray-200 dark:text-zinc-700">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
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

// ── Helpers ───────────────────────────────────────────────────────────────────
function getDisplayName(friend) {
  return friend.nickname || friend.name || friend.discordUsername || '알 수 없음'
}

function getRepChar(friend) {
  let rep = null
  for (const exp of friend.loaExpeditions || []) {
    for (const char of exp.characters || []) {
      if (!rep || char.itemLevel > rep.itemLevel) rep = char
    }
  }
  return rep
}

function computeGroupRaids(groupFriends) {
  if (groupFriends.length === 0) return []

  const raidSets = groupFriends.map(friend => {
    const raids = new Set()
    if (!friend.raidPublicFriends) return raids
    for (const exp of friend.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        for (const raid of char.characterRaids || []) {
          if (!HIDDEN_RAID_IDS.has(raid.raidId)) {
            raids.add(`${raid.raidId}__${raid.difficulty}`)
          }
        }
      }
    }
    return raids
  })

  const first = raidSets[0]
  const intersection = [...first].filter(key => raidSets.every(s => s.has(key)))

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

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ friend, onConfirm, onCancel }) {
  const name = getDisplayName(friend)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl border border-gray-100 dark:border-white/[0.08] w-full max-w-sm p-6">
        <div className="mb-5 text-center">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-500/10 flex items-center justify-center mx-auto mb-3 text-red-400">
            <IconTrash size={20} />
          </div>
          <h3 className="text-base ns-bold text-gray-900 dark:text-white mb-1">친구 삭제</h3>
          <p className="text-sm text-gray-500 dark:text-zinc-400">
            <span className="ns-bold text-gray-800 dark:text-zinc-200">{name}</span>님을<br />
            즐겨찾기에서 삭제할까요?
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
            className="flex-1 py-2.5 text-sm ns-bold rounded-xl
              bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-colors"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function FriendsClient({ initialFriends }) {
  const [friends, setFriends]         = useState(initialFriends)
  const [groups, setGroups]           = useState([])
  const [dragging, setDragging]       = useState(null)
  const [dragOver, setDragOver]       = useState(null)
  const [activeTab, setActiveTab]     = useState('groups')
  const [deleteTarget, setDeleteTarget] = useState(null)

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return
    const targetUserId = deleteTarget.id
    setDeleteTarget(null)
    setFriends(prev => prev.filter(f => f.id !== targetUserId))
    setGroups(prev => prev.map(g => ({ ...g, memberIds: g.memberIds.filter(id => id !== targetUserId) })))
    await fetch('/api/friends', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
  }, [deleteTarget])

  const addGroup    = () => setGroups(prev => [...prev, { id: crypto.randomUUID(), memberIds: [] }])
  const deleteGroup = (id) => setGroups(prev => prev.filter(g => g.id !== id))

  const addToGroup = (groupId, friendId) => setGroups(prev => prev.map(g =>
    g.id === groupId && !g.memberIds.includes(friendId)
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
  const onDrop      = (e, groupId) => {
    e.preventDefault()
    if (dragging) addToGroup(groupId, dragging)
    setDragging(null); setDragOver(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f]">
      {deleteTarget && (
        <DeleteConfirmModal
          friend={deleteTarget}
          onConfirm={confirmDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* ── 페이지 헤더 ─────────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 dark:border-white/[0.05] bg-white dark:bg-[#111] px-4 sm:px-8 py-5">
        <div className="mx-auto max-w-[1400px] flex items-center justify-between">
          <div>
            <h1 className="text-lg ns-bold text-gray-900 dark:text-white">친구</h1>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
              즐겨찾기한 멤버와 함께 갈 수 있는 레이드를 확인하세요
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
          {[
            { key: 'groups', label: '그룹' },
            { key: 'manage', label: '친구 관리' },
          ].map(tab => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-1.5 text-sm ns-bold rounded-lg transition-colors ${
                activeTab === tab.key
                  ? 'bg-[var(--accent-400)] text-gray-900'
                  : 'text-gray-500 dark:text-zinc-500 hover:text-gray-700 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-white/[0.05]'
              }`}
            >
              {tab.label}
              {tab.key === 'manage' && friends.length > 0 && (
                <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${
                  activeTab === tab.key
                    ? 'bg-black/10 text-gray-900'
                    : 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                }`}>
                  {friends.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-[1400px] px-4 sm:px-8 py-6">

        {/* ── 친구 관리 탭 ─────────────────────────────────────────────────── */}
        {activeTab === 'manage' && (
          <div className="max-w-lg">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
              {friends.length === 0 ? (
                <div className="px-4 py-14 text-center">
                  <div className="w-12 h-12 rounded-full bg-gray-50 dark:bg-zinc-800/60 flex items-center justify-center mx-auto mb-3">
                    <IconEmptyGroup />
                  </div>
                  <p className="text-xs text-gray-400 dark:text-zinc-600">즐겨찾기한 친구가 없습니다</p>
                  <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1">
                    공격대 멤버의 별 아이콘을 눌러 추가하세요
                  </p>
                </div>
              ) : friends.map(friend => {
                const repChar = getRepChar(friend)
                const name = getDisplayName(friend)
                return (
                  <div
                    key={friend.id}
                    className="group flex items-center gap-3 px-4 py-3
                      border-b border-gray-50 dark:border-white/[0.03] last:border-b-0
                      hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
                  >
                    <Avatar src={friend.image} name={name} size={36} />
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">
                        {name}
                      </div>
                      {repChar && (
                        <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5 leading-tight">
                          {repChar.name} · {Number(repChar.itemLevel).toFixed(0)}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(friend)}
                      title="친구 삭제"
                      className="flex-shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs
                        text-gray-400 dark:text-zinc-600 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10
                        opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <IconTrash size={12} />
                      삭제
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── 그룹 탭 ──────────────────────────────────────────────────────── */}
        {activeTab === 'groups' && (
        <div className="flex gap-6 items-start flex-col lg:flex-row">

          {/* ── 즐겨찾기 사이드바 ─────────────────────────────────────────── */}
          <div className="w-full lg:w-64 flex-shrink-0 sticky top-4">
            <div className="bg-white dark:bg-[#1a1a1a] rounded-2xl border border-gray-100 dark:border-white/[0.06] shadow-sm overflow-hidden">
              {/* 헤더 */}
              <div className="px-4 pt-4 pb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm ns-bold text-gray-800 dark:text-zinc-100">즐겨찾기</span>
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
                      <IconEmptyGroup />
                    </div>
                    <p className="text-xs text-gray-400 dark:text-zinc-600">즐겨찾기한 멤버가 없습니다</p>
                    <p className="text-[11px] text-gray-300 dark:text-zinc-700 mt-1">
                      공격대 멤버의 별 아이콘을 눌러 추가하세요
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
                      {/* 드래그 핸들 */}
                      <span className="flex-shrink-0 text-gray-200 dark:text-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity -ml-1">
                        <IconGrip />
                      </span>

                      {/* 아바타 */}
                      <Avatar src={friend.image} name={name} size={36} />

                      {/* 이름 + 캐릭터 */}
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] ns-bold text-gray-800 dark:text-zinc-100 truncate leading-tight">
                          {name}
                        </div>
                        {repChar && (
                          <div className="text-[11px] text-gray-400 dark:text-zinc-500 truncate mt-0.5 leading-tight">
                            {repChar.name} · {Number(repChar.itemLevel).toFixed(0)}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── 그룹 영역 ─────────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {groups.length === 0 ? (
              /* 빈 상태 */
              <div className="flex flex-col items-center justify-center bg-white dark:bg-[#1a1a1a]
                rounded-2xl border-2 border-dashed border-gray-200 dark:border-white/[0.06]
                py-20 text-center shadow-sm">
                <div className="w-16 h-16 rounded-2xl bg-gray-50 dark:bg-zinc-800/60
                  flex items-center justify-center mx-auto mb-4">
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
                  const raids  = computeGroupRaids(groupFriends)
                  const isOver = dragOver === group.id

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
                      {/* 그룹 헤더 */}
                      <div className="flex items-center justify-between px-4 py-3
                        border-b border-gray-50 dark:border-white/[0.04]">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30
                            flex items-center justify-center text-[10px] ns-bold
                            text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                            {idx + 1}
                          </span>
                          <span className="text-sm ns-bold text-gray-700 dark:text-zinc-200">
                            그룹 {idx + 1}
                          </span>
                          {groupFriends.length > 0 && (
                            <span className="text-[10px] text-gray-400 dark:text-zinc-600">
                              {groupFriends.length}명
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => deleteGroup(group.id)}
                          className="p-1.5 rounded-lg text-gray-300 dark:text-zinc-700
                            hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10
                            transition-colors"
                        >
                          <IconX size={12} />
                        </button>
                      </div>

                      {/* 멤버 드롭 영역 */}
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
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {groupFriends.map(friend => (
                                <div
                                  key={friend.id}
                                  className="flex items-center gap-1.5 pl-1 pr-1.5 py-0.5
                                    bg-gray-50 dark:bg-zinc-800/80 rounded-lg border
                                    border-gray-100 dark:border-white/[0.05]"
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

                      {/* 레이드 교집합 */}
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
                                return (
                                  <div
                                    key={`${raidId}__${difficulty}`}
                                    className="flex items-center gap-2 px-2.5 py-2 rounded-xl
                                      bg-gray-50 dark:bg-zinc-900/60 hover:bg-gray-100
                                      dark:hover:bg-zinc-800/60 transition-colors"
                                  >
                                    {image && (
                                      <Image src={image} alt="" width={22} height={22}
                                        className="rounded-lg object-cover flex-shrink-0" unoptimized />
                                    )}
                                    <span className="flex-1 text-[12px] text-gray-700 dark:text-zinc-300 truncate min-w-0">
                                      {name}
                                    </span>
                                    <span className={`text-[10px] px-1.5 py-0.5 rounded-md flex-shrink-0 ${
                                      DIFF_COLOR[difficulty] || 'bg-gray-100 text-gray-500'
                                    }`}>
                                      {DIFF_LABEL[difficulty] || diffLabel}
                                    </span>
                                    {/* 멤버별 상태 점 */}
                                    <div className="flex items-center gap-0.5 flex-shrink-0">
                                      {groupFriends.map(friend => {
                                        const status = getFriendRaidStatus(friend, raidId, difficulty)
                                        return (
                                          <div
                                            key={friend.id}
                                            title={`${getDisplayName(friend)}: ${STATUS_LABEL[status]}`}
                                            className={`w-2 h-2 rounded-full ${STATUS_DOT[status]}`}
                                          />
                                        )
                                      })}
                                    </div>
                                  </div>
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

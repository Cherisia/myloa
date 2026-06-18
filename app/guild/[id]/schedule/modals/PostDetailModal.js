'use client'

import { useState, useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, DIFF_COLOR, SUPPORT_CLASSES, defaultRole, getClassIcon } from '@/app/dashboard/_constants'
import { raidStatusOf } from '@/lib/groupRaidShare'
import { IconX, IconCheck, IconTrophy } from '@/app/dashboard/_icons'
import PartyGrid from '../PartyGrid'

const STATUS_LABEL = { recruiting: '모집중', closed: '모집완료', done: '완료', disbanded: '해산' }

function formatKST(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const days = ['일','월','화','수','목','금','토']
  return `${kst.getUTCMonth()+1}/${kst.getUTCDate()}(${days[kst.getUTCDay()]}) ${kst.getUTCHours()}:${String(kst.getUTCMinutes()).padStart(2,'0')}`
}

export default function PostDetailModal({
  post, userId, isLeader, members,
  onClose, onJoin, onLeave, onParticipantAction,
  onClose2Action, onSaveParty, onOpenComplete, onOpenDisband,
}) {
  const [selectedCharId, setSelectedCharId] = useState('')
  const [selectedRole, setSelectedRole] = useState('dealer')
  const [joining, setJoining] = useState(false)

  const raid = RAID_MAP[post.raidId]
  const diff = raid?.difficulties?.find(d => d.key === post.difficulty)
  const raidName = raid?.name || post.raidId
  const diffLabel = DIFF_LABEL[post.difficulty] || post.difficulty
  const diffColor = DIFF_COLOR[post.difficulty] || 'bg-gray-100 text-gray-600'
  const isCreator = post.creatorId === userId
  const isStarted = new Date() >= new Date(post.scheduledAt)

  const myParticipant = post.participants?.find(p => p.userId === userId)
  const accepted = post.participants?.filter(p => p.status === 'accepted') || []
  const pending  = post.participants?.filter(p => p.status === 'pending') || []

  // 멤버 맵
  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) {
      m.set(mem.userId || mem.user?.id, mem)
    }
    return m
  }, [members])

  // 내 캐릭터 목록
  const myMember = memberMap.get(userId)
  const myChars = useMemo(() => {
    const chars = []
    for (const exp of myMember?.user?.loaExpeditions || []) {
      for (const c of exp.characters || []) {
        if (c.isActive !== false) chars.push(c)
      }
    }
    return chars.sort((a, b) => b.itemLevel - a.itemLevel)
  }, [myMember])

  // 캐릭터별 레이드 완료 여부
  function isRaidComplete(char) {
    const entry = char.characterRaids?.find(r => r.raidId === post.raidId && r.difficulty === post.difficulty)
    return entry && raidStatusOf(entry) === 'complete'
  }

  async function handleJoin() {
    if (!selectedCharId) return
    setJoining(true)
    await onJoin(selectedCharId, selectedRole)
    setJoining(false)
  }

  function getUserInfo(p) {
    const mem = memberMap.get(p.userId)
    const user = mem?.user
    const name = user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
    const char = (myChars.find(c => c.id === p.characterId)) ||
      (() => {
        for (const exp of user?.loaExpeditions || []) {
          const found = exp.characters?.find(c => c.id === p.characterId)
          if (found) return found
        }
        return null
      })()
    return { name, char, image: user?.image }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded ${diffColor}`}>{diffLabel}</span>
              <h2 className="ns-bold text-gray-800 dark:text-gray-100">{raidName}</h2>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400">{formatKST(post.scheduledAt)} · {post.durationMinutes}분</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] px-2 py-1 rounded-full ns-bold
              ${post.status === 'recruiting'
                ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                : 'bg-gray-100 dark:bg-[#333] text-gray-500'}`}>
              {STATUS_LABEL[post.status]}
            </span>
            <button type="button" onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
              <IconX size={16} className="text-gray-500" />
            </button>
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* 공고 정보 */}
          <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-400">
            <span>모집: {accepted.length}/{post.totalSlots + 1}명</span>
            {post.minItemLevel && <span>최소 {post.minItemLevel.toLocaleString('ko-KR')}</span>}
            {post.memo && <span className="truncate">{post.memo}</span>}
          </div>

          {/* 참가 확정 목록 */}
          {accepted.length > 0 && (
            <div>
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2">참가 확정 {accepted.length}명</p>
              <div className="space-y-1.5">
                {accepted.map(p => {
                  const { name, char, image } = getUserInfo(p)
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#252525]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image || '/default-avatar.svg'} alt={name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        onError={e => { e.currentTarget.src = '/default-avatar.svg' }} />
                      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{name}</span>
                      {char && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {getClassIcon(char.class) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getClassIcon(char.class)} alt={char.class} className="w-4 h-4" />
                          )}
                          <span>{char.name}</span>
                        </div>
                      )}
                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ns-bold flex-shrink-0
                        ${p.role === 'support'
                          ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                          : 'bg-gray-100 dark:bg-[#333] text-gray-500'}`}>
                        {p.role === 'support' ? 'S' : 'D'}
                      </span>
                      {/* 방장: 거절 버튼 */}
                      {isCreator && p.userId !== userId && (
                        <button type="button"
                          onClick={() => onParticipantAction(p.id, 'rejected')}
                          className="p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                          <IconX size={12} />
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 신청 대기 목록 (방장만) */}
          {isCreator && pending.length > 0 && (
            <div>
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2">신청 대기 {pending.length}명</p>
              <div className="space-y-1.5">
                {pending.map(p => {
                  const { name, char, image } = getUserInfo(p)
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2 rounded-xl border border-gray-100 dark:border-[#2a2a2a]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image || '/default-avatar.svg'} alt={name}
                        className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                        onError={e => { e.currentTarget.src = '/default-avatar.svg' }} />
                      <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 truncate">{name}</span>
                      {char && (
                        <div className="flex items-center gap-1 text-xs text-gray-400">
                          {getClassIcon(char.class) && (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={getClassIcon(char.class)} alt={char.class} className="w-4 h-4" />
                          )}
                          <span>{char.name}</span>
                        </div>
                      )}
                      <button type="button" onClick={() => onParticipantAction(p.id, 'accepted')}
                        className="p-1.5 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] hover:bg-[var(--accent-200)] transition-colors">
                        <IconCheck size={12} />
                      </button>
                      <button type="button" onClick={() => onParticipantAction(p.id, 'rejected')}
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-400 transition-colors">
                        <IconX size={12} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 신청 영역 (본인 미신청 + 모집중) */}
          {!myParticipant && post.status === 'recruiting' && !isStarted && (
            <div className="border border-gray-100 dark:border-[#2a2a2a] rounded-xl p-3 space-y-2">
              <p className="text-xs ns-bold text-gray-600 dark:text-gray-400">참가 신청</p>
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {myChars.map(char => {
                  const ineligible = post.minItemLevel && char.itemLevel < post.minItemLevel
                  const complete = isRaidComplete(char)
                  const isSelected = selectedCharId === char.id
                  const isSupport = SUPPORT_CLASSES.has(char.class)
                  return (
                    <button
                      key={char.id}
                      type="button"
                      disabled={ineligible || complete}
                      onClick={() => {
                        setSelectedCharId(char.id)
                        setSelectedRole(defaultRole(char.class))
                      }}
                      className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors
                        ${isSelected
                          ? 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                          : 'border-gray-100 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#252525]'}
                        ${ineligible || complete ? 'opacity-40 cursor-not-allowed' : ''}`}
                    >
                      {getClassIcon(char.class) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getClassIcon(char.class)} alt={char.class} className="w-5 h-5 object-contain flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                          {complete && <span className="text-[9px] text-gray-400">[완료됨]</span>}
                        </div>
                        <div className="text-[10px] text-gray-400">{char.class} · {Number(char.itemLevel).toFixed(2)}</div>
                      </div>
                    </button>
                  )
                })}
              </div>

              {/* 서포터 역할 토글 */}
              {selectedCharId && SUPPORT_CLASSES.has(myChars.find(c => c.id === selectedCharId)?.class) && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">역할:</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#333] text-xs">
                    {['support','dealer'].map(r => (
                      <button key={r} type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`px-3 py-1 transition-colors
                          ${selectedRole === r
                            ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                            : 'bg-white dark:bg-[#252525] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}>
                        {r === 'support' ? '서포터' : '딜러'}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button type="button"
                disabled={!selectedCharId || joining}
                onClick={handleJoin}
                className="w-full py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                {joining ? '신청 중...' : '참가 신청'}
              </button>
            </div>
          )}

          {/* 신청 취소 (본인이 신청 중) */}
          {myParticipant && myParticipant.userId === userId && !isCreator && post.status !== 'done' && !isStarted && (
            <button type="button" onClick={onLeave}
              className="w-full py-2 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              신청 취소
            </button>
          )}

          {/* 파티 구성 그리드 */}
          {post.status !== 'disbanded' && (
            <div className="border-t border-gray-100 dark:border-[#2a2a2a] pt-4">
              <PartyGrid
                post={post}
                userId={userId}
                members={members}
                isCreator={isCreator}
                onSave={onSaveParty}
              />
            </div>
          )}
        </div>

        {/* 방장 전용 액션 */}
        {isCreator && (
          <div className="px-5 pb-5 space-y-2 border-t border-gray-100 dark:border-[#2a2a2a] pt-4">
            <div className="flex gap-2">
              {post.status === 'recruiting' && (
                <button type="button" onClick={() => onClose2Action('close')}
                  className="flex-1 py-2 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors">
                  모집 마감
                </button>
              )}
              {post.status === 'closed' && (
                <button type="button" onClick={() => onClose2Action('reopen')}
                  className="flex-1 py-2 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                  모집 재개
                </button>
              )}
            </div>
            {post.status === 'closed' && isStarted && (
              <button type="button" onClick={onOpenComplete}
                className="w-full py-2 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm ns-bold transition-colors">
                레이드 완료 처리
              </button>
            )}
            {['recruiting','closed'].includes(post.status) && (
              <button type="button" onClick={onOpenDisband}
                className="w-full py-2 rounded-xl border border-red-200 dark:border-red-900/50 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors">
                해산
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

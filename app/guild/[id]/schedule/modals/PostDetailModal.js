'use client'

import { useState, useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, DIFF_COLOR, SUPPORT_CLASSES, defaultRole, getClassIcon } from '@/app/dashboard/_constants'
import { raidStatusOf } from '@/lib/groupRaidShare'
import { IconX, IconCheck } from '@/app/dashboard/_icons'
import PartyGrid from '../PartyGrid'

const STATUS_LABEL  = { recruiting: '모집중', closed: '모집완료', done: '완료', disbanded: '해산' }
const STATUS_PILL   = {
  recruiting: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]',
  closed:     'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400',
  done:       'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  disbanded:  'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400',
}

function formatKST(iso) {
  const d   = new Date(iso)
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
  const [selectedRole,   setSelectedRole]   = useState('dealer')
  const [joining,        setJoining]        = useState(false)

  const raid       = RAID_MAP[post.raidId]
  const raidName   = raid?.name || post.raidId
  const diffLabel  = DIFF_LABEL[post.difficulty] || post.difficulty
  const diffColor  = DIFF_COLOR[post.difficulty] || 'bg-gray-100 text-gray-600'
  const isCreator  = post.creatorId === userId
  const isStarted  = new Date() >= new Date(post.scheduledAt)

  const myParticipant = post.participants?.find(p => p.userId === userId)
  const accepted      = post.participants?.filter(p => p.status === 'accepted') || []
  const pending       = post.participants?.filter(p => p.status === 'pending')  || []

  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) m.set(mem.userId || mem.user?.id, mem)
    return m
  }, [members])

  const myMember = memberMap.get(userId)
  const myChars  = useMemo(() => {
    const chars = []
    for (const exp of myMember?.user?.loaExpeditions || []) {
      for (const c of exp.characters || []) {
        if (c.isActive !== false) chars.push(c)
      }
    }
    return chars.sort((a, b) => b.itemLevel - a.itemLevel)
  }, [myMember])

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
    const mem  = memberMap.get(p.userId)
    const user = mem?.user
    const name = user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
    const char = (() => {
      for (const exp of user?.loaExpeditions || []) {
        const found = exp.characters?.find(c => c.id === p.characterId)
        if (found) return found
      }
      return null
    })()
    return { name, char, image: user?.image }
  }

  const showParty     = post.status !== 'disbanded'
  const showJoin      = !myParticipant && post.status === 'recruiting' && !isStarted && !isCreator
  const showCancel    = myParticipant && !isCreator && post.status !== 'done' && !isStarted
  const showPending   = isCreator && pending.length > 0
  const showActions   = isCreator

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#181818] rounded-t-2xl sm:rounded-2xl shadow-2xl w-full sm:max-w-xl max-h-[92vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >

        {/* ── 헤더 ── */}
        <div className="flex-shrink-0 px-5 pt-5 pb-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className={`text-[10px] px-1.5 py-0.5 rounded-md ns-bold flex-shrink-0 ${diffColor}`}>
                  {diffLabel}
                </span>
                <h2 className="text-base ns-bold text-gray-900 dark:text-gray-50 truncate">{raidName}</h2>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {formatKST(post.scheduledAt)} · {post.durationMinutes}분
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ns-bold ${STATUS_PILL[post.status] || STATUS_PILL.closed}`}>
                  {STATUS_LABEL[post.status]}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="flex-shrink-0 p-1.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-400 transition-colors"
            >
              <IconX size={16} />
            </button>
          </div>

          {/* 메타 칩 */}
          <div className="flex flex-wrap items-center gap-2 mt-3">
            <span className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400">
              모집 {accepted.length} / {post.totalSlots + 1}명
            </span>
            {post.minItemLevel && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400">
                최소 {post.minItemLevel.toLocaleString('ko-KR')}
              </span>
            )}
            {post.memo && (
              <span className="text-[11px] px-2 py-1 rounded-lg bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                {post.memo}
              </span>
            )}
          </div>
        </div>

        {/* 헤더 아래 구분선 */}
        <div className="h-px bg-gray-100 dark:bg-[#2a2a2a] flex-shrink-0 mx-5" />

        {/* ── 스크롤 바디 ── */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* 파티 구성 */}
          {showParty && (
            <div className="rounded-2xl bg-gray-50 dark:bg-[#222] p-4">
              <PartyGrid
                post={post}
                userId={userId}
                members={members}
                isCreator={isCreator}
                onSave={onSaveParty}
              />
            </div>
          )}

          {/* 참가 신청 */}
          {showJoin && (
            <div className="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] p-4 space-y-3">
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">캐릭터 선택</p>
              <div className="space-y-1 max-h-40 overflow-y-auto -mx-1 px-1">
                {myChars.length === 0 && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-3">등록된 캐릭터가 없습니다</p>
                )}
                {myChars.map(char => {
                  const ineligible = !!(post.minItemLevel && char.itemLevel < post.minItemLevel)
                  const complete   = isRaidComplete(char)
                  const isSelected = selectedCharId === char.id
                  return (
                    <button
                      key={char.id}
                      type="button"
                      disabled={ineligible || complete}
                      onClick={() => { setSelectedCharId(char.id); setSelectedRole(defaultRole(char.class)) }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-left transition-all
                        ${isSelected
                          ? 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 shadow-sm'
                          : 'border-transparent hover:border-gray-200 dark:hover:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525]'}
                        ${ineligible || complete ? 'opacity-35 cursor-not-allowed' : ''}`}
                    >
                      {getClassIcon(char.class) && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getClassIcon(char.class)} alt={char.class} className="w-6 h-6 object-contain flex-shrink-0" />
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                          {complete && <span className="text-[9px] text-gray-400 flex-shrink-0">완료됨</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-0.5">{char.class} · {Number(char.itemLevel).toFixed(2)}</p>
                      </div>
                      {isSelected && <div className="w-2 h-2 rounded-full bg-[var(--accent-400)] flex-shrink-0" />}
                    </button>
                  )
                })}
              </div>

              {selectedCharId && SUPPORT_CLASSES.has(myChars.find(c => c.id === selectedCharId)?.class) && (
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-xs text-gray-400">역할</span>
                  <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#333] text-xs">
                    {['support','dealer'].map(r => (
                      <button key={r} type="button" onClick={() => setSelectedRole(r)}
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

              <button
                type="button"
                disabled={!selectedCharId || joining}
                onClick={handleJoin}
                className="w-full py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {joining ? '신청 중...' : '참가 신청'}
              </button>
            </div>
          )}

          {/* 내 신청 상태 */}
          {myParticipant && !isCreator && (
            <div className={`px-4 py-3 rounded-xl text-sm text-center ns-bold
              ${myParticipant.status === 'accepted'
                ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15 text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                : 'bg-gray-50 dark:bg-[#252525] text-gray-500 dark:text-gray-400'}`}>
              {myParticipant.status === 'accepted' ? '참가 확정' : '신청 검토 중'}
            </div>
          )}

          {/* 신청 취소 버튼 */}
          {showCancel && (
            <button type="button" onClick={onLeave}
              className="w-full py-2 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              신청 취소
            </button>
          )}

          {/* 신청 대기 목록 (방장) */}
          {showPending && (
            <div>
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2">
                신청 대기 <span className="text-[var(--accent-600)] dark:text-[var(--accent-400)]">{pending.length}</span>명
              </p>
              <div className="space-y-1.5">
                {pending.map(p => {
                  const { name, char, image } = getUserInfo(p)
                  return (
                    <div key={p.id} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-gray-50 dark:bg-[#222]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={image || '/default-avatar.svg'} alt={name}
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0"
                        onError={e => { e.currentTarget.src = '/default-avatar.svg' }} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{name}</p>
                        {char && (
                          <div className="flex items-center gap-1 mt-0.5">
                            {getClassIcon(char.class) && (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={getClassIcon(char.class)} alt={char.class} className="w-3.5 h-3.5" />
                            )}
                            <span className="text-[10px] text-gray-400">{char.name}</span>
                          </div>
                        )}
                      </div>
                      <button type="button" onClick={() => onParticipantAction(p.id, 'accepted')}
                        className="p-2 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] hover:bg-[var(--accent-200)] transition-colors">
                        <IconCheck size={13} />
                      </button>
                      <button type="button" onClick={() => onParticipantAction(p.id, 'rejected')}
                        className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-300 dark:text-gray-600 hover:text-red-400 transition-colors">
                        <IconX size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* 방장 액션 */}
          {showActions && (
            <div className="space-y-2 pt-1">
              {post.status === 'recruiting' && (
                <button type="button" onClick={() => onClose2Action('close')}
                  className="w-full py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors">
                  모집 마감
                </button>
              )}
              {post.status === 'closed' && (
                <button type="button" onClick={() => onClose2Action('reopen')}
                  className="w-full py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
                  모집 재개
                </button>
              )}
              {post.status === 'closed' && isStarted && (
                <button type="button" onClick={onOpenComplete}
                  className="w-full py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm ns-bold transition-colors">
                  레이드 완료 처리
                </button>
              )}
              {['recruiting','closed'].includes(post.status) && (
                <button type="button" onClick={onOpenDisband}
                  className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 text-sm text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 active:bg-red-100 dark:active:bg-red-900/20 transition-colors">
                  해산
                </button>
              )}
            </div>
          )}

          {/* 바텀 패딩 */}
          <div className="h-1" />
        </div>
      </div>
    </div>
  )
}

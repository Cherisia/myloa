'use client'

import { useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, DIFF_COLOR, SUPPORT_CLASSES, defaultRole, getClassIcon } from '@/app/dashboard/_constants'

const MAX_AVATARS = 8

function AvatarStack({ participants }) {
  const visible = participants.slice(0, MAX_AVATARS)
  const extra = participants.length - visible.length
  return (
    <div className="flex items-center">
      {visible.map((p, i) => (
        <div
          key={p.id}
          title={p.user?.nickname || p.user?.name || ''}
          className={`w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1a] overflow-hidden bg-gray-200 dark:bg-[#333] flex-shrink-0 ${i > 0 ? '-ml-1.5' : ''}`}
        >
          {p.user?.image
            ? <img src={p.user.image} alt="" className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center text-[7px] text-gray-400">?</div>
          }
        </div>
      ))}
      {extra > 0 && (
        <div className="-ml-1.5 w-5 h-5 rounded-full border-2 border-white dark:border-[#1a1a1a] bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-[8px] text-gray-500 dark:text-gray-400 ns-bold flex-shrink-0">
          +{extra}
        </div>
      )}
    </div>
  )
}

const STATUS_LABEL = {
  recruiting: '모집중',
  closed:     '모집완료',
  done:       '완료',
  disbanded:  '해산',
}

const STATUS_STYLE = {
  recruiting: 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10',
  closed:     'border-gray-300 dark:border-[#444] bg-gray-50 dark:bg-[#1a1a1a]',
  done:       'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] opacity-50',
  disbanded:  'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#1a1a1a] opacity-50',
}

export default function PostCard({ post, userId, compact = false, draggable, onDragStart, onQuickJoin, onClick }) {
  const raid = RAID_MAP[post.raidId]
  const diff = raid?.difficulties?.find(d => d.key === post.difficulty)
  const raidName = raid?.name || post.raidId
  const diffLabel = DIFF_LABEL[post.difficulty] || post.difficulty
  const diffColor = DIFF_COLOR[post.difficulty] || 'bg-gray-100 text-gray-600 dark:bg-[#333] dark:text-gray-300'

  const acceptedParticipants = post.participants?.filter(p => p.status === 'accepted') || []
  const acceptedCount = acceptedParticipants.length
  const myParticipant = post.participants?.find(p => p.userId === userId)
  const isStarted = new Date() >= new Date(post.scheduledAt)

  const kstTime = useMemo(() => {
    const d = new Date(post.scheduledAt)
    const kst = new Date(d.getTime() + 9 * 3600 * 1000)
    return `${kst.getUTCHours()}:${String(kst.getUTCMinutes()).padStart(2, '0')}`
  }, [post.scheduledAt])

  function handleQuickJoin(e) {
    e.stopPropagation()
    if (!onQuickJoin) return
    onQuickJoin(post, null, null) // null → GuildScheduleTab에서 대표캐릭 자동 선택
  }

  const cardClass = `rounded-lg border text-left w-full transition-colors
    ${STATUS_STYLE[post.status] || STATUS_STYLE.recruiting}
    ${post.status === 'disbanded' ? 'line-through' : ''}
    ${compact ? 'p-1' : 'p-3'}
  `

  return (
    <div
      className={cardClass}
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={onClick ? e => e.key === 'Enter' && onClick() : undefined}
    >
      {compact ? (
        /* 셀 내 축약 카드 */
        <div className="flex items-center gap-1 min-w-0">
          <span className={`text-[9px] px-1 rounded flex-shrink-0 ${diffColor}`}>{diffLabel}</span>
          <span className="text-[10px] text-gray-700 dark:text-gray-200 truncate flex-1">{raidName}</span>
          <span className="text-[9px] text-gray-400 flex-shrink-0">{acceptedCount}/{post.totalSlots + 1}</span>
        </div>
      ) : (
        /* 상세 카드 */
        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className={`text-[10px] px-1.5 py-0.5 rounded flex-shrink-0 ${diffColor}`}>{diffLabel}</span>
              <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{raidName}</span>
            </div>
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex-shrink-0 ns-bold
              ${post.status === 'recruiting' ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]' : 'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400'}`}>
              {STATUS_LABEL[post.status]}
            </span>
          </div>

          <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
            <span>{kstTime} ({post.durationMinutes}분)</span>
            <div className="flex items-center gap-1.5">
              <AvatarStack participants={acceptedParticipants} />
              <span className="ns-bold">{acceptedCount} / {post.totalSlots + 1}명</span>
            </div>
          </div>

          {post.memo && (
            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1">{post.memo}</p>
          )}

          {/* 원클릭 참가 버튼 */}
          {post.status === 'recruiting' && !isStarted && (
            myParticipant ? (
              <div className={`text-xs text-center py-1 rounded-lg
                ${myParticipant.status === 'accepted'
                  ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold'
                  : 'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-400'}`}>
                {myParticipant.status === 'accepted' ? '참가확정' : '신청중'}
              </div>
            ) : (
              <button
                type="button"
                onClick={handleQuickJoin}
                className="w-full text-xs py-1 rounded-lg bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] ns-bold transition-colors"
              >
                빠른 참가
              </button>
            )
          )}
        </div>
      )}
    </div>
  )
}

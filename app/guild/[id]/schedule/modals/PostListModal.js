'use client'

import { useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, DIFF_COLOR } from '@/app/dashboard/_constants'
import { IconX, IconPlus } from '@/app/dashboard/_icons'

const STATUS_LABEL = { recruiting: '모집중', closed: '모집완료', done: '완료', disbanded: '해산' }

function formatKST(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const month = kst.getUTCMonth() + 1
  const date  = kst.getUTCDate()
  const day   = ['일','월','화','수','목','금','토'][kst.getUTCDay()]
  const hour  = kst.getUTCHours()
  const min   = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${month}/${date}(${day}) ${hour}:${min}`
}

export default function PostListModal({ scheduledAt, posts, userId, members, onClose, onSelectPost, onCreateNew, onQuickJoin }) {
  const timeLabel = useMemo(() => formatKST(scheduledAt), [scheduledAt])

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="ns-bold text-gray-800 dark:text-gray-100">{timeLabel}</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-3 space-y-2 max-h-72 overflow-y-auto">
          {posts.map(post => {
            const raid = RAID_MAP[post.raidId]
            const raidName = raid?.name || post.raidId
            const diffLabel = DIFF_LABEL[post.difficulty] || post.difficulty
            const diffColor = DIFF_COLOR[post.difficulty] || 'bg-gray-100 text-gray-600'
            const accepted = post.participants?.filter(p => p.status === 'accepted').length || 0
            const myP = post.participants?.find(p => p.userId === userId)

            return (
              <div
                key={post.id}
                className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 dark:border-[#2a2a2a] hover:bg-gray-50 dark:hover:bg-[#252525] cursor-pointer transition-colors"
                onClick={() => onSelectPost(post)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${diffColor}`}>{diffLabel}</span>
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{raidName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[10px] ${post.status === 'recruiting'
                      ? 'text-[var(--accent-600)] dark:text-[var(--accent-300)]'
                      : 'text-gray-400'}`}>
                      {STATUS_LABEL[post.status]}
                    </span>
                    <span className="text-[10px] text-gray-400">{accepted}/{post.totalSlots + 1}명</span>
                  </div>
                </div>

                {/* 원클릭 참가 */}
                {post.status === 'recruiting' && !myP && (
                  <button
                    type="button"
                    onClick={e => { e.stopPropagation(); onQuickJoin(post, null, null) }}
                    className="flex-shrink-0 text-xs px-2.5 py-1.5 rounded-lg bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] ns-bold transition-colors"
                  >
                    참가
                  </button>
                )}
                {myP && (
                  <span className={`flex-shrink-0 text-[10px] px-2 py-1 rounded-full ns-bold
                    ${myP.status === 'accepted'
                      ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                      : 'bg-gray-100 dark:bg-[#333] text-gray-500'}`}>
                    {myP.status === 'accepted' ? '참가확정' : '신청중'}
                  </span>
                )}
              </div>
            )
          })}
        </div>

        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-[#2a2a2a]">
          <button
            type="button"
            onClick={onCreateNew}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border-2 border-dashed border-[var(--accent-300)] dark:border-[var(--accent-700)] text-[var(--accent-600)] dark:text-[var(--accent-300)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/10 transition-colors text-sm ns-bold"
          >
            <IconPlus size={14} />
            레이드 일정 추가
          </button>
        </div>
      </div>
    </div>
  )
}

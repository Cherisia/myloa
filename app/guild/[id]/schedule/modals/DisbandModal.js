'use client'

import { useState } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL } from '@/app/dashboard/_constants'
import { IconX } from '@/app/dashboard/_icons'

export default function DisbandModal({ post, onClose, onDisband }) {
  const [submitting, setSubmitting] = useState(false)
  const raid = RAID_MAP[post.raidId]
  const raidName = raid?.name || post.raidId
  const diffLabel = DIFF_LABEL[post.difficulty] || post.difficulty
  const pendingCount = post.participants?.filter(p => p.status === 'pending').length || 0
  const acceptedCount = post.participants?.filter(p => p.status === 'accepted').length || 0
  const notifyCount = pendingCount + acceptedCount

  async function handleDisband() {
    setSubmitting(true)
    await onDisband()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="ns-bold text-gray-800 dark:text-gray-100">공고 해산</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm text-gray-700 dark:text-gray-200">
            <span className="ns-bold">{raidName} {diffLabel}</span> 공고를 해산하시겠습니까?
          </p>
          {notifyCount > 0 && (
            <p className="text-xs text-gray-400 bg-gray-50 dark:bg-[#252525] rounded-xl px-3 py-2">
              신청자 {notifyCount}명에게 해산 알림이 전송됩니다.
            </p>
          )}
          <p className="text-xs text-gray-400">해산된 공고는 기록 보존을 위해 삭제되지 않습니다.</p>

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              취소
            </button>
            <button type="button" onClick={handleDisband} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-400 text-white text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '해산 중...' : '해산'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

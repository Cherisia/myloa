'use client'

import { useState } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL } from '@/app/dashboard/_constants'
import { IconX } from '@/app/dashboard/_icons'

function formatKST(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const days = ['일','월','화','수','목','금','토']
  return `${kst.getUTCMonth()+1}/${kst.getUTCDate()}(${days[kst.getUTCDay()]}) ${kst.getUTCHours()}:${String(kst.getUTCMinutes()).padStart(2,'0')}`
}

export default function TimeChangeModal({ post, newScheduledAt, onClose, onConfirm }) {
  const [submitting, setSubmitting] = useState(false)
  const raid = RAID_MAP[post.raidId]
  const raidName = raid?.name || post.raidId
  const acceptedCount = post.participants?.filter(p => p.status === 'accepted').length || 0

  async function handleConfirm() {
    setSubmitting(true)
    await onConfirm()
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="ns-bold text-gray-800 dark:text-gray-100">일정 변경</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">{raidName}</p>
          <div className="bg-gray-50 dark:bg-[#252525] rounded-xl px-4 py-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-8">이전</span>
              <span className="text-gray-600 dark:text-gray-300 line-through">{formatKST(post.scheduledAt)}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-400 w-8">변경</span>
              <span className="ns-bold text-gray-800 dark:text-gray-100">{formatKST(newScheduledAt)}</span>
            </div>
          </div>
          {acceptedCount > 1 && (
            <p className="text-xs text-gray-400">
              참가 확정 멤버 {acceptedCount}명에게 변경 알림이 전송됩니다.
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              취소
            </button>
            <button type="button" onClick={handleConfirm} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '변경 중...' : '변경'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

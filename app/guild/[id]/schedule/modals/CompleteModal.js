'use client'

import { useState, useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, getClassIcon } from '@/app/dashboard/_constants'
import { IconX, IconCheck } from '@/app/dashboard/_icons'

export default function CompleteModal({ post, members, onClose, onComplete }) {
  const raid = RAID_MAP[post.raidId]
  const raidName = raid?.name || post.raidId
  const diffLabel = DIFF_LABEL[post.difficulty] || post.difficulty

  const accepted = post.participants?.filter(p => p.status === 'accepted') || []

  const memberMap = useMemo(() => {
    const m = new Map()
    for (const mem of members || []) m.set(mem.userId || mem.user?.id, mem)
    return m
  }, [members])

  const [excluded, setExcluded] = useState(new Set())
  const [submitting, setSubmitting] = useState(false)

  function toggleExclude(userId) {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(userId)) next.delete(userId)
      else next.add(userId)
      return next
    })
  }

  async function handleConfirm() {
    setSubmitting(true)
    await onComplete([...excluded])
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-sm"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="ns-bold text-gray-800 dark:text-gray-100">레이드 완료 처리</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
            <span className="ns-bold text-gray-800 dark:text-gray-100">{raidName} {diffLabel}</span>
          </p>
          <p className="text-xs text-gray-400 mb-4">
            아래 캐릭터의 레이드가 자동 체크됩니다. 제외할 멤버를 선택하세요.
          </p>

          <div className="space-y-2 max-h-60 overflow-y-auto mb-4">
            {accepted.map(p => {
              const mem = memberMap.get(p.userId)
              const user = mem?.user
              const name = user?.nickname || user?.name || user?.discordUsername || '알 수 없음'
              const char = (() => {
                for (const exp of user?.loaExpeditions || []) {
                  const found = exp.characters?.find(c => c.id === p.characterId)
                  if (found) return found
                }
                return null
              })()
              const isExcluded = excluded.has(p.userId)

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleExclude(p.userId)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-colors text-left
                    ${isExcluded
                      ? 'border-gray-200 dark:border-[#333] bg-gray-50 dark:bg-[#252525] opacity-50'
                      : 'border-[var(--accent-300)] dark:border-[var(--accent-700)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10'}`}
                >
                  <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 border
                    ${isExcluded
                      ? 'border-gray-300 dark:border-[#444]'
                      : 'bg-[var(--accent-400)] border-[var(--accent-400)]'}`}>
                    {!isExcluded && <IconCheck size={10} strokeWidth={3} className="text-[var(--accent-900)]" />}
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={user?.image || '/default-avatar.svg'} alt={name}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                    onError={e => { e.currentTarget.src = '/default-avatar.svg' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-800 dark:text-gray-100 truncate">{name}</p>
                    {char && (
                      <div className="flex items-center gap-1 text-[10px] text-gray-400">
                        {getClassIcon(char.class) && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getClassIcon(char.class)} alt={char.class} className="w-3 h-3" />
                        )}
                        <span>{char.name}</span>
                      </div>
                    )}
                  </div>
                  {isExcluded && <span className="text-[10px] text-gray-400 flex-shrink-0">제외</span>}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              취소
            </button>
            <button type="button" onClick={handleConfirm} disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-green-500 hover:bg-green-400 text-white text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '처리 중...' : `완료 처리 (${accepted.length - excluded.size}명)`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

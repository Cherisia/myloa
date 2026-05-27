'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { calcGold, calcGoldMore } from '@/lib/raidData'
import { IconCheck } from '../_icons'

// ── 레이드 셀 ─────────────────────────────────────────────────────────────────
export default function RaidCell({ entry, diff, onToggle, onToggleMoreFrom }) {
  const [tipPos, setTipPos]   = useState(null)
  const toggleRef             = useRef(null)

  const allGates  = entry && diff ? new Array(diff.gates).fill(true) : []
  const allDone   = entry ? (entry.gateClears.length > 0 && entry.gateClears.every(Boolean)) : false
  const moreDone  = entry ? (entry.moreDone || false) : false
  const moreFrom  = entry ? (entry.moreFrom || 'bound') : 'bound'
  const totalGold = entry && diff ? calcGold(diff, allGates) : 0
  const moreGold  = entry && diff ? calcGoldMore(diff, allGates) : 0

  const showTip = () => {
    if (!toggleRef.current) return
    const r = toggleRef.current.getBoundingClientRect()
    setTipPos({ x: r.left + r.width / 2, y: r.top })
  }
  const hideTip = () => setTipPos(null)

  if (!entry || !diff) {
    return <div className="w-full h-[47px] bg-gray-50/50 dark:bg-[#181818]/30 rounded" />
  }

  const diffBadge =
    entry.difficulty === 'nightmare' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400' :
    entry.difficulty === 'hard'      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                                       'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'

  return (
    <div
      onClick={onToggle}
      className={`w-full h-[47px] flex items-center gap-1.5 px-1.5 py-1.5 rounded cursor-pointer transition-colors
        ${moreDone
          ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
          : allDone
          ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
        }`}
    >
      {/* 왼쪽: 체크박스 */}
      <div className={`h-[24px] w-[24px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all
        ${moreDone
          ? 'bg-[var(--accent-500)] border-[var(--accent-500)] text-[var(--accent-900)] shadow-sm'
          : allDone
          ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)] shadow-sm'
          : 'border-gray-200 dark:border-[#383838]'}`}>
        {allDone && <IconCheck />}
      </div>

      {/* 오른쪽: 토글(상단) + 난이도·골드(하단) */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 items-center">
        {/* 토글 행 — 항상 공간 예약 */}
        <div
          ref={toggleRef}
          onMouseEnter={showTip}
          onMouseLeave={hideTip}
          className={`relative ${moreDone ? '' : 'invisible pointer-events-none'}`}
        >
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMoreFrom?.() }}
            className="active:scale-95 transition-transform block"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`flex items-center rounded-full border transition-colors duration-300 ${
              moreFrom === 'bound'
                ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/40'
                : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40'
            }`} style={{ height: 17, padding: 2, gap: 2 }}>
              {moreFrom === 'bound' ? (
                <>
                  <span className="text-[9px] ns-bold select-none leading-none pl-1.5 text-orange-500 dark:text-orange-400 whitespace-nowrap">귀속</span>
                  <div className="flex-shrink-0 rounded-full bg-orange-400 dark:bg-orange-500 shadow" style={{ width: 13, height: 13 }} />
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 rounded-full bg-blue-400 dark:bg-blue-500 shadow" style={{ width: 13, height: 13 }} />
                  <span className="text-[9px] ns-bold select-none leading-none pr-1.5 text-blue-500 dark:text-blue-400 whitespace-nowrap">거래</span>
                </>
              )}
            </div>
          </button>
          {/* 호버 툴팁 — fixed 포지션으로 overflow:hidden 회피 */}
          {tipPos && (
            <div
              style={{ position: 'fixed', left: tipPos.x, top: tipPos.y - 5, transform: 'translate(-50%, -100%)', zIndex: 9999, pointerEvents: 'none' }}
              className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-[8px] ns-bold shadow-md ${
                moreFrom === 'bound'
                  ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-300'
                  : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50 text-sky-600 dark:text-sky-300'
              }`}>
              더보기 -{moreGold.toLocaleString()}G
            </div>
          )}
        </div>

        {/* 난이도 + 골드 행 */}
        <div className="flex items-center gap-0.5">
          <span className={`text-[10px] min-[1920px]:text-[10px] ns-bold px-1 py-0.5 rounded-full leading-none tracking-tight flex-shrink-0 ${diffBadge}`}>
            {diff.label}
          </span>
          <span className={`text-[11px] min-[1920px]:text-[11px] ns-bold leading-none tabular-nums tracking-tight
            ${moreDone ? 'text-[var(--accent-700)] dark:text-[var(--accent-500)]' : allDone ? 'text-[var(--accent-600)] dark:text-[var(--accent-400)]' : 'text-gray-500 dark:text-gray-500'}`}>
            {totalGold.toLocaleString()}G
          </span>
          {entry.isGoldCheck && (
            <Image src="/icons/gold.png" alt="골드" width={10} height={10} className="w-3 h-3 object-contain flex-shrink-0" />
          )}
        </div>
      </div>
    </div>
  )
}

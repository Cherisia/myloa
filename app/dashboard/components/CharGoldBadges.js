'use client'

import AnimatedGold from './AnimatedGold'

// ── 캐릭터별 골드 배지 ────────────────────────────────────────────────────────
export default function CharGoldBadges({ bound, trade, boundTotal, tradeTotal }) {
  const showTotal = boundTotal > 0 || tradeTotal > 0
  return (
    <div className="grid gap-x-1 gap-y-0.5 w-full" style={{ gridTemplateColumns: 'auto 1fr' }}>
      <span className="text-[8px] ns-bold px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 leading-tight self-center whitespace-nowrap">귀속</span>
      <div className="flex items-baseline justify-end gap-0.5 leading-tight">
        <AnimatedGold value={bound} className="text-[9px] ns-bold tabular-nums text-gray-600 dark:text-gray-300" />
        {showTotal && (
          <>
            <span className="text-[8px] text-gray-300 dark:text-gray-600">/</span>
            <span className="text-[8px] tabular-nums text-gray-400 dark:text-gray-500">{boundTotal.toLocaleString()}G</span>
          </>
        )}
      </div>
      <span className="text-[8px] ns-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 leading-tight self-center whitespace-nowrap">거래</span>
      <div className="flex items-baseline justify-end gap-0.5 leading-tight">
        <AnimatedGold value={trade} className="text-[9px] ns-bold tabular-nums text-gray-600 dark:text-gray-300" />
        {showTotal && (
          <>
            <span className="text-[8px] text-gray-300 dark:text-gray-600">/</span>
            <span className="text-[8px] tabular-nums text-gray-400 dark:text-gray-500">{tradeTotal.toLocaleString()}G</span>
          </>
        )}
      </div>
    </div>
  )
}

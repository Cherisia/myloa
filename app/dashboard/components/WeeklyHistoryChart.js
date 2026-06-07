'use client'

import { formatGold } from '@/lib/formatting'

const BAR_MAX_H = 88

// weekStart = 리셋 시각(수요일 06:00 KST), 직전 주 시작은 7일 전
function formatWeekLabel(weekStartStr) {
  const d = new Date(weekStartStr)
  const weekBegin = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000)
  return `${weekBegin.getMonth() + 1}/${weekBegin.getDate()}`
}

export default function WeeklyHistoryChart({ history }) {
  const sorted = [...(history || [])].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart))
  const maxRaids = Math.max(...sorted.map(h => h.totalRaids), 1)

  return (
    <div className="rounded-xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] px-4 pt-4 pb-3 mt-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm ns-bold text-gray-700 dark:text-gray-200">주간 숙제 기록</span>
        {sorted.length > 0 && (
          <span className="text-xs text-gray-400 dark:text-gray-500">최근 {sorted.length}주</span>
        )}
      </div>

      {sorted.length === 0 ? (
        /* 빈 상태 */
        <div className="flex flex-col items-center justify-center py-8 gap-2 text-center">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" className="text-gray-300 dark:text-gray-700">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            <path d="M7 14h3M7 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <p className="text-xs ns-bold text-gray-400 dark:text-gray-500">아직 기록이 없어요</p>
          <p className="text-[11px] text-gray-300 dark:text-gray-600 leading-relaxed">
            매주 수요일 초기화 때 완료한 레이드가<br/>자동으로 저장돼요
          </p>
        </div>
      ) : (
        <>
          {/* 바 차트 */}
          <div className="flex items-end gap-1.5" style={{ height: BAR_MAX_H }}>
            {sorted.map((h, i) => {
              const isLatest = i === sorted.length - 1
              const totalH = h.totalRaids === 0
                ? 0
                : Math.max(4, Math.round((h.totalRaids / maxRaids) * BAR_MAX_H))
              const nonGold = h.totalRaids - h.goldRaids

              return (
                <div
                  key={h.id}
                  className="flex flex-col justify-end flex-1 min-w-0 relative"
                  style={{ height: BAR_MAX_H }}
                  title={`${formatWeekLabel(h.weekStart)}주 · 전체 ${h.totalRaids}개 · 골드 ${h.goldRaids}개`}
                >
                  {/* 개수 레이블 */}
                  {h.totalRaids > 0 && (
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-[9px] ns-bold text-gray-400 dark:text-gray-500 pointer-events-none"
                      style={{ bottom: totalH + 3 }}
                    >
                      {h.totalRaids}
                    </div>
                  )}
                  {/* 스택 바 */}
                  <div
                    className={`w-full flex flex-col overflow-hidden ${isLatest ? 'rounded-t-md' : 'rounded-t'}`}
                    style={{ height: totalH }}
                  >
                    {nonGold > 0 && (
                      <div
                        className="bg-gray-200 dark:bg-[#363636]"
                        style={{ flex: nonGold }}
                      />
                    )}
                    {h.goldRaids > 0 && (
                      <div
                        className="bg-[var(--accent-400)]"
                        style={{ flex: h.goldRaids }}
                      />
                    )}
                  </div>
                </div>
              )
            })}
          </div>

          {/* X축: 날짜 + 골드 */}
          <div className="flex gap-1.5 mt-2">
            {sorted.map((h, i) => {
              const isLatest = i === sorted.length - 1
              return (
                <div
                  key={h.id}
                  className={`flex-1 min-w-0 flex flex-col items-center gap-0.5 ${isLatest ? 'opacity-100' : 'opacity-80'}`}
                >
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 truncate w-full text-center">
                    {formatWeekLabel(h.weekStart)}
                  </span>
                  {h.totalGold > 0 ? (
                    <span className="text-[9px] text-[var(--accent-500)] dark:text-[var(--accent-400)] ns-bold truncate w-full text-center">
                      {formatGold(h.totalGold)}
                    </span>
                  ) : (
                    <span className="text-[9px] text-gray-200 dark:text-gray-700 text-center">—</span>
                  )}
                </div>
              )
            })}
          </div>

          {/* 범례 */}
          <div className="flex items-center gap-5 mt-3 pt-3 border-t border-gray-50 dark:border-[#252525] justify-center">
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-gray-200 dark:bg-[#363636] flex-shrink-0" />
              일반 레이드
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-gray-400 dark:text-gray-500">
              <span className="w-3 h-3 rounded-sm bg-[var(--accent-400)] flex-shrink-0" />
              골드 레이드
            </span>
          </div>
        </>
      )}
    </div>
  )
}

'use client'

import { useState, useMemo } from 'react'

const BAR_MAX_H = 148
const TOP_PAD   = 44  // 툴팁 공간
const Y_WIDTH   = 30  // Y축 레이블 너비

function getWeekSeq(weekStartStr, allSorted) {
  const idx = allSorted.findIndex(h => h.weekStart === weekStartStr)
  return idx >= 0 ? `${idx + 1}주차` : ''
}

function formatDateLabel(weekStartStr) {
  const d = new Date(weekStartStr)
  const wb = new Date(d.getTime() - 7 * 24 * 60 * 60 * 1000)
  return `${wb.getMonth() + 1}/${wb.getDate()}`
}

function formatGold(g) {
  if (g >= 100000) return `${Math.round(g / 1000)}k`
  if (g >= 10000)  return `${(g / 1000).toFixed(1)}k`
  return g.toLocaleString('ko-KR')
}

function Toggle({ options, value, onChange }) {
  return (
    <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#333] text-[11px] flex-shrink-0">
      {options.map(o => (
        <button
          key={o.v}
          type="button"
          onClick={() => onChange(o.v)}
          className={`px-2.5 py-1 transition-colors ${
            value === o.v
              ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
              : 'bg-white dark:bg-[#1c1c1c] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525]'
          }`}
        >
          {o.l}
        </button>
      ))}
    </div>
  )
}

export default function HistoryClient({ history, isDemo = false }) {
  const [display,   setDisplay]   = useState('count') // 'count' | 'pct'
  const [xMode,     setXMode]     = useState('date')  // 'date'  | 'week'
  const [hoveredId, setHoveredId] = useState(null)

  const sorted = useMemo(
    () => [...(history || [])].sort((a, b) => new Date(a.weekStart) - new Date(b.weekStart)),
    [history]
  )

  const maxRaids     = Math.max(...sorted.map(h => h.totalRaids), 1)
  const totalGoldAll = sorted.reduce((s, h) => s + h.totalGold, 0)
  const avgRaids     = sorted.length > 0
    ? (sorted.reduce((s, h) => s + h.totalRaids, 0) / sorted.length).toFixed(1) : 0
  const goldPct = (() => {
    const t = sorted.reduce((s, h) => s + h.totalRaids, 0)
    const g = sorted.reduce((s, h) => s + h.goldRaids, 0)
    return t > 0 ? Math.round(g / t * 100) : 0
  })()
  const bestItem = sorted.reduce((b, h) => h.totalRaids > (b?.totalRaids ?? 0) ? h : b, null)

  const getXLabel = (h) =>
    xMode === 'week' ? getWeekSeq(h.weekStart, sorted) : formatDateLabel(h.weekStart)

  // 차트 전체 높이 = 바 영역 + 상단 레이블 패딩
  const chartH = BAR_MAX_H + TOP_PAD

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

      {/* 헤더 */}
      <div>
        <h1 className="text-lg ns-bold text-gray-800 dark:text-gray-100">숙제 히스토리</h1>
        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
          매주 수요일 초기화 시점의 레이드 완료 현황이 자동으로 저장돼요
        </p>
      </div>

      {/* 데모 배너 */}
      {isDemo && (
        <div className="rounded-xl border border-[var(--accent-200)] dark:border-[var(--accent-900)]/30 bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 px-4 py-3 flex items-center gap-3">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" className="text-[var(--accent-500)] flex-shrink-0">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.8"/>
            <path d="M12 8v4M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
          </svg>
          <p className="text-xs text-[var(--accent-700)] dark:text-[var(--accent-300)]">
            테스트 데이터입니다. 로그인하면 내 실제 히스토리를 확인할 수 있어요.
          </p>
        </div>
      )}

      {sorted.length === 0 ? (
        <div className="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] p-12 flex flex-col items-center gap-3 text-center">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" className="text-gray-200 dark:text-gray-700">
            <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
            <path d="M3 9h18M8 2v4M16 2v4M7 14h3M7 17h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <div>
            <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">아직 히스토리가 없어요</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 leading-relaxed">
              매주 수요일 06시 초기화 때 완료한 레이드가 자동으로 저장돼요
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 요약 카드 */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '기록된 주', value: sorted.length,        unit: '주', color: false },
              { label: '주간 평균', value: avgRaids,             unit: '개', color: false },
              { label: '골드 비율', value: `${goldPct}%`,        unit: '',   color: true  },
              { label: '누적 골드', value: formatGold(totalGoldAll), unit: '', color: true },
            ].map(c => (
              <div key={c.label} className="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] px-3.5 py-3.5 flex flex-col gap-1.5">
                <span className="text-[11px] text-gray-400 dark:text-gray-500">{c.label}</span>
                <span className={`text-xl ns-bold leading-none ${c.color ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)]' : 'text-gray-800 dark:text-gray-100'}`}>
                  {c.value}
                  {c.unit && <span className="text-sm text-gray-400 ml-0.5 ns-light">{c.unit}</span>}
                </span>
              </div>
            ))}
          </div>

          {/* 차트 카드 */}
          <div className="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] px-5 pt-5 pb-4 overflow-visible">

            {/* 차트 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-4">
                <span className="text-sm ns-bold text-gray-700 dark:text-gray-200">주간 레이드 현황</span>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 dark:text-gray-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-200 dark:bg-[#3a3a3a]" />
                    전체
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-[var(--accent-400)]" />
                    골드
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Toggle
                  options={[{ v: 'date', l: '날짜' }, { v: 'week', l: '주차' }]}
                  value={xMode}
                  onChange={setXMode}
                />
                <Toggle
                  options={[{ v: 'count', l: '개수' }, { v: 'pct', l: '%' }]}
                  value={display}
                  onChange={setDisplay}
                />
              </div>
            </div>

            {/* 차트 영역 — Y축 + 바 */}
            <div className="flex" style={{ height: chartH }}>

              {/* Y축 레이블 */}
              <div className="relative flex-shrink-0" style={{ width: Y_WIDTH, height: chartH }}>
                {[0, 0.25, 0.5, 0.75, 1.0].map(r => {
                  const label = display === 'pct'
                    ? (r === 0 ? '0' : `${Math.round(r * 100)}`)
                    : (r === 0 ? '0' : `${Math.round(maxRaids * r)}`)
                  return (
                    <span
                      key={r}
                      className="absolute right-2 text-[10px] text-gray-300 dark:text-[#484848] leading-none select-none"
                      style={{ bottom: Math.round(r * BAR_MAX_H) - 5 }}
                    >
                      {label}
                    </span>
                  )
                })}
                {/* Y축 단위 */}
                <span
                  className="absolute right-2 text-[9px] text-gray-300 dark:text-[#484848] leading-none select-none"
                  style={{ top: 0 }}
                >
                  {display === 'pct' ? '%' : '개'}
                </span>
              </div>

              {/* 바 컨테이너 */}
              <div className="relative flex-1 overflow-visible" style={{ height: chartH }}>

                {/* 수평 그리드선 */}
                {[0, 0.25, 0.5, 0.75, 1.0].map(r => (
                  <div
                    key={r}
                    className={`absolute left-0 right-0 border-t ${
                      r === 0
                        ? 'border-gray-200 dark:border-[#333]'
                        : 'border-dashed border-gray-100 dark:border-[#272727]'
                    }`}
                    style={{ bottom: Math.round(r * BAR_MAX_H) }}
                  />
                ))}

                {/* 바 flex */}
                <div className="absolute inset-0 flex items-end gap-1.5 px-0.5">
                {sorted.map((h, i) => {
                  const isBest = bestItem?.id === h.id && h.totalRaids > 0

                  const isHovered = hoveredId === h.id
                  const tooltipAlign = i === 0 ? 'left-0' : i === sorted.length - 1 ? 'right-0' : 'left-1/2 -translate-x-1/2'

                  /* ── 공통 툴팁 ── */
                  const Tooltip = ({ extra }) => isHovered ? (
                    <div className={`absolute top-0 ${tooltipAlign} z-20 pointer-events-none`}>
                      <div className="bg-gray-800/90 dark:bg-[#e8e8e8] rounded-lg px-2.5 py-1.5 shadow-lg whitespace-nowrap">
                        <div className="text-[10px] ns-bold text-gray-300 dark:text-gray-500 mb-1">{getXLabel(h)}</div>
                        <div className="flex items-center gap-2 text-[11px] ns-bold">
                          <span className="text-white dark:text-gray-800">전체 {h.totalRaids}</span>
                          <span className="text-[var(--accent-300)] dark:text-[var(--accent-500)]">골드 {h.goldRaids}</span>
                        </div>
                        {extra && <div className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">{extra}</div>}
                      </div>
                      <div className="w-0 h-0 mx-auto border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-gray-800/90 dark:border-t-[#e8e8e8]" />
                    </div>
                  ) : null

                  /* ── % 모드 ── */
                  if (display === 'pct') {
                    const pct  = h.totalRaids > 0 ? Math.round(h.goldRaids / h.totalRaids * 100) : 0
                    const barH = pct === 0 ? 2 : Math.max(8, Math.round(pct / 100 * BAR_MAX_H))

                    return (
                      <div
                        key={h.id}
                        className="flex-1 min-w-0 relative flex flex-col justify-end cursor-default"
                        style={{ height: chartH }}
                        onMouseEnter={() => setHoveredId(h.id)}
                        onMouseLeave={() => setHoveredId(null)}
                      >
                        <Tooltip extra={`달성률 ${pct}%`} />
                        <div
                          className={`w-full rounded-t-xl transition-opacity ${isHovered ? 'opacity-75' : ''} ${
                            isBest ? 'bg-[var(--accent-400)]' : 'bg-[var(--accent-300)] dark:bg-[var(--accent-500)]/70'
                          }`}
                          style={{ height: barH }}
                        />
                      </div>
                    )
                  }

                  /* ── 개수 모드 ── */
                  const totalH = h.totalRaids === 0
                    ? 2
                    : Math.max(8, Math.round(h.totalRaids / maxRaids * BAR_MAX_H))
                  const goldH  = h.totalRaids === 0
                    ? 0
                    : Math.round(h.goldRaids / h.totalRaids * totalH)
                  const grayH  = totalH - goldH

                  return (
                    <div
                      key={h.id}
                      className="flex-1 min-w-0 relative flex flex-col justify-end cursor-default"
                      style={{ height: chartH }}
                      onMouseEnter={() => setHoveredId(h.id)}
                      onMouseLeave={() => setHoveredId(null)}
                    >
                      <Tooltip />
                      {/* 2단 바 */}
                      <div
                        className={`w-full rounded-t-xl overflow-hidden transition-opacity ${isHovered ? 'opacity-75' : ''}`}
                        style={{ height: totalH }}
                      >
                        {grayH > 0 && (
                          <div className="w-full bg-gray-200 dark:bg-[#303030]" style={{ height: grayH }} />
                        )}
                        {goldH > 0 && (
                          <div
                            className={isBest ? 'w-full bg-[var(--accent-400)]' : 'w-full bg-[var(--accent-300)] dark:bg-[var(--accent-500)]/80'}
                            style={{ height: goldH }}
                          />
                        )}
                      </div>
                    </div>
                  )
                })}
                </div>
              </div>
            </div>

            {/* X축 레이블 — Y축 너비만큼 들여쓰기 */}
            <div className="flex gap-1.5 mt-2.5" style={{ paddingLeft: Y_WIDTH }}>
              {sorted.map((h, i) => {
                const isBest = bestItem?.id === h.id && h.totalRaids > 0
                return (
                  <div key={h.id} className="flex-1 min-w-0 flex flex-col items-center gap-0.5">
                    <span className={`text-[11px] truncate w-full text-center leading-none ${
                      isBest ? 'ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)]' : 'text-gray-400 dark:text-gray-500'
                    }`}>
                      {getXLabel(h)}
                    </span>
                    {h.totalGold > 0
                      ? <span className="text-[10px] ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)] truncate w-full text-center leading-none">
                          {formatGold(h.totalGold)}
                        </span>
                      : <span className="text-[10px] text-gray-200 dark:text-gray-700 text-center leading-none">—</span>
                    }
                  </div>
                )
              })}
            </div>
          </div>

          {/* 주간 상세 목록 */}
          <div className="rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1c1c1c] overflow-hidden">
            <div className="px-5 py-3.5 border-b border-gray-50 dark:border-[#252525]">
              <span className="text-sm ns-bold text-gray-700 dark:text-gray-200">주간 상세</span>
            </div>
            {[...sorted].reverse().map((h, i) => {
              const isBest   = bestItem?.id === h.id && h.totalRaids > 0
              const seqLabel = getWeekSeq(h.weekStart, sorted)
              const dateLabel = formatDateLabel(h.weekStart)
              const wGoldPct = h.totalRaids > 0 ? Math.round(h.goldRaids / h.totalRaids * 100) : 0
              return (
                <div
                  key={h.id}
                  className="px-5 py-3 flex items-center gap-3 border-b border-gray-50 dark:border-[#252525] last:border-b-0"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm ns-bold text-gray-700 dark:text-gray-200">
                        {seqLabel}
                      </span>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">{dateLabel} 주</span>
                      {isBest && (
                        <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-300)]">
                          최고
                        </span>
                      )}
                      {i === 0 && (
                        <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500">
                          최근
                        </span>
                      )}
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="relative w-16 h-1.5 rounded-full bg-gray-100 dark:bg-[#333] overflow-hidden">
                        <div
                          className="absolute left-0 top-0 bottom-0 rounded-full bg-[var(--accent-400)]"
                          style={{ width: `${wGoldPct}%` }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 dark:text-gray-500">
                        전체 <span className="ns-bold text-gray-600 dark:text-gray-300">{h.totalRaids}</span>
                        <span className="mx-1 text-gray-200 dark:text-gray-700">·</span>
                        골드 <span className="ns-bold text-gray-600 dark:text-gray-300">{h.goldRaids}</span>
                        <span className="mx-1 text-gray-200 dark:text-gray-700">·</span>
                        <span className="ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)]">{wGoldPct}%</span>
                      </span>
                    </div>
                  </div>
                  <div className="text-right flex-shrink-0">
                    {h.totalGold > 0 ? (
                      <>
                        <div className="text-sm ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)]">
                          {h.totalGold.toLocaleString('ko-KR')}
                        </div>
                        <div className="text-[10px] text-gray-400 dark:text-gray-500">골드</div>
                      </>
                    ) : (
                      <span className="text-xs text-gray-300 dark:text-gray-700">—</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </>
      )}
    </div>
  )
}

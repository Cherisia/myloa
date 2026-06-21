'use client'

import { useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

const STATUS_CHIP = {
  recruiting: 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/25 text-[var(--accent-700)] dark:text-[var(--accent-300)] border border-[var(--accent-200)] dark:border-[var(--accent-800)]/50',
  closed:     'bg-gray-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-white/10',
  done:       'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border border-green-200/70 dark:border-green-800/40',
  disbanded:  'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-gray-600 line-through border border-gray-200 dark:border-white/10',
}

const STATUS_DOT = {
  recruiting: 'bg-[var(--accent-400)]',
  closed:     'bg-gray-400 dark:bg-gray-500',
  done:       'bg-green-500',
  disbanded:  'bg-gray-300 dark:bg-gray-600',
}

function toKSTDateStr(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  return [
    kst.getUTCFullYear(),
    String(kst.getUTCMonth() + 1).padStart(2, '0'),
    String(kst.getUTCDate()).padStart(2, '0'),
  ].join('-')
}

function getCurrentWeekRange() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const kstDay = kst.getUTCDay()
  const daysFromWed = (kstDay + 4) % 7

  const wed = new Date(kst)
  wed.setUTCDate(kst.getUTCDate() - daysFromWed)
  const tue = new Date(wed)
  tue.setUTCDate(wed.getUTCDate() + 6)

  const fmt = d => [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('-')

  return { start: fmt(wed), end: fmt(tue) }
}

function buildRows(year, month) {
  const firstDay = new Date(Date.UTC(year, month - 1, 1))
  const startPad = (firstDay.getUTCDay() + 6) % 7
  const totalDays = new Date(Date.UTC(year, month, 0)).getUTCDate()

  const cells = []
  for (let i = 0; i < startPad; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const rows = []
  for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7))
  return rows
}

export default function MonthlyCalendar({ posts, year, month, onDayClick, onPostClick }) {
  const rows = useMemo(() => buildRows(year, month), [year, month])

  const postsByDate = useMemo(() => {
    const map = {}
    for (const post of posts) {
      const key = toKSTDateStr(post.scheduledAt)
      if (!map[key]) map[key] = []
      map[key].push(post)
    }
    return map
  }, [posts])

  const todayStr  = toKSTDateStr(new Date().toISOString())
  const weekRange = useMemo(() => getCurrentWeekRange(), [])

  return (
    <div className="rounded-2xl overflow-hidden border border-gray-200 dark:border-[#252525] shadow-sm bg-white dark:bg-[#161616]">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 border-b border-gray-200 dark:border-[#252525] bg-gray-50 dark:bg-[#111]">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className={`text-center text-[11px] ns-bold py-3 tracking-widest
            ${i === 5 ? 'text-blue-400' : i === 6 ? 'text-rose-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 행들 */}
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-7 ${rowIdx < rows.length - 1 ? 'border-b border-gray-100 dark:border-[#1f1f1f]' : ''}`}
        >
          {row.map((day, colIdx) => {
            const isSat  = colIdx === 5
            const isSun  = colIdx === 6
            const isLast = colIdx === 6
            const borderR = !isLast ? 'border-r border-gray-100 dark:border-[#1f1f1f]' : ''

            if (!day) {
              return (
                <div key={colIdx} className={`min-h-[90px] bg-gray-50/60 dark:bg-[#0f0f0f]/60 ${borderR}`} />
              )
            }

            const dateStr  = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday  = dateStr === todayStr
            const isInWeek = dateStr >= weekRange.start && dateStr <= weekRange.end

            const dayPosts    = postsByDate[dateStr] || []
            const activePosts = dayPosts.filter(p => p.status !== 'disbanded')
            const visiblePosts = activePosts.slice(0, 2)
            const extraCount  = activePosts.length - visiblePosts.length

            const bgClass = isToday
              ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15'
              : isInWeek
                ? 'bg-[var(--accent-50)]/30 dark:bg-[var(--accent-900)]/5'
                : ''

            return (
              <button
                key={colIdx}
                type="button"
                onClick={() => onDayClick(year, month, day)}
                className={`min-h-[90px] p-2 text-left transition-all duration-150 group
                  hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/20
                  hover:ring-2 hover:ring-inset hover:ring-[var(--accent-300)] dark:hover:ring-[var(--accent-700)]/50
                  ${borderR} ${bgClass}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-400)]`}
              >
                {/* 날짜 숫자 + 일정 있음 dot */}
                <div className="flex items-start justify-between mb-1.5">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ns-bold transition-all duration-150
                    ${isToday
                      ? 'bg-[var(--accent-400)] text-[var(--accent-900)] shadow-sm'
                      : isSun
                        ? 'text-rose-400 group-hover:bg-rose-50 dark:group-hover:bg-rose-900/20'
                        : isSat
                          ? 'text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
                          : 'text-gray-600 dark:text-gray-400 group-hover:bg-[var(--accent-100)] dark:group-hover:bg-[var(--accent-900)]/30'}`}>
                    {day}
                  </span>
                  {activePosts.length > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full mt-1 flex-shrink-0 bg-[var(--accent-400)] opacity-60" />
                  )}
                </div>

                {/* 공고 칩 */}
                <div className="space-y-0.5">
                  {visiblePosts.map(post => {
                    const raid = RAID_MAP[post.raidId]
                    return (
                      <button
                        key={post.id}
                        type="button"
                        onClick={onPostClick ? (e) => { e.stopPropagation(); onPostClick(post) } : undefined}
                        className={`w-full flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-md truncate leading-tight ns-bold text-left
                          ${STATUS_CHIP[post.status] || STATUS_CHIP.recruiting}
                          ${onPostClick ? 'hover:brightness-95 dark:hover:brightness-110 transition-[filter]' : ''}`}
                      >
                        <span className={`w-1 h-1 rounded-full flex-shrink-0 ${STATUS_DOT[post.status] || STATUS_DOT.recruiting}`} />
                        {raid?.name || post.raidId}
                      </button>
                    )
                  })}
                  {extraCount > 0 && (
                    <div className="text-[10px] text-[var(--accent-500)] dark:text-[var(--accent-400)] ns-bold pl-1 opacity-80">
                      +{extraCount}
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      ))}
    </div>
  )
}

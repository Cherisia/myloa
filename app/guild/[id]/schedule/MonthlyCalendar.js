'use client'

import { useMemo } from 'react'
import { RAID_MAP } from '@/lib/raidData'

const DAY_LABELS = ['월', '화', '수', '목', '금', '토', '일']

const STATUS_CHIP = {
  recruiting: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/40 text-[var(--accent-700)] dark:text-[var(--accent-300)]',
  closed:     'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400',
  done:       'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400',
  disbanded:  'bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 line-through',
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

// 현재 주간 범위: 지난 수요일 ~ 다음 화요일 (KST 날짜 기준)
function getCurrentWeekRange() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  const kstDay = kst.getUTCDay() // 0=일 1=월 2=화 3=수 4=목 5=금 6=토
  const daysFromWed = (kstDay + 4) % 7  // 수=0, 목=1, 금=2, 토=3, 일=4, 월=5, 화=6

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

export default function MonthlyCalendar({ posts, year, month, onDayClick }) {
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
    <div className="rounded-xl border border-gray-200 dark:border-[#2a2a2a] overflow-hidden">
      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 bg-gray-50 dark:bg-[#181818] border-b border-gray-200 dark:border-[#2a2a2a]">
        {DAY_LABELS.map((d, i) => (
          <div key={i} className={`text-center text-xs ns-bold py-2.5
            ${i < 6 ? 'border-r border-gray-200 dark:border-[#2a2a2a]' : ''}
            ${i === 5 ? 'text-blue-400' : i === 6 ? 'text-red-400' : 'text-gray-400 dark:text-gray-500'}`}>
            {d}
          </div>
        ))}
      </div>

      {/* 날짜 행들 */}
      {rows.map((row, rowIdx) => (
        <div
          key={rowIdx}
          className={`grid grid-cols-7 ${rowIdx < rows.length - 1 ? 'border-b border-gray-200 dark:border-[#2a2a2a]' : ''}`}
        >
          {row.map((day, colIdx) => {
            const isSat  = colIdx === 5
            const isSun  = colIdx === 6
            const isLast = colIdx === 6
            const borderR = !isLast ? 'border-r border-gray-200 dark:border-[#2a2a2a]' : ''

            if (!day) {
              return (
                <div key={colIdx} className={`min-h-[80px] bg-gray-50/60 dark:bg-[#161616] ${borderR}`} />
              )
            }

            const dateStr  = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isToday  = dateStr === todayStr
            const isInWeek = dateStr >= weekRange.start && dateStr <= weekRange.end
            const isWeekStart = dateStr === weekRange.start // 수요일

            const dayPosts    = postsByDate[dateStr] || []
            const activePosts = dayPosts.filter(p => p.status !== 'disbanded')
            const visiblePosts = activePosts.slice(0, 2)
            const extraCount  = activePosts.length - visiblePosts.length

            // 배경색: 오늘 > 이번주 > 기본
            const bgClass = isToday
              ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20'
              : isInWeek
                ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/8'
                : 'hover:bg-gray-50 dark:hover:bg-[#1c1c1c]'

            // 수요일(이번주 시작)에 왼쪽 accent 라인
            const weekStartBorder = isWeekStart ? 'border-l-2 border-l-[var(--accent-400)]' : ''

            return (
              <button
                key={colIdx}
                type="button"
                onClick={() => onDayClick(year, month, day)}
                className={`min-h-[80px] p-1.5 text-left transition-colors group
                  ${borderR} ${bgClass} ${weekStartBorder}
                  focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--accent-400)]`}
              >
                {/* 날짜 숫자 + 이번주 라벨 */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ns-bold transition-colors
                    ${isToday
                      ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
                      : isSun
                        ? 'text-red-400 group-hover:bg-red-50 dark:group-hover:bg-red-900/20'
                        : isSat
                          ? 'text-blue-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20'
                          : 'text-gray-700 dark:text-gray-300 group-hover:bg-gray-100 dark:group-hover:bg-[#2a2a2a]'}`}>
                    {day}
                  </span>
                </div>

                {/* 공고 칩 */}
                <div className="space-y-0.5">
                  {visiblePosts.map(post => {
                    const raid = RAID_MAP[post.raidId]
                    return (
                      <div key={post.id}
                        className={`text-[10px] px-1.5 py-px rounded truncate leading-tight ns-bold
                          ${STATUS_CHIP[post.status] || STATUS_CHIP.recruiting}`}>
                        {raid?.name || post.raidId}
                      </div>
                    )
                  })}
                  {extraCount > 0 && (
                    <div className="text-[10px] text-[var(--accent-500)] dark:text-[var(--accent-400)] ns-bold px-1">
                      +{extraCount}개 더보기
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

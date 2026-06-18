'use client'

import { useMemo, useRef } from 'react'
import { RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, DIFF_COLOR } from '@/app/dashboard/_constants'
import PostCard from './PostCard'

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
const START_HOUR = 6
const END_HOUR = 24
const SLOT_MINUTES = 30
const SLOTS_PER_DAY = ((END_HOUR - START_HOUR) * 60) / SLOT_MINUTES

// 수요일 06:00 KST 경계 초과 여부
function crossesResetBoundary(fromDate, toDate) {
  function getResetBoundary(d) {
    const kst = new Date(d.getTime() + 9 * 3600 * 1000)
    const day = kst.getUTCDay() // 3=수
    const daysToWed = ((3 - day + 7) % 7) || 7
    const wed = new Date(kst)
    wed.setUTCDate(kst.getUTCDate() + daysToWed)
    wed.setUTCHours(6, 0, 0, 0)
    return new Date(wed.getTime() - 9 * 3600 * 1000)
  }
  const boundary = getResetBoundary(fromDate)
  return fromDate < boundary && toDate >= boundary
}

// 주 월요일 날짜 배열 계산
function getWeekDays(weekOffset) {
  const now = new Date()
  now.setUTCDate(now.getUTCDate() + weekOffset * 7)
  const day = now.getUTCDay() || 7
  const monday = new Date(now)
  monday.setUTCDate(now.getUTCDate() - day + 1)
  monday.setUTCHours(0, 0, 0, 0)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday)
    d.setUTCDate(monday.getUTCDate() + i)
    return d
  })
}

// scheduledAt → { dayIndex, slotIndex } 변환
function toGridPos(scheduledAt) {
  const d = new Date(scheduledAt)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const dayIndex = (kst.getUTCDay() + 6) % 7 // 0=월 ~ 6=일
  const hour = kst.getUTCHours()
  const min = kst.getUTCMinutes()
  const totalMin = (hour - START_HOUR) * 60 + min
  const slotIndex = Math.floor(totalMin / SLOT_MINUTES)
  return { dayIndex, slotIndex }
}

export default function WeeklyCalendar({ posts, userId, weekOffset, loading, onCellClick, onDrop, onQuickJoin }) {
  const weekDays = useMemo(() => getWeekDays(weekOffset), [weekOffset])
  const dragPostRef = useRef(null)

  // posts를 (dayIndex, slotIndex) → posts[] 맵으로 변환
  const grid = useMemo(() => {
    const map = {}
    for (const post of posts) {
      const { dayIndex, slotIndex } = toGridPos(post.scheduledAt)
      if (slotIndex < 0 || slotIndex >= SLOTS_PER_DAY) continue
      const key = `${dayIndex}-${slotIndex}`
      if (!map[key]) map[key] = []
      map[key].push(post)
    }
    return map
  }, [posts])

  function handleCellClick(dayIndex, slotIndex) {
    const key = `${dayIndex}-${slotIndex}`
    const cellPosts = grid[key] || []
    const d = new Date(weekDays[dayIndex])
    d.setUTCHours(START_HOUR + Math.floor((slotIndex * SLOT_MINUTES) / 60), (slotIndex * SLOT_MINUTES) % 60, 0, 0)
    // KST 보정 역산 (UTC 저장)
    const utc = new Date(d.getTime() - 9 * 3600 * 1000)
    onCellClick(utc.toISOString(), cellPosts)
  }

  function handleDragStart(e, post) {
    if (post.status !== 'closed') { e.preventDefault(); return }
    if (post.creatorId !== userId) { e.preventDefault(); return }
    dragPostRef.current = post
    e.dataTransfer.effectAllowed = 'move'
  }

  function handleDragOver(e) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  function handleDropCell(e, dayIndex, slotIndex) {
    e.preventDefault()
    const post = dragPostRef.current
    if (!post) return
    dragPostRef.current = null
    const d = new Date(weekDays[dayIndex])
    d.setUTCHours(START_HOUR + Math.floor((slotIndex * SLOT_MINUTES) / 60), (slotIndex * SLOT_MINUTES) % 60, 0, 0)
    const utc = new Date(d.getTime() - 9 * 3600 * 1000)
    const originalDate = new Date(post.scheduledAt)
    if (crossesResetBoundary(originalDate, utc) || crossesResetBoundary(utc, originalDate)) {
      return
    }
    onDrop(post, utc.toISOString())
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
        불러오는 중...
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[640px]">
        {/* 요일 헤더 */}
        <div className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-gray-200 dark:border-[#333]">
          <div />
          {weekDays.map((d, i) => {
            const today = new Date()
            const isToday = d.toDateString() === today.toDateString()
            return (
              <div key={i} className={`text-center py-2 text-xs ns-bold
                ${isToday ? 'text-[var(--accent-700)] dark:text-[var(--accent-300)]' : 'text-gray-500 dark:text-gray-400'}`}>
                {DAYS[i]}<br />
                <span className={`text-[11px] ${isToday ? '' : 'text-gray-400 dark:text-gray-500'}`}>
                  {d.getUTCMonth() + 1}/{d.getUTCDate()}
                </span>
              </div>
            )
          })}
        </div>

        {/* 시간 슬롯 그리드 */}
        <div className="overflow-y-auto max-h-[600px]">
          {Array.from({ length: SLOTS_PER_DAY }, (_, slotIndex) => {
            const totalMin = slotIndex * SLOT_MINUTES
            const hour = START_HOUR + Math.floor(totalMin / 60)
            const min = totalMin % 60
            const showLabel = min === 0
            return (
              <div key={slotIndex} className="grid grid-cols-[48px_repeat(7,1fr)] border-b border-gray-100 dark:border-[#222] min-h-[40px]">
                <div className="text-right pr-2 text-[10px] text-gray-400 dark:text-gray-500 pt-1 select-none">
                  {showLabel ? `${hour}:00` : ''}
                </div>
                {Array.from({ length: 7 }, (_, dayIndex) => {
                  const key = `${dayIndex}-${slotIndex}`
                  const cellPosts = grid[key] || []
                  return (
                    <div
                      key={dayIndex}
                      className="border-l border-gray-100 dark:border-[#222] p-0.5 cursor-pointer hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/10 transition-colors min-h-[40px]"
                      onClick={() => handleCellClick(dayIndex, slotIndex)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDropCell(e, dayIndex, slotIndex)}
                    >
                      {cellPosts.length <= 2
                        ? cellPosts.map(post => (
                            <PostCard
                              key={post.id}
                              post={post}
                              userId={userId}
                              compact
                              draggable={post.status === 'closed' && post.creatorId === userId}
                              onDragStart={(e) => handleDragStart(e, post)}
                              onQuickJoin={onQuickJoin}
                            />
                          ))
                        : (
                          <div className="flex flex-col gap-0.5">
                            <PostCard
                              post={cellPosts[0]}
                              userId={userId}
                              compact
                              draggable={cellPosts[0].status === 'closed' && cellPosts[0].creatorId === userId}
                              onDragStart={(e) => handleDragStart(e, cellPosts[0])}
                              onQuickJoin={onQuickJoin}
                            />
                            <div className="text-[10px] text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold pl-1">
                              +{cellPosts.length - 1}
                            </div>
                          </div>
                        )
                      }
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

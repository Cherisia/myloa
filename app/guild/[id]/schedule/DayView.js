'use client'

import { useMemo } from 'react'
import { IconBack, IconPlus } from '@/app/dashboard/_icons'
import PostCard from './PostCard'

const DAY_NAMES = ['일','월','화','수','목','금','토']
const HOUR_START = 6   // 06:00
const HOUR_END   = 25  // 다음날 01:00 (자정 이후 일정 대응)

// ISO 문자열을 KST 기준 시간 정보로 변환
function toKST(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  return {
    hour:    kst.getUTCHours(),
    minute:  kst.getUTCMinutes(),
    year:    kst.getUTCFullYear(),
    month:   kst.getUTCMonth() + 1,
    day:     kst.getUTCDate(),
    weekday: kst.getUTCDay(),
  }
}

function hourLabel(h) {
  const hh = h % 24
  return `${String(hh).padStart(2,'0')}:00`
}

export default function DayView({
  year, month, day,
  posts,
  myUserId,
  onBack,
  onPostClick,
  onCreateClick,
}) {
  // 선택된 날의 KST 요일 문자열
  const dateLabel = useMemo(() => {
    const d = new Date(Date.UTC(year, month - 1, day))
    return `${month}월 ${day}일 (${DAY_NAMES[d.getUTCDay()]})`
  }, [year, month, day])

  // 해당 날 posts만 필터 (scheduledAt 기준 KST)
  const dayPosts = useMemo(() => {
    return posts.filter(post => {
      const k = toKST(post.scheduledAt)
      return k.year === year && k.month === month && k.day === day
    }).sort((a, b) => new Date(a.scheduledAt) - new Date(b.scheduledAt))
  }, [posts, year, month, day])

  // 시간대별 posts 맵 (key: hour)
  const postsByHour = useMemo(() => {
    const map = {}
    for (const post of dayPosts) {
      const { hour } = toKST(post.scheduledAt)
      const h = hour < HOUR_START ? 24 + hour : hour // 자정 이후는 24+ 처리
      if (!map[h]) map[h] = []
      map[h].push(post)
    }
    return map
  }, [dayPosts])

  const hours = Array.from({ length: HOUR_END - HOUR_START }, (_, i) => HOUR_START + i)

  return (
    <div className="flex flex-col gap-4">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
          aria-label="달력으로 돌아가기"
        >
          <span className="text-gray-500"><IconBack /></span>
        </button>
        <h2 className="ns-bold text-gray-800 dark:text-gray-100 text-base">{dateLabel}</h2>
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {dayPosts.filter(p => p.status !== 'disbanded').length}개 일정
        </span>
      </div>

      {/* 시간대별 타임라인 */}
      {dayPosts.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500">이 날 등록된 레이드 일정이 없어요</p>
          <button
            type="button"
            onClick={onCreateClick}
            className="mt-4 px-4 py-2 rounded-xl border border-dashed border-[var(--accent-300)] text-sm text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/10 transition-colors"
          >
            + 레이드 일정 추가
          </button>
        </div>
      ) : (
        <div className="space-y-0">
          {hours.map(h => {
            const posts = postsByHour[h] || []
            if (posts.length === 0) {
              // 빈 시간대는 구분선만 표시
              return (
                <div key={h} className="flex items-start gap-3 group">
                  <div className="w-14 shrink-0 pt-2 text-right">
                    <span className="text-[11px] text-gray-300 dark:text-gray-600">{hourLabel(h)}</span>
                  </div>
                  <div className="flex-1 border-t border-gray-100 dark:border-[#2a2a2a] min-h-[28px]" />
                </div>
              )
            }
            return (
              <div key={h} className="flex items-start gap-3">
                <div className="w-14 shrink-0 pt-3 text-right">
                  <span className="text-[11px] ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)]">{hourLabel(h)}</span>
                </div>
                <div className="flex-1 border-t border-[var(--accent-200)] dark:border-[var(--accent-900)]/40 pt-2 pb-3 space-y-2">
                  {posts.map(post => (
                    <PostCard
                      key={post.id}
                      post={post}
                      userId={myUserId}
                      onClick={() => onPostClick(post)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ── 상수 ─────────────────────────────────────────────────────────
const NOTICE_TYPE_LABEL = {
  공지: { label: '공지', cls: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300' },
  이벤트: { label: '이벤트', cls: 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-300)]' },
  업데이트: { label: '업데이트', cls: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300' },
  점검: { label: '점검', cls: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300' },
}

const PATCH_NOTE_BADGE = { label: '패치노트', cls: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400' }

function isPatchNote(n) {
  return (n.Title || '').includes('업데이트 내역')
}

function getNoticeBadge(n) {
  if (isPatchNote(n)) return PATCH_NOTE_BADGE
  return NOTICE_TYPE_LABEL[n.Type] ?? { label: n.Type, cls: 'bg-gray-100 dark:bg-zinc-700 text-gray-500' }
}


// KST 기준 오늘 날짜 문자열 (yyyy-MM-dd)
function todayKST() {
  const now = new Date(Date.now() + 9 * 60 * 60 * 1000)
  return now.toISOString().slice(0, 10)
}

function kstTimeStr(isoStr) {
  if (!isoStr) return ''
  const d = new Date(isoStr)
  const kst = new Date(d.getTime() + 9 * 60 * 60 * 1000)
  const h = String(kst.getUTCHours()).padStart(2, '0')
  const m = String(kst.getUTCMinutes()).padStart(2, '0')
  return `${h}:${m}`
}

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${mm}.${dd}`
}

// ── 스켈레톤 ─────────────────────────────────────────────────────
function Skeleton({ className = '' }) {
  return <div className={`animate-pulse rounded bg-gray-200 dark:bg-zinc-700 ${className}`} />
}

// ── 섹션 헤더 ────────────────────────────────────────────────────
function SectionHeader({ icon, title, extra }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base ns-bold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
        <span>{icon}</span>
        {title}
      </h2>
      {extra}
    </div>
  )
}

// ── 공지사항 패널 ─────────────────────────────────────────────────
function NoticesPanel({ notices, loading }) {
  const [tab, setTab] = useState('전체')
  const tabs = ['전체', '공지', '패치노트', '이벤트', '점검']

  const filtered = tab === '전체'
    ? notices
    : notices.filter(n => {
        if (tab === '패치노트') return isPatchNote(n)
        return (n.Type || '').includes(tab)
      })

  return (
    <div className="bg-white dark:bg-zinc-800/60 rounded-xl shadow-border p-4 flex flex-col h-full">
      <SectionHeader icon="📢" title="공지사항" />

      {/* 탭 */}
      <div className="flex gap-1 mb-3 flex-wrap">
        {tabs.map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-2.5 py-0.5 rounded-full text-xs transition-colors ${
              tab === t
                ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                : 'bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-zinc-600'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* 목록 */}
      <ul className="flex-1 space-y-1 overflow-y-auto scrollbar-thin max-h-72 pr-2">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-2 py-1.5">
                <Skeleton className="w-10 h-4 shrink-0" />
                <Skeleton className="h-4 flex-1" />
                <Skeleton className="w-8 h-3 shrink-0" />
              </li>
            ))
          : filtered.length === 0
          ? <li className="text-sm text-gray-400 py-4 text-center">공지사항이 없습니다</li>
          : filtered.slice(0, 20).map((n, i) => {
              const badge = getNoticeBadge(n)
              return (
                <li key={i}>
                  <a
                    href={n.Link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group"
                  >
                    <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full ns-bold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-300)] transition-colors">
                      {n.Title}
                    </span>
                    <span className="shrink-0 text-xs text-gray-400">
                      {formatDate(n.Date)}
                    </span>
                  </a>
                </li>
              )
            })
        }
      </ul>
    </div>
  )
}

// ── 이벤트 패널 ──────────────────────────────────────────────────
function EventsPanel({ events, loading }) {
  const now = Date.now()
  const active = events.filter(e => {
    if (!e.EndDate) return true
    return new Date(e.EndDate).getTime() > now
  })

  return (
    <div className="bg-white dark:bg-zinc-800/60 rounded-xl shadow-border p-4 flex flex-col h-full">
      <SectionHeader
        icon="🎉"
        title="진행 중인 이벤트"
        extra={
          <span className="text-xs text-gray-400">{active.length}개</span>
        }
      />

      <ul className="flex-1 space-y-2 overflow-y-auto scrollbar-thin max-h-72">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="flex gap-3 items-center">
                <Skeleton className="w-14 h-10 rounded-lg shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </li>
            ))
          : active.length === 0
          ? <li className="text-sm text-gray-400 py-4 text-center">진행 중인 이벤트가 없습니다</li>
          : active.slice(0, 10).map((e, i) => (
              <li key={i}>
                <a
                  href={e.Link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex gap-3 items-center p-1.5 rounded-lg hover:bg-gray-50 dark:hover:bg-zinc-700/50 transition-colors group"
                >
                  {e.Thumbnail
                    ? <img
                        src={e.Thumbnail}
                        alt={e.Title}
                        className="w-16 h-10 rounded-lg object-cover shrink-0 bg-gray-100 dark:bg-zinc-700"
                      />
                    : <div className="w-16 h-10 rounded-lg shrink-0 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 flex items-center justify-center text-lg">🎉</div>
                  }
                  <div className="flex-1 min-w-0">
                    <div className="text-sm text-gray-800 dark:text-gray-200 truncate group-hover:text-[var(--accent-600)] dark:group-hover:text-[var(--accent-300)] transition-colors">
                      {e.Title}
                    </div>
                    {(e.StartDate || e.EndDate) && (
                      <div className="text-xs text-gray-400 mt-0.5">
                        {e.StartDate && formatDate(e.StartDate)}
                        {e.StartDate && e.EndDate && ' ~ '}
                        {e.EndDate && formatDate(e.EndDate)}
                      </div>
                    )}
                  </div>
                </a>
              </li>
            ))
        }
      </ul>
    </div>
  )
}

// ── 오늘의 게임 일정 ─────────────────────────────────────────────
const FIXED_CATEGORIES = ['모험 섬', '필드 보스', '카오스 게이트']

// 카테고리 메타 (아이콘 이미지 경로 + accent 색)
const CALENDAR_CATEGORY_META = {
  '모험 섬':    { icon: '/cal-island.svg',  fallback: '🏝️', accent: '#a855f7' },
  '필드 보스':  { icon: '/cal-boss.svg',    fallback: '👹', accent: '#ef4444' },
  '카오스 게이트': { icon: '/cal-chaos.svg', fallback: '🌀', accent: '#8b5cf6' },
}

// 등급별 배경색
const GRADE_BG = {
  '유물': 'bg-orange-900/70',
  '전설': 'bg-yellow-800/70',
  '영웅': 'bg-purple-900/70',
  '희귀': 'bg-blue-900/70',
  '고급': 'bg-emerald-900/70',
  '일반': 'bg-zinc-700/80',
}
function gradeBg(grade = '') {
  return GRADE_BG[grade] ?? 'bg-zinc-700/80'
}

// 대표 뱃지 (보상 목록에서 가장 눈에 띄는 키워드)
const BADGE_PRIORITY = [
  { key: '카드',   label: '카드',   cls: 'bg-amber-500/90 text-white' },
  { key: '주화',   label: '주화',   cls: 'bg-pink-500/90 text-white' },
  { key: '잎사귀', label: '잎사귀', cls: 'bg-emerald-600/90 text-white' },
  { key: '비밀지도',label: '지도',  cls: 'bg-blue-600/90 text-white' },
  { key: '실링',   label: '실링',   cls: 'bg-slate-500/90 text-white' },
  { key: '골드',   label: '골드',   cls: 'bg-yellow-600/90 text-white' },
]
function getPrimaryBadge(rewards) {
  for (const { key, label, cls } of BADGE_PRIORITY) {
    if (rewards.some(r => r.Name?.includes(key))) return { label, cls }
  }
  return null
}

// RewardItems 구조 평탄화
// RewardItems[{ ItemLevel, Items:[{ Name, Icon, Grade, StartTimes }] }]
function flatRewards(rewardItems = []) {
  const out = []
  for (const group of (rewardItems ?? [])) {
    for (const item of (group.Items ?? [])) out.push(item)
  }
  return out
}

// 다음 예정 시각까지 남은 초 계산 (없으면 null)
function nextSecondsUntil(times = []) {
  const now = Date.now()
  const future = times
    .map(t => new Date(t).getTime())
    .filter(ms => ms > now)
    .sort((a, b) => a - b)
  if (future.length === 0) return null
  return Math.floor((future[0] - now) / 1000)
}

// 카운트다운 훅
function useCountdown(initialSec) {
  const [sec, setSec] = useState(initialSec)
  const ref = useRef(null)
  useEffect(() => {
    setSec(initialSec)
    if (initialSec == null) return
    ref.current = setInterval(() => setSec(s => (s != null && s > 0 ? s - 1 : null)), 1000)
    return () => clearInterval(ref.current)
  }, [initialSec])
  return sec
}

function fmtCountdown(sec) {
  if (sec == null || sec < 0) return null
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = sec % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

// ── 콘텐츠 카드 ─────────────────────────────────────────────────
function ContentCard({ item }) {
  const [hovered, setHovered] = useState(false)
  const rewards = flatRewards(item.RewardItems)
  const badge = getPrimaryBadge(rewards)

  return (
    <div
      className="relative flex gap-3 p-2.5 rounded-xl bg-zinc-100 dark:bg-zinc-700/50 hover:bg-zinc-200/70 dark:hover:bg-zinc-700 transition-colors cursor-default"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* 콘텐츠 아이콘 */}
      <div className="shrink-0">
        {item.ContentsIcon
          ? <img src={item.ContentsIcon} alt={item.ContentsName} className="w-14 h-14 rounded-xl object-cover" />
          : <div className="w-14 h-14 rounded-xl bg-zinc-300 dark:bg-zinc-600" />
        }
      </div>

      {/* 정보 */}
      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
        {/* 이름 + 뱃지 */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {badge && (
            <span className={`text-[10px] ns-bold px-1.5 py-0.5 rounded-md shrink-0 ${badge.cls}`}>
              {badge.label}
            </span>
          )}
          <span className="text-sm ns-bold text-gray-900 dark:text-gray-100 truncate">{item.ContentsName}</span>
        </div>

        {/* 보상 아이콘 */}
        {rewards.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {rewards.slice(0, 8).map((r, i) => (
              <div key={i} className={`w-7 h-7 rounded-lg flex items-center justify-center ${gradeBg(r.Grade)}`} title={r.Name}>
                {r.Icon
                  ? <img src={r.Icon} alt={r.Name} className="w-5 h-5 object-contain" />
                  : <span className="text-[9px] text-white">{r.Name?.[0]}</span>
                }
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Hover 툴팁 */}
      {hovered && rewards.length > 0 && (
        <div className="absolute left-0 top-full mt-1.5 z-30 w-56 bg-zinc-900/98 rounded-xl shadow-2xl p-3 border border-white/10">
          <div className="text-[10px] text-zinc-400 ns-bold mb-2 tracking-widest uppercase">보상 아이템</div>
          <div className="space-y-1.5">
            {rewards.map((r, i) => (
              <div key={i} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-lg shrink-0 flex items-center justify-center ${gradeBg(r.Grade)}`}>
                  {r.Icon
                    ? <img src={r.Icon} alt={r.Name} className="w-6 h-6 object-contain" />
                    : <span className="text-xs text-white">{r.Name?.[0]}</span>
                  }
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs text-zinc-200 truncate leading-tight">{r.Name}</div>
                  {r.Grade && (
                    <div className={`text-[10px] mt-0.5 ${
                      r.Grade === '유물' ? 'text-orange-400' :
                      r.Grade === '전설' ? 'text-yellow-400' :
                      r.Grade === '영웅' ? 'text-purple-400' :
                      r.Grade === '희귀' ? 'text-blue-400' :
                      r.Grade === '고급' ? 'text-emerald-400' : 'text-zinc-500'
                    }`}>{r.Grade}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

// ── 카테고리 타이머 헤더 칩 ──────────────────────────────────────
function CategoryTimerChip({ cat, allTimes, loading }) {
  const initialSec = nextSecondsUntil(allTimes)
  const sec = useCountdown(initialSec)
  const countdown = fmtCountdown(sec)
  const meta = CALENDAR_CATEGORY_META[cat] ?? {}

  return (
    <div className="flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gray-50 dark:bg-zinc-800 border border-gray-100 dark:border-zinc-700/80">
      <div className="flex items-center gap-1.5">
        <span className="text-base">{meta.fallback ?? '📌'}</span>
        <span className="text-sm ns-bold text-gray-800 dark:text-gray-200">{cat}</span>
      </div>
      {loading
        ? <Skeleton className="w-16 h-4" />
        : countdown
          ? <span className="text-sm ns-bold tabular-nums" style={{ color: meta.accent ?? '#888' }}>{countdown}</span>
          : <span className="text-xs text-gray-400 dark:text-zinc-500">오늘 일정이 없습니다</span>
      }
    </div>
  )
}

function CalendarSection({ calendar, loading }) {
  const today = todayKST()

  const byCategory = {}
  const allTimesByCategory = {}

  for (const item of calendar) {
    const cat = item.CategoryName
    if (!FIXED_CATEGORIES.includes(cat)) continue

    if (!allTimesByCategory[cat]) allTimesByCategory[cat] = []
    for (const t of (item.StartTimes ?? [])) allTimesByCategory[cat].push(t)

    const todayTimes = (item.StartTimes ?? []).filter(t => {
      const kst = new Date(new Date(t).getTime() + 9 * 60 * 60 * 1000)
      return kst.toISOString().slice(0, 10) === today
    })
    if (todayTimes.length === 0) continue
    if (!byCategory[cat]) byCategory[cat] = []
    byCategory[cat].push({ ...item, todayTimes })
  }

  const islandItems = byCategory['모험 섬'] ?? []

  return (
    <div className="bg-white dark:bg-zinc-800/60 rounded-xl shadow-border p-4 space-y-4">
      <SectionHeader icon="📅" title="오늘의 일정" />

      {/* 카테고리 타이머 헤더 3개 */}
      <div className="grid grid-cols-3 gap-3">
        {FIXED_CATEGORIES.map(cat => (
          <CategoryTimerChip
            key={cat}
            cat={cat}
            allTimes={allTimesByCategory[cat] ?? []}
            loading={loading}
          />
        ))}
      </div>

      {/* 모험 섬 콘텐츠 카드 3개 가로 배치 */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-xl" />)
          : islandItems.length === 0
          ? <div className="col-span-3 flex items-center justify-center h-16 text-sm text-gray-400 dark:text-zinc-500">
              오늘 모험 섬 일정이 없습니다
            </div>
          : islandItems.slice(0, 3).map((item, i) => <ContentCard key={i} item={item} />)
        }
      </div>
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────
export default function HomeClient() {
  const [notices, setNotices] = useState([])
  const [events, setEvents] = useState([])
  const [calendar, setCalendar] = useState([])
  const [loadingNotices, setLoadingNotices] = useState(true)
  const [loadingEvents, setLoadingEvents] = useState(true)
  const [loadingCalendar, setLoadingCalendar] = useState(true)

  const fetchData = useCallback(async () => {
    const [n, e, c] = await Promise.allSettled([
      fetch('/api/loa-content?type=notices').then(r => r.ok ? r.json() : []),
      fetch('/api/loa-content?type=events').then(r => r.ok ? r.json() : []),
      fetch('/api/loa-content?type=calendar').then(r => r.ok ? r.json() : []),
    ])
    setNotices(n.status === 'fulfilled' && Array.isArray(n.value) ? n.value : [])
    setLoadingNotices(false)
    setEvents(e.status === 'fulfilled' && Array.isArray(e.value) ? e.value : [])
    setLoadingEvents(false)
    const calData = c.status === 'fulfilled' && Array.isArray(c.value) ? c.value : []
    setCalendar(calData)
    setLoadingCalendar(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  return (
    <div className="max-w-screen-xl mx-auto px-4 py-6 space-y-6">

      {/* 히어로 배너 */}
      <section className="relative rounded-2xl overflow-hidden shadow-xl" style={{ minHeight: 320 }}>
        {/* 배경 이미지 */}
        <Image
          src="/hero-bg.webp"
          alt="카다룸 제도"
          fill
          className="object-cover object-center"
          priority
          unoptimized
        />
        {/* 오버레이 그라디언트 */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/50 via-black/25 to-black/5" />

        {/* 콘텐츠 */}
        <div className="relative z-10 px-8 py-12 md:px-14 md:py-16 flex flex-col items-center justify-center text-center" style={{ minHeight: 320 }}>
          <h1 className="text-2xl md:text-3xl ns-extrabold drop-shadow mb-4 leading-tight" style={{ color: '#ffffff' }}>
            로스트아크 숙제 관리
          </h1>
          <p className="text-xs md:text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.8)' }}>
            캐릭터별 레이드 관리와 골드 계산<br />
            길드·그룹원과 레이드 현황을 실시간으로 공유하세요
          </p>
        </div>
      </section>

      {/* 오늘의 게임 일정 */}
      <CalendarSection calendar={calendar} loading={loadingCalendar} />

      {/* 공지사항 + 이벤트 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <NoticesPanel notices={notices} loading={loadingNotices} />
        <EventsPanel events={events} loading={loadingEvents} />
      </div>

    </div>
  )
}

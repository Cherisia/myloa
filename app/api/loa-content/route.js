// LoA 공개 콘텐츠 API 프록시
// GET /api/loa-content?type=notices|events|calendar
// 인증 불필요 — 서버 API 키로 호출

import { NextResponse } from 'next/server'

const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'

function getApiKey() {
  return (
    process.env.LOA_PUBLIC_SEARCH_API_KEY ||
    process.env.LOA_PUBLIC_SEARCH_API_KEY_FALLBACK ||
    process.env.LOA_API_KEY ||
    ''
  ).trim()
}

// 다음 targetHour:00 KST까지 남은 초 (최소 60초)
function secUntilKST(targetHour) {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const h = kstNow.getUTCHours()
  const m = kstNow.getUTCMinutes()
  const s = kstNow.getUTCSeconds()
  let secs = (targetHour - h) * 3600 - m * 60 - s
  if (secs <= 0) secs += 24 * 3600
  return Math.max(60, secs)
}

function calendarRevalidate() {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const day = kstNow.getUTCDay()
  const hour = kstNow.getUTCHours()
  const isWeekend = day === 0 || day === 6
  if (!isWeekend) return secUntilKST(6)
  if (hour < 6)  return secUntilKST(6)
  if (hour < 9)  return secUntilKST(9)
  if (hour < 13) return secUntilKST(13)
  if (hour < 19) return secUntilKST(19)
  return secUntilKST(6)
}

async function loaFetch(path, revalidate) {
  const key = getApiKey()
  if (!key) return null
  const res = await fetch(`${LOA_BASE}${path}`, {
    headers: { Authorization: `bearer ${key}`, Accept: 'application/json' },
    next: { revalidate },
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'all') {
      const calRev = calendarRevalidate()
      const evtRev = secUntilKST(10)
      const [notices, events, calendar] = await Promise.all([
        loaFetch('/news/notices', 3600),
        loaFetch('/news/events', evtRev),
        loaFetch('/gamecontents/calendar', calRev),
      ])
      return NextResponse.json(
        { notices: notices ?? [], events: events ?? [], calendar: calendar ?? [] },
        { headers: { 'Cache-Control': `public, max-age=${Math.min(3600, calRev)}, stale-while-revalidate=60` } },
      )
    }

    if (type === 'notices') {
      const data = await loaFetch('/news/notices', 3600)
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=60' },
      })
    }

    if (type === 'events') {
      const rev = secUntilKST(10)
      const data = await loaFetch('/news/events', rev)
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': `public, max-age=${rev}, stale-while-revalidate=60` },
      })
    }

    if (type === 'calendar') {
      const rev = calendarRevalidate()
      const data = await loaFetch('/gamecontents/calendar', rev)
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': `public, max-age=${rev}, stale-while-revalidate=60` },
      })
    }

    return NextResponse.json({ error: 'type 파라미터가 필요합니다' }, { status: 400 })
  } catch (err) {
    console.error('[loa-content]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

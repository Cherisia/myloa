// LoA 공개 콘텐츠 API 프록시
// GET /api/loa-content?type=notices|events|calendar
// 인증 불필요 — 서버 API 키로 호출

import { NextResponse } from 'next/server'
import { LOA_BASE, getApiKey, secUntilKST, calendarRevalidate } from '@/lib/loaApi'

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

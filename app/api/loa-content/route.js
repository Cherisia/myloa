// LoA 공개 콘텐츠 API 프록시
// GET /api/loa-content?type=notices|events|calendar
// 인증 불필요 — 서버 API 키로 호출, 5분 캐싱

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

async function loaFetch(path) {
  const key = getApiKey()
  if (!key) return null
  const res = await fetch(`${LOA_BASE}${path}`, {
    headers: { Authorization: `bearer ${key}`, Accept: 'application/json' },
    next: { revalidate: 3600 }, // 1시간 캐시
  })
  if (!res.ok) return null
  return res.json()
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type')

  try {
    if (type === 'all') {
      const [notices, events, calendar] = await Promise.all([
        loaFetch('/news/notices'),
        loaFetch('/news/events'),
        loaFetch('/gamecontents/calendar'),
      ])
      return NextResponse.json(
        { notices: notices ?? [], events: events ?? [], calendar: calendar ?? [] },
        { headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' } },
      )
    }

    if (type === 'notices') {
      const data = await loaFetch('/news/notices')
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
      })
    }

    if (type === 'events') {
      const data = await loaFetch('/news/events')
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
      })
    }

    if (type === 'calendar') {
      const data = await loaFetch('/gamecontents/calendar')
      return NextResponse.json(data ?? [], {
        headers: { 'Cache-Control': 'public, max-age=3600, stale-while-revalidate=300' },
      })
    }

    return NextResponse.json({ error: 'type 파라미터가 필요합니다' }, { status: 400 })
  } catch (err) {
    console.error('[loa-content]', err)
    return NextResponse.json({ error: '서버 오류' }, { status: 500 })
  }
}

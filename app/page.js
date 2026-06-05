import HomeClient from './HomeClient'

// 매 요청마다 동적 렌더링 — fetch는 각자 TTL로 캐싱됨
export const dynamic = 'force-dynamic'

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

// 공지사항: 1시간마다
const NOTICES_REVALIDATE = 3600

// 이벤트: 매일 10:00 KST에 갱신 (이벤트 일정 공개 시각)
function eventsRevalidate() {
  return secUntilKST(10)
}

// 캘린더:
//   평일 → 06:00 KST 게임 리셋 시점
//   주말 → 06 / 09 / 13 / 19 KST (모험섬 타임슬롯 + 게임 리셋)
function calendarRevalidate() {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const day = kstNow.getUTCDay() // 0=일, 6=토
  const hour = kstNow.getUTCHours()
  const isWeekend = day === 0 || day === 6
  if (!isWeekend) return secUntilKST(6)
  if (hour < 6)  return secUntilKST(6)
  if (hour < 9)  return secUntilKST(9)
  if (hour < 13) return secUntilKST(13)
  if (hour < 19) return secUntilKST(19)
  return secUntilKST(6) // 19시 이후 → 다음날 06:00
}

// 다음 캘린더 갱신 시각 (ms) — 클라이언트 자동 새로고침 타이머에 전달
function nextCalendarBoundaryMs() {
  return Date.now() + calendarRevalidate() * 1000
}

async function loaFetch(path, revalidate) {
  const key = getApiKey()
  if (!key) return null
  try {
    const res = await fetch(`${LOA_BASE}${path}`, {
      headers: { Authorization: `bearer ${key}`, Accept: 'application/json' },
      next: { revalidate },
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export const metadata = {
  title: { absolute: '로스트아크 숙제 관리 & 게임 정보 - myloa' },
  description:
    '로스트아크 숙제를 캐릭터별로 관리하고 골드를 계산하세요. 길드·그룹원과 레이드 현황을 실시간으로 공유하는 로스트아크 숙제 관리 서비스입니다.',
  keywords: ['로스트아크', '숙제 관리', '레이드 숙제', '골드 계산', '로아 숙제', '원정대 관리', 'myloa'],
  alternates: { canonical: 'https://myloa.app/' },
  openGraph: {
    title: '로스트아크 숙제 관리 & 게임 정보 - myloa',
    description:
      '로스트아크 숙제를 캐릭터별로 관리하고 길드·그룹원과 레이드 현황을 실시간으로 공유하세요.',
    url: 'https://myloa.app/',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '로스트아크 숙제 관리 & 게임 정보 - myloa',
    description:
      '로스트아크 숙제를 캐릭터별로 관리하고 길드·그룹원과 레이드 현황을 실시간으로 공유하세요.',
  },
}

export default async function HomePage() {
  const [notices, events, calendar] = await Promise.all([
    loaFetch('/news/notices', NOTICES_REVALIDATE),      // 1시간 캐시
    loaFetch('/news/events', eventsRevalidate()),        // 매일 10:00 KST 갱신
    loaFetch('/gamecontents/calendar', calendarRevalidate()), // 리셋/섬 타임슬롯 기준 갱신
  ])

  return (
    <HomeClient
      initialNotices={notices ?? []}
      initialEvents={events ?? []}
      initialCalendar={calendar ?? []}
      nextCalendarBoundary={nextCalendarBoundaryMs()}
    />
  )
}

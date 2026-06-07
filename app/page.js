import HomeClient from './HomeClient'
import { LOA_BASE, getApiKey, secUntilKST, calendarRevalidate } from '@/lib/loaApi'

// 매 요청마다 동적 렌더링 — fetch는 각자 TTL로 캐싱됨
export const dynamic = 'force-dynamic'

const NOTICES_REVALIDATE = 3600

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
    loaFetch('/news/events', secUntilKST(10)),            // 매일 10:00 KST 갱신
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

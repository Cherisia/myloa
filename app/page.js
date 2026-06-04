import HomeClient from './HomeClient'

export const revalidate = 3600 // 1시간마다 ISR 재생성

const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'

async function loaFetch(path) {
  const key = (
    process.env.LOA_PUBLIC_SEARCH_API_KEY ||
    process.env.LOA_PUBLIC_SEARCH_API_KEY_FALLBACK ||
    process.env.LOA_API_KEY ||
    ''
  ).trim()
  if (!key) return null
  try {
    const res = await fetch(`${LOA_BASE}${path}`, {
      headers: { Authorization: `bearer ${key}`, Accept: 'application/json' },
      next: { revalidate: 3600 },
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
    loaFetch('/news/notices'),
    loaFetch('/news/events'),
    loaFetch('/gamecontents/calendar'),
  ])

  return (
    <HomeClient
      initialNotices={notices ?? []}
      initialEvents={events ?? []}
      initialCalendar={calendar ?? []}
    />
  )
}

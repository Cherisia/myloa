import HomeClient from './HomeClient'

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

export default function HomePage() {
  return <HomeClient />
}

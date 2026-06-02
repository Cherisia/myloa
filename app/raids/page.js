import RaidRewardClient from './RaidRewardClient'

export const metadata = {
  title: '로스트아크 레이드 보상 정보',
  description: '로스트아크 레이드별 클리어 보상 정보 - 관문별 골드(귀속/거래), 재련 재료, 더보기 비용을 한눈에 확인하세요. EX 레이드부터 군단장 레이드까지 모든 레이드 보상을 난이도별로 제공합니다.',
  keywords: ['로스트아크 레이드 보상', '레이드 골드', '카제로스 레이드 보상', '세르카 보상', '어비스 던전 보상', '군단장 레이드 골드', '더보기 비용', '귀속골드', '거래골드'],
  alternates: { canonical: 'https://myloa.app/raids' },
  openGraph: {
    title: '로스트아크 레이드 보상 정보 - myloa',
    description: '관문별 골드(귀속/거래), 재련 재료, 더보기 비용을 한눈에 확인하세요.',
    url: 'https://myloa.app/raids',
  },
}

export default function RaidsPage() {
  return <RaidRewardClient />
}

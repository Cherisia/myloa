import GuideClient from './GuideClient'

export const metadata = {
  title: '사용 가이드',
  description: 'myloa 사용 방법을 단계별로 안내합니다. 캐릭터 추가와 API 키 연동부터 레이드 숙제 체크, 골드 계산, 원정대 공유, 길드·그룹 레이드 현황 공유까지 모든 기능을 설명합니다.',
  alternates: { canonical: 'https://myloa.app/guide' },
}

export default function GuidePage() {
  return <GuideClient />
}

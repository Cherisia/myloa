import GuideClient from './GuideClient'

export const metadata = {
  title: '사용 가이드',
  description: 'myloa 사용 방법을 단계별로 안내합니다. 캐릭터 추가부터 레이드 숙제 체크, 골드 계산, 길드·그룹 현황 공유까지.',
  alternates: { canonical: 'https://myloa.app/guide' },
  robots: { index: false, follow: false },
}

export default function GuidePage() {
  return <GuideClient />
}

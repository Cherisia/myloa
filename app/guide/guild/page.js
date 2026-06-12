import GuideClient from '../GuideClient'

export const metadata = {
  title: '사용 가이드 - 길드',
  description: 'myloa 길드 기능 사용 방법을 안내합니다. 길드를 만들어 멤버들의 레이드 현황을 확인하고, 함께할 레이드를 조율하는 방법을 단계별로 설명합니다.',
  alternates: { canonical: 'https://myloa.app/guide/guild' },
}

export default function GuideGuildPage() {
  return <GuideClient initialTab={1} />
}

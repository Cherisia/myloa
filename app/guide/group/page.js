import GuideClient from '../GuideClient'

export const metadata = {
  title: '사용 가이드 - 그룹',
  description: 'myloa 그룹 기능 사용 방법을 안내합니다. 친구를 추가하고 그룹을 만들어 함께 갈 수 있는 레이드를 확인하는 방법을 단계별로 설명합니다.',
  alternates: { canonical: 'https://myloa.app/guide/group' },
}

export default function GuideGroupPage() {
  return <GuideClient initialTab={2} />
}

import DictionaryClient from './DictionaryClient'

const TAB_META = {
  synergy: {
    title: '직업 시너지 정보',
    description: '로스트아크 모든 직업의 파티 시너지를 확인하세요. 피해량 증가, 치명타 적중, 치명타 피해, 방어력 감소, 공격력 증가, 백헤드 등 각인별 시너지 정보를 직업군별로 제공합니다.',
    ogTitle: '직업 시너지 정보 - myloa',
  },
  raids: {
    title: '레이드 보상 정보',
    description: '로스트아크 레이드별 관문 골드(귀속·거래), 재련 재료, 더보기 비용을 난이도별로 확인하세요. EX 레이드·카제로스·군단장·어비스 던전 전 레이드 보상 정보를 제공합니다.',
    ogTitle: '레이드 보상 정보 - myloa',
  },
}

const BASE_META = {
  title: '로아 사전',
  description: '로스트아크 직업 시너지와 레이드 보상 정보를 확인하세요. 모든 직업 파티 시너지(피해량 증가, 치명타, 방어력 감소 등)와 레이드별 관문 골드·재련 재료·더보기 비용을 난이도별로 제공합니다.',
  ogTitle: '로아 사전 - myloa',
}

export async function generateMetadata({ searchParams }) {
  const tab   = (await searchParams)?.tab
  const meta  = TAB_META[tab] ?? BASE_META

  return {
    title: meta.title,
    description: meta.description,
    keywords: [
      '로아 사전', '로스트아크 사전',
      '로스트아크 직업 시너지', '로아 시너지', '파티 시너지', '직업별 시너지',
      '공격력 증가 직업', '치명타율 증가 직업', '방어력 감소 직업', '피해량 증가 직업',
      '로스트아크 레이드 보상', '레이드 골드', '레이드 재료', '더보기 비용',
      '카제로스 레이드 보상', '군단장 레이드 골드', '어비스 던전 보상',
      'lost ark synergy', 'lost ark raid reward',
    ],
    alternates: { canonical: 'https://myloa.app/dictionary' },
    openGraph: {
      title: meta.ogTitle,
      description: meta.description,
      url: 'https://myloa.app/dictionary',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: meta.ogTitle,
      description: meta.description,
    },
  }
}

export default function DictionaryPage() {
  return <DictionaryClient />
}

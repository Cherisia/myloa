import AuctionClient from './AuctionClient'

export const metadata = {
  title: '경매 입찰 계산기 - 로스트아크 파티 경매 적정가 계산',
  description: '로스트아크 파티 경매 입찰 적정가와 손익분기점을 자동 계산합니다. 4인·8인 파티, 판매시·직접사용시 추천 입찰가·내 수익·인당 분배금을 한눈에 확인하세요.',
  keywords: ['로스트아크 경매 계산기', '로아 입찰 계산기', '파티 경매 적정가', '경매 손익분기', '로아 경매 수수료', '입찰 분배금 계산'],
  alternates: { canonical: 'https://myloa.app/tools/auction' },
  openGraph: {
    title: '로스트아크 경매 입찰 계산기 - myloa',
    description: '파티 경매 추천 입찰가·손익분기·분배금을 자동으로 계산해 드립니다.',
    url: 'https://myloa.app/tools/auction',
    type: 'website',
  },
}

const faqList = [
  {
    q: '추천 입찰가와 손익분기점의 차이는 무엇인가요?',
    a: '손익분기점은 낙찰자와 비낙찰자의 수익이 정확히 같아지는 입찰가입니다. 추천 입찰가는 그보다 낮아, 낙찰자에게 일정 마진을 주는 금액입니다. 판매시에는 손익분기점을 1.1로 나눠 계산하며, 직접사용시에는 손익분기점과 동일합니다.',
  },
  {
    q: '판매시와 직접사용시 입찰가가 다른 이유는 무엇인가요?',
    a: '판매시에는 낙찰 후 경매장에 다시 올릴 때 수수료 5%가 추가로 발생합니다. 이 비용을 감안해야 하므로 추천 입찰가가 더 낮습니다. 직접사용시에는 재판매 수수료가 없어 손익분기점과 추천 입찰가가 동일합니다.',
  },
  {
    q: '경매 수수료 5%는 어떻게 적용되나요?',
    a: '낙찰금은 수수료 없이 파티원에게 균등 분배됩니다. 수수료 5%는 낙찰자가 아이템을 경매장에 되팔 때 판매 금액의 5%가 차감되는 방식으로 적용됩니다.',
  },
  {
    q: '인당 분배금은 어떻게 계산되나요?',
    a: '낙찰금 전액이 낙찰자를 제외한 나머지 파티원에게 균등하게 나뉩니다. 예를 들어 4인 파티에서 3,000골드에 낙찰되면 나머지 3명이 각 1,000골드씩 수령합니다.',
  },
  {
    q: '손익분기점 이상으로 입찰하면 손해인가요?',
    a: '판매시 기준으로 손익분기점을 초과해 낙찰받으면, 아이템을 팔아도 비낙찰자 분배금보다 적게 받게 됩니다. 직접사용시에는 손익분기점을 초과하면 아이템을 직접 구매하는 것보다 손해입니다.',
  },
]

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: faqList.map(({ q, a }) => ({
    '@type': 'Question',
    name: q,
    acceptedAnswer: { '@type': 'Answer', text: a },
  })),
}

const resultFields = [
  { term: '추천 입찰가', desc: '이 금액 이하로 입찰하면 낙찰자가 비낙찰자보다 유리합니다. 파티 경매에서 가장 중요한 기준값입니다.' },
  { term: '손익분기점', desc: '이 금액에 낙찰받으면 낙찰자와 비낙찰자의 이익이 정확히 같아집니다. 이 이상 입찰하면 비낙찰자가 더 유리해집니다.' },
  { term: '내 수익 (판매시)', desc: '아이템을 낙찰받아 경매장에 판매했을 때 얻는 순수익입니다. 판매 수수료 5%를 제외한 금액입니다.' },
  { term: '내 절약금 (직접사용시)', desc: '시장가 대비 직접 구매하는 것보다 얼마나 저렴하게 아이템을 확보했는지를 나타냅니다.' },
  { term: '인당 분배금', desc: '낙찰금이 파티원에게 균등 분배될 때 비낙찰자 1인당 수령하는 금액입니다.' },
]

function ChevronIcon() {
  return (
    <svg
      className="w-4 h-4 text-gray-400 transition-transform duration-200 group-open:rotate-180 shrink-0"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  )
}

function Collapsible({ title, children }) {
  return (
    <details className="group bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border overflow-hidden">
      <summary className="flex items-center justify-between px-5 py-4 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
        <span className="text-sm ns-extrabold text-gray-800 dark:text-gray-100">{title}</span>
        <ChevronIcon />
      </summary>
      <div className="border-t border-gray-100 dark:border-white/[0.06] px-5 py-4">
        {children}
      </div>
    </details>
  )
}

export default function AuctionPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <AuctionClient />

      <div className="max-w-4xl mx-auto px-4 pb-14 flex flex-col gap-3">

        {/* 결과값 해설 */}
        <Collapsible title="계산 결과 읽는 법">
          <dl className="flex flex-col gap-3">
            {resultFields.map(({ term, desc }) => (
              <div key={term}>
                <dt className="text-sm ns-bold text-gray-700 dark:text-gray-200 mb-0.5">{term}</dt>
                <dd className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{desc}</dd>
              </div>
            ))}
          </dl>
        </Collapsible>

{/* FAQ */}
        <Collapsible title="자주 묻는 질문">
          <div className="flex flex-col gap-5">
            {faqList.map(({ q, a }) => (
              <div key={q}>
                <p className="text-sm ns-bold text-gray-700 dark:text-gray-200 mb-1">{q}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{a}</p>
              </div>
            ))}
          </div>
        </Collapsible>

      </div>
    </>
  )
}

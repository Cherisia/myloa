'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import SynergyClient from '../synergy/SynergyClient'
import RaidRewardClient from '../raids/RaidRewardClient'

const TABS = [
  { key: 'raids',   label: '레이드 보상' },
  { key: 'synergy', label: '직업 시너지' },
]

function DictionaryTabs() {
  const router     = useRouter()
  const params     = useSearchParams()
  const tab        = params.get('tab') || 'raids'

  function setTab(key) {
    router.push(`/dictionary?tab=${key}`, { scroll: false })
  }

  return (
    <>
      <div className="sticky top-[50px] z-40 bg-white/90 dark:bg-[#111111]/90 backdrop-blur-md border-b border-gray-200 dark:border-[#2d2d2d]">
        <div className="max-w-5xl mx-auto px-4 flex">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-5 py-3 text-sm font-semibold border-b-2 transition-colors
                ${tab === t.key
                  ? 'border-[var(--accent-400)] text-gray-900 dark:text-gray-50'
                  : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {tab === 'synergy' && (
        <div className="pt-4">
          <SynergyClient />
        </div>
      )}
      {tab === 'raids' && (
        <div className="pt-4">
          <RaidRewardClient />
        </div>
      )}
    </>
  )
}

export default function DictionaryClient() {
  return (
    <Suspense>
      <DictionaryTabs />
    </Suspense>
  )
}

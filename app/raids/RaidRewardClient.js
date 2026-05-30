'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { RAIDS } from '@/lib/raidData'

// ── 재료 아이콘 매핑 ─────────────────────────────────────────────────────────
const MATERIAL_ICON = {
  '운명의파괴석':       '/materials/파괴석.png',
  '운명의수호석':       '/materials/수호석.png',
  '운명의파편':         '/materials/파편.png',
  '운명의돌파석':       '/materials/돌파석.png',
  '운명의돌':           '/materials/운명의돌.png',
  '고귀한구원자의팔찌': '/materials/고귀한팔찌.png',
  '찬란한구원자의팔찌': '/materials/찬란한팔찌.png',
  '위대한비상의돌':     '/materials/비상의돌.png',
  '순환돌파석':         '/materials/순환돌파석.png',
  '은총의파편':         '/materials/은총의파편.png',
  '담금질낙뢰의뿔':     '/materials/낙뢰의뿔.png',
  '클리어메달':         '/materials/클리어메달.png',
  '카르마의잔영':       '/materials/카르마잔영.png',
  '업화의쐐기돌':       '/materials/업화쐐기돌.png',
  '불과얼음의주화':     '/materials/불얼음주화.png',
}

// ── 난이도 ────────────────────────────────────────────────────────────────────
const DIFF_LABEL = {
  nightmare: '나이트메어', hard: '하드', normal: '노말',
  stage3: '3단계', stage2: '2단계', stage1: '1단계',
}

// ── 카테고리 ─────────────────────────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',        label: '전체' },
  { key: 'extreme',    label: 'EX 레이드' },
  { key: 'shadow',     label: '그림자' },
  { key: 'abyss',      label: '어비스 던전' },
  { key: 'kazeros',    label: '카제로스' },
  { key: 'abyss_raid', label: '어비스 레이드' },
  { key: 'legion',     label: '군단장' },
]

const CAT_LABEL = {
  extreme: 'EX', shadow: '그림자', abyss: '어비스',
  kazeros: '카제로스', abyss_raid: '어비스 레이드', legion: '군단장',
}
const CAT_COLOR = {
  extreme:    'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  shadow:     'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  abyss:      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  kazeros:    'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  abyss_raid: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400',
  legion:     'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

function getRaidCategory(raid) {
  if (raid.tag === 'extreme') return 'extreme'
  if (raid.image === '/schedule/shadow_raid.png')   return 'shadow'
  if (raid.image === '/schedule/abyss_dungeon.png') return 'abyss'
  if (raid.image === '/schedule/abyss_raid.png')    return 'abyss_raid'
  if (raid.image === '/schedule/legion_raid.png')   return 'legion'
  return 'kazeros'
}

// ── 재료 보상 데이터 ──────────────────────────────────────────────────────────
const GATE_MATERIALS = {
  'abrel-ex': {
    normal:    [[{ name: '불과얼음의주화', count: 150 }]],
    hard:      [[{ name: '불과얼음의주화', count: 200 }]],
    nightmare: [[{ name: '불과얼음의주화', count: 200 }]],
  },
  'serca': {
    normal: [
      [
        { name: '운명의파괴석', count: 880 }, { name: '운명의수호석', count: 1760 },
        { name: '운명의파편', count: 6200 }, { name: '운명의돌파석', count: 12 },
        { name: '고귀한구원자의팔찌', count: 3 }, { name: '위대한비상의돌', count: 8 },
      ],
      [
        { name: '운명의파괴석', count: 1100 }, { name: '운명의수호석', count: 2200 },
        { name: '운명의파편', count: 7900 }, { name: '운명의돌파석', count: 15 },
        { name: '고귀한구원자의팔찌', count: 5 }, { name: '위대한비상의돌', count: 9 },
        { name: '순환돌파석', count: 17 }, { name: '운명의돌', count: 8 },
      ],
    ],
  },
  'cathedral': {
    stage1: [
      [
        { name: '운명의파괴석', count: 820 }, { name: '운명의수호석', count: 1640 },
        { name: '운명의파편', count: 5400 }, { name: '운명의돌파석', count: 9 },
        { name: '고귀한구원자의팔찌', count: 2 }, { name: '위대한비상의돌', count: 7 },
        { name: '은총의파편', count: 4 },
      ],
      [
        { name: '운명의파괴석', count: 960 }, { name: '운명의수호석', count: 1920 },
        { name: '운명의파편', count: 6800 }, { name: '운명의돌파석', count: 12 },
        { name: '고귀한구원자의팔찌', count: 4 }, { name: '위대한비상의돌', count: 8 },
        { name: '순환돌파석', count: 15 }, { name: '운명의돌', count: 8 },
        { name: '은총의파편', count: 6 },
      ],
    ],
    stage2: [
      [
        { name: '운명의파괴석', count: 960 }, { name: '운명의수호석', count: 1920 },
        { name: '운명의파편', count: 6800 }, { name: '운명의돌파석', count: 12 },
        { name: '고귀한구원자의팔찌', count: 4 }, { name: '위대한비상의돌', count: 8 },
        { name: '순환돌파석', count: 15 }, { name: '운명의돌', count: 8 },
        { name: '은총의파편', count: 6 },
      ],
      [
        { name: '운명의파괴석', count: 1100 }, { name: '운명의수호석', count: 2200 },
        { name: '운명의파편', count: 7900 }, { name: '운명의돌파석', count: 15 },
        { name: '고귀한구원자의팔찌', count: 5 }, { name: '위대한비상의돌', count: 9 },
        { name: '순환돌파석', count: 17 }, { name: '운명의돌', count: 10 },
        { name: '은총의파편', count: 8 },
      ],
    ],
    stage3: [
      [
        { name: '운명의파괴석', count: 1100 }, { name: '운명의수호석', count: 2200 },
        { name: '운명의파편', count: 7900 }, { name: '운명의돌파석', count: 15 },
        { name: '고귀한구원자의팔찌', count: 5 }, { name: '위대한비상의돌', count: 9 },
        { name: '순환돌파석', count: 17 }, { name: '운명의돌', count: 10 },
        { name: '은총의파편', count: 8 },
      ],
      [
        { name: '운명의파괴석', count: 1380 }, { name: '운명의수호석', count: 2760 },
        { name: '운명의파편', count: 9800 }, { name: '운명의돌파석', count: 19 },
        { name: '고귀한구원자의팔찌', count: 6 }, { name: '위대한비상의돌', count: 11 },
        { name: '순환돌파석', count: 21 }, { name: '운명의돌', count: 12 },
        { name: '은총의파편', count: 10 },
      ],
    ],
  },
  'kazeros-final': {
    normal: [
      [
        { name: '운명의파괴석', count: 880 }, { name: '운명의수호석', count: 1760 },
        { name: '운명의파편', count: 6200 }, { name: '운명의돌파석', count: 12 },
        { name: '고귀한구원자의팔찌', count: 3 }, { name: '위대한비상의돌', count: 8 },
      ],
      [
        { name: '운명의파괴석', count: 1100 }, { name: '운명의수호석', count: 2200 },
        { name: '운명의파편', count: 7900 }, { name: '운명의돌파석', count: 15 },
        { name: '고귀한구원자의팔찌', count: 5 }, { name: '위대한비상의돌', count: 9 },
        { name: '순환돌파석', count: 17 }, { name: '운명의돌', count: 8 },
      ],
    ],
  },
  'armocha': {
    normal: [
      [
        { name: '운명의파괴석', count: 820 }, { name: '운명의수호석', count: 1640 },
        { name: '운명의파편', count: 5400 }, { name: '운명의돌파석', count: 9 },
        { name: '고귀한구원자의팔찌', count: 2 }, { name: '위대한비상의돌', count: 7 },
      ],
      [
        { name: '운명의파괴석', count: 960 }, { name: '운명의수호석', count: 1920 },
        { name: '운명의파편', count: 6800 }, { name: '운명의돌파석', count: 12 },
        { name: '고귀한구원자의팔찌', count: 4 }, { name: '위대한비상의돌', count: 8 },
        { name: '순환돌파석', count: 15 }, { name: '운명의돌', count: 7 },
      ],
    ],
  },
  'mordum': {
    normal: [
      [
        { name: '운명의파괴석', count: 320 }, { name: '운명의수호석', count: 640 },
        { name: '운명의파편', count: 2600 }, { name: '운명의돌파석', count: 4 },
        { name: '고귀한구원자의팔찌', count: 1 }, { name: '위대한비상의돌', count: 4 },
        { name: '담금질낙뢰의뿔', count: 3 }, { name: '클리어메달', count: 600 },
      ],
      [
        { name: '운명의파괴석', count: 400 }, { name: '운명의수호석', count: 800 },
        { name: '운명의파편', count: 3000 }, { name: '운명의돌파석', count: 4 },
        { name: '고귀한구원자의팔찌', count: 1 }, { name: '위대한비상의돌', count: 5 },
        { name: '담금질낙뢰의뿔', count: 5 }, { name: '클리어메달', count: 700 },
      ],
      [
        { name: '운명의파괴석', count: 520 }, { name: '운명의수호석', count: 1040 },
        { name: '운명의파편', count: 4200 }, { name: '운명의돌파석', count: 6 },
        { name: '고귀한구원자의팔찌', count: 2 }, { name: '위대한비상의돌', count: 6 },
        { name: '순환돌파석', count: 11 }, { name: '운명의돌', count: 5 },
        { name: '담금질낙뢰의뿔', count: 10 }, { name: '클리어메달', count: 1400 },
      ],
    ],
  },
  'abrelshud-2': {
    normal: [
      [
        { name: '운명의파괴석', count: 540 }, { name: '운명의수호석', count: 1080 },
        { name: '운명의파편', count: 4000 }, { name: '운명의돌파석', count: 5 },
        { name: '찬란한구원자의팔찌', count: 3 }, { name: '위대한비상의돌', count: 6 },
        { name: '카르마의잔영', count: 4 }, { name: '클리어메달', count: 1000 },
      ],
      [
        { name: '운명의파괴석', count: 640 }, { name: '운명의수호석', count: 1280 },
        { name: '운명의파편', count: 4600 }, { name: '운명의돌파석', count: 6 },
        { name: '찬란한구원자의팔찌', count: 4 }, { name: '위대한비상의돌', count: 7 },
        { name: '순환돌파석', count: 11 }, { name: '운명의돌', count: 4 },
        { name: '카르마의잔영', count: 6 }, { name: '클리어메달', count: 1300 },
      ],
    ],
  },
  'egir-1': {
    normal: [
      [
        { name: '운명의파괴석', count: 480 }, { name: '운명의수호석', count: 960 },
        { name: '운명의파편', count: 3600 }, { name: '운명의돌파석', count: 4 },
        { name: '찬란한구원자의팔찌', count: 3 }, { name: '위대한비상의돌', count: 6 },
        { name: '업화의쐐기돌', count: 4 }, { name: '클리어메달', count: 800 },
      ],
      [
        { name: '운명의파괴석', count: 580 }, { name: '운명의수호석', count: 1160 },
        { name: '운명의파편', count: 4400 }, { name: '운명의돌파석', count: 5 },
        { name: '찬란한구원자의팔찌', count: 4 }, { name: '위대한비상의돌', count: 7 },
        { name: '순환돌파석', count: 9 }, { name: '운명의돌', count: 4 },
        { name: '업화의쐐기돌', count: 6 }, { name: '클리어메달', count: 1100 },
      ],
    ],
  },
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0) }

function formatGold(g) {
  if (g >= 10000) return `${Math.round(g / 1000)}K`
  if (g >= 1000)  return `${(g / 1000).toFixed(1)}K`
  return g.toLocaleString()
}

// ── 재료 칩 ──────────────────────────────────────────────────────────────────
function MaterialChip({ name, count }) {
  const icon = MATERIAL_ICON[name]
  const shortName = name.replace('운명의', '').replace('구원자의팔찌', '팔찌')
  return (
    <span className="inline-flex items-center gap-1 bg-white dark:bg-[#1a1a1a] border border-gray-100 dark:border-[#2a2a2a] rounded-lg px-2 py-1 shrink-0">
      {icon && <Image src={icon} alt={name} width={12} height={12} unoptimized className="shrink-0 opacity-90" />}
      <span className="text-[10px] text-gray-400 dark:text-gray-500">{shortName}</span>
      <span className="text-[11px] font-bold text-gray-800 dark:text-gray-200 tabular-nums">{count.toLocaleString()}</span>
    </span>
  )
}

// ── 관문 카드 ─────────────────────────────────────────────────────────────────
function GateCard({ gateNum, bound, trade, more, materials }) {
  const total    = bound + trade
  const hasBound = bound > 0
  const hasTrade = trade > 0

  return (
    <div className="bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#232323] rounded-2xl p-5 flex flex-col gap-3">
      {/* 관문 번호 */}
      <p className="text-[10px] font-bold tracking-widest text-[var(--accent-500)] dark:text-[var(--accent-400)] uppercase">
        {gateNum}관문
      </p>

      {/* 골드 */}
      <div>
        <div className="flex items-baseline gap-1.5">
          <span className="text-[34px] font-black leading-none tracking-tight text-gray-900 dark:text-gray-50">
            {total.toLocaleString()}
          </span>
          <span className="text-sm font-bold text-gray-300 dark:text-gray-600 leading-none pb-0.5">G</span>
        </div>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {hasBound && hasTrade
            ? `귀속 ${bound.toLocaleString()} · 거래 ${trade.toLocaleString()}`
            : hasTrade ? '거래 가능' : '귀속'}
        </p>
        {more > 0 && (
          <p className="text-[11px] font-semibold text-red-400 dark:text-red-500 mt-0.5">
            더보기 -{more.toLocaleString()}
          </p>
        )}
      </div>

      {/* 재료 */}
      {materials && materials.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-3 border-t border-gray-100 dark:border-[#2a2a2a]">
          {materials.map(item => (
            <MaterialChip key={item.name} name={item.name} count={item.count} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── 레이드 상세 ───────────────────────────────────────────────────────────────
function RaidDetail({ raid, diffKey, onDiffChange }) {
  const cat       = getRaidCategory(raid)
  const activeKey = diffKey ?? raid.difficulties[0].key
  const diff      = raid.difficulties.find(d => d.key === activeKey) ?? raid.difficulties[0]
  const gateCount = diff.gates

  const raidMaterials = GATE_MATERIALS[raid.id]
  const materials     = raidMaterials?.[activeKey]
  const fallbackKey   = raidMaterials ? Object.keys(raidMaterials).at(-1) : null
  const displayMats   = materials ?? raidMaterials?.[fallbackKey]
  const isFallback    = !materials && displayMats

  const totalGold = sum(diff.goldBound) + sum(diff.goldTrade)
  const totalMore = sum(diff.goldMore)

  const gridCols =
    gateCount >= 4 ? 'grid-cols-2 xl:grid-cols-4' :
    gateCount === 3 ? 'grid-cols-1 sm:grid-cols-3' :
    gateCount === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1'

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <div className="flex items-center gap-1.5 mb-2 flex-wrap">
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${CAT_COLOR[cat]}`}>
            {CAT_LABEL[cat]}
          </span>
          {raid.maxPlayers === 4 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-[#2a2a2a] dark:text-gray-400 font-medium">
              4인
            </span>
          )}
        </div>
        <h2 className="text-2xl font-black text-gray-900 dark:text-gray-50 tracking-tight mb-1">
          {raid.name}
        </h2>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          최소 아이템레벨 {raid.minItemLevel.toLocaleString()}
        </p>
      </div>

      {/* 난이도 선택 */}
      {raid.difficulties.length > 1 && (
        <div className="w-fit bg-gray-100 dark:bg-[#1a1a1a] rounded-xl p-1 flex gap-0.5 mb-6">
          {raid.difficulties.map(d => {
            const isActive = activeKey === d.key
            return (
              <button
                key={d.key}
                onClick={() => onDiffChange(d.key)}
                className={`flex flex-col items-center px-4 py-2 rounded-lg text-xs font-semibold transition-all whitespace-nowrap
                  ${isActive
                    ? 'bg-white dark:bg-[#2e2e2e] text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
              >
                <span>{DIFF_LABEL[d.key]}</span>
                <span className="text-[10px] font-normal opacity-50 mt-0.5 tabular-nums">{d.minItemLevel.toLocaleString()}</span>
              </button>
            )
          })}
        </div>
      )}

      {/* 관문 그리드 */}
      <div className={`grid gap-3 ${gridCols}`}>
        {Array.from({ length: gateCount }, (_, i) => (
          <GateCard
            key={i}
            gateNum={i + 1}
            bound={diff.goldBound[i] || 0}
            trade={diff.goldTrade[i] || 0}
            more={diff.goldMore[i] || 0}
            materials={displayMats?.[i]}
          />
        ))}
      </div>

      {/* 전체 합계 */}
      {gateCount > 1 && (
        <div className="mt-4 flex items-center justify-between px-5 py-4 bg-gray-50 dark:bg-[#161616] border border-gray-100 dark:border-[#232323] rounded-2xl">
          <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wide uppercase">
            전체 합계
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xl font-black text-[var(--accent-600)] dark:text-[var(--accent-400)] tabular-nums">
              {totalGold.toLocaleString()}
              <span className="text-sm font-bold ml-1">G</span>
            </span>
            {totalMore > 0 && (
              <span className="text-[11px] font-semibold text-red-400 dark:text-red-500 tabular-nums">
                더보기 -{totalMore.toLocaleString()}
              </span>
            )}
          </div>
        </div>
      )}

      {isFallback && (
        <p className="mt-3 text-[10px] text-gray-400 dark:text-gray-600">
          * 재료 정보는 {DIFF_LABEL[fallbackKey]} 기준입니다
        </p>
      )}
    </div>
  )
}

// ── 카테고리 필터 버튼 ────────────────────────────────────────────────────────
function CategoryFilter({ activeCategory, onChange }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {CATEGORIES.map(cat => (
        <button
          key={cat.key}
          onClick={() => onChange(cat.key)}
          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-colors
            ${activeCategory === cat.key
              ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
              : 'bg-gray-100 text-gray-500 dark:bg-[#1e1e1e] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#252525]'
            }`}
        >
          {cat.label}
        </button>
      ))}
    </div>
  )
}

// ── 메인 ─────────────────────────────────────────────────────────────────────
export default function RaidRewardClient() {
  const [activeCategory, setActiveCategory] = useState('all')
  const [selectedRaidId, setSelectedRaidId] = useState(RAIDS[0].id)
  const [selectedDiff, setSelectedDiff]     = useState(RAIDS[0].difficulties[0].key)

  const filteredRaids = useMemo(() =>
    activeCategory === 'all'
      ? RAIDS
      : RAIDS.filter(r => getRaidCategory(r) === activeCategory)
  , [activeCategory])

  const selectedRaid = useMemo(() =>
    RAIDS.find(r => r.id === selectedRaidId) ?? filteredRaids[0]
  , [selectedRaidId, filteredRaids])

  const currentDiffKey = selectedDiff ?? selectedRaid?.difficulties[0].key

  function handleCategoryChange(catKey) {
    setActiveCategory(catKey)
    const next = catKey === 'all' ? RAIDS : RAIDS.filter(r => getRaidCategory(r) === catKey)
    if (next.length > 0) {
      setSelectedRaidId(next[0].id)
      setSelectedDiff(next[0].difficulties[0].key)
    }
  }

  function handleRaidChange(raidId) {
    setSelectedRaidId(raidId)
    const raid = RAIDS.find(r => r.id === raidId)
    setSelectedDiff(raid?.difficulties[0].key ?? null)
  }

  function getMaxGold(raid) {
    const d = raid.difficulties[0]
    return sum(d.goldBound) + sum(d.goldTrade)
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-10">

      {/* 페이지 헤더 */}
      <div className="mb-8">
        <h1 className="text-3xl font-black text-gray-900 dark:text-gray-50 tracking-tight">레이드 보상</h1>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">관문별 골드 · 재료 보상 정보</p>
      </div>

      {/* ── 모바일 네비게이션 ── */}
      <div className="md:hidden space-y-3 mb-6">
        <CategoryFilter activeCategory={activeCategory} onChange={handleCategoryChange} />
        <select
          value={selectedRaid?.id ?? ''}
          onChange={e => handleRaidChange(e.target.value)}
          className="w-full bg-gray-50 dark:bg-[#1a1a1a] border border-gray-200 dark:border-[#2a2a2a] rounded-xl px-3 py-2.5 text-sm font-semibold text-gray-700 dark:text-gray-300 appearance-none"
        >
          {filteredRaids.map(raid => (
            <option key={raid.id} value={raid.id}>{raid.name}</option>
          ))}
        </select>
      </div>

      {/* ── 레이아웃 ── */}
      <div className="md:flex gap-8 items-start">

        {/* 사이드바 (데스크탑) */}
        <div className="hidden md:flex flex-col w-52 shrink-0 gap-4">
          <CategoryFilter activeCategory={activeCategory} onChange={handleCategoryChange} />

          {/* 레이드 목록 */}
          <nav
            className="space-y-0.5 overflow-y-auto max-h-[calc(100vh-260px)]"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {filteredRaids.map(raid => {
              const isSelected = selectedRaid?.id === raid.id
              const maxGold    = getMaxGold(raid)
              return (
                <button
                  key={raid.id}
                  onClick={() => handleRaidChange(raid.id)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-2.5 rounded-xl transition-all
                    ${isSelected
                      ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-800)] dark:text-[var(--accent-300)]'
                      : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#1a1a1a] hover:text-gray-900 dark:hover:text-gray-200'
                    }`}
                >
                  <span className="text-sm font-semibold truncate flex-1">{raid.name}</span>
                  <span className={`text-[11px] font-bold shrink-0 tabular-nums
                    ${isSelected ? 'text-[var(--accent-600)] dark:text-[var(--accent-400)]' : 'text-gray-300 dark:text-gray-600'}`}
                  >
                    {formatGold(maxGold)}
                  </span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* 구분선 (데스크탑) */}
        <div className="hidden md:block w-px self-stretch bg-gray-100 dark:bg-[#1e1e1e] shrink-0" />

        {/* 상세 패널 */}
        <div className="flex-1 min-w-0">
          {selectedRaid && (
            <RaidDetail
              raid={selectedRaid}
              diffKey={currentDiffKey}
              onDiffChange={setSelectedDiff}
            />
          )}
        </div>
      </div>
    </div>
  )
}

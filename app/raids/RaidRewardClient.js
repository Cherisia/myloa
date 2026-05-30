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

const DIFF_STYLE = {
  nightmare: {
    active:   'bg-purple-500 text-white border-purple-500',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-purple-300 hover:text-purple-600 dark:hover:border-purple-700 dark:hover:text-purple-400',
    dot: 'bg-purple-500',
  },
  hard: {
    active:   'bg-red-500 text-white border-red-500',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-red-300 hover:text-red-500 dark:hover:border-red-700 dark:hover:text-red-400',
    dot: 'bg-red-500',
  },
  normal: {
    active:   'bg-gray-500 text-white border-gray-500',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500',
    dot: 'bg-gray-400',
  },
  stage3: {
    active:   'bg-orange-500 text-white border-orange-500',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-orange-300 hover:text-orange-600 dark:hover:border-orange-700 dark:hover:text-orange-400',
    dot: 'bg-orange-500',
  },
  stage2: {
    active:   'bg-amber-500 text-white border-amber-500',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-amber-300 hover:text-amber-600 dark:hover:border-amber-700 dark:hover:text-amber-400',
    dot: 'bg-amber-400',
  },
  stage1: {
    active:   'bg-gray-400 text-white border-gray-400',
    inactive: 'border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500',
    dot: 'bg-gray-300',
  },
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

function computeMaterialTotals(gateList) {
  const totals = {}
  for (const gateMats of gateList) {
    for (const item of gateMats) {
      totals[item.name] = (totals[item.name] || 0) + item.count
    }
  }
  return totals
}

const MATERIAL_ORDER = [
  '운명의파괴석', '운명의수호석', '운명의파편', '운명의돌파석', '운명의돌',
  '순환돌파석', '위대한비상의돌',
  '고귀한구원자의팔찌', '찬란한구원자의팔찌',
  '담금질낙뢰의뿔', '카르마의잔영', '업화의쐐기돌',
  '은총의파편', '클리어메달', '불과얼음의주화',
]

function sortedTotals(totals) {
  return MATERIAL_ORDER
    .filter(name => totals[name])
    .map(name => ({ name, count: totals[name] }))
}

function sum(arr) { return arr.reduce((a, b) => a + b, 0) }

// ── 재료 칩 ──────────────────────────────────────────────────────────────────
function MaterialChip({ name, count }) {
  const icon = MATERIAL_ICON[name]
  const shortName = name.replace('운명의', '').replace('구원자의팔찌', '팔찌')
  return (
    <span className="inline-flex items-center gap-1 bg-gray-100 dark:bg-[#272727] rounded-md px-2 py-1 shrink-0">
      {icon && (
        <Image src={icon} alt={name} width={13} height={13} unoptimized className="rounded-sm shrink-0 opacity-90" />
      )}
      <span className="text-[10px] text-gray-400 dark:text-gray-500 hidden sm:inline">{shortName}</span>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200">
        {count.toLocaleString()}
      </span>
    </span>
  )
}

// ── 골드 표 (단일 관문) ───────────────────────────────────────────────────────
function SingleGateGold({ diff }) {
  const bound = diff.goldBound[0] || 0
  const trade = diff.goldTrade[0] || 0
  const more  = diff.goldMore[0]  || 0
  const total = bound + trade

  return (
    <div className="space-y-2">
      {bound > 0 && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">귀속</span>
          <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{bound.toLocaleString()}</span>
        </div>
      )}
      {trade > 0 && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-gray-400 dark:text-gray-500">거래</span>
          <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">{trade.toLocaleString()}</span>
        </div>
      )}
      <div className="flex items-baseline justify-between pt-2.5 border-t border-gray-200 dark:border-[#303030]">
        <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">합계</span>
        <span className="text-2xl font-black tracking-tight text-[var(--accent-600)] dark:text-[var(--accent-400)]">
          {total.toLocaleString()}<span className="text-base ml-0.5 font-bold">G</span>
        </span>
      </div>
      {more > 0 && (
        <div className="flex items-baseline justify-between">
          <span className="text-xs text-red-400 dark:text-red-500">더보기 비용</span>
          <span className="text-sm font-semibold text-red-500 dark:text-red-400">
            -{more.toLocaleString()}
          </span>
        </div>
      )}
    </div>
  )
}

// ── 골드 표 (다중 관문) ───────────────────────────────────────────────────────
function MultiGateGold({ diff, gateCount }) {
  const totalBound = sum(diff.goldBound)
  const totalTrade = sum(diff.goldTrade)
  const totalMore  = sum(diff.goldMore)
  const totalGold  = totalBound + totalTrade
  const gateGolds  = Array.from({ length: gateCount }, (_, i) =>
    (diff.goldBound[i] || 0) + (diff.goldTrade[i] || 0)
  )

  const hasBound = totalBound > 0
  const hasTrade = totalTrade > 0
  const hasMore  = totalMore > 0

  // 레이블 컬럼 고정, 관문 컬럼 균등, 합계 컬럼 고정
  const colTemplate = `56px ${Array(gateCount).fill('1fr').join(' ')} 100px`

  // 그리드 공통 스타일
  const rowStyle = { display: 'grid', gridTemplateColumns: colTemplate, alignItems: 'baseline' }

  const dash = <span className="text-gray-200 dark:text-gray-700 font-normal">—</span>

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: `${56 + gateCount * 80 + 100}px` }}>

        {/* 헤더 */}
        <div style={rowStyle} className="pb-2.5 border-b border-gray-200 dark:border-[#2e2e2e]">
          <span />
          {Array.from({ length: gateCount }, (_, i) => (
            <span key={i} className="text-right text-[11px] font-medium text-gray-400 dark:text-gray-500 pr-3">
              {i + 1}관문
            </span>
          ))}
          <span className="text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400">합계</span>
        </div>

        {/* 귀속 */}
        {hasBound && (
          <div style={rowStyle} className="py-2.5 border-b border-gray-50 dark:border-[#1e1e1e]">
            <span className="text-xs text-gray-400 dark:text-gray-500">귀속</span>
            {diff.goldBound.map((g, i) => (
              <span key={i} className="text-right text-sm text-gray-600 dark:text-gray-300 pr-3">
                {g > 0 ? g.toLocaleString() : dash}
              </span>
            ))}
            <span className="text-right text-sm font-semibold text-gray-700 dark:text-gray-200">
              {totalBound.toLocaleString()}
            </span>
          </div>
        )}

        {/* 거래 */}
        {hasTrade && (
          <div style={rowStyle} className="py-2.5 border-b border-gray-50 dark:border-[#1e1e1e]">
            <span className="text-xs text-gray-400 dark:text-gray-500">거래</span>
            {diff.goldTrade.map((g, i) => (
              <span key={i} className="text-right text-sm text-yellow-600 dark:text-yellow-400 pr-3">
                {g > 0 ? g.toLocaleString() : dash}
              </span>
            ))}
            <span className="text-right text-sm font-semibold text-yellow-600 dark:text-yellow-400">
              {totalTrade.toLocaleString()}
            </span>
          </div>
        )}

        {/* 합계 구분선 */}
        <div className="h-0.5 bg-gray-200 dark:bg-[#333]" />

        {/* 합계 */}
        <div style={rowStyle} className="py-3">
          <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">합계</span>
          {gateGolds.map((g, i) => (
            <span key={i} className="text-right text-base font-bold text-[var(--accent-600)] dark:text-[var(--accent-400)] pr-3">
              {g.toLocaleString()}
            </span>
          ))}
          <span className="text-right">
            <span className="text-xl font-black tracking-tight text-[var(--accent-600)] dark:text-[var(--accent-400)]">
              {totalGold.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-[var(--accent-600)] dark:text-[var(--accent-400)] ml-0.5">G</span>
          </span>
        </div>

        {/* 더보기 구분선 + 행 */}
        {hasMore && (
          <>
            <div className="h-px bg-gray-100 dark:bg-[#252525]" />
            <div style={rowStyle} className="py-2.5">
              <span className="text-xs text-red-400 dark:text-red-500">더보기</span>
              {diff.goldMore.map((g, i) => (
                <span key={i} className="text-right text-sm text-red-400 dark:text-red-400 pr-3">
                  {g > 0 ? `-${g.toLocaleString()}` : dash}
                </span>
              ))}
              <span className="text-right text-sm font-semibold text-red-500 dark:text-red-400">
                -{totalMore.toLocaleString()}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 레이드 상세 ───────────────────────────────────────────────────────────────
function RaidDetail({ raid, diffKey, onDiffChange }) {
  const cat     = getRaidCategory(raid)
  const activeKey = diffKey ?? raid.difficulties[0].key
  const diff    = raid.difficulties.find(d => d.key === activeKey) ?? raid.difficulties[0]
  const gateCount = diff.gates

  const raidMaterials  = GATE_MATERIALS[raid.id]
  const materials      = raidMaterials?.[activeKey]
  const fallbackKey    = raidMaterials ? Object.keys(raidMaterials).at(-1) : null
  const displayMats    = materials ?? raidMaterials?.[fallbackKey]
  const isFallback     = !materials && displayMats

  const totalGold = sum(diff.goldBound) + sum(diff.goldTrade)

  return (
    <div className="mt-5 space-y-6">
      {/* 레이드 헤더 */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-gray-100 dark:bg-[#252525] border border-gray-150 dark:border-[#333] flex items-center justify-center shrink-0">
            <Image src={raid.image} alt="" width={20} height={20} unoptimized className="opacity-70" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-none">{raid.name}</h2>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium leading-none ${CAT_COLOR[cat]}`}>
                {CAT_LABEL[cat]}
              </span>
              {raid.maxPlayers === 4 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500 dark:bg-[#2a2a2a] dark:text-gray-400 leading-none">
                  4인
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
              최소 아이템레벨 {raid.minItemLevel.toLocaleString()}
            </p>
          </div>
        </div>

        {/* 난이도 선택 */}
        {raid.difficulties.length > 1 && (
          <div className="flex gap-1.5 sm:ml-auto flex-wrap">
            {raid.difficulties.map(d => {
              const s = DIFF_STYLE[d.key] ?? DIFF_STYLE.normal
              const isActive = activeKey === d.key
              return (
                <button
                  key={d.key}
                  onClick={() => onDiffChange(d.key)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${isActive ? s.active : s.inactive}`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-white/80' : s.dot}`} />
                  {DIFF_LABEL[d.key]}
                  <span className="opacity-50 text-[10px] font-normal">{d.minItemLevel.toLocaleString()}</span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 골드 표 */}
      <div>
        {gateCount === 1
          ? <SingleGateGold diff={diff} />
          : <MultiGateGold diff={diff} gateCount={gateCount} />
        }
      </div>

      {/* 재료 보상 */}
      {displayMats && (
        <div className="pt-1 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-gray-500 tracking-wider uppercase">
              재료 보상
            </span>
            {isFallback && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400">
                {DIFF_LABEL[fallbackKey]} 기준
              </span>
            )}
          </div>

          <div className="space-y-2.5">
            {displayMats.map((gateMats, gi) => (
              <div key={gi} className="flex items-start gap-3">
                <span className="text-[11px] text-gray-400 dark:text-gray-500 shrink-0 w-9 pt-1.5">
                  {gi + 1}관문
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {gateMats.map(item => (
                    <MaterialChip key={item.name} name={item.name} count={item.count} />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 전체 합산 (관문이 2개 이상일 때만) */}
          {gateCount > 1 && (
            <div className="flex items-start gap-3 pt-2 border-t border-gray-100 dark:border-[#252525]">
              <span className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 shrink-0 w-9 pt-1.5">합산</span>
              <div className="flex flex-wrap gap-1.5">
                {sortedTotals(computeMaterialTotals(displayMats)).map(item => (
                  <MaterialChip key={item.name} name={item.name} count={item.count} />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {raidMaterials === undefined && (
        <p className="text-xs text-gray-400 dark:text-gray-500">재료 데이터 준비 중</p>
      )}
    </div>
  )
}

// ── 메인 컴포넌트 ─────────────────────────────────────────────────────────────
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

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 sm:py-8">
      {/* 헤더 */}
      <div className="mb-7">
        <h1 className="text-2xl font-black text-gray-900 dark:text-gray-100 mb-1">레이드 보상</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          레이드 종류와 이름을 선택해 관문별 골드·재료·더보기 비용을 확인하세요.
        </p>
      </div>

      {/* 1단계 탭: 종류 */}
      <div className="flex gap-1.5 overflow-x-auto pb-2">
        {CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => handleCategoryChange(cat.key)}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors shrink-0
              ${activeCategory === cat.key
                ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
                : 'bg-gray-100 text-gray-500 dark:bg-[#232323] dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]'
              }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* 2단계 탭: 레이드 이름 */}
      <div className="flex overflow-x-auto border-b border-gray-150 dark:border-[#2a2a2a] mt-0.5 mb-0">
        {filteredRaids.map(raid => (
          <button
            key={raid.id}
            onClick={() => handleRaidChange(raid.id)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-all shrink-0 -mb-px
              ${selectedRaid?.id === raid.id
                ? 'border-[var(--accent-500)] text-[var(--accent-600)] dark:border-[var(--accent-400)] dark:text-[var(--accent-400)]'
                : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-300 dark:hover:border-[#444]'
              }`}
          >
            {raid.name}
          </button>
        ))}
      </div>

      {/* 레이드 상세 */}
      {selectedRaid && (
        <RaidDetail
          raid={selectedRaid}
          diffKey={currentDiffKey}
          onDiffChange={setSelectedDiff}
        />
      )}

      {/* 푸터 */}
      <div className="mt-10 pb-4">
        <p className="text-xs text-gray-400 dark:text-gray-600">
          실제 보상은 게임 업데이트에 따라 달라질 수 있습니다.
        </p>
      </div>
    </div>
  )
}

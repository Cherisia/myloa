'use client'

import { useState, useRef, useEffect } from 'react'
import Image from 'next/image'

// ── 로스트아크 경매 시스템 ────────────────────────────────────────────────────
//
// 낙찰 구조: 낙찰자가 B 골드를 내면 → 나머지 N-1명이 B/(N-1)씩 수령
//
// [판매시]
//   손익분기 = P × 0.95 × (N-1)/N
//     → 이 입찰가에서 낙찰자(판매수익)와 비낙찰자(분배금)가 동일
//   적정가  = floor(손익분기 / 1.1)   (1.1 = 1 + 2 × 수수료 5%)
//
// [직접사용시]
//   손익분기 = 적정가 = P × (N-1)/N
//     → 이 입찰가에서 낙찰자 절약금과 비낙찰자 분배금이 동일
//
// 수수료: 5% (경매장 판매 수수료)

const FEE = 0.05

function g(n) {
  if (n === null || n === undefined || !isFinite(n)) return '-'
  return Math.floor(n).toLocaleString('ko-KR')
}

function Gold({ size = 13 }) {
  return (
    <Image
      src="/icons/gold.png"
      alt="골드"
      width={size}
      height={size}
      className="object-contain flex-shrink-0 inline-block"
      style={{ width: size, height: size }}
    />
  )
}

function StatBox({ label, value, color, dim }) {
  return (
    <div className="bg-gray-50 dark:bg-[#111116] rounded-lg px-2.5 py-2">
      <div className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">{label}</div>
      <div className={`flex items-center justify-end gap-0.5 ns-bold text-xs tabular-nums ${dim ? 'text-gray-500 dark:text-gray-400' : (color ?? 'text-gray-800 dark:text-gray-100')}`}>
        <span>{g(value)}</span>
        <Gold size={11} />
      </div>
    </div>
  )
}

function SectionBadge({ label, color }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] ns-bold tracking-wider ${color}`}>
      {label}
    </span>
  )
}

export default function AuctionClient() {
  const [rawPrice, setRawPrice] = useState('')
  const [partySize, setPartySize] = useState(4)
  const priceInputRef = useRef(null)

  useEffect(() => {
    priceInputRef.current?.focus()
  }, [])

  const P = Number(rawPrice) || 0
  const N = partySize

  const sellRevenue        = P * (1 - FEE)
  const sellBreakevenFloat = sellRevenue * (N - 1) / N
  const sellOptimalFloat   = sellBreakevenFloat / (1 + 2 * FEE)

  const sellOptimalBid    = Math.floor(sellOptimalFloat)
  const sellOptimalMy     = Math.floor(sellRevenue - sellOptimalFloat)
  const sellOptimalOthers = Math.floor(sellOptimalFloat / (N - 1))

  const sellBE            = sellBreakevenFloat
  const sellBEMy          = Math.floor(sellRevenue - sellBreakevenFloat)
  const sellBEOthers      = Math.floor(sellBreakevenFloat / (N - 1))

  const useBreakevenFloat = P * (N - 1) / N
  const useBid            = Math.floor(useBreakevenFloat)
  const useMySaving       = Math.floor(P - useBreakevenFloat)
  const useOthers         = Math.floor(useBreakevenFloat / (N - 1))

  return (
    <div className="max-w-4xl mx-auto px-4 py-5">
      <div className="mb-5">
        <h1 className="text-2xl ns-extrabold text-gray-900 dark:text-white">경매 입찰 계산기</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          파티 경매 낙찰 적정가 · 손익분기점 · 분배금을 계산합니다.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-[256px_1fr_1fr] gap-4">

        {/* ── 입력 ───────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border p-5 flex flex-col gap-5">

          <div>
            <label className="block text-[11px] ns-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
              파티 인원
            </label>
            <div className="flex gap-2">
              {[4, 8].map(n => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setPartySize(n)}
                  className={`flex-1 py-2.5 rounded-xl text-sm ns-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)] ${
                    partySize === n
                      ? 'bg-[var(--accent-400)] text-[var(--accent-900)]'
                      : 'bg-gray-100 dark:bg-[#2a2a30] text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#333338] active:scale-95'
                  }`}
                >
                  {n}인
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] ns-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-2.5">
              아이템 가격
            </label>
            <div className="relative">
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <Gold size={15} />
              </div>
              <input
                ref={priceInputRef}
                type="number"
                min="0"
                placeholder="가격을 입력하세요"
                value={rawPrice}
                onChange={e => {
                  const v = e.target.value
                  if (v === '' || Number(v) <= 99999999) setRawPrice(v)
                  else setRawPrice('99999999')
                }}
                className="w-full pl-4 pr-9 py-2 rounded-xl bg-gray-50 dark:bg-[#111116] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-right ns-bold text-base focus:outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
            </div>
          </div>

          <div className="rounded-xl bg-gray-50 dark:bg-[#111116] px-3 py-2.5 text-xs text-gray-400 dark:text-gray-500 leading-relaxed space-y-0.5">
            <p>낙찰금은 나머지 {N - 1}명이 균등 수령</p>
            <p>경매 수수료 5% 적용</p>
          </div>
        </div>

        {/* ── 판매시 ─────────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border flex flex-col">
          <div className="p-4 flex flex-col gap-3 flex-1">

            <div className="flex items-center gap-2">
              <SectionBadge label="판매시" color="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400" />
            </div>

            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">추천 입찰가</p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="ns-extrabold text-2xl text-amber-500 dark:text-amber-400 tabular-nums leading-none">
                  {g(sellOptimalBid)}
                </span>
                <Gold size={16} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <StatBox label="내 수익" value={sellOptimalMy} color="text-gray-700 dark:text-gray-300" />
              <StatBox label={`인당 분배 (${N - 1}명)`} value={sellOptimalOthers} color="text-gray-700 dark:text-gray-300" />
            </div>

            <div className="border-t border-gray-100 dark:border-white/[0.06] pt-3 flex flex-col gap-2">
              <div className="flex items-center justify-between">
                <p className="text-[10px] ns-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">손익분기</p>
                <div className="flex items-center gap-1">
                  <span className="ns-bold text-sm text-gray-700 dark:text-gray-200 tabular-nums">{g(sellBE)}</span>
                  <Gold size={12} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <StatBox label="내 수익" value={sellBEMy} dim />
                <StatBox label={`인당 분배 (${N - 1}명)`} value={sellBEOthers} dim />
              </div>
            </div>
          </div>
        </div>

        {/* ── 직접사용시 ──────────────────────────────────────────── */}
        <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border flex flex-col">
          <div className="p-4 flex flex-col gap-3 flex-1">

            <div className="flex items-center gap-2">
              <SectionBadge label="직접사용시" color="bg-gray-100 dark:bg-white/[0.06] text-gray-600 dark:text-gray-400" />
            </div>

            <div>
              <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-0.5">
                추천 입찰가 <span className="text-gray-300 dark:text-gray-600">· 손익분기와 동일</span>
              </p>
              <div className="flex items-center justify-end gap-1.5">
                <span className="ns-extrabold text-2xl text-amber-500 dark:text-amber-400 tabular-nums leading-none">
                  {g(useBid)}
                </span>
                <Gold size={16} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <StatBox label="내 절약금" value={useMySaving} color="text-gray-700 dark:text-gray-300" />
              <StatBox label={`인당 분배 (${N - 1}명)`} value={useOthers} color="text-gray-700 dark:text-gray-300" />
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

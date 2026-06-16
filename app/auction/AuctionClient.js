'use client'

import { useState } from 'react'
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

function GoldValue({ value, color, size = 'text-sm' }) {
  if (value === null || !isFinite(value)) return <span className="text-gray-400">-</span>
  return (
    <span className={`inline-flex items-center gap-0.5 ns-bold tabular-nums ${size} ${color ?? 'text-gray-900 dark:text-white'}`}>
      {g(value)}
      <Gold size={13} />
    </span>
  )
}

// 분배금 행: "라벨 ─ A · B" 형식
function DistRow({ label, myVal, myLabel, othersVal, othersLabel, color }) {
  return (
    <div className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
      <span>{label} — </span>
      <span className={`ns-bold ${color ?? 'text-gray-700 dark:text-gray-300'}`}>{myLabel} </span>
      <GoldValue value={myVal} color={color} size="text-xs" />
      <span className="mx-1">·</span>
      <span className={`ns-bold ${color ?? 'text-gray-700 dark:text-gray-300'}`}>{othersLabel} </span>
      <GoldValue value={othersVal} color={color} size="text-xs" />
    </div>
  )
}

// 메인 결과 행
function MainRow({ headingLabel, bidValue, note }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">{headingLabel}</span>
        <span className="flex items-center gap-1">
          <span className="ns-extrabold text-xl text-amber-500 dark:text-amber-400 tabular-nums">
            {g(bidValue)}
          </span>
          <Gold size={16} />
          <span className="text-xs text-gray-500 dark:text-gray-400">가 적당해요</span>
        </span>
      </div>
      {note && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{note}</p>}
    </div>
  )
}

export default function AuctionClient() {
  const [rawPrice, setRawPrice] = useState('')
  const [partySize, setPartySize] = useState(4)

  const P = Number(rawPrice) || 0
  const N = partySize

  // ── 판매시 ──────────────────────────────────────────────────────────────────
  // 판매 수익 (수수료 5% 차감)
  const sellRevenue = P * (1 - FEE)

  // 손익분기: 낙찰자(판매수익) = 비낙찰자(분배금) 가 같아지는 입찰가
  const sellBreakevenFloat  = sellRevenue * (N - 1) / N          // 66,500G
  // 적정가: 손익분기 / 1.1 (수수료 10% 여유분 확보)
  const sellOptimalFloat    = sellBreakevenFloat / (1 + 2 * FEE) // 60,454.54...

  const sellOptimalBid     = Math.floor(sellOptimalFloat)                      // 60,454G
  const sellOptimalMy      = Math.floor(sellRevenue - sellOptimalFloat)        // 15,545G
  const sellOptimalOthers  = Math.floor(sellOptimalFloat / (N - 1))            // 8,636G

  const sellBE             = sellBreakevenFloat                                // 66,500G (exact)
  const sellBEMy           = Math.floor(sellRevenue - sellBreakevenFloat)      // 9,500G
  const sellBEOthers       = Math.floor(sellBreakevenFloat / (N - 1))          // 9,500G

  // ── 직접사용시 ──────────────────────────────────────────────────────────────
  // 적정가 = 손익분기: 낙찰자 절약금 = 비낙찰자 분배금
  const useBreakevenFloat   = P * (N - 1) / N                    // 70,000G
  const useBid              = Math.floor(useBreakevenFloat)       // 70,000G
  const useMySaving         = Math.floor(P - useBreakevenFloat)   // 10,000G (나 절약)
  const useOthers           = Math.floor(useBreakevenFloat / (N - 1)) // 10,000G

  const hasData = P > 0

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl ns-extrabold text-gray-900 dark:text-white">경매 입찰 계산기</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          파티 경매 낙찰 적정가 · 손익분기점 · 분배금을 계산합니다.
        </p>
      </div>

      {/* 좌우 레이아웃 */}
      <div className="flex flex-col md:flex-row gap-4 items-start">

        {/* ── 왼쪽: 입력 ──────────────────────────────────── */}
        <div className="w-full md:w-72 shrink-0">
          <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border p-5 flex flex-col gap-5">
            {/* 파티 인원 */}
            <div>
              <label className="block text-sm ns-bold text-gray-700 dark:text-gray-300 mb-2">
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
                    {n}인 파티
                  </button>
                ))}
              </div>
            </div>

            {/* 아이템 가격 */}
            <div>
              <label className="block text-sm ns-bold text-gray-700 dark:text-gray-300 mb-2">
                <span className="inline-flex items-center gap-1">
                  아이템 가격
                  <Gold size={14} />
                </span>
              </label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2">
                  <Gold size={16} />
                </div>
                <input
                  type="number"
                  min="0"
                  placeholder="시장 거래 가격 입력"
                  value={rawPrice}
                  onChange={e => setRawPrice(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 rounded-xl bg-gray-50 dark:bg-[#111116] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-right ns-bold text-base focus:outline-none focus:ring-2 focus:ring-[var(--accent-400)] transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 placeholder:font-normal"
                />
              </div>
            </div>

            {/* 안내 */}
            <p className="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">
              낙찰금은 나머지 {N - 1}명이 균등 수령<br />
              경매 수수료 5% 적용
            </p>
          </div>
        </div>

        {/* ── 오른쪽: 결과 ─────────────────────────────────── */}
        <div className="flex-1 flex flex-col gap-3 min-w-0">
          {!hasData ? (
            <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border flex items-center justify-center py-16 text-gray-400 dark:text-gray-500 text-sm">
              아이템 가격을 입력하면 결과가 표시됩니다.
            </div>
          ) : (
            <>
              {/* ── 판매시 ──────────────────────────────────── */}
              <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border p-5 flex flex-col gap-3">
                <span className="text-xs ns-bold text-blue-500 dark:text-blue-400 tracking-wide">판매시</span>

                {/* 적정가 */}
                <div className="flex flex-col gap-1.5">
                  <MainRow headingLabel="입찰 적정가" bidValue={sellOptimalBid} />
                  <DistRow
                    label="분배금"
                    myLabel="나"
                    myVal={sellOptimalMy}
                    othersLabel={`다른 ${N - 1}명 각`}
                    othersVal={sellOptimalOthers}
                    color="text-blue-600 dark:text-blue-400"
                  />
                </div>

                <div className="h-px bg-gray-100 dark:bg-white/[0.06]" />

                {/* 손익분기 */}
                <div className="flex flex-col gap-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">손익분기점</span>
                    <span className="flex items-center gap-1">
                      <span className="ns-extrabold text-lg text-gray-700 dark:text-gray-200 tabular-nums">
                        {g(sellBE)}
                      </span>
                      <Gold size={13} />
                      <span className="text-xs text-gray-400 dark:text-gray-500">이에요</span>
                    </span>
                  </div>
                  <DistRow
                    label="분배금"
                    myLabel="나"
                    myVal={sellBEMy}
                    othersLabel={`다른 ${N - 1}명 각`}
                    othersVal={sellBEOthers}
                    color="text-gray-600 dark:text-gray-400"
                  />
                </div>
              </div>

              {/* ── 직접사용시 ──────────────────────────────── */}
              <div className="bg-white dark:bg-[#1a1a1f] rounded-2xl shadow-border p-5 flex flex-col gap-3">
                <span className="text-xs ns-bold text-emerald-500 dark:text-emerald-400 tracking-wide">직접사용시</span>

                <div className="flex flex-col gap-1.5">
                  <MainRow
                    headingLabel="입찰 적정가 (= 손익분기점)"
                    bidValue={useBid}
                  />
                  <DistRow
                    label="분배금"
                    myLabel="나 절약"
                    myVal={useMySaving}
                    othersLabel={`다른 ${N - 1}명 각`}
                    othersVal={useOthers}
                    color="text-emerald-600 dark:text-emerald-400"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

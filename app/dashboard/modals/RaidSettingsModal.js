'use client'

import { useState, useMemo } from 'react'
import { RAIDS } from '@/lib/raidData'
import { EX_RAID_IDS, HIDDEN_RAID_IDS, GOLD_RAID_LIMIT, GOLD_CHAR_LIMIT } from '../_constants'

// ── 레이드 설정 모달 (캐릭터별) ───────────────────────────────────────────────
export default function RaidSettingsModal({ chars, raids, expPages, onToggle, onToggleGold, onClose, onConfirm, exRaidError, onClearExRaidError, onOpenCharAdd, initialCharId }) {
  const initialIdx = initialCharId ? Math.max(0, chars.findIndex(c => c.id === initialCharId)) : 0
  const [selectedIdx, setSelectedIdx] = useState(initialIdx)
  const selectedChar = chars[selectedIdx]

  const [goldError, setGoldError]         = useState(null) // 캐릭터당 초과 목록
  const [acctGoldError, setAcctGoldError] = useState(null) // 계정당 초과 목록

  const charRaidList    = selectedChar ? (raids[selectedChar.id] || []) : []
  const activeKeys      = useMemo(() => new Set(charRaidList.map(e => `${e.raidId}_${e.difficulty}`)), [charRaidList])
  const normalGoldCount = charRaidList.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
  const exGoldCount     = charRaidList.filter(e => e.isGoldCheck &&  EX_RAID_IDS.has(e.raidId)).length

  // 계정별 골드 캐릭터 현황 (chars 순서 = 계정 등록 순서)
  // 대표캐릭터: accountRepChar(DB 저장값) > 아이템레벨 최고 캐릭터명 순으로 fallback
  const acctGoldMap = (() => {
    const seenKeys = []
    const map = {}
    chars.forEach(c => {
      const key = c.expeditionId || 'unknown'
      if (!map[key]) {
        seenKeys.push(key)
        map[key] = { key, label: c.accountRepChar || c.name, count: 0 }
      }
      if ((raids[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))) map[key].count++
    })
    return seenKeys.map(k => map[k])
  })()
  const acctKey          = selectedChar ? (selectedChar.expeditionId || 'unknown') : null
  const acctGoldCharCount = acctGoldMap.find(a => a.key === acctKey)?.count ?? 0
  const charHasGold = charRaidList.some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))

  const handleConfirm = () => {
    // 캐릭터당 골드 레이드 3개 초과 검사
    const exceeded = chars
      .map(char => ({
        name:  char.name,
        count: (raids[char.id] || []).filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length,
      }))
      .filter(c => c.count > GOLD_RAID_LIMIT)
    if (exceeded.length > 0) { setGoldError(exceeded); return }

    // 계정당 골드 캐릭터 6개 초과 검사
    const accountMap = {}
    chars.forEach(char => {
      const key = char.expeditionId || 'unknown'
      if (!accountMap[key]) accountMap[key] = { label: expPages?.find(p => p.id === key)?.name || '원정대', goldCount: 0 }
      if ((raids[char.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
        accountMap[key].goldCount++
    })
    const acctExceeded = Object.values(accountMap).filter(a => a.goldCount > GOLD_CHAR_LIMIT)
    if (acctExceeded.length > 0) { setAcctGoldError(acctExceeded); return }

    onConfirm()
  }

  if (!chars.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25" onClick={onClose}>
        <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
          <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
          <button onClick={() => { onClose(); onOpenCharAdd() }} className="mt-6 px-4 py-2 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
            캐릭터 추가
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25" onClick={onClose}>
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <div>
            <span className="ns-bold text-gray-900 dark:text-white">레이드 설정</span>
            <span className="ml-2 text-xs text-gray-400">캐릭터별로 참여할 레이드를 선택하세요</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 캐릭터 탭 */}
        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-gray-100 dark:border-[#383838] flex-shrink-0 scrollbar-hide">
          {chars.map((char, i) => {
            const count = (raids[char.id] || []).length
            return (
              <button
                key={char.id}
                onClick={() => setSelectedIdx(i)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ns-bold transition-colors ${
                  i === selectedIdx
                    ? 'bg-yellow-200 text-yellow-900'
                    : 'border border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                }`}
              >
                {char.name}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ns-bold ${
                    i === selectedIdx
                      ? 'bg-yellow-400/40 text-yellow-900'
                      : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 골드 현황 바 */}
        <div className="px-5 pt-3 pb-0 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          {/* 캐릭터당 골드 레이드 수 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">골드 보상</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1.5 w-5 rounded-full transition-colors ${
                  normalGoldCount > GOLD_RAID_LIMIT ? 'bg-red-400' : i < normalGoldCount ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                }`} />
              ))}
            </div>
            <span className={`text-[11px] ns-bold transition-colors ${
              normalGoldCount > GOLD_RAID_LIMIT ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}>{normalGoldCount}/{GOLD_RAID_LIMIT}</span>
            {exGoldCount > 0 && (
              <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
                EX +{exGoldCount}
              </span>
            )}
          </div>
          {/* 선택된 캐릭터의 계정 골드 캐릭터 수 */}
          {acctGoldMap.filter(({ key }) => key === acctKey).map(({ key, label, count }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{label} 계정 골드 캐릭터</span>
              <div className="flex gap-0.5">
                {Array.from({ length: GOLD_CHAR_LIMIT }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-3 rounded-full transition-colors ${
                    count > GOLD_CHAR_LIMIT ? 'bg-red-400' : i < count ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                  }`} />
                ))}
              </div>
              <span className={`text-[11px] ns-bold transition-colors ${
                count > GOLD_CHAR_LIMIT ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}>{count}/{GOLD_CHAR_LIMIT}</span>
            </div>
          ))}
        </div>

        {/* 레이드 목록 */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
          {RAIDS.filter(raid => !HIDDEN_RAID_IDS.has(raid.id)).map(raid => {
            const isLevelOk = selectedChar && selectedChar.itemLevel >= raid.minItemLevel
            return (
              <div
                key={raid.id}
                className={`rounded-lg border px-4 py-2.5 transition-colors ${
                  isLevelOk
                    ? 'border-gray-200 dark:border-[#383838]'
                    : 'border-gray-100 dark:border-[#2a2a2a] opacity-35'
                }`}
              >
                <div className="grid items-center gap-3" style={{ gridTemplateColumns: '140px 56px auto 1fr' }}>
                  {/* 레이드명 */}
                  <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{raid.name}</span>
                  {/* 입장 레벨 — 독립 열로 세로 정렬 */}
                  <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{raid.minItemLevel.toLocaleString()}+</span>

                  {/* 골드 토글 스위치 */}
                  {(() => {
                    const entry     = charRaidList.find(e => e.raidId === raid.id)
                    const hasActive = !!entry
                    const isGold    = hasActive && entry.isGoldCheck
                    const isEx      = EX_RAID_IDS.has(raid.id)
                    const canToggle = hasActive && !isEx && (
                      isGold || (normalGoldCount < GOLD_RAID_LIMIT && (charHasGold || acctGoldCharCount < GOLD_CHAR_LIMIT))
                    )
                    const title     = !hasActive ? '레이드를 먼저 선택하세요'
                                    : isEx       ? 'EX 레이드는 골드가 항상 지급됩니다'
                                    : !canToggle && normalGoldCount >= GOLD_RAID_LIMIT ? `골드 보상 ${GOLD_RAID_LIMIT}개 초과`
                                    : !canToggle ? `계정 내 골드 캐릭터 ${GOLD_CHAR_LIMIT}개 초과`
                                    : ''
                    return (
                      <button
                        onClick={() => canToggle && onToggleGold(selectedChar.id, raid.id, entry.difficulty)}
                        disabled={!hasActive || isEx && !isGold}
                        className="flex items-center gap-1.5 flex-shrink-0 disabled:cursor-not-allowed"
                        title={title}
                      >
                        <span className={`text-[10px] ns-bold transition-colors ${
                          isGold ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600'
                        }`}>골드</span>
                        <span className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${
                          isGold    ? 'bg-yellow-400'
                          : hasActive ? 'bg-gray-200 dark:bg-[#383838]'
                          :             'bg-gray-100 dark:bg-[#2a2a2a] opacity-40'
                        }`}>
                          <span className={`inline-block h-3 w-3 rounded-full bg-white shadow-sm transition-transform ${
                            isGold ? 'translate-x-3.5' : 'translate-x-0.5'
                          }`} />
                        </span>
                      </button>
                    )
                  })()}

                  {/* 난이도 버튼들 */}
                  <div className="flex gap-2 justify-end">
                    {raid.difficulties.map(diff => {
                      const key           = `${raid.id}_${diff.key}`
                      const on            = activeKeys.has(key)
                      const totalGold     = (diff.goldBound || []).reduce((s,g) => s+g, 0) + (diff.goldTrade || []).reduce((s,g) => s+g, 0)
                      const isDiffLevelOk = selectedChar && selectedChar.itemLevel >= diff.minItemLevel
                      const diffStyle = on
                        ? diff.key === 'nightmare'
                          ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/15 text-purple-600 dark:text-purple-400'
                          : diff.key === 'hard'
                          ? 'border-red-300 bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400'
                          : 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10 text-yellow-700 dark:text-yellow-400'
                        : 'border-gray-200 dark:border-[#383838] text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500'
                      return (
                        <button
                          key={key}
                          disabled={!isDiffLevelOk}
                          onClick={() => onToggle(selectedChar.id, raid.id, diff.key)}
                          className={`flex flex-col items-center justify-center gap-0.5 px-4 py-1.5 rounded-lg border text-xs ns-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${diffStyle}`}
                        >
                          <span>{diff.label}</span>
                          <span className={`text-[10px] ns-light ${on ? 'opacity-60' : 'text-gray-300 dark:text-gray-700'}`}>
                            {totalGold.toLocaleString()}G
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 푸터 */}
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#383838] flex-shrink-0">
          <button
            onClick={handleConfirm}
            className="w-full rounded bg-yellow-200 hover:bg-yellow-300 py-2 text-sm font-medium text-yellow-900 transition-colors"
          >
            확인
          </button>
        </div>
      </div>

      {/* EX 레이드 계정 제한 에러 */}
      {exRaidError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={onClearExRaidError}>
          <div className="relative w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button onClick={onClearExRaidError} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            <div className="px-5 pt-6 pb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100 dark:bg-purple-900/20 mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
                </svg>
              </div>
              <p className="text-sm ns-bold text-gray-900 dark:text-white text-center mb-1">EX 레이드 중복</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5 leading-relaxed">
                <span className="ns-bold text-gray-700 dark:text-gray-200">{exRaidError.raidName}</span> 레이드는<br/>
                같은 계정에서 캐릭터 하나만 선택할 수 있습니다.<br/>
                <span className="ns-bold text-purple-500 dark:text-purple-400">{exRaidError.conflictCharName}</span> 캐릭터에 이미 설정되어 있습니다.
              </p>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={onClearExRaidError}
                className="w-full rounded bg-yellow-200 hover:bg-yellow-300 py-2 text-sm font-medium text-yellow-900 transition-colors"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 골드 초과 에러 모달 */}
      {goldError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={() => setGoldError(null)}>
          <div className="relative w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setGoldError(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            <div className="px-5 pt-6 pb-4">
              {/* 아이콘 */}
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/20 mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-sm ns-bold text-gray-900 dark:text-white text-center mb-1">골드 보상 초과</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5">
                캐릭터당 골드 획득 가능 레이드는 최대 {GOLD_RAID_LIMIT}개입니다
              </p>
              {/* 초과 캐릭터 목록 */}
              <div className="space-y-1.5">
                {goldError.map(c => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#383838] px-3 py-2.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span className="text-xs ns-bold text-orange-500 dark:text-orange-400">{c.count} / {GOLD_RAID_LIMIT}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => {
                  const firstIdx = chars.findIndex(c => c.name === goldError[0].name)
                  if (firstIdx >= 0) setSelectedIdx(firstIdx)
                  setGoldError(null)
                }}
                className="w-full rounded bg-yellow-200 hover:bg-yellow-300 py-2 text-sm font-medium text-yellow-900 transition-colors"
              >
                수정하러 갈게요!
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 계정당 골드 캐릭터 초과 에러 모달 */}
      {acctGoldError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={() => setAcctGoldError(null)}>
          <div className="relative w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button onClick={() => setAcctGoldError(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            <div className="px-5 pt-6 pb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/20 mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-sm ns-bold text-gray-900 dark:text-white text-center mb-1">계정 내 골드 캐릭터 초과</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5">
                계정 내 골드 수령 캐릭터는 최대 {GOLD_CHAR_LIMIT}개입니다
              </p>
              <div className="space-y-1.5">
                {acctGoldError.map(a => (
                  <div key={a.label} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#383838] px-3 py-2.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{a.label}</span>
                    <span className="text-xs ns-bold text-orange-500 dark:text-orange-400">{a.goldCount} / {GOLD_CHAR_LIMIT}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                onClick={() => setAcctGoldError(null)}
                className="w-full rounded bg-yellow-200 hover:bg-yellow-300 py-2 text-sm font-medium text-yellow-900 transition-colors"
              >
                수정하러 갈게요!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

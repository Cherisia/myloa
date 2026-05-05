'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import DiscordIcon from '@/components/DiscordIcon'
import { RAIDS, CLASS_COLOR, calcGold, calcGoldBound, calcGoldTrade, calcGoldMore } from '@/lib/raidData'

// 계정당 1캐릭터만 선택 가능한 EX 레이드
const EX_RAID_IDS = new Set(['egir-ex', 'abrel-ex'])
// 아직 출시되지 않아 UI에서 숨기는 레이드 (데이터는 유지)
const HIDDEN_RAID_IDS = new Set(['abrel-ex'])

const GOLD_RAID_LIMIT = 3  // 캐릭터당 골드 획득 레이드 최대 수
const GOLD_CHAR_LIMIT = 6  // 계정당 골드 수령 캐릭터 최대 수

// ── 직업 아이콘 (로컬 /public/class/) ────────────────────────────────────────
const CLASS_ICON = {
  // 전사(남)
  '디스트로이어': 'destroyer',
  '워로드':      'gunlancer',
  '버서커':      'berserker',
  '홀리나이트':  'paladin',
  // 전사(여)
  '슬레이어':    'slayer',
  '발키리':      'valkyrie',
  // 무도가(남)
  '스트라이커':  'striker',
  '브레이커':    'breaker',
  // 무도가(여)
  '배틀마스터':  'wardancer',
  '인파이터':    'scrapper',
  '기공사':      'soulfist',
  '창술사':      'glaivier',
  // 헌터(남)
  '데빌헌터':    'deadeye',
  '블래스터':    'artillerist',
  '호크아이':    'sharpshooter',
  '스카우터':    'machinist',
  // 헌터(여)
  '건슬링어':    'gunslinger',
  // 마법사
  '바드':        'bard',
  '서머너':      'summoner',
  '아르카나':    'arcanist',
  '소서리스':    'sorceress',
  // 암살자
  '블레이드':    'deathblade',
  '데모닉':      'shadowhunter',
  '리퍼':        'reaper',
  '소울이터':    'souleater',
  // 스페셜리스트
  '도화가':      'artist',
  '기상술사':    'aeromancer',
  '환수사':      'wildsoul',
  // 가디언나이트
  '가디언나이트': 'guardianknight',
}
const getClassIcon = (cls) => CLASS_ICON[cls] ? `/class/${CLASS_ICON[cls]}.svg` : null

// ── 아이콘 ────────────────────────────────────────────────────────────────────
const IconCrown = () => (
  <svg width="12" height="11" viewBox="0 0 24 22" fill="currentColor">
    <path d="M2 19h20v2H2zM22 3.27l-5.5 6.5L12 2 7.5 9.77 2 3.27V18h20V3.27z"/>
  </svg>
)
const IconPlus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)
const IconClass = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
    <path d="M12 2L4 6v6c0 5.25 3.75 10.2 8 11 4.25-.8 8-5.75 8-11V6L12 2z"/>
  </svg>
)
const IconItemLevel = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-60">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconPower = () => (
  <img src="/combat-power.svg" alt="전투력" style={{ width: 10, height: 10 }} />
)
const IconGrip = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
    <circle cx="9"  cy="5"  r="1.8"/><circle cx="15" cy="5"  r="1.8"/>
    <circle cx="9"  cy="12" r="1.8"/><circle cx="15" cy="12" r="1.8"/>
    <circle cx="9"  cy="19" r="1.8"/><circle cx="15" cy="19" r="1.8"/>
  </svg>
)

// ── 레이드 설정 모달 (캐릭터별) ───────────────────────────────────────────────
function RaidSettingsModal({ chars, raids, onToggle, onToggleGold, onClose, onConfirm, exRaidError, onClearExRaidError, onOpenCharAdd }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedChar = chars[selectedIdx]

  const [goldError, setGoldError]         = useState(null) // 캐릭터당 초과 목록
  const [acctGoldError, setAcctGoldError] = useState(null) // 계정당 초과 목록

  const charRaidList    = selectedChar ? (raids[selectedChar.id] || []) : []
  const activeKeys      = useMemo(() => new Set(charRaidList.map(e => `${e.raidId}_${e.difficulty}`)), [charRaidList])
  const normalGoldCount = charRaidList.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
  const exGoldCount     = charRaidList.filter(e => e.isGoldCheck &&  EX_RAID_IDS.has(e.raidId)).length

  const acctKey          = selectedChar ? (selectedChar.loaAccountId || selectedChar.account) : null
  const acctGoldCharCount = acctKey
    ? chars.filter(c => (c.loaAccountId || c.account) === acctKey && (raids[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))).length
    : 0
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
      const key = char.loaAccountId || char.account
      if (!accountMap[key]) accountMap[key] = { label: char.account, goldCount: 0 }
      if ((raids[char.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
        accountMap[key].goldCount++
    })
    const acctExceeded = Object.values(accountMap).filter(a => a.goldCount > GOLD_CHAR_LIMIT)
    if (acctExceeded.length > 0) { setAcctGoldError(acctExceeded); return }

    onConfirm()
  }

  if (!chars.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center">
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90vh]">

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
          {/* 계정당 골드 캐릭터 수 */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">골드 캐릭터</span>
            <div className="flex gap-0.5">
              {Array.from({ length: GOLD_CHAR_LIMIT }).map((_, i) => (
                <div key={i} className={`h-1.5 w-3 rounded-full transition-colors ${
                  acctGoldCharCount > GOLD_CHAR_LIMIT ? 'bg-red-400' : i < acctGoldCharCount ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                }`} />
              ))}
            </div>
            <span className={`text-[11px] ns-bold transition-colors ${
              acctGoldCharCount > GOLD_CHAR_LIMIT ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}>{acctGoldCharCount}/{GOLD_CHAR_LIMIT}</span>
          </div>
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
                                    : !canToggle ? `계정 골드 캐릭터 ${GOLD_CHAR_LIMIT}개 초과`
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
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
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
            <div className="px-5 pt-6 pb-4">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-900/20 mx-auto mb-3">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-rose-400">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                  <line x1="12" y1="9" x2="12" y2="13"/>
                  <line x1="12" y1="17" x2="12.01" y2="17"/>
                </svg>
              </div>
              <p className="text-sm ns-bold text-gray-900 dark:text-white text-center mb-1">골드 캐릭터 초과</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-5">
                계정당 골드 수령 캐릭터는 최대 {GOLD_CHAR_LIMIT}개입니다
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

// ── API 키 발급 가이드 모달 ────────────────────────────────────────────────────
function ApiKeyGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/30">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">API 키 발급 가이드</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-200 text-yellow-900 text-[11px] ns-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">포털 접속 및 로그인</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  <a href="https://developer-lostark.game.onstove.com/clients" target="_blank" rel="noreferrer"
                    className="text-yellow-500 dark:text-yellow-400 underline underline-offset-2 hover:text-yellow-600">
                    로스트아크 개발자 포털
                  </a>
                  에 접속해 스토브(Stove) 계정으로 로그인 후{' '}
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CREATE A NEW CLIENT</span> 버튼을 클릭하여 클라이언트 생성 페이지로 이동합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-200 text-yellow-900 text-[11px] ns-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">클라이언트 생성</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CLIENT NAME</span> 항목을 작성하고 이용약관을 체크한 뒤{' '}
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CREATE</span> 버튼을 클릭하여 클라이언트를 생성합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-200 text-yellow-900 text-[11px] ns-bold flex items-center justify-center">3</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">API 키 입력</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  생성된 API 키를 복사하여 입력합니다.
                </p>
              </div>
            </li>
          </ol>

          <div className="flex gap-2 rounded bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-3">
            <span className="text-blue-400 flex-shrink-0 mt-0.5"><IconInfo /></span>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              API 키는 브라우저에 저장되며 타인과 공유하지 마세요. 분당 100회 호출 제한이 있습니다.
            </p>
          </div>
        </div>

        <div className="px-5 pb-5">
          <button onClick={onClose}
            className="w-full rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 캐릭터 설정 모달 ──────────────────────────────────────────────────────────
function CharacterEditModal({ chars, raids, onAdd, onDelete, onClose, onReorder, initialShowAdd = false, isDemo = false, onLoginRequired }) {
  const [showAddChar,      setShowAddChar]      = useState(initialShowAdd)
  const [selectedIds,      setSelectedIds]      = useState(new Set())
  const [showBatchConfirm, setShowBatchConfirm] = useState(false)

  // ── 로컬 순서 (드래그 전용) ────────────────────────────────────────────────
  const [localChars, setLocalChars] = useState(chars)
  // chars prop 변경(추가·삭제)시 동기화
  useEffect(() => {
    setLocalChars(prev => {
      const existingIds = new Set(chars.map(c => c.id))
      // 삭제된 항목 제거, 추가된 항목 병합
      const filtered = prev.filter(c => existingIds.has(c.id))
      const newOnes  = chars.filter(c => !prev.find(p => p.id === c.id))
      return [...filtered, ...newOnes]
    })
  }, [chars])

  // ── DnD 상태 ───────────────────────────────────────────────────────────────
  const [dragId,   setDragId]   = useState(null) // 드래그 중인 id
  const [overId,   setOverId]   = useState(null) // 현재 호버된 id
  const [dragDir,  setDragDir]  = useState(null) // 'up' | 'down' — 삽입선 위치
  const dragIdxRef = useRef(null)

  const handleDragStart = (e, id) => {
    setDragId(id)
    dragIdxRef.current = localChars.findIndex(c => c.id === id)
    e.dataTransfer.effectAllowed = 'move'
    // 커스텀 ghost: 행 자체를 복제해 살짝 키운 카드로
    const row = e.currentTarget.closest('[data-charid]')
    if (row) {
      const ghost = row.cloneNode(true)
      ghost.style.cssText = `
        position:fixed; top:-9999px; left:-9999px;
        width:${row.offsetWidth}px; opacity:1;
        border-radius:10px; overflow:hidden;
        box-shadow:0 20px 60px rgba(0,0,0,0.25),0 4px 16px rgba(0,0,0,0.15);
        border:2px solid rgb(250,204,21);
        pointer-events:none; transform:scale(1.03);
      `
      document.body.appendChild(ghost)
      e.dataTransfer.setDragImage(ghost, row.offsetWidth / 2, row.offsetHeight / 2)
      setTimeout(() => ghost.remove(), 0)
    }
  }

  const handleDragOver = (e, id) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (id === dragId) { setOverId(null); return }
    const overIdx = localChars.findIndex(c => c.id === id)
    const dir = overIdx < dragIdxRef.current ? 'up' : 'down'
    setOverId(id)
    setDragDir(dir)
  }

  const handleDrop = (e, id) => {
    e.preventDefault()
    if (!dragId || dragId === id) return
    setLocalChars(prev => {
      const arr     = [...prev]
      const fromIdx = arr.findIndex(c => c.id === dragId)
      const toIdx   = arr.findIndex(c => c.id === id)
      const [item]  = arr.splice(fromIdx, 1)
      arr.splice(toIdx, 0, item)
      onReorder(arr)
      return arr
    })
  }

  const handleDragEnd = () => {
    setDragId(null); setOverId(null); setDragDir(null)
    dragIdxRef.current = null
  }

  // ── 선택·삭제 ──────────────────────────────────────────────────────────────
  const allSelected  = localChars.length > 0 && selectedIds.size === localChars.length
  const someSelected = selectedIds.size > 0 && selectedIds.size < localChars.length

  const toggleSelect = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAll = () => {
    setSelectedIds(selectedIds.size === localChars.length ? new Set() : new Set(localChars.map(c => c.id)))
  }
  const handleBatchDelete = () => {
    selectedIds.forEach(id => onDelete(id))
    setSelectedIds(new Set())
    setShowBatchConfirm(false)
  }

  const handleAdd = (newChars, apiKey, raidsByName) => {
    onAdd(newChars, apiKey, raidsByName)
    onClose()
  }

  if (showAddChar) {
    return (
      <CharacterAddModal
        existingNames={new Set(chars.map(c => c.name))}
        onAdd={handleAdd}
        onClose={() => setShowAddChar(false)}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[80vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <div className="flex items-center gap-2.5">
            {localChars.length > 0 && (
              <div
                onClick={toggleAll}
                className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center cursor-pointer transition-all ${
                  allSelected || someSelected
                    ? 'bg-yellow-400 border-yellow-400'
                    : 'border-gray-300 dark:border-[#555] hover:border-yellow-400'
                }`}
              >
                {allSelected && <IconCheck />}
                {someSelected && (
                  <svg width="8" height="2" viewBox="0 0 8 2" fill="currentColor" className="text-yellow-900">
                    <rect width="8" height="2" rx="1"/>
                  </svg>
                )}
              </div>
            )}
            <span className="ns-bold text-gray-900 dark:text-white">캐릭터 설정</span>
            {selectedIds.size > 0 && (
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{selectedIds.size}개 선택</span>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-xl leading-none">×</button>
        </div>

        {/* 캐릭터 목록 */}
        <div className="overflow-y-auto flex-1 px-3 py-3 space-y-1.5" onDragOver={e => e.preventDefault()}>
          {localChars.length === 0 && (
            <p className="text-center text-sm text-gray-400 dark:text-gray-500 py-10">등록된 캐릭터가 없습니다</p>
          )}
          {localChars.map(char => {
            const isSelected  = selectedIds.has(char.id)
            const hasRaids    = (raids[char.id] || []).length > 0
            const isDragging  = dragId === char.id
            const isOver      = overId === char.id
            return (
              <div key={char.id} className="relative">
                {/* 삽입 인디케이터 — 위 */}
                {isOver && dragDir === 'up' && (
                  <div className="absolute -top-[3px] left-0 right-0 h-[3px] rounded-full bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.5)] z-10 pointer-events-none" />
                )}

                <div
                  data-charid={char.id}
                  draggable
                  onDragStart={e => handleDragStart(e, char.id)}
                  onDragOver={e => handleDragOver(e, char.id)}
                  onDrop={e => handleDrop(e, char.id)}
                  onDragEnd={handleDragEnd}
                  onClick={() => !dragId && toggleSelect(char.id)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg border select-none transition-all duration-150 ${
                    isDragging
                      ? 'opacity-30 scale-[0.98] border-dashed border-yellow-300 dark:border-yellow-700 bg-yellow-50 dark:bg-yellow-900/10'
                      : isSelected
                        ? 'border-yellow-400/60 dark:border-yellow-600/40 bg-yellow-50 dark:bg-yellow-900/10 cursor-pointer hover:border-yellow-400'
                        : 'border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] cursor-pointer hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                  }`}
                  style={isOver ? { boxShadow: 'none' } : {}}
                >
                  {/* 드래그 핸들 */}
                  <span className="text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-default touch-none">
                    <IconGrip />
                  </span>

                  {/* 체크박스 */}
                  <div className={`w-4 h-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                    isSelected
                      ? 'bg-yellow-400 border-yellow-400'
                      : 'border-gray-300 dark:border-[#555]'
                  }`}>
                    {isSelected && <IconCheck />}
                  </div>

                  {/* 클래스 아이콘 */}
                  {(() => { const icon = getClassIcon(char.class); return icon
                    ? <img src={icon} alt={char.class} className="class-icon w-6 h-6 object-contain flex-shrink-0" />
                    : <span className="w-6 h-6 flex-shrink-0" />
                  })()}

                  {/* 이름 + 메타 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                      {!hasRaids && (
                        <span className="text-[9px] ns-bold px-1 py-0.5 rounded bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 flex-shrink-0">
                          레이드 미설정
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 truncate">
                      {char.class} · {char.itemLevel?.toFixed(2)}
                    </p>
                  </div>
                </div>

                {/* 삽입 인디케이터 — 아래 */}
                {isOver && dragDir === 'down' && (
                  <div className="absolute -bottom-[3px] left-0 right-0 h-[3px] rounded-full bg-yellow-400 shadow-[0_0_8px_2px_rgba(250,204,21,0.5)] z-10 pointer-events-none" />
                )}
              </div>
            )
          })}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-[#383838] flex-shrink-0">
          {showBatchConfirm ? (
            <div className="flex items-center gap-2">
              <span className="flex-1 text-[13px] ns-bold text-red-500 dark:text-red-400">
                {selectedIds.size}개를 삭제할까요?
              </span>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 rounded bg-red-500 hover:bg-red-600 text-white text-[12px] ns-bold transition-colors">
                삭제
              </button>
              <button
                onClick={() => setShowBatchConfirm(false)}
                className="px-3 py-1.5 rounded border border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 text-[12px] hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                취소
              </button>
            </div>
          ) : selectedIds.size > 0 ? (
            <div className="flex gap-2">
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                선택 취소
              </button>
              <button
                onClick={() => setShowBatchConfirm(true)}
                className="flex-1 rounded bg-red-500 hover:bg-red-600 py-2 text-sm ns-bold text-white transition-colors">
                삭제 ({selectedIds.size}개)
              </button>
            </div>
          ) : (
            /* 기본 */
            <div className="flex gap-2">
              <button
                onClick={() => isDemo ? onLoginRequired?.() : setShowAddChar(true)}
                className="flex-1 flex items-center justify-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                <IconPlus size={12} /> 캐릭터 추가
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
                완료
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 캐릭터 추가 모달 ──────────────────────────────────────────────────────────
const LOA_KEY_STORAGE = 'myloa_api_key'

const DIFF_LABEL = { nightmare: '나메', hard: '하드', normal: '노말', stage3: '3단계', stage2: '2단계', stage1: '1단계' }
const DIFF_COLOR  = {
  nightmare: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  hard:      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  normal:    'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400',
  stage3:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  stage2:    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  stage1:    'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400',
}

function CharacterAddModal({ existingNames, onAdd, onClose }) {
  const [charName,    setCharName]    = useState('')
  const [apiKey,      setApiKey]      = useState('')
  const [keySaved,    setKeySaved]    = useState(false)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState('')
  const [results,     setResults]     = useState(null)
  const [selected,    setSelected]    = useState(new Set())
  const [showGuide,   setShowGuide]   = useState(false)
  const [step,        setStep]        = useState('search') // 'search' | 'choose' | 'setup'
  const [strategies,  setStrategies]  = useState({})      // { [name]: 'trade'|'bound' }

  useEffect(() => {
    const saved = localStorage.getItem(LOA_KEY_STORAGE)
    if (saved) { setApiKey(saved); setKeySaved(true) }
  }, [])

  const search = async () => {
    if (!charName.trim()) return setError('캐릭터명을 입력하세요')
    if (!apiKey.trim())   return setError('API 키를 입력하세요')
    setLoading(true); setError(''); setResults(null); setSelected(new Set())
    try {
      const res  = await fetch(`/api/loa?characterName=${encodeURIComponent(charName.trim())}&apiKey=${encodeURIComponent(apiKey.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '알 수 없는 오류')
      localStorage.setItem(LOA_KEY_STORAGE, apiKey.trim())
      setKeySaved(true)
      setResults(data)
      setSelected(new Set())
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (name) =>
    setSelected(prev => { const n = new Set(prev); n.has(name) ? n.delete(name) : n.add(name); return n })

  // 선택된 캐릭터 (아이템레벨 내림차순)
  const selectedChars = useMemo(() =>
    (results || []).filter(c => selected.has(c.name)).sort((a, b) => b.itemLevel - a.itemLevel),
    [results, selected]
  )

  // 캐릭터별 레이드 자동 배정 미리보기
  const raidsByName = useMemo(() => {
    const map = {}
    selectedChars.forEach((char, idx) => {
      const strategy = strategies[char.name] || 'trade'
      const normal   = autoSelectNormalRaids(char, strategy)
      const entries  = [...normal]
      if (idx === 0) { const ex = autoSelectExRaid(char); if (ex) entries.unshift(ex) }
      map[char.name] = entries
    })
    return map
  }, [selectedChars, strategies])

  const goChoose = () => {
    const init = {}
    selectedChars.forEach(c => { init[c.name] = strategies[c.name] || 'trade' })
    setStrategies(init)
    setStep('choose')
  }

  const handleConfirm = () => {
    onAdd(selectedChars, apiKey.trim(), raidsByName)
    onClose()
  }

  const handleManualSetup = () => {
    onAdd(selectedChars, apiKey.trim(), {})
    onClose()
  }

  const newCount = results ? results.filter(c => selected.has(c.name)).length : 0

  // ── 스텝 2: 레이드 설정 방식 선택 ──────────────────────────────────────────
  if (step === 'choose') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
            <div className="flex items-center gap-2">
              <button onClick={() => setStep('search')} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6"/>
                </svg>
              </button>
              <div>
                <span className="ns-bold text-gray-900 dark:text-white">레이드 설정</span>
                <span className="ml-2 text-xs text-gray-400">설정 방식을 선택하세요</span>
              </div>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* 선택 카드 */}
          <div className="px-5 py-5 space-y-3">
            {/* 자동 설정 */}
            <button onClick={() => setStep('setup')}
              className="w-full flex items-start gap-4 rounded-lg border border-gray-200 dark:border-[#383838] px-4 py-4 text-left hover:border-yellow-400 hover:bg-yellow-50 dark:hover:border-[#666] dark:hover:bg-yellow-900/10 transition-colors group">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-500">
                  <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors">레이드 자동 설정</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">캐릭터별 골드 전략을 선택해 레이드를 자동으로 배정합니다</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 dark:text-gray-600 mt-1 flex-shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>

            {/* 직접 설정 */}
            <button onClick={handleManualSetup}
              className="w-full flex items-start gap-4 rounded-lg border border-gray-200 dark:border-[#383838] px-4 py-4 text-left hover:border-yellow-400 hover:bg-yellow-50 dark:hover:border-[#666] dark:hover:bg-yellow-900/10 transition-colors group">
              <div className="mt-0.5 flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 dark:text-gray-400">
                  <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100 group-hover:text-yellow-700 dark:group-hover:text-yellow-400 transition-colors">레이드 직접 설정</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">레이드 설정 모달에서 캐릭터별로 직접 레이드를 추가합니다</p>
              </div>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 dark:text-gray-600 mt-1 flex-shrink-0">
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 스텝 3: 레이드 자동 설정 ──────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[88vh]">
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
            <div>
              <span className="ns-bold text-gray-900 dark:text-white">레이드 자동 설정</span>
              <span className="ml-2 text-xs text-gray-400">캐릭터별 골드 전략을 선택하세요.</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
          </div>

          {/* 캐릭터별 미리보기 */}
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {selectedChars.map((char, idx) => {
              const isRep     = idx === 0
              const strategy  = strategies[char.name] || 'trade'
              const entries   = raidsByName[char.name] || []
              return (
                <div key={char.name} className="rounded-lg border border-gray-200 dark:border-[#383838] overflow-hidden">
                  {/* 캐릭터 헤더 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#181818] border-b border-gray-100 dark:border-[#2a2a2a]">
                    {getClassIcon(char.class) && <img src={getClassIcon(char.class)} alt={char.class} className="class-icon w-5 h-5 object-contain flex-shrink-0" />}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                    <span className="text-[10px] text-gray-400 flex-shrink-0">{char.itemLevel.toFixed(2)}</span>
                    {isRep && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-yellow-400 dark:text-yellow-500">
                        <path d="M2 19h20v2H2v-2zm2-2l2-9 4 4 2-7 2 7 4-4 2 9H4z"/>
                      </svg>
                    )}
                    <span className="flex-1" />
                    {/* 전략 토글 */}
                    <div className="flex items-center gap-0.5 ml-1 rounded-md border border-gray-200 dark:border-[#383838] overflow-hidden flex-shrink-0">
                      {[['trade','거래골드 우선'],['bound','전체골드 우선']].map(([key, label]) => (
                        <button key={key}
                          onClick={() => setStrategies(prev => ({ ...prev, [char.name]: key }))}
                          className={`px-2 py-1 text-[10px] ns-bold transition-colors
                            ${strategy === key
                              ? 'bg-yellow-200 dark:bg-[#2e2e2e] text-yellow-800 dark:text-gray-200'
                              : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}>
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {/* 레이드 목록 */}
                  <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                    {entries.length === 0 ? (
                      <p className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-600">
                        아이템레벨이 낮아 배정 가능한 레이드가 없습니다
                      </p>
                    ) : entries.map((entry, i) => {
                      const raid = RAIDS.find(r => r.id === entry.raidId)
                      const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                      if (!raid || !diff) return null
                      const allGates  = new Array(diff.gates).fill(true)
                      const goldBound = calcGoldBound(diff, allGates)
                      const goldTrade = calcGoldTrade(diff, allGates)
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2">
                          <span className={`text-[8px] ns-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DIFF_COLOR[entry.difficulty]}`}>
                            {DIFF_LABEL[entry.difficulty]}
                          </span>
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{raid.name}</span>
                          <div className="flex items-center gap-2 text-[10px] tabular-nums text-gray-400 flex-shrink-0">
                            {goldBound > 0 && <span className="text-orange-500 dark:text-orange-400">귀속 {goldBound.toLocaleString()}</span>}
                            {goldTrade > 0 && <span className="text-blue-500 dark:text-blue-400">거래 {goldTrade.toLocaleString()}</span>}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {/* 푸터 */}
          <div className="px-5 py-4 border-t border-gray-100 dark:border-[#383838] flex-shrink-0 flex gap-2">
            <button onClick={() => setStep('search')}
              className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
              이전
            </button>
            <button onClick={handleConfirm}
              className="flex-1 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
              {selectedChars.length}개 캐릭터 추가
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ── 스텝 1: 캐릭터 검색 ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">캐릭터 추가</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">캐릭터명</label>
            <input
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={charName} onChange={e => setCharName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="보유 캐릭터명 아무거나 입력" autoFocus
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                로스트아크 API 키
                {keySaved && (
                  <span className="inline-flex items-center gap-1 text-[10px] ns-bold text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-1.5 py-0.5 rounded">
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>
                    저장됨
                  </span>
                )}
              </label>
              <button type="button" onClick={() => setShowGuide(true)}
                className="text-xs text-yellow-500 dark:text-yellow-400 ns-light px-2 py-0.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                발급 가이드
              </button>
            </div>
            <input
              type="text"
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm font-mono bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={apiKey} onChange={e => { setApiKey(e.target.value); setKeySaved(false) }}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <button onClick={search} disabled={loading}
            className="w-full rounded border border-gray-200 dark:border-[#383838] py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
            {loading ? (
              <><svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>검색 중…</>
            ) : '원정대 캐릭터 검색'}
          </button>
        </div>

        {results !== null && (
          <div className="px-5 pt-3 pb-1">
            {(() => {
              const selectables = results.filter(c => !existingNames.has(c.name))
              const allSelected = selectables.length > 0 && selectables.every(c => selected.has(c.name))
              const top6Names   = [...selectables].sort((a, b) => b.itemLevel - a.itemLevel).slice(0, 6).map(c => c.name)
              return (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">원정대 캐릭터 {results.length}개</p>
                  <div className="flex items-center gap-1">
                    {/* 자동선택 */}
                    <div className="relative group inline-flex items-center">
                      <button
                        onClick={() => setSelected(new Set(top6Names))}
                        className="text-[10px] ns-bold text-yellow-500 dark:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors whitespace-nowrap">
                        자동선택
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-yellow-200 text-yellow-900 text-[10px] ns-bold rounded px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                          아이템 레벨 높은 6개 캐릭터가 선택됩니다.
                        </div>
                        <div className="w-2 h-2 bg-yellow-200 rotate-45 mx-auto -mt-1" />
                      </div>
                    </div>
                    {/* 전체선택 / 전체해제 */}
                    <button
                      onClick={() => allSelected
                        ? setSelected(new Set())
                        : setSelected(new Set(selectables.map(c => c.name)))
                      }
                      className="text-[10px] ns-bold text-yellow-500 dark:text-yellow-400 px-1.5 py-0.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors whitespace-nowrap">
                      {allSelected ? '전체해제' : '전체선택'}
                    </button>
                  </div>
                </div>
              )
            })()}
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {results.map(c => {
                const already = existingNames.has(c.name)
                const checked = selected.has(c.name)
                const ilvlColor = c.itemLevel >= 1660 ? 'text-orange-500' : c.itemLevel >= 1640 ? 'text-yellow-500' : c.itemLevel >= 1620 ? 'text-green-500' : 'text-gray-400'
                return (
                  <label key={c.name}
                    className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors
                      ${already ? 'border-gray-100 dark:border-[#2a2a2a] opacity-40 cursor-not-allowed'
                        : checked ? 'border-yellow-400/60 bg-yellow-50/50 dark:bg-yellow-900/10'
                        : 'border-gray-200 dark:border-[#383838] hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    <input type="checkbox" checked={checked} disabled={already}
                      onChange={() => !already && toggleSelect(c.name)}
                      className="accent-yellow-500 w-3.5 h-3.5 flex-shrink-0"/>
                    {(() => { const icon = getClassIcon(c.class); return icon
                      ? <img src={icon} alt={c.class} title={c.class} className="class-icon w-5 h-5 flex-shrink-0 object-contain" />
                      : <span className={`text-[10px] px-1.5 py-0.5 rounded ns-bold leading-tight flex-shrink-0 ${CLASS_COLOR[c.class] || 'bg-gray-100 text-gray-600'}`}>{c.class}</span>
                    })()}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">{c.name}</span>
                    <span className="w-[34px] text-[10px] text-gray-400 text-right flex-shrink-0">
                      {already ? '추가됨' : ''}
                    </span>
                    <div className={`flex items-center gap-1 flex-shrink-0 ${ilvlColor}`}>
                      <span className="opacity-60"><IconItemLevel /></span>
                      <span className="w-[48px] text-[11px] ns-bold text-right">{c.itemLevel.toFixed(2)}</span>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#383838] mt-3">
          <button onClick={onClose}
            className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">취소</button>
          <button onClick={goChoose} disabled={newCount === 0}
            className="flex-1 rounded bg-yellow-200 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-yellow-900 transition-colors">
            {newCount > 0 ? `${newCount}개 선택` : '추가'}
          </button>
        </div>
      </div>
      {showGuide && <ApiKeyGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}

// ── 자동 설정 헬퍼 ────────────────────────────────────────────────────────────
function autoSelectNormalRaids(char, strategy) {
  const eligible = RAIDS
    .filter(r => !HIDDEN_RAID_IDS.has(r.id) && !EX_RAID_IDS.has(r.id))
    .flatMap(raid => {
      const bestDiff = [...raid.difficulties]
        .sort((a, b) => b.minItemLevel - a.minItemLevel)
        .find(d => char.itemLevel >= d.minItemLevel)
      if (!bestDiff) return []
      const allGates  = new Array(bestDiff.gates).fill(true)
      const goldTrade = calcGoldTrade(bestDiff, allGates)
      const goldBound = calcGoldBound(bestDiff, allGates)
      return [{ raid, diff: bestDiff, goldTrade, totalGold: goldTrade + goldBound }]
    })

  const sorted = [...eligible].sort((a, b) =>
    strategy === 'trade' ? b.goldTrade - a.goldTrade : b.totalGold - a.totalGold
  )

  return sorted.slice(0, 3).map(({ raid, diff }) => ({
    raidId: raid.id, difficulty: diff.key,
    gateClears: new Array(diff.gates).fill(false),
    isGoldCheck: true, moreDone: false, moreFrom: 'bound',
  }))
}

function autoSelectExRaid(char) {
  const exRaid = RAIDS.find(r => r.id === 'egir-ex')
  if (!exRaid) return null
  const bestDiff = [...exRaid.difficulties]
    .sort((a, b) => b.minItemLevel - a.minItemLevel)
    .find(d => char.itemLevel >= d.minItemLevel)
  if (!bestDiff) return null
  return {
    raidId: exRaid.id, difficulty: bestDiff.key,
    gateClears: new Array(bestDiff.gates).fill(false),
    isGoldCheck: true, moreDone: false, moreFrom: 'bound',
  }
}

function buildAutoRaids(chars, strategy) {
  const raidsByName = {}
  chars.forEach((char, idx) => {
    const entries = autoSelectNormalRaids(char, strategy)
    if (idx === 0) {
      const ex = autoSelectExRaid(char)
      if (ex) entries.push(ex)
    }
    raidsByName[char.name] = entries
  })
  return raidsByName
}

// ── 자동 설정 모달 ────────────────────────────────────────────────────────────
function AutoSetupModal({ onApply, onClose, existingRaids, existingChars }) {
  const [charName,  setCharName]  = useState('')
  const [apiKey,    setApiKey]    = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(LOA_KEY_STORAGE) || '' : ''))
  const [keySaved,  setKeySaved]  = useState(() => !!(typeof window !== 'undefined' && localStorage.getItem(LOA_KEY_STORAGE)))
  const [strategy,  setStrategy]  = useState('trade') // 'trade' | 'total'
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [previewBase, setPreviewBase] = useState(null) // { chars, apiKey }
  const [confirm,     setConfirm]     = useState(false)

  // strategy 변경 시 raidsByName 자동 재계산
  const preview = useMemo(() =>
    previewBase ? { ...previewBase, raidsByName: buildAutoRaids(previewBase.chars, strategy) } : null,
    [previewBase, strategy]
  )

  const search = async () => {
    if (!charName.trim()) return setError('캐릭터명을 입력하세요')
    if (!apiKey.trim()) return setError('API 키를 입력하세요')
    setLoading(true); setError('')
    try {
      const res  = await fetch(`/api/loa?characterName=${encodeURIComponent(charName.trim())}&apiKey=${encodeURIComponent(apiKey.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '오류 발생')
      const top6 = [...data].sort((a, b) => b.itemLevel - a.itemLevel).slice(0, 6)
      if (top6.length === 0) throw new Error('캐릭터를 찾을 수 없습니다')
      localStorage.setItem(LOA_KEY_STORAGE, apiKey.trim())
      setKeySaved(true)
      setPreviewBase({ chars: top6, apiKey: apiKey.trim() })
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const hasExistingSetup = (() => {
    if (!preview) return false
    const previewNames = new Set(preview.chars.map(c => c.name))
    // 미리보기 캐릭터 중 이미 레이드가 설정된 캐릭터가 있는지 확인
    return existingChars.some(c => previewNames.has(c.name) && (existingRaids[c.id]?.length > 0))
      || Object.values(existingRaids).some(r => r.length > 0)
  })()

  const handleApply = () => {
    if (hasExistingSetup && !confirm) {
      setConfirm(true)
      return
    }
    onApply(preview.chars, preview.raidsByName, preview.apiKey)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <div>
            <span className="ns-bold text-gray-900 dark:text-gray-100">자동 설정</span>
            <span className="ml-2 text-xs text-gray-400">원정대 상위 6캐릭터를 자동으로 세팅합니다</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 설정 입력 */}
        <div className="px-5 pt-4 pb-3 border-b border-gray-100 dark:border-[#383838] flex-shrink-0 space-y-3">
          {/* API 키 */}
          <div className="flex gap-2 items-center">
            <input
              type="text"
              className="flex-1 rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm font-mono bg-white dark:bg-[#1a1a1a] dark:text-gray-200 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
              value={apiKey} onChange={e => { setApiKey(e.target.value); setKeySaved(false) }}
              placeholder="Lost Ark API 키"
            />
            {keySaved && (
              <span className="flex-shrink-0 text-[11px] ns-bold text-green-600 dark:text-green-400 whitespace-nowrap">저장됨 ✓</span>
            )}
          </div>
          {/* 캐릭터 검색 */}
          <div className="flex gap-2">
            <input
              className="flex-1 rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#1a1a1a] dark:text-gray-200 outline-none focus:border-gray-400 dark:focus:border-gray-500 transition-colors"
              value={charName} onChange={e => setCharName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="원정대 캐릭터명 입력" autoFocus
            />
            <button onClick={search} disabled={loading}
              className="flex-shrink-0 flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-4 py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors">
              {loading
                ? <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
                : <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              }
              검색
            </button>
          </div>

          {/* 골드 우선순위 */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400 ns-bold flex-shrink-0">우선순위</span>
            <div className="flex gap-1.5">
              {[
                { key: 'trade', label: '거래 골드 우선', desc: '거래 가능 골드가 높은 레이드' },
                { key: 'total', label: '총 골드 우선',   desc: '귀속 + 거래 골드가 높은 레이드' },
              ].map(opt => (
                <button key={opt.key} onClick={() => setStrategy(opt.key)} title={opt.desc}
                  className={`px-3 py-1 rounded-full text-xs ns-bold transition-colors ${
                    strategy === opt.key
                      ? 'bg-gray-800 dark:bg-gray-200 text-white dark:text-gray-900'
                      : 'border border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                  }`}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}
        </div>

        {/* 미리보기 */}
        {preview && (
          <div className="overflow-y-auto flex-1 px-5 py-3 space-y-2">
            <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2">
              상위 {preview.chars.length}캐릭터 자동 배정 미리보기
            </p>
            {preview.chars.map((char, idx) => {
              const entries = preview.raidsByName[char.name] || []
              return (
                <div key={char.name} className="rounded-lg border border-gray-200 dark:border-[#383838] overflow-hidden">
                  {/* 캐릭터 헤더 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-[#383838]">
                    {idx === 0 && (
                      <span className="text-[9px] ns-bold px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-gray-700 text-yellow-700 dark:text-gray-300">최고레벨</span>
                    )}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-200">{char.name}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500">{char.itemLevel.toFixed(2)}</span>
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500">{entries.length}개 레이드</span>
                  </div>
                  {/* 레이드 목록 */}
                  <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                    {entries.map(entry => {
                      const raid = RAIDS.find(r => r.id === entry.raidId)
                      const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                      if (!raid || !diff) return null
                      const allGates  = new Array(diff.gates).fill(true)
                      const goldTrade = calcGoldTrade(diff, allGates)
                      const goldBound = calcGoldBound(diff, allGates)
                      const totalGold = goldTrade + goldBound
                      const isEx = EX_RAID_IDS.has(entry.raidId)
                      const diffColor =
                        entry.difficulty === 'nightmare' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' :
                        entry.difficulty === 'hard'      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' :
                                                           'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                      return (
                        <div key={entry.raidId} className="flex items-center gap-2 px-3 py-1.5">
                          <span className={`text-[8px] ns-bold px-1.5 py-0.5 rounded-full ${diffColor}`}>{diff.label}</span>
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex-1">{raid.name}</span>
                          <div className="flex items-center gap-2 text-[10px] tabular-nums text-gray-500 dark:text-gray-400">
                            {goldBound > 0 && <span className="text-orange-500 dark:text-orange-400">귀속 {goldBound.toLocaleString()}</span>}
                            {goldTrade > 0 && <span className="text-blue-500 dark:text-blue-400">거래 {goldTrade.toLocaleString()}</span>}
                            <span className="ns-bold text-gray-600 dark:text-gray-300">{totalGold.toLocaleString()}G</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {!preview && !loading && (
          <div className="flex-1 flex items-center justify-center py-12 text-sm text-gray-300 dark:text-gray-600">
            캐릭터명을 검색하면 자동 배정 결과를 미리볼 수 있습니다
          </div>
        )}

        {/* 초기화 경고 확인 단계 */}
        {confirm && (
          <div className="px-5 py-4 border-t border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/10 flex-shrink-0">
            <div className="flex items-start gap-2 mb-3">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-orange-500 flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <div>
                <p className="text-sm ns-bold text-orange-700 dark:text-orange-400">기존 레이드 설정이 초기화됩니다</p>
                <p className="text-xs text-orange-600 dark:text-orange-500 mt-0.5">자동 설정을 적용하면 현재 설정된 모든 레이드 정보가 삭제되고 새로 설정됩니다. 계속하시겠습니까?</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirm(false)}
                className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                돌아가기
              </button>
              <button onClick={() => { onApply(preview.chars, preview.raidsByName, preview.apiKey); onClose() }}
                className="flex-1 rounded bg-orange-500 hover:bg-orange-600 py-1.5 text-sm ns-bold text-white transition-colors">
                초기화 후 적용
              </button>
            </div>
          </div>
        )}

        {/* 푸터 */}
        {!confirm && (
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#383838] flex-shrink-0 flex gap-2">
          <button onClick={onClose}
            className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            취소
          </button>
          <button onClick={handleApply} disabled={!preview}
            className="flex-1 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
            자동 설정 적용
          </button>
        </div>
        )}
      </div>
    </div>
  )
}

// ── 숫자 애니메이션 (촤르륵) ──────────────────────────────────────────────────
function AnimatedGold({ value, className }) {
  const [display, setDisplay] = useState(value)
  const animRef  = useRef(null)
  const prevRef  = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to   = value
    prevRef.current = value
    if (from === to) return
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const DURATION = 350
    const t0 = performance.now()
    const step = (now) => {
      const progress = Math.min((now - t0) / DURATION, 1)
      const eased    = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
  }, [value])

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  return <span className={className}>{display.toLocaleString()}G</span>
}

// ── 캐릭터별 골드 배지 ────────────────────────────────────────────────────────
function CharGoldBadges({ bound, trade }) {
  return (
    <div className="grid gap-x-1 gap-y-0.5 w-full" style={{ gridTemplateColumns: 'auto 1fr' }}>
      <span className="text-[8px] ns-bold px-1 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400 leading-tight">귀속</span>
      <AnimatedGold value={bound} className="text-[9px] ns-bold tabular-nums text-right text-gray-600 dark:text-gray-300 leading-tight self-center" />
      <span className="text-[8px] ns-bold px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400 leading-tight">거래</span>
      <AnimatedGold value={trade} className="text-[9px] ns-bold tabular-nums text-right text-gray-600 dark:text-gray-300 leading-tight self-center" />
    </div>
  )
}

// ── 레이드 셀 ─────────────────────────────────────────────────────────────────
function RaidCell({ entry, diff, onToggle, onToggleMoreFrom }) {
  const allGates  = entry && diff ? new Array(diff.gates).fill(true) : []
  const allDone   = entry ? entry.gateClears.every(Boolean) : false
  const moreDone  = entry ? (entry.moreDone || false) : false
  const moreFrom  = entry ? (entry.moreFrom || 'bound') : 'bound'
  const totalGold = entry && diff ? calcGold(diff, allGates) : 0
  const moreGold  = entry && diff ? calcGoldMore(diff, allGates) : 0

  if (!entry || !diff) {
    return <div className="w-full min-h-[52px] bg-gray-50/50 dark:bg-[#181818]/30 rounded" />
  }

  const diffBadge =
    entry.difficulty === 'nightmare' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400' :
    entry.difficulty === 'hard'      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                                       'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'

  return (
    <div
      onClick={onToggle}
      className={`w-full flex items-center gap-1.5 px-1.5 py-1.5 rounded cursor-pointer transition-colors
        ${moreDone
          ? 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
          : allDone
          ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
        }`}
    >
      {/* 왼쪽: 체크박스 */}
      <div className={`h-[26px] w-[26px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all
        ${moreDone
          ? 'bg-yellow-500 border-yellow-500 text-yellow-900 shadow-sm'
          : allDone
          ? 'bg-yellow-400 border-yellow-400 text-yellow-900 shadow-sm'
          : 'border-gray-200 dark:border-[#383838]'}`}>
        {allDone && <IconCheck />}
      </div>

      {/* 오른쪽: 토글(상단) + 난이도·골드(하단) */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5 items-center">
        {/* 토글 행 — 항상 공간 예약 */}
        <div className={`relative group/morebadge ${moreDone ? '' : 'invisible pointer-events-none'}`}>
          <button
            onClick={(e) => { e.stopPropagation(); onToggleMoreFrom?.() }}
            className="active:scale-95 transition-transform block"
            style={{ WebkitTapHighlightColor: 'transparent' }}
          >
            <div className={`flex items-center rounded-full border transition-colors duration-300 ${
              moreFrom === 'bound'
                ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/40'
                : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40'
            }`} style={{ height: 14, padding: 1.5, gap: 2 }}>
              {moreFrom === 'bound' ? (
                <>
                  <span className="text-[7px] ns-bold select-none leading-none pl-1.5 text-orange-500 dark:text-orange-400 whitespace-nowrap">귀속</span>
                  <div className="flex-shrink-0 rounded-full bg-orange-400 dark:bg-orange-500 shadow" style={{ width: 11, height: 11 }} />
                </>
              ) : (
                <>
                  <div className="flex-shrink-0 rounded-full bg-blue-400 dark:bg-blue-500 shadow" style={{ width: 11, height: 11 }} />
                  <span className="text-[7px] ns-bold select-none leading-none pr-1.5 text-blue-500 dark:text-blue-400 whitespace-nowrap">거래</span>
                </>
              )}
            </div>
          </button>
          {/* 호버 툴팁 */}
          <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/morebadge:block z-50">
            <div className={`whitespace-nowrap rounded-lg border px-2 py-0.5 text-[8px] ns-bold shadow-md ${
              moreFrom === 'bound'
                ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-300'
                : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50 text-sky-600 dark:text-sky-300'
            }`}>
              더보기 -{moreGold.toLocaleString()}G
            </div>
            <div className={`mx-auto w-1.5 h-1.5 rotate-45 border-r border-b -mt-1 ${
              moreFrom === 'bound'
                ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/50'
                : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50'
            }`} />
          </div>
        </div>

        {/* 난이도 + 골드 행 */}
        <div className="flex items-center gap-0.5">
          <span className={`text-[8px] ns-bold px-1 py-0.5 rounded-full leading-none tracking-tight flex-shrink-0 ${diffBadge}`}>
            {diff.label}
          </span>
          <span className={`text-[9px] ns-bold leading-none tabular-nums tracking-tight
            ${moreDone ? 'text-yellow-700 dark:text-yellow-500' : allDone ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}>
            {totalGold.toLocaleString()}G
          </span>
        </div>
      </div>
    </div>
  )
}

// ── 폭죽 애니메이션 ───────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#facc15','#f97316','#ec4899','#8b5cf6','#3b82f6','#10b981','#ef4444','#06b6d4']

function Confetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const pieces = Array.from({ length: 180 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height * -1.5,
      w:    Math.random() * 8 + 4,
      h:    Math.random() * 4 + 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
      vx:   (Math.random() - 0.5) * 2,
      vy:   Math.random() * 3 + 2,
      opacity: 1,
    }))

    let frame
    let elapsed = 0
    const DURATION = 4000
    const start = performance.now()

    const draw = (now) => {
      elapsed = now - start
      const progress = Math.min(elapsed / DURATION, 1)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      pieces.forEach(p => {
        p.x     += p.vx
        p.y     += p.vy
        p.angle += p.spin
        // 후반부에 서서히 사라짐
        p.opacity = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (progress < 1) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 z-[300] pointer-events-none" />
}

// ── 커스텀 숙제 설정 모달 ─────────────────────────────────────────────────────
const CUSTOM_MAX = 10

function CustomSettingsModal({ chars, customItems, onAdd, onDelete, onReorder, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const [input, setInput]             = useState('')
  const [dragIdx, setDragIdx]         = useState(null)
  const [dropIdx, setDropIdx]         = useState(null)
  const inputRef                      = useRef(null)

  const selectedChar  = chars[selectedIdx]
  const charItems     = (selectedChar ? customItems[selectedChar.id] : null) || []
  const charItemNames = new Set(charItems.map(it => it.name))
  const isFull        = charItems.length >= CUSTOM_MAX
  const isDuplicate   = !!input.trim() && charItemNames.has(input.trim())
  const canAdd        = !!input.trim() && !isFull && !isDuplicate

  // 다른 캐릭터에만 있고 이 캐릭터에 없는 고유 이름 목록
  const otherNames = useMemo(() => {
    const seen = new Set(charItemNames)
    const result = []
    chars.forEach(char => {
      if (char.id === selectedChar?.id) return
      ;(customItems[char.id] || []).forEach(it => {
        if (!seen.has(it.name)) { seen.add(it.name); result.push(it.name) }
      })
    })
    return result
  }, [chars, customItems, selectedChar, charItemNames])

  useEffect(() => { inputRef.current?.focus() }, [selectedIdx])

  const handleAdd = () => {
    if (!canAdd || !selectedChar) return
    onAdd(selectedChar.id, input.trim())
    setInput('')
    inputRef.current?.focus()
  }
  const handleAddAll = () => {
    const name = input.trim()
    if (!name) return
    chars.forEach(char => onAdd(char.id, name))
    setInput('')
    inputRef.current?.focus()
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }
  const handleSelectChar = (i) => { setSelectedIdx(i); setInput('') }

  // ── DnD 핸들러 ──
  const handleDragStart = (e, idx) => {
    setDragIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
  }
  const handleDragOver = (e, idx) => {
    e.preventDefault()
    if (idx !== dropIdx) setDropIdx(idx)
  }
  const handleDrop = (e, idx) => {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    const next = [...charItems]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    onReorder(selectedChar.id, next)
    setDragIdx(null); setDropIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDropIdx(null) }

  if (!chars.length) return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/25" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
        <p className="text-sm text-gray-400 dark:text-gray-500">등록된 캐릭터가 없습니다</p>
      </div>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25" onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl overflow-hidden flex flex-col"
        style={{ maxHeight: '80vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a] flex-shrink-0">
          <h2 className="ns-bold text-sm text-gray-800 dark:text-gray-100">커스텀 숙제</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </div>

        {/* 본문 */}
        <div className="flex flex-1 min-h-0">

          {/* ── 좌: 캐릭터 목록 ── */}
          <div className="w-36 flex-shrink-0 border-r border-gray-100 dark:border-[#2a2a2a] overflow-y-auto">
            {chars.map((char, i) => {
              const count    = (customItems[char.id] || []).length
              const icon     = getClassIcon(char.class)
              const isActive = i === selectedIdx
              return (
                <button key={char.id} onClick={() => handleSelectChar(i)}
                  className={`w-full text-left px-3 py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] transition-colors last:border-b-0 ${
                    isActive ? 'bg-yellow-50 dark:bg-yellow-900/10' : 'hover:bg-gray-50 dark:hover:bg-[#282828]'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-0.5">
                    {icon
                      ? <img src={icon} alt="" className="class-icon w-4 h-4 object-contain flex-shrink-0" />
                      : <span className="w-4 h-4 text-gray-300 flex-shrink-0"><IconClass /></span>
                    }
                    <span className={`text-[11px] ns-bold truncate ${isActive ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-200'}`}>
                      {char.name}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 pl-[22px]">
                    <div className="flex gap-px">
                      {Array.from({ length: CUSTOM_MAX }).map((_, di) => (
                        <div key={di} className={`w-1.5 h-1.5 rounded-sm ${di < count ? 'bg-yellow-400 dark:bg-yellow-500' : 'bg-gray-200 dark:bg-[#383838]'}`} />
                      ))}
                    </div>
                    <span className="text-[9px] text-gray-400 dark:text-gray-600 tabular-nums">{count}/{CUSTOM_MAX}</span>
                  </div>
                </button>
              )
            })}
          </div>

          {/* ── 우: 항목 관리 ── */}
          <div className="flex-1 flex flex-col min-h-0">

            {/* 입력 영역 */}
            <div className="px-3 py-3 border-b border-gray-100 dark:border-[#2a2a2a] flex-shrink-0">
              <div className="flex gap-2">
                <div className="flex-1 relative">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => setInput(e.target.value.slice(0, 10))}
                    onKeyDown={handleKeyDown}
                    disabled={isFull}
                    placeholder={isFull ? '최대 10개까지 추가할 수 있어요' : '숙제 이름 입력 (최대 10자)'}
                    className={`w-full rounded-lg border px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-colors disabled:opacity-50 bg-gray-50 dark:bg-[#181818] ${
                      isDuplicate ? 'border-red-300 dark:border-red-700 focus:border-red-400' : 'border-gray-200 dark:border-[#383838] focus:border-yellow-400 dark:focus:border-yellow-600'
                    }`}
                  />
                  {isDuplicate && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-400 whitespace-nowrap">이미 있어요</span>
                  )}
                </div>
                <button onClick={handleAdd} disabled={!canAdd}
                  className="flex items-center gap-1 rounded-lg bg-yellow-400 dark:bg-yellow-500 px-3 py-1.5 text-xs ns-bold text-yellow-900 disabled:opacity-40 hover:bg-yellow-500 dark:hover:bg-yellow-400 transition-colors">
                  <IconPlus size={11} /> 추가
                </button>
                <button onClick={handleAddAll} disabled={!input.trim() || isDuplicate}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors whitespace-nowrap">
                  전체 추가
                </button>
              </div>
            </div>

            {/* 항목 목록 (스크롤) */}
            <div className="flex-1 overflow-y-auto">
              {/* 이 캐릭터의 항목 — 드래그앤드랍 순서 변경 */}
              {charItems.length === 0 && otherNames.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-10 gap-1">
                  <p className="text-xs text-gray-400 dark:text-gray-600">아직 추가된 숙제가 없어요</p>
                  <p className="text-[10px] text-gray-300 dark:text-gray-700">이름을 입력하고 추가해 보세요</p>
                </div>
              ) : (
                <>
                  {charItems.length > 0 && (
                    <ul>
                      {charItems.map((item, idx) => {
                        const isDragging = dragIdx === idx
                        const isOver    = dropIdx === idx && dragIdx !== idx
                        return (
                          <li
                            key={item.id}
                            draggable
                            onDragStart={e => handleDragStart(e, idx)}
                            onDragOver={e => handleDragOver(e, idx)}
                            onDrop={e => handleDrop(e, idx)}
                            onDragEnd={handleDragEnd}
                            className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 group/item select-none transition-colors ${
                              isDragging ? 'opacity-40' : isOver ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                            }`}
                          >
                            <span className="cursor-default text-gray-300 dark:text-gray-600 flex-shrink-0"><IconGrip /></span>
                            <span className="text-[10px] text-gray-300 dark:text-gray-700 w-4 text-center tabular-nums flex-shrink-0">{idx + 1}</span>
                            <span className="flex-1 text-xs ns-bold text-gray-700 dark:text-gray-200">{item.name}</span>
                            <button
                              onClick={() => onDelete(selectedChar.id, item.id)}
                              className="opacity-0 group-hover/item:opacity-100 text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-all flex-shrink-0"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* 다른 캐릭터 항목 — 체크박스로 추가 */}
                  {otherNames.length > 0 && (
                    <div className={charItems.length > 0 ? 'border-t border-gray-100 dark:border-[#2a2a2a]' : ''}>
                      <p className="px-3 py-2 text-[10px] ns-bold text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-[#1c1c1c]">
                        다른 캐릭터 숙제에서 추가
                      </p>
                      <ul>
                        {otherNames.map(name => (
                          <li
                            key={name}
                            onClick={() => !isFull && onAdd(selectedChar.id, name)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 transition-colors ${
                              isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#282828]'
                            }`}
                          >
                            <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#555] flex-shrink-0" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">{name}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-4 py-3 border-t border-gray-100 dark:border-[#2a2a2a] flex justify-end flex-shrink-0">
          <button onClick={onClose} className="rounded-lg bg-gray-100 dark:bg-[#2a2a2a] px-4 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#333] transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── DB 저장 헬퍼 (optimistic — fire & forget) ─────────────────────────────────
function saveRaid(characterId, entry) {
  fetch('/api/homework', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      characterId,
      raidId:      entry.raidId,
      difficulty:  entry.difficulty,
      gateClears:  entry.gateClears,
      isGoldCheck: entry.isGoldCheck,
      moreDone:    entry.moreDone  ?? false,
      moreFrom:    entry.moreFrom  ?? 'bound',
    }),
  }).catch(() => {}) // 실패 시 무시 (optimistic)
}

function deleteRaid(characterId, raidId, difficulty) {
  fetch(`/api/homework?characterId=${characterId}&raidId=${raidId}&difficulty=${difficulty}`, {
    method: 'DELETE',
  }).catch(() => {})
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────
export default function DashboardClient({ initialChars = [], initialRaids = {}, isLoggedIn = false }) {
  const isDemo = !isLoggedIn
  const [chars, setChars] = useState(initialChars)
  const [raids, setRaids] = useState(initialRaids)
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAutoSetup,    setShowAutoSetup]    = useState(false)
  const [showCharEdit,     setShowCharEdit]     = useState(false)
  const [charEditOpenAdd,  setCharEditOpenAdd]  = useState(false)
  const [showNoChar,       setShowNoChar]       = useState(false)
  const [showLoginGuide,   setShowLoginGuide]   = useState(false)
  const [syncing, setSyncing]                   = useState(false)
  const [showConfetti, setShowConfetti]         = useState(false)
  const [exRaidError, setExRaidError]           = useState(null) // { raidName, conflictCharName }
  const [cardView, setCardView]                 = useState(false)
  const [dragCharId, setDragCharId]             = useState(null) // 드래그 중인 캐릭터 id
  const [dropCharId, setDropCharId]             = useState(null) // 드롭 대상 캐릭터 id
  const [selectedRaid, setSelectedRaid]         = useState(null) // { raidId, diffKey } — 레이드 필터
  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const [customItems, setCustomItems]           = useState({})   // {charId: [{id, name}]}
  const [customChecks, setCustomChecks]         = useState({})   // {charId: {itemId: bool}}
  const wasCompleteRef                          = useRef(false)

  // 커스텀 항목 localStorage 동기화
  useEffect(() => {
    try {
      const items = localStorage.getItem('myloa_custom_items')
      if (items) setCustomItems(JSON.parse(items))
      const checks = localStorage.getItem('myloa_custom_checks')
      if (checks) setCustomChecks(JSON.parse(checks))
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('myloa_custom_items', JSON.stringify(customItems)) } catch {}
  }, [customItems])
  useEffect(() => {
    try { localStorage.setItem('myloa_custom_checks', JSON.stringify(customChecks)) } catch {}
  }, [customChecks])

  // 비로그인(데모) 시 DB 저장 스킵 래퍼
  const persistRaid   = (charId, entry)           => { if (isLoggedIn) saveRaid(charId, entry) }
  const persistDelete = (charId, raidId, diffKey) => { if (isLoggedIn) deleteRaid(charId, raidId, diffKey) }

  // 커스텀 항목 CRUD
  const addCustomItem = (charId, name) => {
    setCustomItems(prev => {
      const list = prev[charId] || []
      if (list.length >= CUSTOM_MAX) return prev
      return { ...prev, [charId]: [...list, { id: `c-${Date.now()}`, name }] }
    })
  }
  const deleteCustomItem = (charId, itemId) => {
    setCustomItems(prev => ({ ...prev, [charId]: (prev[charId] || []).filter(it => it.id !== itemId) }))
    setCustomChecks(prev => {
      const { [itemId]: _, ...rest } = prev[charId] || {}
      return { ...prev, [charId]: rest }
    })
  }
  const reorderCustomItems = (charId, newItems) => {
    setCustomItems(prev => ({ ...prev, [charId]: newItems }))
  }
  const toggleCustomCheck = (charId, itemId) => {
    setCustomChecks(prev => {
      const charChecks = prev[charId] || {}
      return { ...prev, [charId]: { ...charChecks, [itemId]: !charChecks[itemId] } }
    })
  }

  // 대표 캐릭터 = 아이템레벨 최고
  const repCharId = useMemo(
    () => chars.length === 0 ? null : chars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b).id,
    [chars]
  )

  // ── 레이드 필터 — 전체 캐릭터에 등록된 고유 레이드 목록 ─────────────────────
  const allRegisteredRaids = useMemo(() => {
    const seen = new Map()
    for (const char of chars) {
      for (const r of (raids[char.id] || [])) {
        if (HIDDEN_RAID_IDS.has(r.raidId)) continue
        const key = `${r.raidId}:${r.difficulty}`
        if (!seen.has(key)) {
          const raidDef = RAIDS.find(x => x.id === r.raidId)
          const diffDef = raidDef?.difficulties.find(x => x.key === r.difficulty)
          seen.set(key, {
            raidId:    r.raidId,
            diffKey:   r.difficulty,
            raidName:  raidDef?.name   ?? r.raidId,
            diffLabel: diffDef?.label  ?? r.difficulty,
            gates:     diffDef?.gates  ?? 0,
            incomplete: 0,
          })
        }
        const clears = r.gateClears
        if (!Array.isArray(clears) || !clears.every(Boolean)) seen.get(key).incomplete++
      }
    }
    return [...seen.values()].sort((a, b) =>
      RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId)
    )
  }, [chars, raids])

  // 선택된 레이드에서 미완료 캐릭터 목록
  const raidIncompleteChars = useMemo(() => {
    if (!selectedRaid) return []
    return chars.flatMap(char => {
      const entry = (raids[char.id] || []).find(
        r => r.raidId === selectedRaid.raidId && r.difficulty === selectedRaid.diffKey
      )
      if (!entry) return []
      const clears = Array.isArray(entry.gateClears) ? entry.gateClears : []
      if (clears.every(Boolean)) return [] // 전부 완료
      return [{ char, gateClears: clears }]
    })
  }, [selectedRaid, chars, raids])

  // 캐릭터가 있다가 0이 되면 빈 상태 모달 자동 표시 (초기 0은 제외)
  const hadCharsRef = useRef(initialChars.length > 0)
  useEffect(() => {
    if (isDemo) return
    if (chars.length > 0) { hadCharsRef.current = true; return }
    if (hadCharsRef.current && !showCharEdit) setShowNoChar(true)
  }, [chars.length, showCharEdit, isDemo])

  // 캐릭터별 레이드 토글 (설정 모달에서 사용) — 레이드당 난이도 하나만 허용
  const toggleCharRaid = (charId, raidId, diffKey) => {
    // EX 레이드: 같은 계정에서 캐릭터 하나만 선택 가능
    if (EX_RAID_IDS.has(raidId)) {
      const currentChar = chars.find(c => c.id === charId)
      const alreadyHas = (raids[charId] || []).some(e => e.raidId === raidId)
      if (!alreadyHas && currentChar) {
        const accountKey = currentChar.loaAccountId || currentChar.account
        const conflict = chars.find(c => {
          if (c.id === charId) return false
          const cKey = c.loaAccountId || c.account
          return cKey === accountKey && (raids[c.id] || []).some(e => e.raidId === raidId)
        })
        if (conflict) {
          const raidName = RAIDS.find(r => r.id === raidId)?.name || raidId
          setExRaidError({ raidName, conflictCharName: conflict.name })
          return
        }
      }
    }

    setRaids(prev => {
      let list = [...(prev[charId] || [])]
      const sameIdx = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (sameIdx >= 0) {
        // 이미 선택된 난이도 → 해제 후 DB 삭제
        list.splice(sameIdx, 1)
        persistDelete(charId, raidId, diffKey)
      } else {
        // 같은 레이드의 다른 난이도가 있으면 먼저 제거
        const oldEntry = list.find(e => e.raidId === raidId)
        if (oldEntry) persistDelete(charId, raidId, oldEntry.difficulty)
        list = list.filter(e => e.raidId !== raidId)
        // 새 난이도 추가 후 DB 저장
        const raid = RAIDS.find(r => r.id === raidId)
        const diff = raid?.difficulties.find(d => d.key === diffKey)
        if (diff) {
          // EX 레이드는 항상 골드, 일반 레이드는 캐릭터/계정 한도 기준으로 결정
          const currentGoldCount  = list.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
          const charAlreadyHasGold = currentGoldCount > 0
          const curChar  = chars.find(c => c.id === charId)
          const curAcctKey = curChar?.loaAccountId || curChar?.account
          const acctGoldChars = chars.filter(c =>
            c.id !== charId &&
            (c.loaAccountId || c.account) === curAcctKey &&
            (prev[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
          ).length
          const isGoldCheck = EX_RAID_IDS.has(raidId) ? true
            : currentGoldCount < GOLD_RAID_LIMIT && (charAlreadyHasGold || acctGoldChars < GOLD_CHAR_LIMIT)
          const newEntry = { raidId, difficulty: diffKey, gateClears: new Array(diff.gates).fill(false), isGoldCheck, moreDone: false, moreFrom: 'bound' }
          list.push(newEntry)
          persistRaid(charId, newEntry)
        }
      }
      return { ...prev, [charId]: list }
    })
  }

  // 골드 보상 토글 (설정 모달에서 사용) — EX 레이드는 항상 골드 고정
  const toggleCharRaidGold = (charId, raidId, diffKey) => {
    if (EX_RAID_IDS.has(raidId)) return // EX는 골드 해제 불가
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev

      const turningOn = !list[idx].isGoldCheck
      if (turningOn) {
        // 캐릭터당 한도 검사
        const currentGoldCount = list.filter((e, i) => i !== idx && e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
        if (currentGoldCount >= GOLD_RAID_LIMIT) return prev
        // 계정당 한도 검사 (이 캐릭터에 다른 골드 레이드가 없는 경우에만)
        const charHasOtherGold = list.some((e, i) => i !== idx && e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
        if (!charHasOtherGold) {
          const curChar = chars.find(c => c.id === charId)
          const curAcctKey = curChar?.loaAccountId || curChar?.account
          const acctGoldChars = chars.filter(c =>
            c.id !== charId &&
            (c.loaAccountId || c.account) === curAcctKey &&
            (prev[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
          ).length
          if (acctGoldChars >= GOLD_CHAR_LIMIT) return prev
        }
      }

      const updated = { ...list[idx], isGoldCheck: turningOn }
      list[idx] = updated
      persistRaid(charId, updated)
      return { ...prev, [charId]: list }
    })
  }

  // 레이드 완료 토글 (테이블 셀 클릭)
  // 더보기 있는 레이드: 미완료 → 완료 → 더보기완료 → 미완료
  // 더보기 없는 레이드: 미완료 → 완료 → 미완료
  const toggleRaid = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry    = { ...list[idx] }
      const allDone  = entry.gateClears.every(Boolean)
      const moreDone = entry.moreDone || false

      const raid     = RAIDS.find(r => r.id === raidId)
      const diff     = raid?.difficulties.find(d => d.key === diffKey)
      const allGates = diff ? new Array(diff.gates).fill(true) : []
      const hasMore  = diff ? calcGoldMore(diff, allGates) > 0 : false

      if (!allDone) {
        entry.gateClears = new Array(entry.gateClears.length).fill(true)
        entry.moreDone   = false
      } else if (!moreDone && hasMore) {
        entry.moreDone  = true
        entry.moreFrom  = 'bound'
      } else {
        entry.gateClears = new Array(entry.gateClears.length).fill(false)
        entry.moreDone   = false
      }
      list[idx] = entry
      persistRaid(charId, entry)
      return { ...prev, [charId]: list }
    })
  }

  // 더보기 차감 출처 토글 (귀속 ↔ 거래)
  const toggleMoreFrom = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry = { ...list[idx] }
      entry.moreFrom = (entry.moreFrom || 'bound') === 'bound' ? 'trade' : 'bound'
      list[idx] = entry
      persistRaid(charId, entry)
      return { ...prev, [charId]: list }
    })
  }

  // 자동 설정 적용
  const applyAutoSetup = async (selectedChars, raidsByName, apiKey) => {
    // 1. 선택된 모든 캐릭터를 DB에 추가 (레이드 배정 여부와 무관)
    const charsWithRaids = selectedChars.filter(c => (raidsByName[c.name] || []).length > 0)
    const existingNames  = new Set(chars.map(c => c.name))
    const toAdd          = selectedChars.filter(c => !existingNames.has(c.name))
    if (toAdd.length > 0) {
      try {
        await fetch('/api/characters', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, label: '본계정', characters: toAdd }),
        })
      } catch {}
    }
    // 2. 최신 캐릭터 목록 재조회 (ID 확보)
    let updatedChars = chars
    try {
      const res = await fetch('/api/characters')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) { updatedChars = data; setChars(data) }
      }
    } catch {}
    // 3. 이름 → ID 매핑 후 레이드 배정 + DB 저장
    const newRaids = { ...raids }
    charsWithRaids.forEach(sc => {
      const char = updatedChars.find(c => c.name === sc.name)
      if (!char) return
      const entries = raidsByName[sc.name] || []
      newRaids[char.id] = entries
      entries.forEach(entry => persistRaid(char.id, entry))
    })
    setRaids(newRaids)
  }

  // 개별 캐릭터 삭제
  const deleteChar = (charId) => {
    setChars(prev => prev.filter(c => c.id !== charId))
    setRaids(prev => { const n = { ...prev }; delete n[charId]; return n })
    if (isLoggedIn) fetch(`/api/characters?id=${charId}`, { method: 'DELETE' }).catch(() => {})
  }

  // 캐릭터 순서 저장
  const saveCharOrder = async (ordered) => {
    setChars(ordered)
    if (!isLoggedIn || ordered.some(c => String(c.id).startsWith('tmp'))) return
    try {
      await fetch('/api/characters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ordered.map((c, i) => ({ id: c.id, sortOrder: i })) }),
      })
    } catch {}
  }

  // 레이드 설정 모달 확인 (금지 초과 검사 통과 후 호출)
  const handleRaidSettingsConfirm = () => {
    setShowRaidSettings(false)
  }

  // 캐릭터 추가 (raidsByName이 있으면 자동 배정, 없으면 레이드 설정 모달 즉시 오픈)
  const addChars = async (newChars, apiKey, raidsByName = {}) => {
    const isManual = Object.keys(raidsByName).length === 0

    // 낙관적 추가
    setChars(prev => {
      const existingNames = new Set(prev.map(c => c.name))
      const toAdd = newChars.filter(c => !existingNames.has(c.name)).map((c, i) => ({
        id: `tmp_${Date.now()}_${i}`, name: c.name, class: c.class,
        server: c.server, itemLevel: c.itemLevel, combatPower: null, account: '본계정',
      }))
      return [...prev, ...toAdd]
    })

    // 직접 설정: 레이드 설정 모달 즉시 오픈
    if (isManual) setShowRaidSettings(true)

    try {
      await fetch('/api/characters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, label: '본계정', characters: newChars }),
      })
      const res = await fetch('/api/characters')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          setChars(data) // 실제 ID로 교체
          if (!isManual) {
            // 자동 배정
            const newRaids = {}
            data.forEach(char => {
              const entries = raidsByName[char.name]
              if (entries?.length > 0) {
                newRaids[char.id] = entries
                entries.forEach(entry => persistRaid(char.id, entry))
              }
            })
            if (Object.keys(newRaids).length > 0) {
              setRaids(prev => ({ ...prev, ...newRaids }))
              return
            }
          }
        }
      }
    } catch {}

    // 자동 배정 실패 시 레이드 설정 모달 오픈
    if (!isManual) setShowRaidSettings(true)
  }

  // 전체 캐릭터 갱신
  const syncChars = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const res  = await fetch('/api/characters/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.characters)) setChars(data.characters)
    } catch {} finally { setSyncing(false) }
  }

  // 캐릭터별 획득 골드 맵 (isGoldCheck인 레이드만, 더보기 차감 반영)
  const charGoldMap = useMemo(() => {
    const map = {}
    chars.forEach(char => {
      let bound = 0, trade = 0
      ;(raids[char.id] || []).forEach(entry => {
        if (!entry.isGoldCheck) return
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        const allGates   = new Array(diff.gates).fill(true)
        const moreDone   = entry.moreDone || false
        const moreFrom   = entry.moreFrom || 'bound'
        const moreDeduct = moreDone ? calcGoldMore(diff, allGates) : 0
        bound += calcGoldBound(diff, entry.gateClears) - (moreDone && moreFrom === 'bound' ? moreDeduct : 0)
        trade += calcGoldTrade(diff, entry.gateClears) - (moreDone && moreFrom === 'trade' ? moreDeduct : 0)
      })
      map[char.id] = { bound, trade }
    })
    return map
  }, [chars, raids])

  // 테이블 행 — 레이드 단위로 합산, RAIDS 순서 유지 (캐릭터마다 난이도가 다를 수 있음)
  const raidRows = useMemo(() => {
    const activeRaidIds = new Set()
    Object.values(raids).forEach(list =>
      list.forEach(e => activeRaidIds.add(e.raidId))
    )
    return RAIDS
      .filter(raid => activeRaidIds.has(raid.id) && !HIDDEN_RAID_IDS.has(raid.id))
      .map(raid => ({ key: raid.id, raidId: raid.id, raidName: raid.name }))
  }, [raids])

  // 요약 통계 — earnedBound/Trade 는 charGoldMap 합산, totalBound/Trade 는 isGoldCheck 레이드 기준
  const { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount } = useMemo(() => {
    // 획득 골드: charGoldMap 을 그대로 합산 (이미 isGoldCheck + 더보기 차감 반영)
    let earnedBound = 0, earnedTrade = 0
    Object.values(charGoldMap).forEach(({ bound, trade }) => {
      earnedBound += bound
      earnedTrade += trade
    })

    // 최대 골드 / 완료 수: isGoldCheck 레이드 기준
    let totalBound = 0, totalTrade = 0, completedCount = 0, totalCount = 0
    Object.values(raids).forEach(list =>
      list.forEach(entry => {
        if (!entry.isGoldCheck) return
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        const allGates = new Array(diff.gates).fill(true)
        totalBound += calcGoldBound(diff, allGates)
        totalTrade += calcGoldTrade(diff, allGates)
        totalCount++
        if (entry.gateClears.every(Boolean)) completedCount++
      })
    )
    return { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount }
  }, [charGoldMap, raids])

  // 100% 달성 시 폭죽 트리거 (처음 완료되는 순간에만)
  useEffect(() => {
    const isComplete = totalCount > 0 && completedCount === totalCount
    if (isComplete && !wasCompleteRef.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    }
    wasCompleteRef.current = isComplete
  }, [completedCount, totalCount])

  return (
    <div className="space-y-5">
      <Confetti active={showConfetti} />

      {/* ── 데모 모드 안내 배너 ── */}
      {isDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-3.5 py-2.5 text-xs">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400 dark:bg-yellow-500" />
          <span className="text-gray-500 dark:text-gray-400">
            <span className="ns-bold text-gray-700 dark:text-gray-200">미리보기 모드</span>
            {' '}· 샘플 데이터가 표시되고 있어요. 체크 상태는 저장되지 않아요.
          </span>
          <button
            onClick={() => signIn('discord')}
            className="ml-auto flex-shrink-0 flex items-center gap-1 ns-bold text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
          >
            로그인하기 →
          </button>
        </div>
      )}

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">원정대</h1>
          <p className="text-xs text-gray-400 mt-0.5">주간 초기화 · 매주 수요일 06:00</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRaidSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            레이드 설정
          </button>
          <button onClick={() => setShowCustomSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            커스텀 설정
          </button>
          <button onClick={() => setShowCharEdit(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            캐릭터 설정
          </button>
          <button
            onClick={() => isLoggedIn ? (chars.length === 0 ? setShowNoChar(true) : syncChars()) : setShowLoginGuide(true)}
            disabled={isLoggedIn && syncing}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:hover:bg-[#2a2a2a] dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <span className={isLoggedIn && syncing ? 'animate-spin' : ''}><IconRefresh /></span>
            {isLoggedIn && syncing ? '갱신 중…' : '캐릭터 갱신'}
          </button>
        </div>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-3 gap-3">
        {/* 원정대 캐릭터 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500">원정대 캐릭터</p>
          <p className="ns-extrabold text-xl mt-0.5 text-gray-800 dark:text-gray-100">{chars.length}개</p>
        </div>

        {/* 이번 주 획득 골드 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">이번 주 획득</p>
          {/* 그리드로 두 행 컬럼 정렬: [뱃지] [spacer] [획득량] [/] [합계G] */}
          <div className="grid items-baseline gap-y-1.5" style={{ gridTemplateColumns: 'auto 1fr auto auto auto', columnGap: '4px' }}>
            <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400">귀속</span>
            <span />
            <AnimatedGold value={earnedBound} className="ns-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums text-right" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">/</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-right">{totalBound.toLocaleString()}G</span>

            <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400">거래</span>
            <span />
            <AnimatedGold value={earnedTrade} className="ns-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums text-right" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">/</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-right">{totalTrade.toLocaleString()}G</span>
          </div>
        </div>

        {/* 완료 레이드 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">완료 레이드</p>
            <span className="text-xs ns-bold text-gray-500 dark:text-gray-400">
              {completedCount} / {totalCount}
            </span>
          </div>
          {/* 프로그레스 바 */}
          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <p className="ns-extrabold text-xl text-gray-800 dark:text-gray-100">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* ── 숙제 테이블 / 카드 ── */}
      {(() => {
        const COL_RAID = 110
        const COL_CHAR = 116

        const nameSize = (name) => {
          const korLen = [...name].filter(c => /[가-힣ᄀ-ᇿ㄰-㆏]/.test(c)).length
          if (korLen <= 5) return 'text-xs'
          if (korLen <= 7) return 'text-[10px]'
          return 'text-[9px]'
        }

        // ── 드래그앤드랍 순서 변경 ────────────────────────────────────────
        const saveCharOrder = async (ordered) => {
          // tmp ID(낙관적 업데이트 중)가 섞인 경우 스킵
          if (ordered.some(c => String(c.id).startsWith('tmp-'))) return
          try {
            await fetch('/api/characters', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: ordered.map((c, i) => ({ id: c.id, sortOrder: i })) }),
            })
          } catch {}
        }

        const handleCharDragStart = (e, charId) => {
          setDragCharId(charId)
          e.dataTransfer.effectAllowed = 'move'

          // ── 전체 컬럼 ghost 생성 ──────────────────────────────────
          const char     = chars.find(c => c.id === charId)
          const charRaids = (raids[charId] || [])
            .filter(entry => !HIDDEN_RAID_IDS.has(entry.raidId))
            .sort((a, b) => RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId))

          const isDark = document.documentElement.classList.contains('dark')
          const col    = { bg: isDark ? '#222222' : '#ffffff', hdr: isDark ? '#181818' : '#f9fafb', bdr: isDark ? '#2a2a2a' : '#f0f0f0', txt: isDark ? '#e0e0e0' : '#111827', sub: isDark ? '#888' : '#6b7280' }

          const ghost = document.createElement('div')
          ghost.setAttribute('aria-hidden', 'true')
          ghost.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${COL_CHAR}px;background:${col.bg};border:2px solid #fbbf24;border-radius:8px;box-shadow:0 24px 56px rgba(0,0,0,0.35),0 8px 20px rgba(0,0,0,0.2);overflow:hidden;font-family:NanumSquareR,sans-serif;pointer-events:none;`

          // 캐릭터 헤더
          const hdr = document.createElement('div')
          hdr.style.cssText = `background:${col.hdr};padding:8px 6px 6px;text-align:center;border-bottom:2px solid #fbbf24;`
          hdr.innerHTML = `<div style="font-size:11px;font-weight:bold;color:${col.txt};line-height:1.4;">${char?.name || ''}</div><div style="font-size:10px;color:${col.sub};margin-top:1px;">${char?.itemLevel?.toFixed(2) || ''}</div>`
          ghost.appendChild(hdr)

          // 레이드 행
          charRaids.forEach(entry => {
            const raid   = RAIDS.find(r => r.id === entry.raidId)
            if (!raid) return
            const allDone = entry.gateClears.every(Boolean)
            const row = document.createElement('div')
            row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid ${col.bdr};background:${allDone ? (isDark ? 'rgba(253,224,71,0.08)' : 'rgba(254,252,232,0.7)') : col.bg};`
            const chk = document.createElement('div')
            chk.style.cssText = `width:13px;height:13px;flex-shrink:0;border-radius:3px;border:2px solid ${allDone ? '#fbbf24' : (isDark ? '#444' : '#d1d5db')};background:${allDone ? '#fbbf24' : 'transparent'};`
            const lbl = document.createElement('span')
            lbl.style.cssText = `font-size:10px;color:${allDone ? '#d97706' : col.txt};`
            lbl.textContent = raid.name
            row.appendChild(chk)
            row.appendChild(lbl)
            ghost.appendChild(row)
          })

          // 레이드 없을 때 빈 셀
          if (charRaids.length === 0) {
            const empty = document.createElement('div')
            empty.style.cssText = `padding:14px 8px;text-align:center;font-size:10px;color:${col.sub};`
            empty.textContent = '레이드 없음'
            ghost.appendChild(empty)
          }

          document.body.appendChild(ghost)
          e.dataTransfer.setDragImage(ghost, Math.floor(COL_CHAR / 2), 28)
          setTimeout(() => { ghost.remove() }, 0)
        }

        const handleCharDragOver = (e, charId) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (charId !== dropCharId) setDropCharId(charId)
        }

        const handleCharDrop = (e, charId) => {
          e.preventDefault()
          if (!dragCharId || dragCharId === charId) return
          setChars(prev => {
            const arr      = [...prev]
            const fromIdx  = arr.findIndex(c => c.id === dragCharId)
            const toIdx    = arr.findIndex(c => c.id === charId)
            if (fromIdx === -1 || toIdx === -1) return prev
            const [moved]  = arr.splice(fromIdx, 1)
            arr.splice(toIdx, 0, moved)
            saveCharOrder(arr)
            return arr
          })
        }

        const handleCharDragEnd = () => {
          setDragCharId(null)
          setDropCharId(null)
        }

        // ── 카드 뷰 ────────────────────────────────────────────────────────
        const renderCardView = () => (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-2">
            {chars.map(char => {
              const charRaids = [...(raids[char.id] || [])]
                .filter(e => !HIDDEN_RAID_IDS.has(e.raidId))
                .filter(e => !selectedRaid || (e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
                .sort((a, b) => RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId))
              const isDragging = dragCharId === char.id
              const isDragOver = dropCharId === char.id && dragCharId !== char.id
              return (
                <div
                  key={char.id}
                  draggable
                  onDragStart={(e) => handleCharDragStart(e, char.id)}
                  onDragOver={(e) => handleCharDragOver(e, char.id)}
                  onDrop={(e) => handleCharDrop(e, char.id)}
                  onDragEnd={handleCharDragEnd}
                  className={`rounded-lg border bg-white dark:bg-[#222222] overflow-hidden transition-all select-none ${
                    isDragging  ? 'opacity-40 border-gray-200 dark:border-[#383838]' :
                    isDragOver  ? 'border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-300/50 dark:ring-yellow-700/30' :
                                  'border-gray-200 dark:border-[#383838]'
                  }`}
                >
                  {/* 캐릭터 헤더 */}
                  <div className="flex items-center gap-1.5 px-2 py-2 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818] cursor-default">
                    <span className="text-gray-300 dark:text-gray-600 flex-shrink-0"><IconGrip /></span>
                    {getClassIcon(char.class)
                      ? <img src={getClassIcon(char.class)} alt={char.class} className="class-icon w-6 h-6 object-contain flex-shrink-0" />
                      : <span className="w-6 h-6 flex items-center justify-center text-gray-400 flex-shrink-0"><IconClass /></span>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        {char.id === repCharId && (
                          <span className="text-yellow-400 flex-shrink-0"><IconCrown /></span>
                        )}
                        <p className={`${nameSize(char.name)} ns-bold text-gray-900 dark:text-white truncate`}>{char.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[9px] text-gray-500 dark:text-gray-400">
                          <IconItemLevel />{char.itemLevel.toFixed(2)}
                        </span>
                        {char.combatPower != null && (
                          <span className="flex items-center gap-0.5 text-[9px] text-gray-400 dark:text-gray-500">
                            <img src="/combat-power.svg" className="w-[9px] h-[9px] object-contain" alt="" />
                            {char.combatPower.toFixed(2)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* 캐릭터 골드 요약 */}
                  <div className="px-2 py-1 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#181818]/50">
                    <CharGoldBadges
                      bound={charGoldMap[char.id]?.bound ?? 0}
                      trade={charGoldMap[char.id]?.trade ?? 0}
                    />
                  </div>
                  {/* 레이드 목록 */}
                  {charRaids.length === 0 ? (
                    <div className="py-4 text-center text-[10px] text-gray-300 dark:text-gray-600">레이드 없음</div>
                  ) : (
                    <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                      {charRaids.map(entry => {
                        const raid = RAIDS.find(r => r.id === entry.raidId)
                        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                        if (!raid || !diff) return null
                        const allGates  = new Array(diff.gates).fill(true)
                        const allDone   = entry.gateClears.every(Boolean)
                        const moreDone  = entry.moreDone || false
                        const moreFrom  = entry.moreFrom || 'bound'
                        const totalGold = calcGold(diff, allGates)
                        const moreGold  = calcGoldMore(diff, allGates)
                        const netGold   = totalGold - moreGold
                        const diffBadge =
                          entry.difficulty === 'nightmare' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400' :
                          entry.difficulty === 'hard'      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                                                             'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
                        return (
                          <div
                            key={`${entry.raidId}:${entry.difficulty}`}
                            onClick={() => toggleRaid(char.id, entry.raidId, entry.difficulty)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors ${
                              moreDone ? 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                              : allDone ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                            }`}
                          >
                            <div className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                              moreDone ? 'bg-yellow-500 border-yellow-500 text-yellow-900 shadow-sm'
                              : allDone ? 'bg-yellow-400 border-yellow-400 text-yellow-900 shadow-sm'
                              : 'border-gray-300 dark:border-[#383838]'
                            }`}>
                              {allDone && <IconCheck />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[10px] ns-bold text-gray-700 dark:text-gray-200 truncate">{raid.name}</p>
                              <div className="flex items-center gap-1">
                                <span className={`text-[8px] ns-bold px-1 py-0.5 rounded leading-tight ${diffBadge}`}>{diff.label}</span>
                                {/* 클리어 골드: 더보기 여부 무관하게 항상 totalGold */}
                                {entry.isGoldCheck && (
                                  <span className={`text-[10px] ns-bold tabular-nums ${
                                    moreDone ? 'text-yellow-600 dark:text-yellow-500'
                                    : allDone ? 'text-yellow-500 dark:text-yellow-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                  }`}>
                                    {totalGold.toLocaleString()}G
                                  </span>
                                )}
                              </div>
                            </div>
                            {/* 더보기 토글 — 항상 공간 예약, moreDone 아닐 때 invisible */}
                            <div className={`relative group/cardtoggle flex-shrink-0 ${moreDone ? '' : 'invisible pointer-events-none'}`}>
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleMoreFrom(char.id, entry.raidId, entry.difficulty) }}
                                className="active:scale-95 transition-transform block"
                                style={{ WebkitTapHighlightColor: 'transparent' }}
                              >
                                {/* iOS 슬림 토글 */}
                                <div className={`flex items-center rounded-full border transition-colors duration-300 ${
                                  moreFrom === 'bound'
                                    ? 'bg-orange-100 dark:bg-orange-900/30 border-orange-200 dark:border-orange-800/40'
                                    : 'bg-blue-100 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800/40'
                                }`} style={{ height: 20, padding: 2, gap: 4 }}>
                                  {moreFrom === 'bound' ? (
                                    <>
                                      <span className="text-[8px] ns-bold select-none leading-none pl-1.5 text-orange-500 dark:text-orange-400 whitespace-nowrap">귀속골드 더보기</span>
                                      <div className="flex-shrink-0 rounded-full bg-orange-400 dark:bg-orange-500 shadow" style={{ width: 16, height: 16 }} />
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex-shrink-0 rounded-full bg-blue-400 dark:bg-blue-500 shadow" style={{ width: 16, height: 16 }} />
                                      <span className="text-[8px] ns-bold select-none leading-none pr-1.5 text-blue-500 dark:text-blue-400 whitespace-nowrap">거래골드 더보기</span>
                                    </>
                                  )}
                                </div>
                              </button>
                              {/* 호버 툴팁: 더보기 차감액 */}
                              <div className="pointer-events-none absolute bottom-full right-0 mb-2 hidden group-hover/cardtoggle:block z-50">
                                <div className={`whitespace-nowrap rounded-lg border px-2.5 py-0.5 text-[9px] ns-bold shadow-md ${
                                  moreFrom === 'bound'
                                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/50 text-orange-600 dark:text-orange-300'
                                    : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50 text-sky-600 dark:text-sky-300'
                                }`}>
                                  더보기 -{moreGold.toLocaleString()}G
                                </div>
                                {/* 아래 화살표 */}
                                <div className={`ml-auto mr-2 w-1.5 h-1.5 rotate-45 border-r border-b -mt-1 ${
                                  moreFrom === 'bound'
                                    ? 'bg-orange-50 dark:bg-orange-950/60 border-orange-200 dark:border-orange-800/50'
                                    : 'bg-sky-50 dark:bg-sky-950/60 border-sky-200 dark:border-sky-800/50'
                                }`} />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  {/* 커스텀 항목 — 레이드 필터 선택 시 숨김 */}
                  {!selectedRaid && (customItems[char.id] || []).length > 0 && (
                    <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a] border-t border-gray-100 dark:border-[#2a2a2a]">
                      {(customItems[char.id] || []).map(item => {
                        const checked = !!(customChecks[char.id]?.[item.id])
                        return (
                          <div
                            key={item.id}
                            onClick={() => toggleCustomCheck(char.id, item.id)}
                            className={`flex items-center gap-1.5 px-2 py-1.5 cursor-pointer transition-colors ${
                              checked ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                      : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                            }`}
                          >
                            <div className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                              checked ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'border-gray-300 dark:border-[#555]'
                            }`}>
                              {checked && <IconCheck />}
                            </div>
                            <span className={`text-[11px] ns-bold truncate ${
                              checked ? 'text-yellow-700 dark:text-yellow-400 line-through' : 'text-gray-600 dark:text-gray-300'
                            }`}>{item.name}</span>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )

        // ── 테이블 뷰 ────────────────────────────────────────────────────────
        const renderTable = (charSubset) => (
          <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden w-fit mx-auto max-w-full">
            <div className="overflow-x-auto">
              <table className="border-collapse" style={{ tableLayout: 'fixed', width: COL_RAID + COL_CHAR * charSubset.length }}>
                <thead>
                  {/* 1행: 캐릭터 이름 + 스탯 */}
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {charSubset.map(char => {
                      const isDragging = dragCharId === char.id
                      const isDragOver = dropCharId === char.id && dragCharId !== char.id
                      return (
                        <th
                          key={char.id}
                          draggable
                          onDragStart={(e) => handleCharDragStart(e, char.id)}
                          onDragOver={(e) => handleCharDragOver(e, char.id)}
                          onDrop={(e) => handleCharDrop(e, char.id)}
                          onDragEnd={handleCharDragEnd}
                          style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                          className={`px-2 py-2 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 align-top select-none cursor-default transition-colors ${
                            isDragging ? 'bg-yellow-100/80 dark:bg-yellow-900/25' :
                            isDragOver ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                            dragCharId ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5 w-full overflow-hidden">
                            <span className="text-gray-300 dark:text-gray-600 mb-0.5"><IconGrip /></span>
                            {getClassIcon(char.class) && (
                              <img src={getClassIcon(char.class)} alt={char.class} className="class-icon w-5 h-5 object-contain flex-shrink-0" />
                            )}
                            <div className="flex items-center gap-0.5 w-full justify-center overflow-hidden">
                              {char.id === repCharId && (
                                <span className="text-yellow-400 flex-shrink-0"><IconCrown /></span>
                              )}
                              <span className={`${nameSize(char.name)} ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center truncate`}>{char.name}</span>
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500"><IconItemLevel /></span>
                                <span className="text-[10px] ns-bold text-gray-600 dark:text-gray-300">{char.itemLevel.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <img src="/combat-power.svg" alt="전투력" className="w-[11px] h-[11px] object-contain flex-shrink-0" />
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {char.combatPower != null ? char.combatPower.toFixed(2) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                  {/* 2행: 캐릭터별 획득 골드 */}
                  <tr className="border-b border-gray-200 dark:border-[#383838] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {charSubset.map(char => (
                      <th
                        key={char.id}
                        onDragOver={(e) => handleCharDragOver(e, char.id)}
                        onDrop={(e) => handleCharDrop(e, char.id)}
                        style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                        className={`px-2 py-1.5 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 transition-colors ${
                          dragCharId === char.id     ? 'bg-yellow-100/70 dark:bg-yellow-900/20' :
                          dropCharId === char.id     ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                          dragCharId                 ? 'opacity-50' : ''
                        }`}
                      >
                        <CharGoldBadges
                          bound={charGoldMap[char.id]?.bound ?? 0}
                          trade={charGoldMap[char.id]?.trade ?? 0}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {(selectedRaid ? raidRows.filter(row => row.raidId === selectedRaid.raidId) : raidRows).map(row => {
                    const raidData = RAIDS.find(r => r.id === row.raidId)
                    return (
                      <tr key={row.key} className="group">
                        <td style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-100 dark:border-[#2a2a2a] px-3 py-2">
                          <span className="text-xs ns-bold text-gray-800 dark:text-gray-100">{row.raidName}</span>
                        </td>
                        {charSubset.map(char => {
                          const entry = (raids[char.id] || []).find(e => e.raidId === row.raidId)
                          const diff  = raidData?.difficulties.find(d => d.key === entry?.difficulty)
                          return (
                            <td
                              key={char.id}
                              onDragOver={(e) => handleCharDragOver(e, char.id)}
                              onDrop={(e) => handleCharDrop(e, char.id)}
                              style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                              className={`border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1 transition-colors ${
                                dragCharId === char.id ? 'bg-yellow-100/50 dark:bg-yellow-900/15' :
                                dropCharId === char.id ? 'bg-yellow-50/70 dark:bg-yellow-900/8' :
                                dragCharId            ? 'opacity-50' : ''
                              }`}
                            >
                              <RaidCell
                                entry={entry}
                                diff={diff}
                                onToggle={() => entry && toggleRaid(char.id, row.raidId, entry.difficulty)}
                                onToggleMoreFrom={() => entry && toggleMoreFrom(char.id, row.raidId, entry.difficulty)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {raidRows.length === 0 && !charSubset.some(c => (customItems[c.id] || []).length > 0) && (
                    <tr>
                      <td colSpan={charSubset.length + 1} className="py-16 text-center">
                        <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                        <p className="text-xs text-gray-300 dark:text-gray-700">레이드 설정에서 캐릭터별로 참여할 레이드를 추가하세요</p>
                      </td>
                    </tr>
                  )}
                  {/* 커스텀 항목 행 — 이름 기준으로 묶어서 표시, 레이드 필터 선택 시 숨김 */}
                  {!selectedRaid && (() => {
                    // 이름 기준 그룹: name -> { charId -> itemId }
                    const byName = new Map()
                    charSubset.forEach(char => {
                      ;(customItems[char.id] || []).forEach(it => {
                        if (!byName.has(it.name)) byName.set(it.name, new Map())
                        byName.get(it.name).set(char.id, it.id)
                      })
                    })
                    return [...byName.entries()].map(([name, charMap]) => (
                      <tr key={name} className="group">
                        <td style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-100 dark:border-[#2a2a2a] px-3 py-2">
                          <span className="text-xs ns-bold text-gray-500 dark:text-gray-400">{name}</span>
                        </td>
                        {charSubset.map(char => {
                          const itemId = charMap.get(char.id)
                          const checked = !!(itemId && customChecks[char.id]?.[itemId])
                          return (
                            <td
                              key={char.id}
                              style={{ width: COL_CHAR, maxWidth: COL_CHAR }}
                              className="border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1"
                            >
                              {itemId ? (
                                <div
                                  onClick={() => toggleCustomCheck(char.id, itemId)}
                                  className={`flex items-center justify-center h-8 rounded cursor-pointer transition-colors ${
                                    checked ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                            : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                                  }`}
                                >
                                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                                    checked ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'border-gray-300 dark:border-[#555]'
                                  }`}>
                                    {checked && <IconCheck />}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-8 flex items-center justify-center">
                                  <span className="text-gray-200 dark:text-gray-700">—</span>
                                </div>
                              )}
                            </td>
                          )
                        })}
                      </tr>
                    ))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        )

        return (
          <div className="space-y-2">
            {/* ── 레이드 필터 ── */}
            {allRegisteredRaids.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
                {/* 레이드 버튼 행 */}
                {(() => {
                  const diffBg = (diffKey, isActive) =>
                    isActive ? (
                      diffKey === 'nightmare'     ? 'bg-violet-200 dark:bg-violet-800/60 text-violet-900 dark:text-violet-100' :
                      diffKey === 'hard'          ? 'bg-rose-200 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100' :
                      diffKey.startsWith('stage') ? 'bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100' :
                                                    'bg-sky-200 dark:bg-sky-800/60 text-sky-900 dark:text-sky-100'
                    ) : (
                      diffKey === 'nightmare'     ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40' :
                      diffKey === 'hard'          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40' :
                      diffKey.startsWith('stage') ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40' :
                                                    'bg-sky-50 dark:bg-sky-950/30 text-sky-500 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40'
                    )
                  const raidGroups = allRegisteredRaids.reduce((acc, r) => {
                    const g = acc.find(x => x.raidId === r.raidId)
                    if (g) g.diffs.push(r)
                    else acc.push({ raidId: r.raidId, raidName: r.raidName, diffs: [r] })
                    return acc
                  }, [])
                  return (
                    <div className="flex flex-wrap items-center gap-y-2 px-3 py-2.5">
                      {raidGroups.map((group, gi) => (
                        <div key={group.raidId} className="flex items-center gap-2">
                          {gi > 0 && <div className="w-px h-4 bg-gray-200 dark:bg-[#383838] mx-2 flex-shrink-0" />}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mr-0.5">{group.raidName}</span>
                          <div className="flex items-center gap-1">
                            {group.diffs.map(r => {
                              const isActive = selectedRaid?.raidId === r.raidId && selectedRaid?.diffKey === r.diffKey
                              return (
                                <button
                                  key={r.diffKey}
                                  onClick={() => setSelectedRaid(isActive ? null : { raidId: r.raidId, diffKey: r.diffKey })}
                                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ns-bold transition-all ${diffBg(r.diffKey, isActive)}`}
                                >
                                  <span>{r.diffLabel}</span>
                                  <span className="inline-flex items-center justify-center w-4">
                                    {r.incomplete > 0 ? (
                                      <span className={`tabular-nums text-[9px] ns-bold ${isActive ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {r.incomplete}
                                      </span>
                                    ) : (
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-emerald-500 dark:text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* 선택된 레이드 캐릭터 완료 현황 — 항상 동일 높이 유지 */}
                {selectedRaid && (() => {
                  const incompleteIds = new Set(raidIncompleteChars.map(({ char }) => char.id))
                  // 해당 레이드가 등록된 캐릭터만 표시
                  const relevantChars = chars.filter(char =>
                    (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                  )
                  return (
                  <div className="border-t border-gray-100 dark:border-[#2a2a2a]">
                    <div className="flex flex-wrap gap-x-1 gap-y-1 px-2.5 py-2">
                      {relevantChars.map(char => {
                        const incomplete = incompleteIds.has(char.id)
                        const entry      = (raids[char.id] || []).find(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                        const gateClears = entry?.gateClears || []
                        const partialCount = gateClears.filter(Boolean).length
                        const isPartial  = incomplete && partialCount > 0
                        return (
                          <div key={char.id} className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                            incomplete
                              ? 'bg-gray-50 dark:bg-[#2a2a2a]'
                              : 'bg-emerald-50 dark:bg-emerald-900/20'
                          }`}>
                            {incomplete ? (
                              getClassIcon(char.class)
                                ? <img src={getClassIcon(char.class)} alt="" className="class-icon w-3.5 h-3.5 object-contain flex-shrink-0" />
                                : <span className="w-3.5 h-3.5 text-gray-300 flex-shrink-0"><IconClass /></span>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 dark:text-emerald-400 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                            <span className={`text-[10px] ns-bold ${incomplete ? 'text-gray-700 dark:text-gray-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {char.name}
                            </span>
                            {isPartial && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 tabular-nums">
                                {partialCount}/{gateClears.length}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })()}
              </div>
            )}

            {/* 카드 / 테이블 뷰 토글 */}
            <div className="flex justify-end gap-1 rounded-lg border border-gray-200 dark:border-[#383838] p-0.5 w-fit ml-auto bg-gray-50 dark:bg-[#181818]">
              <button
                onClick={() => setCardView(false)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ns-bold transition-colors ${
                  !cardView
                    ? 'bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-200 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="3" width="18" height="18" rx="1"/>
                  <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                  <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                </svg>
                테이블
              </button>
              <button
                onClick={() => setCardView(true)}
                className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ns-bold transition-colors ${
                  cardView
                    ? 'bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-200 shadow-sm'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                }`}
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="2" y="3" width="9" height="9" rx="1"/><rect x="13" y="3" width="9" height="9" rx="1"/>
                  <rect x="2" y="14" width="9" height="7" rx="1"/><rect x="13" y="14" width="9" height="7" rx="1"/>
                </svg>
                카드
              </button>
            </div>
            {cardView ? renderCardView() : renderTable(chars)}
          </div>
        )
      })()}

      {/* ── 모달 ── */}
      {showRaidSettings && (
        <RaidSettingsModal
          chars={chars}
          raids={raids}
          onToggle={toggleCharRaid}
          onToggleGold={toggleCharRaidGold}
          onClose={() => setShowRaidSettings(false)}
          onConfirm={handleRaidSettingsConfirm}
          exRaidError={exRaidError}
          onClearExRaidError={() => setExRaidError(null)}
          onOpenCharAdd={() => { setCharEditOpenAdd(true); setShowCharEdit(true) }}
        />
      )}
      {showNoChar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
          <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center">
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
            <button
              onClick={() => { setShowNoChar(false); setCharEditOpenAdd(true); setShowCharEdit(true) }}
              className="mt-6 px-4 py-2 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
              캐릭터 추가
            </button>
          </div>
        </div>
      )}
      {showCharEdit && (
        <CharacterEditModal
          chars={chars}
          raids={raids}
          onAdd={addChars}
          onDelete={deleteChar}
          onReorder={saveCharOrder}
          initialShowAdd={charEditOpenAdd}
          onClose={() => { setShowCharEdit(false); setCharEditOpenAdd(false) }}
          isDemo={isDemo}
          onLoginRequired={() => { setShowCharEdit(false); setShowLoginGuide(true) }}
        />
      )}
      {showAutoSetup && (
        <AutoSetupModal
          onApply={applyAutoSetup}
          onClose={() => setShowAutoSetup(false)}
          existingRaids={raids}
          existingChars={chars}
        />
      )}

      {showCustomSettings && (
        <CustomSettingsModal
          chars={chars}
          customItems={customItems}
          onAdd={addCustomItem}
          onDelete={deleteCustomItem}
          onReorder={reorderCustomItems}
          onClose={() => setShowCustomSettings(false)}
        />
      )}

      {/* ── 데모 모드 로그인 유도 모달 ── */}
      {showLoginGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowLoginGuide(false)}>
          <div
            className="w-full max-w-sm rounded-2xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            {/* 아이콘 */}
            <div className="h-14 w-14 rounded-full bg-yellow-100 dark:bg-yellow-400/15 flex items-center justify-center">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-yellow-500 dark:text-yellow-400">
                <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
              </svg>
            </div>

            <div className="space-y-2">
              <p className="ns-extrabold text-base text-gray-900 dark:text-gray-100">테스트 데이터입니다</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                지금 보이는 원정대는 미리보기용 샘플이에요.<br/>
                디스코드 로그인 후 내 캐릭터를 직접 등록하고<br/>
                레이드 숙제를 관리해 보세요!
              </p>
            </div>

            <button
              onClick={() => signIn('discord')}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 px-5 py-2.5 text-sm ns-bold text-gray-900 transition-colors"
            >
              <DiscordIcon size={16} />
              디스코드로 로그인하기
            </button>

            <button onClick={() => setShowLoginGuide(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              계속 둘러보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

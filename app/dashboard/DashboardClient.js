'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { RAIDS, CLASS_COLOR, calcGold, calcGoldBound, calcGoldTrade, calcGoldMore } from '@/lib/raidData'

// 계정당 1캐릭터만 선택 가능한 EX 레이드
const EX_RAID_IDS = new Set(['egir-ex', 'abrel-ex'])
// 아직 출시되지 않아 UI에서 숨기는 레이드 (데이터는 유지)
const HIDDEN_RAID_IDS = new Set(['abrel-ex'])

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
const getClassIcon = (cls) => CLASS_ICON[cls] ? `/class/${CLASS_ICON[cls]}.png` : null

// ── 아이콘 ────────────────────────────────────────────────────────────────────
const IconPlus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
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

// ── 레이드 설정 모달 (캐릭터별) ───────────────────────────────────────────────
function RaidSettingsModal({ chars, raids, onToggle, onToggleGold, onClose, exRaidError, onClearExRaidError }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedChar = chars[selectedIdx]

  const [goldError, setGoldError] = useState(null) // 초과 캐릭터 목록

  const charRaidList    = selectedChar ? (raids[selectedChar.id] || []) : []
  const activeKeys      = useMemo(() => new Set(charRaidList.map(e => `${e.raidId}_${e.difficulty}`)), [charRaidList])
  const normalGoldCount = charRaidList.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
  const exGoldCount     = charRaidList.filter(e => e.isGoldCheck &&  EX_RAID_IDS.has(e.raidId)).length

  const handleConfirm = () => {
    const exceeded = chars
      .map(char => ({
        name:  char.name,
        count: (raids[char.id] || []).filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length,
      }))
      .filter(c => c.count > 3)
    if (exceeded.length > 0) {
      setGoldError(exceeded)
    } else {
      onClose()
    }
  }

  if (!chars.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
          <button onClick={onClose} className="mt-6 px-4 py-2 rounded border border-gray-200 dark:border-[#383838] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            닫기
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
        <div className="px-5 pt-3 pb-0 flex items-center gap-2">
          <span className="text-[11px] text-gray-400 dark:text-gray-500">골드 보상</span>
          <div className="flex gap-1">
            {[0, 1, 2].map(i => (
              <div key={i} className={`h-1.5 w-5 rounded-full transition-colors ${
                normalGoldCount > 3 ? 'bg-red-400' : i < normalGoldCount ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#2a2a2a]'
              }`} />
            ))}
          </div>
          <span className={`text-[11px] ns-bold transition-colors ${
            normalGoldCount > 3 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}>{normalGoldCount}/3</span>
          {exGoldCount > 0 && (
            <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400">
              EX +{exGoldCount}
            </span>
          )}
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
                    const canToggle = hasActive && (isGold || isEx || normalGoldCount < 3)
                    return (
                      <button
                        onClick={() => canToggle && onToggleGold(selectedChar.id, raid.id, entry.difficulty)}
                        disabled={!canToggle}
                        className="flex items-center gap-1.5 flex-shrink-0 disabled:cursor-not-allowed"
                        title={!hasActive ? '레이드를 먼저 선택하세요' : !canToggle ? '골드 보상 3개 초과' : ''}
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
                캐릭터당 골드 획득 가능 레이드는 최대 3개입니다
              </p>
              {/* 초과 캐릭터 목록 */}
              <div className="space-y-1.5">
                {goldError.map(c => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#383838] px-3 py-2.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span className="text-xs ns-bold text-orange-500 dark:text-orange-400">{c.count} / 3</span>
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

// ── 캐릭터 추가 모달 ──────────────────────────────────────────────────────────
const LOA_KEY_STORAGE = 'myloa_api_key'

function CharacterAddModal({ existingNames, onAdd, onClose }) {
  const [charName,  setCharName]  = useState('')
  const [apiKey,    setApiKey]    = useState('')
  const [keySaved,  setKeySaved]  = useState(false)
  const [loading,   setLoading]   = useState(false)
  const [error,     setError]     = useState('')
  const [results,   setResults]   = useState(null)
  const [selected,  setSelected]  = useState(new Set())
  const [showGuide, setShowGuide] = useState(false)

  // 마운트 시 저장된 API 키 불러오기
  useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(LOA_KEY_STORAGE)
      if (saved) { setApiKey(saved); setKeySaved(true) }
    }
  })

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

  const handleAdd = () => {
    onAdd((results || []).filter(c => selected.has(c.name)), apiKey.trim())
    onClose()
  }

  const newCount = results ? results.filter(c => selected.has(c.name)).length : 0

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
              return (
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">원정대 캐릭터 {results.length}개</p>
                  <button
                    onClick={() => allSelected
                      ? setSelected(new Set())
                      : setSelected(new Set(selectables.map(c => c.name)))
                    }
                    className="text-[10px] text-yellow-500 px-2 py-0.5 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20 transition-colors">
                    {allSelected ? '전체해제' : '전체선택'}
                  </button>
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
                    {getClassIcon(c.class)
                      ? <img src={getClassIcon(c.class)} alt={c.class} title={c.class} className="w-5 h-5 flex-shrink-0 object-contain" />
                      : <span className={`text-[10px] px-1.5 py-0.5 rounded ns-bold leading-tight flex-shrink-0 ${CLASS_COLOR[c.class] || 'bg-gray-100 text-gray-600'}`}>{c.class}</span>
                    }
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
          <button onClick={handleAdd} disabled={newCount === 0}
            className="flex-1 rounded bg-yellow-200 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-yellow-900 transition-colors">
            {newCount > 0 ? `${newCount}개 추가` : '추가'}
          </button>
        </div>
      </div>
      {showGuide && <ApiKeyGuideModal onClose={() => setShowGuide(false)} />}
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
          ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
          : allDone
          ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
        }`}
    >
      {/* 왼쪽: 체크박스 */}
      <div className={`h-[26px] w-[26px] flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all
        ${moreDone
          ? 'bg-blue-400 border-blue-400 text-white shadow-sm'
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
            ${moreDone ? 'text-blue-600 dark:text-blue-400' : allDone ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}>
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
export default function DashboardClient({ initialChars = [], initialRaids = {} }) {
  const [chars, setChars] = useState(initialChars)
  // raids: { [charId]: [{ raidId, difficulty, gateClears, isGoldCheck, moreDone, moreFrom }] }
  const [raids, setRaids] = useState(initialRaids)
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAddChar, setShowAddChar]           = useState(false)
  const [syncing, setSyncing]                   = useState(false)
  const [showConfetti, setShowConfetti]         = useState(false)
  const [exRaidError, setExRaidError]           = useState(null) // { raidName, conflictCharName }
  const [cardView, setCardView]                 = useState(false)
  const wasCompleteRef                          = useRef(false)

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
        deleteRaid(charId, raidId, diffKey)
      } else {
        // 같은 레이드의 다른 난이도가 있으면 먼저 제거
        const oldEntry = list.find(e => e.raidId === raidId)
        if (oldEntry) deleteRaid(charId, raidId, oldEntry.difficulty)
        list = list.filter(e => e.raidId !== raidId)
        // 새 난이도 추가 후 DB 저장
        const raid = RAIDS.find(r => r.id === raidId)
        const diff = raid?.difficulties.find(d => d.key === diffKey)
        if (diff) {
          const newEntry = { raidId, difficulty: diffKey, gateClears: new Array(diff.gates).fill(false), isGoldCheck: true, moreDone: false, moreFrom: 'bound' }
          list.push(newEntry)
          saveRaid(charId, newEntry)
        }
      }
      return { ...prev, [charId]: list }
    })
  }

  // 골드 보상 토글 (설정 모달에서 사용)
  const toggleCharRaidGold = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const updated = { ...list[idx], isGoldCheck: !list[idx].isGoldCheck }
      list[idx] = updated
      saveRaid(charId, updated)
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
      saveRaid(charId, entry)
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
      saveRaid(charId, entry)
      return { ...prev, [charId]: list }
    })
  }

  // 캐릭터 추가
  const addChars = async (newChars, apiKey) => {
    setChars(prev => {
      const existingNames = new Set(prev.map(c => c.name))
      const toAdd = newChars.filter(c => !existingNames.has(c.name)).map((c, i) => ({
        id: `tmp_${Date.now()}_${i}`, name: c.name, class: c.class,
        server: c.server, itemLevel: c.itemLevel, combatPower: null, account: '본계정',
      }))
      return [...prev, ...toAdd]
    })
    try {
      await fetch('/api/characters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, label: '본계정', characters: newChars }),
      })
      const res = await fetch('/api/characters')
      if (res.ok) { const data = await res.json(); if (Array.isArray(data)) setChars(data) }
    } catch {}
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
          <button onClick={() => setShowAddChar(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconPlus size={12} /> 캐릭터 추가
          </button>
          <button onClick={syncChars} disabled={syncing}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:hover:bg-[#2a2a2a] dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <span className={syncing ? 'animate-spin' : ''}><IconRefresh /></span>
            {syncing ? '갱신 중…' : '캐릭터 갱신'}
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

        // ── 카드 뷰 ────────────────────────────────────────────────────────
        const renderCardView = () => (
          <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
            {chars.map(char => {
              const charRaids = [...(raids[char.id] || [])]
                .filter(e => !HIDDEN_RAID_IDS.has(e.raidId))
                .sort((a, b) => RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId))
              return (
                <div key={char.id} className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
                  {/* 캐릭터 헤더 */}
                  <div className="flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
                    {getClassIcon(char.class)
                      ? <img src={getClassIcon(char.class)} alt={char.class} className="w-7 h-7 object-contain flex-shrink-0 opacity-85" />
                      : <span className="w-7 h-7 flex items-center justify-center text-gray-400 flex-shrink-0"><IconClass /></span>
                    }
                    <div className="flex-1 min-w-0">
                      <p className={`${nameSize(char.name)} ns-bold text-gray-900 dark:text-white truncate`}>{char.name}</p>
                      <div className="flex items-center gap-1 mt-0.5 flex-wrap">
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <IconItemLevel />{char.itemLevel.toFixed(2)}
                        </span>
                        <span className="text-[10px] text-gray-300 dark:text-gray-600">·</span>
                        <span className="flex items-center gap-0.5 text-[10px] text-gray-500 dark:text-gray-400">
                          <img src="/combat-power.svg" className="w-[10px] h-[10px] object-contain" />
                          {char.combatPower != null ? char.combatPower.toFixed(2) : '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                  {/* 캐릭터 골드 요약 */}
                  <div className="px-3 py-1.5 border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#181818]/50">
                    <CharGoldBadges
                      bound={charGoldMap[char.id]?.bound ?? 0}
                      trade={charGoldMap[char.id]?.trade ?? 0}
                    />
                  </div>
                  {/* 레이드 목록 */}
                  {charRaids.length === 0 ? (
                    <div className="py-6 text-center text-[11px] text-gray-300 dark:text-gray-600">레이드 없음</div>
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
                            key={entry.raidId}
                            onClick={() => toggleRaid(char.id, entry.raidId, entry.difficulty)}
                            className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                              moreDone ? 'bg-blue-50 dark:bg-blue-900/10 hover:bg-blue-100 dark:hover:bg-blue-900/20'
                              : allDone ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                              : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                            }`}
                          >
                            <div className={`h-5 w-5 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                              moreDone ? 'bg-blue-400 border-blue-400 text-white shadow-sm'
                              : allDone ? 'bg-yellow-400 border-yellow-400 text-gray-900 shadow-sm'
                              : 'border-gray-300 dark:border-[#383838]'
                            }`}>
                              {allDone && <IconCheck />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] ns-bold text-gray-700 dark:text-gray-200 truncate">{raid.name}</p>
                              <div className="flex items-center gap-1 mt-0.5">
                                <span className={`text-[8px] ns-bold px-1 py-0.5 rounded leading-tight ${diffBadge}`}>{diff.label}</span>
                                {/* 클리어 골드: 더보기 여부 무관하게 항상 totalGold */}
                                {entry.isGoldCheck && (
                                  <span className={`text-[10px] ns-bold tabular-nums ${
                                    moreDone ? 'text-blue-500 dark:text-blue-400'
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
                </div>
              )
            })}
          </div>
        )

        // ── 테이블 뷰 ────────────────────────────────────────────────────────
        const renderTable = (charSubset) => (
          <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="border-collapse w-full" style={{ minWidth: 'max-content' }}>
                <thead>
                  {/* 1행: 캐릭터 이름 + 스탯 */}
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {charSubset.map(char => (
                      <th key={char.id} style={{ width: COL_CHAR, minWidth: COL_CHAR }} className="px-2 py-2 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 align-top">
                        <div className="flex flex-col items-center gap-0.5">
                          <span className={`${nameSize(char.name)} ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center break-keep`}>{char.name}</span>
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
                    ))}
                  </tr>
                  {/* 2행: 캐릭터별 획득 골드 */}
                  <tr className="border-b border-gray-200 dark:border-[#383838] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {charSubset.map(char => (
                      <th key={char.id} style={{ width: COL_CHAR, minWidth: COL_CHAR }} className="px-2 py-1.5 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0">
                        <CharGoldBadges
                          bound={charGoldMap[char.id]?.bound ?? 0}
                          trade={charGoldMap[char.id]?.trade ?? 0}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {raidRows.map(row => {
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
                            <td key={char.id} style={{ width: COL_CHAR, minWidth: COL_CHAR }} className="border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1">
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
                  {raidRows.length === 0 && (
                    <tr>
                      <td colSpan={charSubset.length + 1} className="py-16 text-center">
                        <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                        <p className="text-xs text-gray-300 dark:text-gray-700">레이드 설정에서 캐릭터별로 참여할 레이드를 추가하세요</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )

        return (
          <div className="space-y-2">
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
          exRaidError={exRaidError}
          onClearExRaidError={() => setExRaidError(null)}
        />
      )}
      {showAddChar && (
        <CharacterAddModal
          existingNames={new Set(chars.map(c => c.name))}
          onAdd={addChars}
          onClose={() => setShowAddChar(false)}
        />
      )}
    </div>
  )
}

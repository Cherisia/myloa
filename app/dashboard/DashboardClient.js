'use client'

import { useState, useMemo } from 'react'
import { RAIDS, CLASS_COLOR, calcGold, calcGoldBound, calcGoldTrade } from '@/lib/raidData'

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
const IconPower = () => (
  <img src="/combat-power.svg" alt="전투력" style={{ width: 10, height: 10 }} />
)

// ── 레이드 설정 모달 (캐릭터별) ───────────────────────────────────────────────
function RaidSettingsModal({ chars, raids, onToggle, onToggleGold, onClose }) {
  const [selectedIdx, setSelectedIdx] = useState(0)
  const selectedChar = chars[selectedIdx]

  const [goldError, setGoldError] = useState(null) // 초과 캐릭터 목록

  const charRaidList = selectedChar ? (raids[selectedChar.id] || []) : []
  const activeKeys   = useMemo(() => new Set(charRaidList.map(e => `${e.raidId}_${e.difficulty}`)), [charRaidList])
  const goldCount    = charRaidList.filter(e => e.isGoldCheck).length

  const handleConfirm = () => {
    const exceeded = chars
      .map(char => ({
        name:  char.name,
        count: (raids[char.id] || []).filter(e => e.isGoldCheck).length,
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
        <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl px-5 py-10 text-center">
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
          <button onClick={onClose} className="mt-6 px-4 py-2 rounded border border-gray-200 dark:border-[#30363d] text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            닫기
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-2xl rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl flex flex-col max-h-[90vh]">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d] flex-shrink-0">
          <div>
            <span className="ns-bold text-gray-900 dark:text-white">레이드 설정</span>
            <span className="ml-2 text-xs text-gray-400">캐릭터별로 참여할 레이드를 선택하세요</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 캐릭터 탭 */}
        <div className="flex gap-1.5 px-5 py-3 overflow-x-auto border-b border-gray-100 dark:border-[#30363d] flex-shrink-0 scrollbar-hide">
          {chars.map((char, i) => {
            const count = (raids[char.id] || []).length
            return (
              <button
                key={char.id}
                onClick={() => setSelectedIdx(i)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ns-bold transition-colors ${
                  i === selectedIdx
                    ? 'bg-yellow-400 text-gray-900'
                    : 'border border-gray-200 dark:border-[#30363d] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#21262d]'
                }`}
              >
                {char.name}
                {count > 0 && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ns-bold ${
                    i === selectedIdx
                      ? 'bg-gray-900/15 text-gray-900'
                      : 'bg-gray-100 dark:bg-[#21262d] text-gray-500 dark:text-gray-400'
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
                goldCount > 3 ? 'bg-red-400' : i < goldCount ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#21262d]'
              }`} />
            ))}
          </div>
          <span className={`text-[11px] ns-bold transition-colors ${
            goldCount > 3 ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
          }`}>{goldCount}/3</span>
        </div>

        {/* 레이드 목록 */}
        <div className="overflow-y-auto flex-1 px-5 py-3 space-y-1.5">
          {RAIDS.map(raid => {
            const isLevelOk = selectedChar && selectedChar.itemLevel >= raid.minItemLevel
            return (
              <div
                key={raid.id}
                className={`rounded-lg border px-4 py-2.5 transition-colors ${
                  isLevelOk
                    ? 'border-gray-200 dark:border-[#30363d]'
                    : 'border-gray-100 dark:border-[#21262d] opacity-35'
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
                    const canToggle = hasActive && (isGold || goldCount < 3)
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
                          : hasActive ? 'bg-gray-200 dark:bg-[#30363d]'
                          :             'bg-gray-100 dark:bg-[#21262d] opacity-40'
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
                        : 'border-gray-200 dark:border-[#30363d] text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500'
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
        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#30363d] flex-shrink-0">
          <button
            onClick={handleConfirm}
            className="w-full rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm font-medium text-gray-900 transition-colors"
          >
            확인
          </button>
        </div>
      </div>

      {/* 골드 초과 에러 모달 */}
      {goldError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30">
          <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
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
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#21262d] border border-gray-200 dark:border-[#30363d] px-3 py-2.5">
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
                className="w-full rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm font-medium text-gray-900 transition-colors"
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
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="ns-bold text-gray-900 dark:text-white">API 키 발급 가이드</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-400 text-gray-900 text-[11px] ns-bold flex items-center justify-center">1</span>
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
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-400 text-gray-900 text-[11px] ns-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">클라이언트 생성</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CLIENT NAME</span> 항목을 작성하고 이용약관을 체크한 뒤{' '}
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CREATE</span> 버튼을 클릭하여 클라이언트를 생성합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-400 text-gray-900 text-[11px] ns-bold flex items-center justify-center">3</span>
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
            className="w-full rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
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
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="ns-bold text-gray-900 dark:text-white">캐릭터 추가</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">캐릭터명</label>
            <input
              className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
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
              className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm font-mono bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={apiKey} onChange={e => { setApiKey(e.target.value); setKeySaved(false) }}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <button onClick={search} disabled={loading}
            className="w-full rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
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
                      ${already ? 'border-gray-100 dark:border-[#21262d] opacity-40 cursor-not-allowed'
                        : checked ? 'border-yellow-400/60 bg-yellow-50/50 dark:bg-yellow-900/10'
                        : 'border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-500'}`}>
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
                    <span className={`w-[48px] text-[11px] ns-bold text-right flex-shrink-0 ${ilvlColor}`}>
                      {c.itemLevel.toFixed(2)}
                    </span>
                  </label>
                )
              })}
            </div>
          </div>
        )}

        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#30363d] mt-3">
          <button onClick={onClose}
            className="flex-1 rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">취소</button>
          <button onClick={handleAdd} disabled={newCount === 0}
            className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-gray-900 transition-colors">
            {newCount > 0 ? `${newCount}개 추가` : '추가'}
          </button>
        </div>
      </div>
      {showGuide && <ApiKeyGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}

// ── 레이드 셀 ─────────────────────────────────────────────────────────────────
function RaidCell({ entry, totalGold, onToggle }) {
  if (!entry) {
    // 해당 캐릭터에 이 레이드가 없음 — 빈 셀
    return <div className="w-full min-h-[48px] bg-gray-50/50 dark:bg-[#0d1117]/30 rounded" />
  }

  const allDone = entry.gateClears.every(Boolean)

  return (
    <button
      onClick={onToggle}
      className={`w-full min-h-[48px] flex flex-col items-center justify-center gap-1.5 rounded cursor-pointer transition-colors
        ${allDone
          ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#21262d]'
        }`}
    >
      <div className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all
        ${allDone ? 'bg-yellow-400 border-yellow-400 text-gray-900 shadow-sm' : 'border-gray-300 dark:border-[#30363d]'}`}>
        {allDone && <IconCheck />}
      </div>
      <span className={`text-[11px] ns-bold leading-tight
        ${allDone ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}>
        {totalGold.toLocaleString()}G
      </span>
    </button>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────
export default function DashboardClient({ initialChars = [] }) {
  const [chars, setChars] = useState(initialChars)
  // raids: { [charId]: [{ raidId, difficulty, gateClears, isGoldCheck }] }
  const [raids, setRaids] = useState({})
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAddChar, setShowAddChar]           = useState(false)
  const [syncing, setSyncing]                   = useState(false)

  // 캐릭터별 레이드 토글 (설정 모달에서 사용) — 레이드당 난이도 하나만 허용
  const toggleCharRaid = (charId, raidId, diffKey) => {
    setRaids(prev => {
      let list = [...(prev[charId] || [])]
      const sameIdx = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (sameIdx >= 0) {
        // 이미 선택된 난이도 → 해제
        list.splice(sameIdx, 1)
      } else {
        // 같은 레이드의 다른 난이도가 있으면 먼저 제거
        list = list.filter(e => e.raidId !== raidId)
        // 새 난이도 추가
        const raid = RAIDS.find(r => r.id === raidId)
        const diff = raid?.difficulties.find(d => d.key === diffKey)
        if (diff) list.push({ raidId, difficulty: diffKey, gateClears: new Array(diff.gates).fill(false), isGoldCheck: true })
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
      list[idx] = { ...list[idx], isGoldCheck: !list[idx].isGoldCheck }
      return { ...prev, [charId]: list }
    })
  }

  // 레이드 완료 토글 (테이블 셀 클릭)
  const toggleRaid = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry   = { ...list[idx] }
      const allDone = entry.gateClears.every(Boolean)
      entry.gateClears = new Array(entry.gateClears.length).fill(!allDone)
      list[idx] = entry
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

  // 테이블 행 — 모든 캐릭터에 걸쳐 활성화된 레이드의 합집합, RAIDS 순서 유지
  const raidRows = useMemo(() => {
    const activeKeys = new Set()
    Object.values(raids).forEach(list =>
      list.forEach(e => activeKeys.add(`${e.raidId}_${e.difficulty}`))
    )
    return RAIDS.flatMap(raid =>
      raid.difficulties
        .filter(diff => activeKeys.has(`${raid.id}_${diff.key}`))
        .map(diff => ({
          key:       `${raid.id}_${diff.key}`,
          raidId:    raid.id,
          diffKey:   diff.key,
          raidName:  raid.name,
          diffLabel: diff.label,
          gates:     diff.gates,
          totalGold: (diff.goldBound || []).reduce((s,g) => s+g, 0) + (diff.goldTrade || []).reduce((s,g) => s+g, 0),
        }))
    )
  }, [raids])

  // 요약 통계
  const { allEarned, completedCount } = useMemo(() => {
    let allEarned = 0, completedCount = 0
    Object.values(raids).forEach(list =>
      list.forEach(entry => {
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (diff) {
          allEarned += calcGold(diff, entry.gateClears)
          if (entry.gateClears.every(Boolean)) completedCount++
        }
      })
    )
    return { allEarned, completedCount }
  }, [raids])

  return (
    <div className="space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">원정대</h1>
          <p className="text-xs text-gray-400 mt-0.5">주간 초기화 · 매주 수요일 06:00</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRaidSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            레이드 설정
          </button>
          <button onClick={() => setShowAddChar(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            <IconPlus size={12} /> 캐릭터 추가
          </button>
          <button onClick={syncChars} disabled={syncing}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:hover:bg-[#21262d] dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <span className={syncing ? 'animate-spin' : ''}><IconRefresh /></span>
            {syncing ? '갱신 중…' : '캐릭터 갱신'}
          </button>
        </div>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '원정대 캐릭터', value: `${chars.length}개` },
          { label: '이번 주 획득',  value: `${allEarned.toLocaleString()}G`, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: '완료 레이드',   value: `${completedCount}건` },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
            <p className={`ns-extrabold text-xl mt-0.5 ${item.color || 'text-gray-800 dark:text-gray-100'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── 숙제 테이블 ── */}
      <div className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full" style={{ minWidth: 'max-content' }}>
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117]">
                <th className="sticky left-0 z-30 bg-gray-50 dark:bg-[#0d1117] w-[120px] min-w-[120px] border-r border-gray-200 dark:border-[#21262d]"/>
                {chars.map(char => {
                  return (
                    <th key={char.id} className="min-w-[108px] w-[108px] px-2 py-3 border-r border-gray-100 dark:border-[#21262d] last:border-r-0 align-top">
                      <div className="flex flex-col items-center gap-1">
                        <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center break-keep">{char.name}</span>
                        <div className="flex flex-col items-start gap-0.5">
                          <div className="flex items-center gap-1">
                            {getClassIcon(char.class)
                              ? <img src={getClassIcon(char.class)} alt={char.class} title={char.class} className="w-[14px] h-[14px] object-contain opacity-80 flex-shrink-0" />
                              : <span className="w-[14px] h-[14px] flex items-center justify-center flex-shrink-0"><IconClass /></span>
                            }
                            <span className="text-[11px] ns-bold text-gray-600 dark:text-gray-300">{char.itemLevel.toFixed(2)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <img src="/combat-power.svg" alt="전투력" className="w-[14px] h-[14px] object-contain flex-shrink-0" />
                            <span className="text-[11px] text-gray-500 dark:text-gray-400">
                              {char.combatPower != null ? char.combatPower.toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 dark:divide-[#21262d]">
              {raidRows.map(row => (
                <tr key={row.key} className="group">
                  <td className="sticky left-0 z-10 bg-white dark:bg-[#161b22] border-r border-gray-100 dark:border-[#21262d] px-3 py-1.5 min-w-[120px] w-[120px]">
                    <div className="space-y-1">
                      <div className="text-sm ns-bold text-gray-800 dark:text-gray-100">{row.raidName}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ns-bold px-1.5 py-0.5 rounded leading-tight
                          ${row.diffKey === 'nightmare'
                            ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400'
                            : row.diffKey === 'hard'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'}`}>
                          {row.diffLabel}
                        </span>
                        <span className="text-[11px] ns-bold text-yellow-600 dark:text-yellow-500">
                          {row.totalGold.toLocaleString()}G
                        </span>
                      </div>
                    </div>
                  </td>
                  {chars.map(char => {
                    const entry = (raids[char.id] || []).find(
                      e => e.raidId === row.raidId && e.difficulty === row.diffKey
                    )
                    return (
                      <td key={char.id} className="border-r border-gray-100 dark:border-[#21262d] last:border-r-0 p-1 min-w-[108px] w-[108px]">
                        <RaidCell
                          entry={entry}
                          totalGold={row.totalGold}
                          onToggle={() => toggleRaid(char.id, row.raidId, row.diffKey)}
                        />
                      </td>
                    )
                  })}
                </tr>
              ))}

              {raidRows.length === 0 && (
                <tr>
                  <td colSpan={chars.length + 1} className="py-16 text-center">
                    <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                    <p className="text-xs text-gray-300 dark:text-gray-700">레이드 설정에서 캐릭터별로 참여할 레이드를 추가하세요</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 모달 ── */}
      {showRaidSettings && (
        <RaidSettingsModal
          chars={chars}
          raids={raids}
          onToggle={toggleCharRaid}
          onToggleGold={toggleCharRaidGold}
          onClose={() => setShowRaidSettings(false)}
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

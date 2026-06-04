'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect } from 'react'
import { RAID_MAP, CLASS_COLOR, calcGoldBound, calcGoldTrade } from '@/lib/raidData'
import { LOA_KEY_STORAGE, DIFF_LABEL, DIFF_COLOR, GOLD_CHAR_LIMIT, EX_RAID_IDS } from '../_constants'
import { getClassIcon } from '../_constants'
import { IconInfo, IconItemLevel } from '../_icons'
import { autoSelectNormalRaids, autoSelectExRaid } from '../_raidHelpers'

// ── API 키 발급 가이드 모달 ────────────────────────────────────────────────────
function ApiKeyGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/30">
      <div className="w-full max-w-sm rounded-t-2xl sm:rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">API 키 발급 가이드</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-5 py-5 space-y-4">
          <ol className="space-y-3">
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-[var(--accent-200)] text-[var(--accent-900)] text-[11px] ns-bold flex items-center justify-center">1</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">포털 접속 및 로그인</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  <a href="https://developer-lostark.game.onstove.com/clients" target="_blank" rel="noreferrer"
                    className="text-[var(--accent-500)] underline underline-offset-2 hover:text-[var(--accent-600)]">
                    로스트아크 개발자 포털
                  </a>
                  에 접속해 스토브(Stove) 계정으로 로그인 후{' '}
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CREATE A NEW CLIENT</span> 버튼을 클릭하여 클라이언트 생성 페이지로 이동합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-[var(--accent-200)] text-[var(--accent-900)] text-[11px] ns-bold flex items-center justify-center">2</span>
              <div>
                <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">클라이언트 생성</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CLIENT NAME</span> 항목을 작성하고 이용약관을 체크한 뒤{' '}
                  <span className="ns-bold text-gray-700 dark:text-gray-300">CREATE</span> 버튼을 클릭하여 클라이언트를 생성합니다.
                </p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-[var(--accent-200)] text-[var(--accent-900)] text-[11px] ns-bold flex items-center justify-center">3</span>
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
            className="w-full rounded shadow-border-md py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            닫기
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 캐릭터 추가 모달 ──────────────────────────────────────────────────────────
export default function CharacterAddModal({ existingNames, existingGoldChars = [], onAdd, onClose, isLoggedIn = true, hasApiKey = true, onApiKeyRegistered, activeTabExpeditionId = null, getTargetTabName = null, expeditionHasExRaid = false }) {
  const [charName,            setCharName]            = useState('')
  const [apiKey,              setApiKey]              = useState('')
  const [keySaved,            setKeySaved]            = useState(false)
  const [loading,             setLoading]             = useState(false)
  const [error,               setError]               = useState('')
  const [results,             setResults]             = useState(null)
  const [selected,            setSelected]            = useState(new Set())
  const [showGuide,           setShowGuide]           = useState(false)
  const [step,                setStep]                = useState('search') // 'search' | 'choose' | 'setup'
  const [strategies,          setStrategies]          = useState({})      // { [name]: 'trade'|'bound'|'no_gold' }
  const [existingStrategies,   setExistingStrategies]   = useState(() => {  // { [name]: 'bound'|'trade'|'no_gold' }
    const init = {}
    existingGoldChars.forEach(c => { init[c.name] = 'bound' })
    return init
  })
  const [isNewExpedition,      setIsNewExpedition]      = useState(false)
  const [matchedExpeditionId,  setMatchedExpeditionId]  = useState(null)
  const [targetTabName,        setTargetTabName]        = useState(null)   // 저장될 탭 이름 (null = 새 탭)

  // localStorage에서 API 키 복원 (계정 등록 여부와 무관하게 항상)
  useEffect(() => {
    const saved = localStorage.getItem(LOA_KEY_STORAGE)
    if (saved) { setApiKey(saved); setKeySaved(true) }
  }, [])

  const search = async () => {
    if (!charName.trim()) return setError('캐릭터명을 입력하세요')
    if (!apiKey.trim() && !hasApiKey) return setError('로스트아크 API 키를 입력해주세요')
    setLoading(true); setError(''); setResults(null); setSelected(new Set()); setIsNewExpedition(false); setMatchedExpeditionId(null); setTargetTabName(null)
    try {
      const loaParams = new URLSearchParams({ characterName: charName.trim() })
      const res  = await fetch(`/api/loa?${loaParams}`, {
        headers: apiKey.trim() ? { 'X-Loa-Api-Key': apiKey.trim() } : {},
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '알 수 없는 오류')
      if (apiKey.trim()) {
        localStorage.setItem(LOA_KEY_STORAGE, apiKey.trim())
        setKeySaved(true)
      }
      // 검색 성공 시 DB에 API 키 저장
      if (isLoggedIn && apiKey.trim()) {
        fetch('/api/characters/apikey', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        }).then(r => { if (r.ok) onApiKeyRegistered?.() }).catch(() => {})
      }
      setResults(data)
      setSelected(new Set())
      setLoading(false)
      // 계정 확인 (현재 탭에 캐릭터가 있을 때만 의미 있음) — 로딩 UI와 분리
      if (isLoggedIn) {
        try {
          // siblingNames: 검색 결과의 모든 캐릭터명 (같은 원정대)
          const siblingNamesParam = (data || []).map(c => c.name).join(',')
          const chkParams = new URLSearchParams()
          if (siblingNamesParam) chkParams.set('siblingNames', siblingNamesParam)
          const chkRes  = await fetch(`/api/characters/check-account?${chkParams}`)
          const chkData  = await chkRes.json()
          const matchedExpId = chkData.matchedExpeditionId ?? null
          setIsNewExpedition(chkData.isNewExpedition === true)
          setMatchedExpeditionId(matchedExpId)
          // 현재 탭에 캐릭터가 있고 다른 원정대일 때, 저장될 탭 이름 미리 계산
          const isDifferentAcct = activeTabExpeditionId && (chkData.isNewExpedition || (matchedExpId && matchedExpId !== activeTabExpeditionId))
          if (isDifferentAcct && getTargetTabName) {
            setTargetTabName(getTargetTabName(matchedExpId)) // null이면 새 탭 생성 예정
          }
        } catch {}
      }
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
    // 같은 원정대에 이미 EX 레이드가 있으면 신규 캐릭터에 배정하지 않음
    const diffExp = !!(activeTabExpeditionId && (isNewExpedition || (matchedExpeditionId && matchedExpeditionId !== activeTabExpeditionId)))
    const alreadyHasEx = expeditionHasExRaid && !diffExp
    selectedChars.forEach((char, idx) => {
      const strategy = strategies[char.name] || 'bound'
      const normal   = autoSelectNormalRaids(char, strategy === 'no_gold' ? 'bound' : strategy)
      const entries  = [...normal]
      // EX 레이드는 원정대 전체에서 1개만 — 기존에 없고 최고레벨 캐릭터(idx=0)일 때만 배정
      if (idx === 0 && !alreadyHasEx) { const ex = autoSelectExRaid(char); if (ex) entries.unshift(ex) }
      if (strategy === 'no_gold') {
        // EX 레이드는 골드 해제 불가 — 나머지만 미수령 처리
        map[char.name] = entries.map(e => EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false })
      } else {
        map[char.name] = entries
      }
    })
    return map
  }, [selectedChars, strategies, expeditionHasExRaid, activeTabExpeditionId, isNewExpedition, matchedExpeditionId])

  const isDifferentExpedition = !!(activeTabExpeditionId && (isNewExpedition || (matchedExpeditionId && matchedExpeditionId !== activeTabExpeditionId)))
  const existingGoldCharCount = isDifferentExpedition ? 0 : existingGoldChars.filter(c => existingStrategies[c.name] !== 'no_gold').length
  const newGoldCharCount = selectedChars.filter(c => strategies[c.name] !== 'no_gold').length
  const goldCharCount = existingGoldCharCount + newGoldCharCount

  const goSetup = () => {
    const availableGoldSlots = Math.max(0, GOLD_CHAR_LIMIT - existingGoldCharCount)
    const init = {}
    selectedChars.forEach((c, idx) => {
      init[c.name] = strategies[c.name] || (idx < availableGoldSlots ? 'bound' : 'no_gold')
    })
    setStrategies(init)
    setStep('setup')
  }

  const handleConfirm = () => {
    const siblingNames = (results || []).map(c => c.name)
    const existingGoldOverrides = {}
    existingGoldChars.forEach(c => {
      if (existingStrategies[c.name] === 'no_gold') existingGoldOverrides[c.id] = 'no_gold'
    })
    onAdd(selectedChars, apiKey.trim(), raidsByName, charName.trim(), siblingNames, existingGoldOverrides)
    onClose()
  }

  const handleManualSetup = () => {
    const siblingNames = (results || []).map(c => c.name)
    const existingGoldOverrides = {}
    existingGoldChars.forEach(c => {
      if (existingStrategies[c.name] === 'no_gold') existingGoldOverrides[c.id] = 'no_gold'
    })
    onAdd(selectedChars, apiKey.trim(), {}, charName.trim(), siblingNames, existingGoldOverrides)
    onClose()
  }

  const newCount = results ? results.filter(c => selected.has(c.name)).length : 0

  // ── 스텝 2: 레이드 자동 설정 ──────────────────────────────────────────────
  if (step === 'setup') {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="w-full max-w-2xl rounded-t-2xl sm:rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>
          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
            <div>
              <span className="ns-bold text-gray-900 dark:text-white">레이드 자동 설정</span>
              <span className="ml-2 text-xs text-gray-400">캐릭터별 골드 전략을 선택하세요.</span>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
          </div>

          {/* 캐릭터별 미리보기 */}
          <div className="overflow-y-auto flex-1 px-4 py-3 space-y-3">
            {/* 기존 골드 수령 캐릭터 */}
            {existingGoldChars.length > 0 && !isDifferentExpedition && (
              <>
                <p className="text-[11px] ns-bold text-gray-400 dark:text-gray-500 px-1">기존 골드 수령 캐릭터</p>
                {existingGoldChars.map(char => {
                  const exStrategy = existingStrategies[char.name] || 'gold'
                  const isNoGold   = exStrategy === 'no_gold'
                  return (
                    <div key={char.id} className={`rounded-lg border overflow-hidden transition-opacity ${isNoGold ? 'border-gray-100 dark:border-[#2a2a2a] opacity-50' : 'border-gray-200 dark:border-[#383838]'}`}>
                      {/* 캐릭터 헤더 */}
                      <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#181818] border-b border-gray-100 dark:border-[#2a2a2a]">
                        {getClassIcon(char.class) && <Image src={getClassIcon(char.class)} alt={char.class} width={20} height={20} unoptimized className="class-icon w-5 h-5 object-contain flex-shrink-0" />}
                        <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate min-w-0">{char.name}</span>
                        <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                          <IconItemLevel />
                          <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{char.itemLevel?.toFixed(2)}</span>
                        </div>
                        <span className="flex-1" />
                        {/* 골드 전략 토글 */}
                        <div className="flex items-center gap-0.5 ml-1 rounded-md shadow-border-md overflow-hidden flex-shrink-0">
                          {[['no_gold','골드 미수령'],['trade','거래골드 우선'],['bound','전체골드 우선']].map(([key, label]) => (
                            <button key={key}
                              onClick={() => setExistingStrategies(prev => ({ ...prev, [char.name]: key }))}
                              className={`px-2 py-1 text-[10px] ns-bold transition-colors
                                ${exStrategy === key
                                  ? key === 'no_gold'
                                    ? 'bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400'
                                    : 'bg-[var(--accent-200)] dark:bg-[#2e2e2e] text-[var(--accent-800)] dark:text-gray-200'
                                  : 'text-gray-400 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      {/* 레이드 목록 */}
                      <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                        {char.raidEntries.length === 0 ? (
                          <p className="px-3 py-2.5 text-xs text-gray-400 dark:text-gray-600">설정된 레이드가 없습니다</p>
                        ) : char.raidEntries.map((entry, i) => {
                          const raid = RAID_MAP[entry.raidId]
                          const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                          if (!raid || !diff) return null
                          const allGates  = new Array(diff.gates).fill(true)
                          const goldBound = calcGoldBound(diff, allGates)
                          const goldTrade = calcGoldTrade(diff, allGates)
                          return (
                            <div key={i} className="flex items-center gap-2 px-3 py-2">
                              <Image src={raid.image} alt="" width={16} height={16} className="w-4 h-4 object-contain flex-shrink-0 opacity-70" />
                              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{raid.name}</span>
                                <span className={`text-[8px] ns-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DIFF_COLOR[entry.difficulty]}`}>
                                  {DIFF_LABEL[entry.difficulty]}
                                </span>
                              </div>
                              <div className="flex items-center gap-2 text-[10px] tabular-nums text-gray-400 flex-shrink-0">
                                {isNoGold
                                  ? <span className="text-gray-400 dark:text-gray-500">미수령</span>
                                  : <>
                                      {goldBound > 0 && <span className="text-orange-500 dark:text-orange-400">귀속 {goldBound.toLocaleString()}</span>}
                                      {goldTrade > 0 && <span className="text-blue-500 dark:text-blue-400">거래 {goldTrade.toLocaleString()}</span>}
                                    </>
                                }
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
                {selectedChars.length > 0 && (
                  <p className="text-[11px] ns-bold text-gray-400 dark:text-gray-500 px-1 pt-1">새로 추가할 캐릭터</p>
                )}
              </>
            )}

            {selectedChars.map((char, idx) => {
              const isRep     = char.isMainCharacter === true
              const strategy  = strategies[char.name] || ('bound')
              const entries   = raidsByName[char.name] || []
              return (
                <div key={char.name} className="rounded-lg shadow-border-md overflow-hidden">
                  {/* 캐릭터 헤더 */}
                  <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-[#181818] border-b border-gray-100 dark:border-[#2a2a2a]">
                    {/* 직업 아이콘 */}
                    {getClassIcon(char.class) && <Image src={getClassIcon(char.class)} alt={char.class} width={20} height={20} unoptimized className="class-icon w-5 h-5 object-contain flex-shrink-0" />}
                    {/* 왕관 (대표 캐릭터) */}
                    {isRep && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-[var(--accent-400)]">
                        <path d="M2 19h20v2H2v-2zm2-2l2-9 4 4 2-7 2 7 4-4 2 9H4z"/>
                      </svg>
                    )}
                    {/* 닉네임 */}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate min-w-0">{char.name}</span>
                    {/* 아이템레벨 */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <IconItemLevel />
                      <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{char.itemLevel.toFixed(2)}</span>
                    </div>
                    {/* 전투력 */}
                    {char.combatPower != null && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Image src="/combat-power.svg" alt="" width={10} height={10} unoptimized className="w-[10px] h-[10px] object-contain flex-shrink-0" />
                        <span className="text-[11px] tabular-nums text-gray-500 dark:text-gray-400">{Math.round(char.combatPower).toLocaleString()}</span>
                      </div>
                    )}
                    <span className="flex-1" />
                    {/* 전략 토글 */}
                    <div className="flex items-center gap-0.5 ml-1 rounded-md shadow-border-md overflow-hidden flex-shrink-0">
                      {[['no_gold','골드 미수령'],['trade','거래골드 우선'],['bound','전체골드 우선']].map(([key, label]) => (
                        <button key={key}
                          onClick={() => setStrategies(prev => ({ ...prev, [char.name]: key }))}
                          className={`px-2 py-1 text-[10px] ns-bold transition-colors
                            ${strategy === key
                              ? key === 'no_gold'
                                ? 'bg-gray-200 dark:bg-[#333] text-gray-500 dark:text-gray-400'
                                : 'bg-[var(--accent-200)] dark:bg-[#2e2e2e] text-[var(--accent-800)] dark:text-gray-200'
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
                      const raid = RAID_MAP[entry.raidId]
                      const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                      if (!raid || !diff) return null
                      const allGates  = new Array(diff.gates).fill(true)
                      const goldBound = calcGoldBound(diff, allGates)
                      const goldTrade = calcGoldTrade(diff, allGates)
                      return (
                        <div key={i} className="flex items-center gap-2 px-3 py-2">
                          <Image src={raid.image} alt="" width={16} height={16} className="w-4 h-4 object-contain flex-shrink-0 opacity-70" />
                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">{raid.name}</span>
                            <span className={`text-[8px] ns-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${DIFF_COLOR[entry.difficulty]}`}>
                              {DIFF_LABEL[entry.difficulty]}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] tabular-nums text-gray-400 flex-shrink-0">
                            {strategy === 'no_gold'
                              ? <span className="text-gray-400 dark:text-gray-500">미수령</span>
                              : <>
                                  {goldBound > 0 && <span className="text-orange-500 dark:text-orange-400">귀속 {goldBound.toLocaleString()}</span>}
                                  {goldTrade > 0 && <span className="text-blue-500 dark:text-blue-400">거래 {goldTrade.toLocaleString()}</span>}
                                </>
                            }
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
          <div className="px-5 pb-4 border-t border-gray-100 dark:border-[#383838] flex-shrink-0">
            {/* 골드 수령 캐릭터 카운터 */}
            <div className="flex items-center justify-between mt-3 mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                골드 수령 캐릭터
                {existingGoldCharCount > 0 && (
                  <span className="text-gray-400 dark:text-gray-500 ml-1">
                    ({existingGoldCharCount} 기존
                    {newGoldCharCount > 0 && ` + ${newGoldCharCount} 신규`})
                  </span>
                )}
                <span className={`ns-bold ml-1 ${goldCharCount > GOLD_CHAR_LIMIT ? 'text-red-500' : 'text-gray-700 dark:text-gray-200'}`}>
                  {goldCharCount}
                </span>
                <span className="text-gray-400 dark:text-gray-500"> / {GOLD_CHAR_LIMIT}</span>
              </span>
              {goldCharCount > GOLD_CHAR_LIMIT && (
                <span className="text-[11px] ns-bold text-red-500">골드 수령 {GOLD_CHAR_LIMIT}개 초과</span>
              )}
            </div>
            {goldCharCount > GOLD_CHAR_LIMIT && (
              <p className="text-[11px] text-red-400 mb-2 leading-relaxed">
                골드 수령 캐릭터가 {GOLD_CHAR_LIMIT}개를 초과했습니다. 초과된 캐릭터를 골드 미수령으로 변경해 주세요.
              </p>
            )}
            {/* 현재 탭에 캐릭터가 있고, 검색한 계정이 다를 때만 안내 표시 */}
            {activeTabExpeditionId && (isNewExpedition || (matchedExpeditionId && matchedExpeditionId !== activeTabExpeditionId)) && (
              <div className="flex items-start gap-2 mt-3 mb-3 px-3 py-2.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-500 dark:text-blue-400 flex-shrink-0 mt-0.5">
                  <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
                </svg>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  현재 원정대와 <span className="ns-bold">다른 계정</span>의 캐릭터입니다.<br/>
                  <span className="ns-bold">{targetTabName ? `${targetTabName} 탭` : '새 원정대 탭'}</span>에 저장됩니다.
                </p>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <button onClick={() => setStep('search')}
                className="flex-1 rounded shadow-border-md py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                이전
              </button>
              <button onClick={handleConfirm} disabled={goldCharCount > GOLD_CHAR_LIMIT}
                className="flex-1 rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm ns-bold text-[var(--accent-900)] dark:text-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                {selectedChars.length}개 캐릭터 추가
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // ── 스텝 1: 캐릭터 검색 ────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl max-h-[90dvh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">캐릭터 추가</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">캐릭터명</label>
            <input
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-[16px] bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-[var(--accent-400)] transition-colors"
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
                className="text-xs text-[var(--accent-500)] ns-light px-2 py-0.5 rounded hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/20 transition-colors">
                발급 가이드
              </button>
            </div>
            <input
              type="text"
              className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-[16px] font-mono bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-[var(--accent-400)] transition-colors"
              value={apiKey} onChange={e => { setApiKey(e.target.value); setKeySaved(false) }}
              onKeyDown={e => e.key === 'Enter' && search()}
            />
          </div>

          {!hasApiKey && !(apiKey.trim()) && (
            <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700/30">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-amber-500 dark:text-amber-400 flex-shrink-0 mt-0.5">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
              </svg>
              <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                <span className="ns-bold">API 키를 입력해야 캐릭터 검색을 사용할 수 있습니다.</span>
                {isLoggedIn && (
                  <>
                    <br />
                    API 키 입력 후 원정대 캐릭터 검색을 진행하시면 키가 등록됩니다.
                  </>
                )}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-500 dark:text-red-400">{error}</p>}

          <button onClick={search} disabled={loading}
            className="w-full rounded shadow-border-md py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
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
                        className="text-[10px] ns-bold text-[var(--accent-500)] px-1.5 py-0.5 rounded hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/20 transition-colors whitespace-nowrap">
                        자동선택
                      </button>
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-10 pointer-events-none">
                        <div className="bg-[var(--accent-200)] text-[var(--accent-900)] text-[10px] ns-bold rounded px-2.5 py-1.5 whitespace-nowrap shadow-lg">
                          아이템 레벨 높은 6개 캐릭터가 선택됩니다.
                        </div>
                        <div className="w-2 h-2 bg-[var(--accent-200)] rotate-45 mx-auto -mt-1" />
                      </div>
                    </div>
                    {/* 전체선택 / 전체해제 */}
                    <button
                      onClick={() => allSelected
                        ? setSelected(new Set())
                        : setSelected(new Set(selectables.map(c => c.name)))
                      }
                      className="text-[10px] ns-bold text-[var(--accent-500)] dark:text-[var(--accent-400)] px-1.5 py-0.5 rounded hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/20 transition-colors whitespace-nowrap">
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
                        : checked ? 'border-[var(--accent-400)]/60 bg-[var(--accent-50)]/50 dark:bg-[var(--accent-900)]/10'
                        : 'border-gray-200 dark:border-[#383838] hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    <input type="checkbox" checked={checked} disabled={already}
                      onChange={() => !already && toggleSelect(c.name)}
                      className="accent-[var(--accent-500)] w-3.5 h-3.5 flex-shrink-0"/>
                    {(() => { const icon = getClassIcon(c.class); return icon
                      ? <Image src={icon} alt={c.class} title={c.class} width={20} height={20} unoptimized className="class-icon w-5 h-5 flex-shrink-0 object-contain" />
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

        <div className="px-5 pb-4 border-t border-gray-100 dark:border-[#383838] mt-3">
          <div className="flex gap-2 pt-1">
            <button
              onClick={results !== null ? () => setResults(null) : onClose}
              className="flex-1 rounded shadow-border-md py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
              {results !== null ? '이전' : '취소'}
            </button>
            <button onClick={goSetup} disabled={newCount === 0}
              className="flex-1 rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-[var(--accent-900)] dark:text-gray-300 transition-colors">
              선택
            </button>
          </div>
        </div>
      </div>
      {showGuide && <ApiKeyGuideModal onClose={() => setShowGuide(false)} />}
    </div>
  )
}

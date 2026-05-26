'use client'

import Image from 'next/image'
import { useState, useMemo } from 'react'
import { RAIDS, RAID_MAP, calcGoldTrade, calcGoldBound } from '@/lib/raidData'
import { LOA_KEY_STORAGE, EX_RAID_IDS, getClassIcon } from '../_constants'
import { buildAutoRaids } from '../_raidHelpers'

// 아이템레벨 아이콘 (인라인 SVG)
function ItemLevelIcon({ size = 11 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 16 16" fill="none" className="flex-shrink-0 opacity-60">
      <path d="M8 1L10.5 5.5H13.5L11 8.5L12 13L8 10.5L4 13L5 8.5L2.5 5.5H5.5L8 1Z" fill="currentColor" className="text-yellow-500 dark:text-yellow-400" />
    </svg>
  )
}

// ── 자동 설정 모달 ────────────────────────────────────────────────────────────
export default function AutoSetupModal({ onApply, onClose, existingRaids, existingChars }) {
  const [charName,  setCharName]  = useState('')
  const [apiKey,    setApiKey]    = useState(() => (typeof window !== 'undefined' ? localStorage.getItem(LOA_KEY_STORAGE) || '' : ''))
  const [keySaved,  setKeySaved]  = useState(() => !!(typeof window !== 'undefined' && localStorage.getItem(LOA_KEY_STORAGE)))
  const [strategy,  setStrategy]  = useState('bound') // 'trade' | 'bound'
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
      <div className="w-full max-w-3xl rounded-t-2xl sm:rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <div>
            <span className="ns-bold text-gray-900 dark:text-gray-100">자동 설정</span>
            <span className="ml-2 text-xs text-gray-400">원정대 상위 6캐릭터를 자동으로 세팅합니다</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
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
                    {/* 직업 아이콘 */}
                    {getClassIcon(char.class) && (
                      <Image src={getClassIcon(char.class)} alt={char.class} width={20} height={20} unoptimized className="class-icon w-5 h-5 object-contain flex-shrink-0" />
                    )}
                    {/* 왕관 (최고레벨 캐릭터) */}
                    {idx === 0 && (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="flex-shrink-0 text-yellow-500 dark:text-yellow-400">
                        <path d="M2 19h20v2H2zM2 6l5 5 5-8 5 8 5-5v11H2z"/>
                      </svg>
                    )}
                    {/* 닉네임 */}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-200 truncate min-w-0">{char.name}</span>
                    {/* 아이템레벨 */}
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <ItemLevelIcon />
                      <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{char.itemLevel.toFixed(2)}</span>
                    </div>
                    {/* 전투력 */}
                    {char.combatPower != null && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <Image src="/combat-power.svg" alt="" width={10} height={10} unoptimized className="w-[10px] h-[10px] object-contain flex-shrink-0" />
                        <span className="text-xs tabular-nums text-gray-500 dark:text-gray-400">{Math.round(char.combatPower).toLocaleString()}</span>
                      </div>
                    )}
                    <span className="ml-auto text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">{entries.length}개 레이드</span>
                  </div>
                  {/* 레이드 목록 */}
                  <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                    {entries.map(entry => {
                      const raid = RAID_MAP[entry.raidId]
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
                          <Image src={raid.image} alt="" width={16} height={16} className="w-4 h-4 object-contain flex-shrink-0 opacity-70" />
                          <span className={`text-[8px] ns-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${diffColor}`}>{diff.label}</span>
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

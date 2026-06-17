'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect, useRef, useLayoutEffect } from 'react'
import { RAIDS, RAID_MAP } from '@/lib/raidData'
import { EX_RAID_IDS, HIDDEN_RAID_IDS, GOLD_RAID_LIMIT, GOLD_CHAR_LIMIT, getClassIcon } from '../_constants'
import { IconClass } from '../_icons'
import CustomItemsEditor from './CustomItemsEditor'

// ── 레이드 + 커스텀 숙제 설정 모달 — 원정대(탭)별 캐릭터 그룹 ───────────────────
export default function RaidSettingsModal({
  chars,
  raids,
  expPages,
  customItems,
  onToggle,
  onToggleGold,
  onClose,
  onConfirm,
  exRaidError,
  onClearExRaidError,
  onOpenCharAdd,
  initialCharId,
  onCustomAdd,
  onCustomDelete,
  onCustomDeleteAll,
  onCustomReorder,
}) {
  const expGroups = useMemo(() => {
    if (!chars.length) return []
    const byExp = new Map()
    chars.forEach(c => {
      const id = c.expeditionId || 'unknown'
      if (!byExp.has(id)) byExp.set(id, [])
      byExp.get(id).push(c)
    })
    const ordered = []
    const used = new Set()
    ;(expPages || []).forEach(p => {
      const list = byExp.get(p.id)
      if (list?.length) {
        ordered.push({ id: p.id, label: p.name, chars: list })
        used.add(p.id)
      }
    })
    byExp.forEach((list, id) => {
      if (!used.has(id)) {
        ordered.push({
          id,
          label: list[0]?.accountRepChar || '원정대',
          chars: list,
        })
      }
    })
    return ordered
  }, [chars, expPages])

  const [selectedCharId, setSelectedCharId] = useState('')
  const appliedInitialRef = useRef(false)
  const [settingsTab, setSettingsTab]       = useState('raid') // 'raid' | 'custom'
  const [goldError, setGoldError]           = useState(null)
  const [acctGoldError, setAcctGoldError]   = useState(null)
  const bodyScrollRef                       = useRef(null)

  useEffect(() => {
    if (!expGroups.length || !chars.length) return

    if (initialCharId && !appliedInitialRef.current) {
      appliedInitialRef.current = true
      if (chars.some(c => c.id === initialCharId)) {
        setSelectedCharId(initialCharId)
        return
      }
    }

    setSelectedCharId(prev => {
      if (prev && chars.some(c => c.id === prev)) return prev
      return expGroups[0]?.chars[0]?.id ?? ''
    })
  }, [chars, expGroups, initialCharId])

  const selectedGroup  = expGroups.find(g => g.chars.some(c => c.id === selectedCharId)) || expGroups[0]
  const groupChars     = selectedGroup?.chars || []
  const selectedChar   = chars.find(c => c.id === selectedCharId) || groupChars[0]
  const selectedExpId  = selectedGroup?.id ?? ''

  const setExpAndPickChar = (expId) => {
    const g = expGroups.find(x => x.id === expId)
    if (!g?.chars.length) return
    const keep = g.chars.some(c => c.id === selectedCharId)
    setSelectedCharId(keep ? selectedCharId : g.chars[0].id)
  }

  useLayoutEffect(() => {
    const el = bodyScrollRef.current
    if (el) el.scrollTop = 0
  }, [selectedCharId, settingsTab, selectedExpId])

  /** 캐릭터 아이템레벨로 입장 가능한 레이드·난이도만 */
  const raidsForLevel = useMemo(() => {
    if (!selectedChar) return []
    const il = selectedChar.itemLevel
    return RAIDS
      .filter(raid => !HIDDEN_RAID_IDS.has(raid.id))
      .filter(raid => il >= raid.minItemLevel)
      .map(raid => {
        const difficulties = raid.difficulties.filter(d => il >= d.minItemLevel)
        return difficulties.length ? { raid, difficulties } : null
      })
      .filter(Boolean)
  }, [selectedChar])

  const charRaidList = selectedChar ? (raids[selectedChar.id] || []) : []
  const activeKeys   = useMemo(() => new Set(charRaidList.map(e => `${e.raidId}_${e.difficulty}`)), [charRaidList])
  const normalGoldCount = charRaidList.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId]).length
  const exGoldCount     = charRaidList.filter(e => e.isGoldCheck &&  EX_RAID_IDS.has(e.raidId)).length

  const acctGoldMap = (() => {
    const seenKeys = []
    const map = {}
    chars.forEach(c => {
      const key = c.expeditionId || 'unknown'
      if (!map[key]) {
        seenKeys.push(key)
        map[key] = { key, label: c.accountRepChar || c.name, count: 0 }
      }
      if ((raids[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId])) map[key].count++
    })
    return seenKeys.map(k => map[k])
  })()
  const acctKey = selectedChar ? (selectedChar.expeditionId || 'unknown') : null
  const acctGoldCharCount = acctGoldMap.find(a => a.key === acctKey)?.count ?? 0
  const charHasGold       = charRaidList.some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId])

  const handleConfirm = () => {
    const exceeded = chars
      .map(char => ({
        name:  char.name,
        count: (raids[char.id] || []).filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId]).length,
      }))
      .filter(c => c.count > GOLD_RAID_LIMIT)
    if (exceeded.length > 0) { setGoldError(exceeded); return }

    const accountMap = {}
    chars.forEach(char => {
      const key = char.expeditionId || 'unknown'
      if (!accountMap[key]) accountMap[key] = { label: expPages?.find(p => p.id === key)?.name || '원정대', goldCount: 0 }
      if ((raids[char.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId]))
        accountMap[key].goldCount++
    })
    const acctExceeded = Object.values(accountMap).filter(a => a.goldCount > GOLD_CHAR_LIMIT)
    if (acctExceeded.length > 0) { setAcctGoldError(acctExceeded); return }

    onConfirm()
  }

  const focusExceededChar = (name) => {
    const ch = chars.find(c => c.name === name)
    if (ch) setSelectedCharId(ch.id)
  }

  if (!chars.length) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
        <div className="relative w-full max-w-md rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
          <button type="button" onClick={onClose} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none">×</button>
          <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
          <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
          <button type="button" onClick={() => { onClose(); onOpenCharAdd() }} className="mt-6 px-4 py-2 rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] text-sm ns-bold text-[var(--accent-900)] dark:text-gray-300 transition-colors">
            캐릭터 추가
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-3xl rounded-t-2xl sm:rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[90dvh]" onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <div>
            <span className="ns-bold text-gray-900 dark:text-white">숙제 설정</span>
            <span className="ml-2 text-xs text-gray-400 dark:text-gray-300">원정대와 캐릭터 선택 후 숙제를 설정해주세요</span>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">×</button>
        </div>

        {/* 원정대 탭 */}
        <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto border-b border-gray-100 dark:border-[#383838] flex-shrink-0 scrollbar-thin">
          {expGroups.map(g => (
            <button
              key={g.id}
              type="button"
              onClick={() => setExpAndPickChar(g.id)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs ns-bold transition-colors ${
                g.id === selectedExpId
                  ? 'bg-[var(--accent-200)] text-[var(--accent-900)] dark:text-white'
                  : 'shadow-border-md text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {g.label}
              <span className={`ml-1 tabular-nums ${g.id === selectedExpId ? 'text-[var(--accent-800)] dark:text-gray-300' : 'text-gray-400'}`}>
                ({g.chars.length})
              </span>
            </button>
          ))}
        </div>

        {/* 캐릭터 선택 (현재 원정대) */}
        <div className="flex gap-1.5 px-5 py-2.5 overflow-x-auto border-b border-gray-100 dark:border-[#383838] flex-shrink-0 scrollbar-thin">
          {groupChars.map(char => {
            const count = (raids[char.id] || []).length
            const active = char.id === selectedCharId
            const icon = getClassIcon(char.class)
            return (
              <button
                key={char.id}
                type="button"
                onClick={() => setSelectedCharId(char.id)}
                className={`flex-shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs ns-bold transition-colors border ${
                  active
                    ? 'bg-[var(--accent-200)] border-transparent text-[var(--accent-900)] dark:text-white'
                    : 'border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                }`}
              >
                {icon
                  ? <Image src={icon} alt="" width={14} height={14} unoptimized className="class-icon w-3.5 h-3.5 object-contain flex-shrink-0" />
                  : <span className="w-3.5 h-3.5 flex-shrink-0 text-gray-300"><IconClass /></span>
                }
                <span className="max-w-[7rem] truncate">{char.name}</span>
                {(raids[char.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId) && RAID_MAP[e.raidId]) && (
                  <Image src="/icons/coin.png" alt="골드 획득 캐릭터" width={12} height={12} className="w-3 h-3 object-contain flex-shrink-0" />
                )}
                {count > 0 && (
                  <span className={`text-[10px] px-1 rounded-full ns-bold ${
                    active ? 'bg-[var(--accent-400)]/40 text-[var(--accent-900)] dark:text-gray-200' : 'bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-300'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* 레이드 / 커스텀 탭 */}
        <div className="flex gap-2 px-5 pt-2 pb-0 border-b border-gray-100 dark:border-[#383838] flex-shrink-0">
          <button
            type="button"
            onClick={() => setSettingsTab('raid')}
            className={`relative px-3 py-2 text-xs ns-bold transition-colors rounded-t-lg ${
              settingsTab === 'raid'
                ? 'text-[var(--accent-900)] dark:text-[var(--accent-300)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            레이드 설정
            {settingsTab === 'raid' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent-400)]" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setSettingsTab('custom')}
            className={`relative px-3 py-2 text-xs ns-bold transition-colors rounded-t-lg ${
              settingsTab === 'custom'
                ? 'text-[var(--accent-900)] dark:text-[var(--accent-300)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/15'
                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
          >
            커스텀 설정
            {settingsTab === 'custom' && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 rounded-full bg-[var(--accent-400)]" />
            )}
          </button>
        </div>

        {settingsTab === 'raid' && (
        <div className="px-5 pt-3 pb-0 flex flex-wrap items-center gap-x-4 gap-y-1.5 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-400 dark:text-gray-500">골드 보상</span>
            <div className="flex gap-1">
              {[0, 1, 2].map(i => (
                <div key={i} className={`h-1.5 w-5 rounded-full transition-colors ${
                  normalGoldCount > GOLD_RAID_LIMIT ? 'bg-red-400' : i < normalGoldCount ? 'bg-[var(--accent-400)]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                }`} />
              ))}
            </div>
            <span className={`text-[11px] ns-bold transition-colors ${
              normalGoldCount > GOLD_RAID_LIMIT ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
            }`}>{normalGoldCount}/{GOLD_RAID_LIMIT}</span>
            <span className={`text-[10px] ns-bold px-1.5 py-0.5 rounded bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 ${exGoldCount > 0 ? '' : 'invisible'}`}>
              EX +{exGoldCount}
            </span>
          </div>
          {acctGoldMap.filter(({ key }) => key === acctKey).map(({ key, label, count }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[11px] text-gray-400 dark:text-gray-500">{label} 계정 골드 캐릭터</span>
              <div className="flex gap-0.5">
                {Array.from({ length: GOLD_CHAR_LIMIT }).map((_, i) => (
                  <div key={i} className={`h-1.5 w-3 rounded-full transition-colors ${
                    count > GOLD_CHAR_LIMIT ? 'bg-red-400' : i < count ? 'bg-[var(--accent-400)]' : 'bg-gray-200 dark:bg-[#2a2a2a]'
                  }`} />
                ))}
              </div>
              <span className={`text-[11px] ns-bold transition-colors ${
                count > GOLD_CHAR_LIMIT ? 'text-red-500 dark:text-red-400' : 'text-gray-500 dark:text-gray-400'
              }`}>{count}/{GOLD_CHAR_LIMIT}</span>
            </div>
          ))}
        </div>
        )}

        <div ref={bodyScrollRef} className="overflow-y-auto flex-1 px-5 py-3 min-h-0">
          {settingsTab === 'raid' && (
          <div className="space-y-1.5">
            <p className="text-[11px] ns-bold text-gray-500 dark:text-gray-400">
              레이드 <span className="font-normal text-gray-400">(아이템레벨 {selectedChar?.itemLevel?.toFixed(2) ?? '–'} 기준 입장 가능)</span>
            </p>
            {raidsForLevel.length === 0 ? (
              <p className="text-xs text-gray-400 dark:text-gray-500 py-6 text-center">
                현재 아이템레벨로 입장 가능한 레이드가 없습니다
              </p>
            ) : (
            raidsForLevel.map(({ raid, difficulties }) => (
                <div
                  key={raid.id}
                  className="rounded-lg shadow-border-md px-4 py-2.5 transition-colors"
                >
                  <div className="grid items-center gap-3" style={{ gridTemplateColumns: 'minmax(0,140px) 56px auto 1fr' }}>
                    <div className="flex items-center gap-1 min-w-0">
                      <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{raid.name}</span>
                      {charRaidList.find(e => e.raidId === raid.id)?.isGoldCheck && (
                        <Image src="/icons/gold.png" alt="골드" width={12} height={12} className="w-3 h-3 object-contain flex-shrink-0" />
                      )}
                    </div>
                    <span className="text-[11px] text-gray-400 dark:text-gray-500 whitespace-nowrap">{raid.minItemLevel.toLocaleString()}+</span>

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
                          type="button"
                          onClick={() => canToggle && selectedChar && entry && onToggleGold(selectedChar.id, raid.id, entry.difficulty)}
                          disabled={!hasActive || isEx && !isGold}
                          className="flex items-center gap-1.5 flex-shrink-0 disabled:cursor-not-allowed"
                          title={title}
                        >
                          <span className={`text-[10px] ns-bold transition-colors ${isGold ? 'text-[var(--accent-600)] dark:text-[var(--accent-400)]' : 'text-gray-300 dark:text-gray-600'}`}>골드</span>
                          <span className={`relative inline-flex h-4 w-7 flex-shrink-0 items-center rounded-full transition-colors ${
                            isGold    ? 'bg-[var(--accent-400)]'
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

                    <div className="flex gap-2 justify-end flex-wrap">
                      {difficulties.map(diff => {
                        const key           = `${raid.id}_${diff.key}`
                        const on            = activeKeys.has(key)
                        const totalGold     = (diff.goldBound || []).reduce((s,g) => s+g, 0) + (diff.goldTrade || []).reduce((s,g) => s+g, 0)
                        const diffStyle = on
                          ? diff.key === 'nightmare' ? 'border-purple-300 bg-purple-50 dark:bg-purple-900/15 text-purple-600 dark:text-purple-400'
                            : diff.key === 'hard' ? 'border-red-300 bg-red-50 dark:bg-red-900/15 text-red-600 dark:text-red-400'
                            : 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 text-[var(--accent-700)] dark:text-[var(--accent-400)]'
                          : 'border-gray-200 dark:border-[#383838] text-gray-400 dark:text-gray-500 hover:border-gray-300 dark:hover:border-gray-500'
                        return (
                          <button
                            type="button"
                            key={key}
                            disabled={!selectedChar}
                            onClick={() => selectedChar && onToggle(selectedChar.id, raid.id, diff.key)}
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
            ))
            )}
          </div>
          )}

          {settingsTab === 'custom' && selectedChar && (
            <CustomItemsEditor
              chars={chars}
              selectedChar={selectedChar}
              customItems={customItems}
              onAdd={onCustomAdd}
              onDelete={onCustomDelete}
              onDeleteAll={onCustomDeleteAll}
              onReorder={onCustomReorder}
            />
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#383838] flex-shrink-0">
          <button
            type="button"
            onClick={handleConfirm}
            className="w-full rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm font-medium text-[var(--accent-900)] dark:text-gray-300 transition-colors"
          >
            확인
          </button>
        </div>
      </div>

      {exRaidError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={onClearExRaidError}>
          <div className="relative w-full max-w-sm rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={onClearExRaidError} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
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
              <button type="button" onClick={onClearExRaidError} className="w-full rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm font-medium text-[var(--accent-900)] dark:text-gray-300 transition-colors">확인</button>
            </div>
          </div>
        </div>
      )}

      {goldError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={() => setGoldError(null)}>
          <div className="relative w-full max-w-sm rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setGoldError(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            <div className="px-5 pt-6 pb-4">
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
              <div className="space-y-1.5">
                {goldError.map(c => (
                  <div key={c.name} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#2a2a2a] shadow-border-md px-3 py-2.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{c.name}</span>
                    <span className="text-xs ns-bold text-orange-500 dark:text-orange-400">{c.count} / {GOLD_RAID_LIMIT}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => {
                  if (goldError[0]?.name) focusExceededChar(goldError[0].name)
                  setGoldError(null)
                }}
                className="w-full rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm font-medium text-[var(--accent-900)] dark:text-gray-300 transition-colors"
              >
                수정하러 갈게요!
              </button>
            </div>
          </div>
        </div>
      )}

      {acctGoldError && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/30" onClick={() => setAcctGoldError(null)}>
          <div className="relative w-full max-w-sm rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl" onClick={e => e.stopPropagation()}>
            <button type="button" onClick={() => setAcctGoldError(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
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
                  <div key={a.label} className="flex items-center justify-between rounded-lg bg-gray-50 dark:bg-[#2a2a2a] shadow-border-md px-3 py-2.5">
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">{a.label}</span>
                    <span className="text-xs ns-bold text-orange-500 dark:text-orange-400">{a.goldCount} / {GOLD_CHAR_LIMIT}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="px-5 pb-5">
              <button type="button" onClick={() => setAcctGoldError(null)} className="w-full rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] py-2 text-sm font-medium text-[var(--accent-900)] dark:text-gray-300 transition-colors">수정하러 갈게요!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

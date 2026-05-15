'use client'

import Image from 'next/image'
import { useState, useEffect, useRef } from 'react'
import { IconCheck, IconGrip, IconPlus } from '../_icons'
import { getClassIcon, EX_RAID_IDS } from '../_constants'
import CharacterAddModal from './CharacterAddModal'

// ── 캐릭터 설정 모달 ──────────────────────────────────────────────────────────
export default function CharacterEditModal({ chars, raids, onAdd, onDelete, onClose, onReorder, initialShowAdd = false, isDemo = false, hasApiKey = true, onApiKeyRegistered, onLoginRequired, activeTabExpeditionId = null, getTargetTabName = null, expeditionHasExRaid = false }) {
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

  const handleAdd = (newChars, apiKey, raidsByName, repCharName, siblingNames, existingGoldOverrides = {}) => {
    onAdd(newChars, apiKey, raidsByName, repCharName, siblingNames, existingGoldOverrides)
    onClose()
  }

  if (showAddChar) {
    const existingGoldChars = chars
      .filter(c => {
        const expedition = c.expeditionId || 'default'
        if (activeTabExpeditionId && expedition !== (activeTabExpeditionId || 'default')) return false
        return raids?.[c.id]?.some(e => e.isGoldCheck) ?? false
      })
      .map(c => ({ ...c, raidEntries: raids?.[c.id] || [] }))

    return (
      <CharacterAddModal
        existingNames={new Set(chars.map(c => c.name))}
        existingGoldChars={existingGoldChars}
        onAdd={handleAdd}
        onClose={() => setShowAddChar(false)}
        isLoggedIn={!isDemo}
        hasApiKey={hasApiKey}
        onApiKeyRegistered={onApiKeyRegistered}
        activeTabExpeditionId={activeTabExpeditionId}
        getTargetTabName={getTargetTabName}
        expeditionHasExRaid={expeditionHasExRaid}
      />
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>

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
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl leading-none">×</button>
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
                    ? <Image src={icon} alt={char.class} width={24} height={24} unoptimized className="class-icon w-6 h-6 object-contain flex-shrink-0" />
                    : <span className="w-6 h-6 flex-shrink-0" />
                  })()}

                  {/* 이름 + 메타 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                      {(raids?.[char.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)) && (
                        <Image src="/icons/coin.png" alt="골드 획득 캐릭터" width={12} height={12} className="w-3 h-3 object-contain flex-shrink-0" />
                      )}
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

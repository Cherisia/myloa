'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { getClassIcon } from '../_constants'
import { IconClass, IconPlus, IconGrip } from '../_icons'

const CUSTOM_MAX = 10

const PRESET_ITEMS = [
  { name: '쿠르잔 전선', type: 'daily',  image: '/schedule/kurzan.png'   },
  { name: '가디언 토벌', type: 'daily',  image: '/schedule/guardian.png' },
  { name: '할의 모래시계', type: 'weekly', image: '/schedule/hal.png'      },
  { name: '낙원',        type: 'weekly', image: '/schedule/paradise.png'  },
  { name: '큐브',        type: 'weekly', image: '/schedule/cube.png'      },
]

// 휴식 게이지가 적용되는 항목 이름
const REST_GAUGE_NAMES = new Set(['쿠르잔 전선', '가디언 토벌'])

export default function CustomSettingsModal({ chars, customItems, onAdd, onDelete, onDeleteAll, onReorder, onClose, initialCharId }) {
  const initialIdx = initialCharId ? Math.max(0, chars.findIndex(c => c.id === initialCharId)) : 0
  const [selectedIdx, setSelectedIdx] = useState(initialIdx)
  const [input, setInput]             = useState('')
  const [itemType, setItemType]       = useState('weekly')
  const [dragIdx, setDragIdx]         = useState(null)
  const [dropIdx, setDropIdx]         = useState(null)
  const inputRef                      = useRef(null)

  const selectedChar  = chars[selectedIdx]
  const charItems     = (selectedChar ? customItems[selectedChar.id] : null) || []
  const charItemNames = new Set(charItems.map(it => it.name))

  // 2개 이상 캐릭터에 존재하는 이름 — 전체 삭제 버튼 표시 기준
  const multiCharNames = useMemo(() => {
    const counts = new Map()
    chars.forEach(char => {
      ;(customItems[char.id] || []).forEach(it => counts.set(it.name, (counts.get(it.name) || 0) + 1))
    })
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name))
  }, [chars, customItems])
  const isFull        = charItems.length >= CUSTOM_MAX
  const isDuplicate   = !!input.trim() && charItemNames.has(input.trim())
  const canAdd        = !!input.trim() && !isFull && !isDuplicate

  // 다른 캐릭터에만 있고 이 캐릭터에 없는 고유 이름+타입 목록
  const otherItems = useMemo(() => {
    const seen = new Set(charItemNames)
    const result = []
    chars.forEach(char => {
      if (char.id === selectedChar?.id) return
      ;(customItems[char.id] || []).forEach(it => {
        if (!seen.has(it.name)) { seen.add(it.name); result.push(it) }
      })
    })
    return result
  }, [chars, customItems, selectedChar, charItemNames])

  useEffect(() => { inputRef.current?.focus() }, [selectedIdx])

  const handleAdd = () => {
    if (!canAdd || !selectedChar) return
    onAdd(selectedChar.id, input.trim(), itemType)
    setInput('')
    inputRef.current?.focus()
  }
  const handleAddAll = () => {
    const name = input.trim()
    if (!name) return
    chars.forEach(char => onAdd(char.id, name, itemType))
    setInput('')
    inputRef.current?.focus()
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape') onClose()
  }
  const handleSelectChar = (i) => { setSelectedIdx(i); setInput(''); }

  const handlePreset = (preset) => {
    if (!selectedChar || isFull || charItemNames.has(preset.name)) return
    onAdd(selectedChar.id, preset.name, preset.type, preset.image)
    inputRef.current?.focus()
  }
  const handlePresetAll = (e, preset) => {
    e.stopPropagation()
    chars.forEach(char => onAdd(char.id, preset.name, preset.type, preset.image))
    inputRef.current?.focus()
  }

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
      <div className="relative w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
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
            <div className="px-3 py-3 border-b border-gray-100 dark:border-[#2a2a2a] flex-shrink-0 space-y-2">
              {/* 일일/주간 토글 */}
              <div className="flex items-center gap-1.5">
                <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-[#383838]">
                  {[{ key: 'daily', label: '일일' }, { key: 'weekly', label: '주간' }].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => setItemType(key)}
                      className={`px-3 py-1 text-[10px] ns-bold transition-colors ${
                        itemType === key
                          ? 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900'
                          : 'bg-white dark:bg-[#181818] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#222]'
                      }`}
                    >{label}</button>
                  ))}
                </div>
              </div>
              {/* 이름 입력 */}
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
              {/* 예시 프리셋 */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {PRESET_ITEMS.map(preset => {
                  const already = charItemNames.has(preset.name)
                  return (
                    <div key={preset.name} className="flex items-center rounded-full border border-gray-200 dark:border-[#383838] overflow-hidden">
                      <button
                        onClick={() => handlePreset(preset)}
                        disabled={already || isFull}
                        className={`flex items-center gap-1 pl-2 pr-1.5 py-0.5 text-[10px] transition-colors ${
                          already || isFull
                            ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                            : 'text-gray-500 dark:text-gray-400 hover:text-yellow-700 dark:hover:text-yellow-400'
                        }`}
                      >
                        <img src={preset.image} alt="" className="w-3 h-3 object-contain flex-shrink-0" />
                        {preset.name}
                        <span className={`text-[9px] ${preset.type === 'daily' ? 'text-blue-400' : 'text-purple-400'}`}>
                          {preset.type === 'daily' ? '일' : '주'}
                        </span>
                      </button>
                      <button
                        onClick={e => handlePresetAll(e, preset)}
                        title="전체 캐릭터에 추가"
                        className="pl-1 pr-2 py-0.5 text-[9px] ns-bold text-gray-300 dark:text-gray-600 hover:text-yellow-500 dark:hover:text-yellow-400 transition-colors border-l border-gray-200 dark:border-[#383838]"
                      >전체</button>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* 항목 목록 (스크롤) */}
            <div className="flex-1 overflow-y-auto">
              {/* 이 캐릭터의 항목 — 드래그앤드랍 순서 변경 */}
              {charItems.length === 0 && otherItems.length === 0 ? (
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
                            className={`flex items-center gap-2 px-3 py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 select-none transition-colors ${
                              isDragging ? 'opacity-40' : isOver ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                            }`}
                          >
                            <span className="cursor-default text-gray-300 dark:text-gray-600 flex-shrink-0"><IconGrip /></span>
                            <span className="text-[10px] text-gray-300 dark:text-gray-700 w-4 text-center tabular-nums flex-shrink-0">{idx + 1}</span>
                            <div className="flex-1 flex items-center gap-1.5 min-w-0">
                              {item.image && <img src={item.image} alt="" className="w-[18px] h-[18px] object-contain flex-shrink-0" />}
                              <span className="text-xs ns-bold text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                              {item.type && (
                                <span className={`text-[9px] ns-bold flex-shrink-0 ${item.type === 'daily' ? 'text-blue-400' : 'text-purple-400'}`}>
                                  {item.type === 'daily' ? '일일' : '주간'}
                                </span>
                              )}
                            </div>
                            {multiCharNames.has(item.name) && (
                              <button
                                onClick={() => onDeleteAll(item.name)}
                                className="text-[9px] ns-bold text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors flex-shrink-0 whitespace-nowrap"
                              >전체삭제</button>
                            )}
                            <button
                              onClick={() => onDelete(selectedChar.id, item.id)}
                              className="text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors flex-shrink-0"
                            >
                              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}

                  {/* 다른 캐릭터 항목 — 체크박스로 추가 */}
                  {otherItems.length > 0 && (
                    <div className={charItems.length > 0 ? 'border-t border-gray-100 dark:border-[#2a2a2a]' : ''}>
                      <p className="px-3 py-2 text-[10px] ns-bold text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-[#1c1c1c]">
                        다른 캐릭터 숙제에서 추가
                      </p>
                      <ul>
                        {otherItems.map(it => (
                          <li
                            key={it.name}
                            onClick={() => !isFull && onAdd(selectedChar.id, it.name, it.type)}
                            className={`flex items-center gap-2.5 px-3 py-2.5 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 transition-colors ${
                              isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-[#282828]'
                            }`}
                          >
                            <div className="w-4 h-4 rounded border-2 border-gray-300 dark:border-[#555] flex-shrink-0" />
                            <span className="flex-1 text-xs text-gray-500 dark:text-gray-400">{it.name}</span>
                            {it.type && (
                              <span className={`text-[9px] ns-bold ${it.type === 'daily' ? 'text-blue-400' : 'text-purple-400'}`}>
                                {it.type === 'daily' ? '일일' : '주간'}
                              </span>
                            )}
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

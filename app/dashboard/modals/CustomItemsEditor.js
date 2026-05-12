'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { CUSTOM_MAX } from '../_constants'
import { BYNN_ARK_ICONS } from '../_bynnArkIcons'
import { IconPlus, IconGrip } from '../_icons'
import BynnArkIconPicker from './BynnArkIconPicker'

const PRESET_ITEMS = [
  { name: '쿠르잔 전선', type: 'daily',  image: '/schedule/kurzan.png'   },
  { name: '가디언 토벌', type: 'daily',  image: '/schedule/guardian.png' },
  { name: '할의 모래시계', type: 'weekly', image: '/schedule/hal.png'      },
  { name: '낙원',        type: 'weekly', image: '/schedule/paradise.png'  },
  { name: '큐브',        type: 'weekly', image: '/schedule/cube.png'      },
]

/**
 * 선택 캐릭터 기준 커스텀 숙제 편집 UI (좌측 캐릭터 목록 없음 — 부모에서 캐릭터 선택)
 */
export default function CustomItemsEditor({
  chars,
  selectedChar,
  customItems,
  onAdd,
  onDelete,
  onDeleteAll,
  onReorder,
  /** Escape 시 호출되면 레이드 설정 통합 창에서는 생략 */
  onEscapeClose,
  noTopBorder = false,
}) {
  const [input, setInput]       = useState('')
  const [itemType, setItemType] = useState('weekly')
  const [dragIdx, setDragIdx]   = useState(null)
  const [dropIdx, setDropIdx]   = useState(null)
  const inputRef                = useRef(null)
  /** 다음 추가에 붙일 아이콘 — 그리드에서 선택한 public URL */
  const [iconForAdd, setIconForAdd] = useState(null)

  const charItems     = (selectedChar ? customItems[selectedChar.id] : null) || []
  const charItemNames = useMemo(() => new Set(charItems.map(it => it.name)), [charItems])

  const multiCharNames = useMemo(() => {
    const counts = new Map()
    chars.forEach(char => {
      ;(customItems[char.id] || []).forEach(it => counts.set(it.name, (counts.get(it.name) || 0) + 1))
    })
    return new Set([...counts.entries()].filter(([, n]) => n > 1).map(([name]) => name))
  }, [chars, customItems])

  const otherItems = useMemo(() => {
    if (!selectedChar) return []
    const seen = new Set(charItemNames)
    const result = []
    chars.forEach(char => {
      if (char.id === selectedChar.id) return
      ;(customItems[char.id] || []).forEach(it => {
        if (!seen.has(it.name)) { seen.add(it.name); result.push(it) }
      })
    })
    return result
  }, [chars, customItems, selectedChar, charItemNames])

  const isFull      = charItems.length >= CUSTOM_MAX
  const isDuplicate = !!input.trim() && charItemNames.has(input.trim())
  const canAdd      = !!input.trim() && !isFull && !isDuplicate

  useEffect(() => { inputRef.current?.focus() }, [selectedChar?.id])
  useEffect(() => { setIconForAdd(null) }, [selectedChar?.id])

  const handleAdd = () => {
    if (!canAdd || !selectedChar) return
    onAdd(selectedChar.id, input.trim(), itemType, iconForAdd || undefined)
    setInput('')
    inputRef.current?.focus()
  }
  const handleAddAll = () => {
    const name = input.trim()
    if (!name) return
    const img = iconForAdd || undefined
    chars.forEach(char => onAdd(char.id, name, itemType, img))
    setInput('')
    inputRef.current?.focus()
  }
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleAdd()
    if (e.key === 'Escape' && onEscapeClose) onEscapeClose()
  }

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
    if (dragIdx === null || dragIdx === idx || !selectedChar) return
    const next = [...charItems]
    const [moved] = next.splice(dragIdx, 1)
    next.splice(idx, 0, moved)
    onReorder(selectedChar.id, next)
    setDragIdx(null); setDropIdx(null)
  }
  const handleDragEnd = () => { setDragIdx(null); setDropIdx(null) }

  if (!selectedChar) {
    return <p className="text-xs text-gray-400 dark:text-gray-600 px-1 py-2">캐릭터를 선택하면 숙제를 편집할 수 있어요</p>
  }

  return (
    <div className="flex flex-col min-h-0">
      <div className={`px-0 py-3 flex-shrink-0 space-y-2 ${noTopBorder ? '' : 'border-t border-gray-100 dark:border-[#383838]'}`}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap sm:gap-2">
          <div className="flex rounded-md overflow-hidden border border-gray-200 dark:border-[#383838] w-fit flex-shrink-0">
            {[{ key: 'daily', label: '일일' }, { key: 'weekly', label: '주간' }].map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setItemType(key)}
                className={`px-3 py-1 text-[10px] ns-bold transition-colors ${
                  itemType === key
                    ? 'bg-yellow-400 dark:bg-yellow-500 text-yellow-900'
                    : 'bg-white dark:bg-[#181818] text-gray-500 dark:text-gray-400 hover:bg-yellow-50/90 dark:hover:bg-[#252525]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex-1 min-w-[140px] relative sm:min-w-[min(12rem,100%)] sm:max-w-md">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value.slice(0, 10))}
              onKeyDown={handleKeyDown}
              disabled={isFull}
              placeholder={isFull ? '최대 10개까지' : '숙제 이름 (최대 10자)'}
              className={`w-full rounded-lg border px-3 py-1.5 text-xs text-gray-800 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-600 outline-none transition-colors disabled:opacity-50 bg-white dark:bg-[#181818] hover:border-yellow-200/80 dark:hover:border-[#4a4a4a] ${
                isDuplicate ? 'border-red-300 dark:border-red-700 focus:border-red-400' : 'border-gray-200 dark:border-[#383838] focus:border-yellow-400 dark:focus:border-yellow-500/70 focus:ring-2 focus:ring-yellow-400/20 dark:focus:ring-yellow-500/15'
              }`}
            />
            {isDuplicate && (
              <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-red-400 whitespace-nowrap">이미 있어요</span>
            )}
          </div>
          <BynnArkIconPicker
            icons={BYNN_ARK_ICONS}
            value={iconForAdd}
            onChange={setIconForAdd}
            disabled={isFull}
          />
          <div className="flex gap-2 flex-shrink-0">
            <button type="button" onClick={handleAdd} disabled={!canAdd}
              className="flex items-center gap-1 rounded-lg bg-yellow-400 dark:bg-yellow-500 px-3 py-1.5 text-xs ns-bold text-yellow-900 disabled:opacity-40 hover:bg-yellow-500 dark:hover:bg-yellow-400 active:bg-yellow-600 dark:active:bg-yellow-600 transition-colors">
              <IconPlus size={11} /> 추가
            </button>
            <button type="button" onClick={handleAddAll} disabled={!input.trim() || isDuplicate}
              className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-[#404040] bg-white dark:bg-[#1c1c1c] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-yellow-50/90 hover:border-yellow-300/60 dark:hover:bg-[#2a2a2a] dark:hover:border-[#505050] transition-colors whitespace-nowrap">
              원정대 추가
            </button>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {PRESET_ITEMS.map(preset => {
            const already = charItemNames.has(preset.name)
            return (
              <div key={preset.name} className="flex items-center rounded-full border border-gray-200 dark:border-[#383838] overflow-hidden">
                <button
                  type="button"
                  onClick={() => handlePreset(preset)}
                  disabled={already || isFull}
                      className={`flex items-center gap-1 pl-2 pr-1.5 py-0.5 text-[10px] transition-colors ${
                    already || isFull
                      ? 'text-gray-300 dark:text-gray-700 cursor-not-allowed'
                      : 'text-gray-500 dark:text-gray-400 hover:text-yellow-700 dark:hover:text-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-transparent'
                  }`}
                >
                  <img src={preset.image} alt="" className="custom-homework-icon w-3 h-3 object-contain flex-shrink-0" />
                  {preset.name}
                  <span className={`text-[9px] ${preset.type === 'daily' ? 'text-blue-400' : 'text-purple-400'}`}>
                    {preset.type === 'daily' ? '일' : '주'}
                  </span>
                </button>
                <button
                  type="button"
                  onClick={e => handlePresetAll(e, preset)}
                  title="원정대 캐릭터에 추가"
                  className="pl-1 pr-2 py-0.5 text-[9px] ns-bold text-gray-400 dark:text-gray-600 hover:text-yellow-700 dark:hover:text-yellow-400 hover:bg-yellow-50/60 dark:hover:bg-[#2a2a2a] transition-colors border-l border-gray-200 dark:border-[#383838]"
                >
                  원정대
                </button>
              </div>
            )
          })}
        </div>
      </div>

      <div className="max-h-[220px] overflow-y-auto rounded-lg border border-gray-100 dark:border-[#383838]">
        {charItems.length === 0 && otherItems.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 gap-1">
            <p className="text-xs text-gray-400 dark:text-gray-600">아직 추가된 숙제가 없어요</p>
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
                      className={`flex items-center gap-2 px-3 py-2 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 select-none transition-colors ${
                        isDragging ? 'opacity-40' : isOver ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''
                      }`}
                    >
                      <span className="cursor-default text-gray-300 dark:text-gray-600 flex-shrink-0"><IconGrip /></span>
                      <span className="text-[10px] text-gray-300 dark:text-gray-700 w-4 text-center tabular-nums flex-shrink-0">{idx + 1}</span>
                      <div className="flex-1 flex items-center gap-1.5 min-w-0">
                        {item.image && <img src={item.image} alt="" className="custom-homework-icon w-[18px] h-[18px] object-contain flex-shrink-0" />}
                        <span className="text-xs ns-bold text-gray-700 dark:text-gray-200 truncate">{item.name}</span>
                        {item.type && (
                          <span className={`text-[9px] ns-bold flex-shrink-0 ${item.type === 'daily' ? 'text-blue-400' : 'text-purple-400'}`}>
                            {item.type === 'daily' ? '일일' : '주간'}
                          </span>
                        )}
                      </div>
                      {multiCharNames.has(item.name) && (
                        <button type="button"
                          onClick={() => onDeleteAll(item.name)}
                          className="text-[9px] ns-bold text-gray-300 dark:text-gray-600 hover:text-red-400 dark:hover:text-red-500 transition-colors flex-shrink-0 whitespace-nowrap"
                        >
                          원정대삭제
                        </button>
                      )}
                      <button type="button"
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
            {otherItems.length > 0 && (
              <div className={charItems.length > 0 ? 'border-t border-gray-100 dark:border-[#2a2a2a]' : ''}>
                <p className="px-3 py-2 text-[10px] ns-bold text-gray-400 dark:text-gray-600 bg-gray-50 dark:bg-[#1c1c1c]">
                  다른 캐릭터 숙제에서 추가
                </p>
                <ul>
                  {otherItems.map(it => (
                    <li
                      key={it.name}
                      role="button"
                      tabIndex={0}
                      onClick={() => !isFull && onAdd(selectedChar.id, it.name, it.type, it.image)}
                      onKeyDown={e => e.key === 'Enter' && !isFull && onAdd(selectedChar.id, it.name, it.type, it.image)}
                      className={`flex items-center gap-2.5 px-3 py-2 border-b border-gray-50 dark:border-[#2a2a2a] last:border-b-0 transition-colors ${
                        isFull ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:bg-yellow-50/70 dark:hover:bg-[#282828]'
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
  )
}

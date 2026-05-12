'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'

/**
 * Lost Ark 아이콘 그리드 선택 (라이트/다크·핑크 테마와 동일 톤)
 * 닫기: 우측 상단 X만. 아이콘 선택 시 확정 후 닫힘.
 * icons 항목: { id, src, label, category?: string | null }
 */
export default function BynnArkIconPicker({
  icons,
  value,
  onChange,
  disabled = false,
}) {
  const [open, setOpen]     = useState(false)
  const [anchor, setAnchor] = useState({ top: 0, left: 0 })
  const triggerRef          = useRef(null)
  const panelRef            = useRef(null)

  const panelW = 384
  const panelMaxH = 428

  const updateAnchor = useCallback(() => {
    const el = triggerRef.current
    if (!el) return
    const r = el.getBoundingClientRect()
    let left = Math.max(8, Math.min(r.left, window.innerWidth - panelW - 8))
    let top = r.bottom + 8
    if (top + panelMaxH > window.innerHeight - 8) {
      top = Math.max(8, r.top - panelMaxH - 8)
    }
    setAnchor({ top, left })
  }, [])

  useEffect(() => {
    if (!open) return
    updateAnchor()
    window.addEventListener('resize', updateAnchor)
    return () => {
      window.removeEventListener('resize', updateAnchor)
    }
  }, [open, updateAnchor])

  const selectIcon = (src) => {
    onChange(src)
    setOpen(false)
  }

  const panel = open && typeof document !== 'undefined' && (
    <div
      ref={panelRef}
      className="fixed z-[300] flex flex-col overflow-hidden rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl shadow-black/15 ring-1 ring-black/5 dark:shadow-black/50 dark:ring-white/[0.06] max-h-[min(72vh,428px)]"
      style={{ top: anchor.top, left: anchor.left, width: panelW }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="px-3 pt-3 pb-2 border-b border-gray-100 dark:border-[#2a2a2a] flex-shrink-0 bg-gradient-to-b from-gray-50/80 to-transparent dark:from-[#262626]/90 dark:to-transparent">
        <div className="flex items-center justify-between gap-2">
          <p className="text-[11px] ns-bold text-gray-700 dark:text-gray-200 tracking-tight">아이콘 선택</p>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="flex-shrink-0 -mr-1 p-1 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 dark:hover:text-gray-200 dark:hover:bg-[#333] transition-colors"
            aria-label="닫기"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2">
        {icons.length === 0 ? (
          <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 py-10">아이콘이 없습니다</p>
        ) : (
          <div
            className="grid gap-2 pt-1 pb-1"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(42px, 1fr))' }}
          >
            {icons.map((ic) => {
              const selected = value === ic.src
              return (
                <button
                  key={ic.id}
                  type="button"
                  title={ic.label}
                  onClick={() => selectIcon(ic.src)}
                  className={`group aspect-square rounded-xl border flex items-center justify-center p-1.5 transition-all ${
                    selected
                      ? 'border-yellow-400 bg-yellow-50 ring-2 ring-yellow-400/45 dark:border-yellow-500/70 dark:bg-yellow-900/20 dark:ring-yellow-400/35'
                      : 'border-gray-200/90 bg-gray-50 hover:border-gray-300 hover:bg-white hover:shadow-sm dark:border-[#353535] dark:bg-[#2a2a2a] dark:hover:border-[#484848] dark:hover:bg-[#303030]'
                  }`}
                >
                  <img
                    src={ic.src}
                    alt=""
                    className="custom-homework-icon w-7 h-7 object-contain opacity-95 group-hover:opacity-100 transition-opacity"
                    loading="lazy"
                  />
                </button>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <>
      <div className="inline-flex items-center gap-1.5 flex-wrap">
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!open) {
              updateAnchor()
              setOpen(true)
            }
          }}
          className="flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-[#404040] bg-white dark:bg-[#2a2a2a] px-2.5 py-1.5 text-[11px] ns-bold text-gray-800 dark:text-gray-100 hover:bg-yellow-50/90 hover:border-yellow-300/70 dark:hover:bg-[#333] dark:hover:border-yellow-500/40 disabled:opacity-40 transition-colors shadow-sm shadow-black/[0.03] dark:shadow-none"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-yellow-600 dark:text-yellow-500 opacity-80">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          아이콘 선택
        </button>
        {value != null && value !== '' && (
          <div className="flex items-center gap-1">
            <div className="w-8 h-8 rounded-lg border border-gray-200 dark:border-[#404040] bg-white dark:bg-[#1c1c1c] flex items-center justify-center overflow-hidden p-0.5 shadow-sm shadow-black/[0.04] dark:shadow-none ring-0 transition-shadow hover:ring-2 hover:ring-yellow-400/25 dark:hover:ring-yellow-500/20">
              <img src={value} alt="" className="custom-homework-icon w-full h-full object-contain" />
            </div>
            <button
              type="button"
              title="아이콘 해제"
              onClick={() => onChange(null)}
              className="text-[10px] text-gray-400 hover:text-red-500 dark:hover:text-red-400 px-1 transition-colors"
            >
              해제
            </button>
          </div>
        )}
      </div>
      {panel && createPortal(panel, document.body)}
    </>
  )
}

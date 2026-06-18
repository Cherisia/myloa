'use client'

import { useState, useEffect, useRef } from 'react'

const KO_DAYS = ['일', '월', '화', '수', '목', '금', '토']
const MINUTES = [0, 10, 20, 30, 40, 50]

const pad = n => String(n).padStart(2, '0')

function parseKST(str) {
  if (!str) return null
  const [d, t] = str.split('T')
  if (!d || !t) return null
  const [year, month, day] = d.split('-').map(Number)
  const [hour, minute]     = t.split(':').map(Number)
  if (isNaN(year) || isNaN(hour)) return null
  return { year, month, day, hour, minute }
}

function buildKST(year, month, day, hour, minute) {
  return `${year}-${pad(month)}-${pad(day)}T${pad(hour)}:${pad(minute)}`
}

function formatDisplay(str) {
  const p = parseKST(str)
  if (!p) return null
  const dow = new Date(p.year, p.month - 1, p.day).getDay()
  const ampm = p.hour < 12 ? '오전' : '오후'
  const h12  = p.hour % 12 || 12
  return `${p.month}월 ${p.day}일 (${KO_DAYS[dow]}) ${ampm} ${h12}:${pad(p.minute)}`
}

function buildCalendar(year, month) {
  const firstDow   = new Date(year, month - 1, 1).getDay()
  const daysInCur  = new Date(year, month, 0).getDate()
  const daysInPrev = new Date(year, month - 1, 0).getDate()
  const cells = []

  for (let i = firstDow - 1; i >= 0; i--) {
    const py = month === 1 ? year - 1 : year
    const pm = month === 1 ? 12 : month - 1
    cells.push({ year: py, month: pm, day: daysInPrev - i, outside: true })
  }
  for (let d = 1; d <= daysInCur; d++) {
    cells.push({ year, month, day: d, outside: false })
  }
  const rem = 42 - cells.length
  for (let d = 1; d <= rem; d++) {
    const ny = month === 12 ? year + 1 : year
    const nm = month === 12 ? 1 : month + 1
    cells.push({ year: ny, month: nm, day: d, outside: true })
  }
  return cells
}

function nextTimeSlot() {
  const now  = new Date()
  const h    = now.getHours()
  const m    = now.getMinutes()
  const nextM = Math.ceil((m + 1) / 10) * 10
  if (nextM >= 60) return { hour: (h + 1) % 24, minute: 0 }
  return { hour: h, minute: nextM }
}

export default function DateTimePicker({ value, onChange }) {
  const parsed = parseKST(value)
  const now    = new Date()
  const slot   = nextTimeSlot()

  const [open,      setOpen]      = useState(false)
  const [calYear,   setCalYear]   = useState(parsed?.year  ?? now.getFullYear())
  const [calMonth,  setCalMonth]  = useState(parsed?.month ?? now.getMonth() + 1)
  const [selDay,    setSelDay]    = useState(parsed
    ? { year: parsed.year, month: parsed.month, day: parsed.day }
    : { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() })
  const [selHour,   setSelHour]   = useState(parsed?.hour   ?? slot.hour)
  const [selMinute, setSelMinute] = useState(parsed?.minute ?? slot.minute)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    // value 없으면 열리는 순간 오늘+다음 슬롯을 자동 선택
    if (!value) {
      const d = selDay
      onChange(buildKST(d.year, d.month, d.day, selHour, selMinute))
    }
    const fn = e => { if (!ref.current?.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', fn)
    return () => document.removeEventListener('mousedown', fn)
  }, [open]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const p = parseKST(value)
    if (!p) return
    setSelDay({ year: p.year, month: p.month, day: p.day })
    setSelHour(p.hour)
    setSelMinute(p.minute)
    setCalYear(p.year)
    setCalMonth(p.month)
  }, [value])

  function emit(day, h, m) {
    if (!day) return
    onChange(buildKST(day.year, day.month, day.day, h, m))
  }

  function handleDay(cell) {
    const next = { year: cell.year, month: cell.month, day: cell.day }
    if (cell.outside) { setCalYear(cell.year); setCalMonth(cell.month) }
    setSelDay(next)
    emit(next, selHour, selMinute)
  }

  function prevMonth() {
    if (calMonth === 1) { setCalYear(y => y - 1); setCalMonth(12) }
    else setCalMonth(m => m - 1)
  }
  function nextMonth() {
    if (calMonth === 12) { setCalYear(y => y + 1); setCalMonth(1) }
    else setCalMonth(m => m + 1)
  }

  const display  = formatDisplay(value)
  const cells    = buildCalendar(calYear, calMonth)
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
  const selStr   = selDay ? `${selDay.year}-${pad(selDay.month)}-${pad(selDay.day)}` : ''

  return (
    <div ref={ref} className="relative">
      {/* 트리거 */}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between gap-2 pl-3.5 pr-3 py-2.5 text-sm rounded-xl border transition-colors text-left
          ${open
            ? 'border-[var(--accent-400)] ring-2 ring-[var(--accent-400)]/30 bg-white dark:bg-[#252525]'
            : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] hover:border-gray-300 dark:hover:border-[#444]'}
          ${display ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
      >
        <span>{display ?? '날짜, 시간을 선택해주세요'}</span>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-400 flex-shrink-0">
          <rect x="3" y="4" width="18" height="18" rx="2"/>
          <line x1="16" y1="2" x2="16" y2="6"/>
          <line x1="8"  y1="2" x2="8"  y2="6"/>
          <line x1="3"  y1="10" x2="21" y2="10"/>
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 left-0 right-0 top-full mt-1.5 rounded-2xl border border-gray-100 dark:border-[#2a2a2a] bg-white dark:bg-[#1e1e1e] shadow-xl overflow-hidden">
          <div className="flex">
            {/* 달력 */}
            <div className="p-3 flex-1 min-w-0">
              {/* 월 네비 */}
              <div className="flex items-center justify-between mb-2">
                <button type="button" onClick={prevMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M12.79 5.23a.75.75 0 01-.02 1.06L8.832 10l3.938 3.71a.75.75 0 11-1.04 1.08l-4.5-4.25a.75.75 0 010-1.08l4.5-4.25a.75.75 0 011.06.02z" clipRule="evenodd"/>
                  </svg>
                </button>
                <span className="text-sm ns-bold text-gray-800 dark:text-gray-100">
                  {calYear}년 {calMonth}월
                </span>
                <button type="button" onClick={nextMonth}
                  className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-500 transition-colors">
                  <svg width="14" height="14" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd"/>
                  </svg>
                </button>
              </div>

              {/* 요일 헤더 */}
              <div className="grid grid-cols-7 mb-0.5">
                {KO_DAYS.map((d, i) => (
                  <div key={d} className={`text-center text-[10px] ns-bold py-1
                    ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : 'text-gray-400 dark:text-gray-500'}`}>
                    {d}
                  </div>
                ))}
              </div>

              {/* 날짜 셀 */}
              <div className="grid grid-cols-7">
                {cells.map((cell, i) => {
                  const cellStr  = `${cell.year}-${pad(cell.month)}-${pad(cell.day)}`
                  const isSel    = cellStr === selStr
                  const isToday  = cellStr === todayStr
                  const col      = i % 7
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleDay(cell)}
                      className={`h-8 flex items-center justify-center rounded-full text-[11px] transition-colors
                        ${isSel
                          ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                          : cell.outside
                            ? 'text-gray-300 dark:text-gray-600'
                            : isToday
                              ? 'ns-bold text-[var(--accent-600)] dark:text-[var(--accent-400)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/20'
                              : col === 0
                                ? 'text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10'
                                : col === 6
                                  ? 'text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/10'
                                  : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      {cell.day}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 시간 선택 */}
            <div className="border-l border-gray-100 dark:border-[#2a2a2a] flex flex-col w-[116px] flex-shrink-0">
              {/* 오전/오후 탭 */}
              <div className="flex border-b border-gray-100 dark:border-[#2a2a2a]">
                {['오전', '오후'].map(label => {
                  const isAm  = label === '오전'
                  const active = isAm ? selHour < 12 : selHour >= 12
                  return (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        const h = isAm
                          ? (selHour >= 12 ? selHour - 12 : selHour)
                          : (selHour < 12  ? selHour + 12 : selHour)
                        setSelHour(h)
                        emit(selDay, h, selMinute)
                      }}
                      className={`flex-1 py-2 text-xs ns-bold transition-colors border-b-2 -mb-px
                        ${active
                          ? 'border-[var(--accent-400)] text-[var(--accent-600)] dark:text-[var(--accent-400)]'
                          : 'border-transparent text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>

              {/* 시 버튼 그리드 */}
              <div className="p-2 grid grid-cols-3 gap-1 flex-1">
                {Array.from({ length: 12 }, (_, i) => selHour >= 12 ? i + 12 : i).map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => { setSelHour(h); emit(selDay, h, selMinute) }}
                    className={`py-1.5 rounded-lg text-xs transition-colors
                      ${selHour === h
                        ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}
                  >
                    {h}
                  </button>
                ))}</div>

              <div className="border-t border-gray-100 dark:border-[#2a2a2a] p-2">
                <p className="text-[10px] ns-bold text-gray-400 dark:text-gray-500 mb-1.5">분</p>
                <div className="grid grid-cols-3 gap-1">
                  {MINUTES.map(m => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setSelMinute(m); emit(selDay, selHour, m) }}
                      className={`py-1.5 rounded-lg text-xs transition-colors
                        ${selMinute === m
                          ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                          : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-[#2a2a2a]'}`}
                    >
                      {pad(m)}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* 하단 푸터 */}
          <div className="border-t border-gray-100 dark:border-[#2a2a2a] px-3 py-2.5 flex items-center justify-between">
            <span className="text-xs text-gray-600 dark:text-gray-300 ns-bold">
              {display ?? <span className="text-gray-300 dark:text-gray-600 font-normal">날짜와 시간을 선택하세요</span>}
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="px-4 py-1.5 text-xs ns-bold rounded-lg bg-[var(--accent-400)] text-[var(--accent-900)] hover:bg-[var(--accent-300)] transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

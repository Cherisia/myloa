'use client'

import { useState, useMemo, useEffect, useRef } from 'react'
import { RAIDS, RAID_MAP } from '@/lib/raidData'
import { DIFF_LABEL, HIDDEN_RAID_IDS, SUPPORT_CLASSES, defaultRole, getClassIcon } from '@/app/dashboard/_constants'
import { raidStatusOf } from '@/lib/groupRaidShare'
import { IconX } from '@/app/dashboard/_icons'
import DateTimePicker from './DateTimePicker'

// 선택됐을 때: 진한 색
const DIFF_SELECTED = {
  nightmare: 'bg-violet-500 border-violet-500 text-white',
  hard:      'bg-red-500   border-red-500   text-white',
  normal:    'bg-sky-500   border-sky-500   text-white',
  stage3:    'bg-violet-500 border-violet-500 text-white',
  stage2:    'bg-red-500   border-red-500   text-white',
  stage1:    'bg-sky-500   border-sky-500   text-white',
}
// 미선택: 연한 배경 + 컬러 텍스트
const DIFF_IDLE = {
  nightmare: 'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800/40 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30',
  hard:      'bg-red-50    border-red-200    text-red-600    dark:bg-red-900/20    dark:border-red-800/40    dark:text-red-400    hover:bg-red-100    dark:hover:bg-red-900/30',
  normal:    'bg-sky-50    border-sky-200    text-sky-600    dark:bg-sky-900/20    dark:border-sky-800/40    dark:text-sky-400    hover:bg-sky-100    dark:hover:bg-sky-900/30',
  stage3:    'bg-violet-50 border-violet-200 text-violet-600 dark:bg-violet-900/20 dark:border-violet-800/40 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/30',
  stage2:    'bg-red-50    border-red-200    text-red-600    dark:bg-red-900/20    dark:border-red-800/40    dark:text-red-400    hover:bg-red-100    dark:hover:bg-red-900/30',
  stage1:    'bg-sky-50    border-sky-200    text-sky-600    dark:bg-sky-900/20    dark:border-sky-800/40    dark:text-sky-400    hover:bg-sky-100    dark:hover:bg-sky-900/30',
}

function formatKSTInput(iso) {
  const d = new Date(iso)
  const kst = new Date(d.getTime() + 9 * 3600 * 1000)
  const pad = n => String(n).padStart(2, '0')
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth()+1)}-${pad(kst.getUTCDate())}T${pad(kst.getUTCHours())}:${pad(kst.getUTCMinutes())}`
}

function kstInputToISO(localStr) {
  const d = new Date(localStr)
  return new Date(d.getTime() - 9 * 3600 * 1000).toISOString()
}

function nextSlotKST() {
  const now  = new Date()
  const kst  = new Date(now.getTime() + 9 * 3600 * 1000)
  const h    = kst.getUTCHours()
  const m    = kst.getUTCMinutes()
  const pad  = n => String(n).padStart(2, '0')
  const nextM = Math.ceil((m + 1) / 10) * 10
  const nextH = nextM >= 60 ? (h + 1) % 24 : h
  const nextMin = nextM >= 60 ? 0 : nextM
  return `${kst.getUTCFullYear()}-${pad(kst.getUTCMonth() + 1)}-${pad(kst.getUTCDate())}T${pad(nextH)}:${pad(nextMin)}`
}

export default function PostCreateModal({ scheduledAt, expeditionId, userId, members, onClose, onCreate }) {
  const defaultKST = useMemo(() => scheduledAt ? formatKSTInput(scheduledAt) : nextSlotKST(), [scheduledAt])

  const [form, setForm] = useState({
    scheduledAt: defaultKST,
    raidId: '',
    difficulty: '',
    durationMinutes: 30,
    totalSlots: 7,
    allowedClasses: [],
    memo: '',
    creatorCharacterId: '',
    creatorRole: 'dealer',
  })
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState({})
  const [raidOpen, setRaidOpen] = useState(false)
  const raidDropRef = useRef(null)

  useEffect(() => {
    if (!raidOpen) return
    function handleOutside(e) {
      if (!raidDropRef.current?.contains(e.target)) setRaidOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [raidOpen])

// 모달 열릴 때 신선한 캐릭터 + 숙제 데이터 fetch
  const [freshChars, setFreshChars] = useState([])
  const [charsLoading, setCharsLoading] = useState(true)

  useEffect(() => {
    fetch('/api/characters/raids')
      .then(r => r.ok ? r.json() : [])
      .then(data => setFreshChars(Array.isArray(data) ? data : []))
      .catch(() => {})
      .finally(() => setCharsLoading(false))
  }, [])

  const selectedRaid = RAID_MAP[form.raidId]
  const difficulties = selectedRaid?.difficulties || []
  const selectedDiff = difficulties.find(d => d.key === form.difficulty)

  // 대시보드에 해당 레이드+난이도를 등록한 캐릭터만 표시, 완료된 캐릭터는 뒤로
  const eligibleChars = useMemo(() => {
    if (!form.raidId || !form.difficulty) return []
    const chars = freshChars.filter(c =>
      c.characterRaids?.some(r => r.raidId === form.raidId && r.difficulty === form.difficulty)
    )
    return [...chars].sort((a, b) => {
      const aEntry = a.characterRaids?.find(r => r.raidId === form.raidId && r.difficulty === form.difficulty)
      const bEntry = b.characterRaids?.find(r => r.raidId === form.raidId && r.difficulty === form.difficulty)
      const ac = raidStatusOf(aEntry) === 'complete'
      const bc = raidStatusOf(bEntry) === 'complete'
      if (ac !== bc) return ac ? 1 : -1
      return 0 // API 순서(sortOrder) 유지
    })
  }, [freshChars, form.raidId, form.difficulty])

  function isRaidComplete(char) {
    const entry = char.characterRaids?.find(r => r.raidId === form.raidId && r.difficulty === form.difficulty)
    return raidStatusOf(entry) === 'complete'
  }

  // 선택 캐릭터가 서포터 직업인지
  const selectedChar = freshChars.find(c => c.id === form.creatorCharacterId)
  const selectedIsSupport = selectedChar ? SUPPORT_CLASSES.has(selectedChar.class) : false

  function handleRaidChange(raidId) {
    const raid = RAID_MAP[raidId]
    const firstDiff = raid?.difficulties?.[0]
    setForm(f => ({
      ...f,
      raidId,
      difficulty: firstDiff?.key || '',
      totalSlots: (raid?.maxPlayers || 8) - 1,
      creatorCharacterId: '',
      creatorRole: 'dealer',
    }))
  }

  function handleDiffChange(diff) {
    setForm(f => ({
      ...f,
      difficulty: diff,
      creatorCharacterId: '',
      creatorRole: 'dealer',
    }))
  }

  function validate() {
    const errs = {}
    if (!form.raidId) errs.raidId = '레이드를 선택하세요'
    if (!form.difficulty) errs.difficulty = '난이도를 선택하세요'
    if (!form.scheduledAt) errs.scheduledAt = '날짜/시간을 입력하세요'
    if (!form.creatorCharacterId) errs.creatorCharacterId = '참가할 캐릭터를 선택하세요'
    return errs
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    const scheduledISO = kstInputToISO(form.scheduledAt)
    const closedISO = new Date(new Date(scheduledISO).getTime() - 3600 * 1000).toISOString()

    setSubmitting(true)
    await onCreate({
      raidId: form.raidId,
      difficulty: form.difficulty,
      scheduledAt: scheduledISO,
      durationMinutes: Number(form.durationMinutes),
      totalSlots: Number(form.totalSlots),
      minItemLevel: selectedDiff?.minItemLevel ?? selectedRaid?.minItemLevel ?? null,
      allowedClasses: form.allowedClasses,
      memo: form.memo || null,
      closedAt: closedISO,
      creatorCharacterId: form.creatorCharacterId,
      creatorRole: form.creatorRole,
    })
    setSubmitting(false)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-[#1e1e1e] rounded-2xl shadow-xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <h2 className="ns-bold text-gray-800 dark:text-gray-100">레이드 일정 등록</h2>
          <button type="button" onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors">
            <IconX size={16} className="text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
          {/* 레이드 + 난이도 한 줄 */}
          <div className="flex items-start gap-3">
            {/* 커스텀 레이드 드롭다운 */}
            <div className="flex-[3] min-w-0" ref={raidDropRef}>
              <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">레이드</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setRaidOpen(o => !o)}
                  className={`w-full flex items-center justify-between gap-2 pl-3.5 pr-3 py-2.5 text-sm rounded-xl border transition-colors text-left
                    ${raidOpen
                      ? 'border-[var(--accent-400)] ring-2 ring-[var(--accent-400)]/30 bg-white dark:bg-[#252525]'
                      : 'border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] hover:border-gray-300 dark:hover:border-[#444]'}
                    ${form.raidId ? 'text-gray-800 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}
                >
                  <span className="truncate">{selectedRaid?.name || '레이드 선택'}</span>
                  <svg
                    className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform duration-150 ${raidOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {raidOpen && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white dark:bg-[#252525] border border-gray-200 dark:border-[#3a3a3a] rounded-xl shadow-lg overflow-hidden">
                    <div className="max-h-52 overflow-y-auto py-1">
                      {RAIDS.filter(r => !HIDDEN_RAID_IDS.has(r.id)).map(r => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => { handleRaidChange(r.id); setRaidOpen(false) }}
                          className={`w-full text-left px-3.5 py-2 text-sm transition-colors
                            ${form.raidId === r.id
                              ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold'
                              : 'text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-[#2e2e2e]'}`}
                        >
                          {r.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {errors.raidId && <p className="text-xs text-red-500 mt-1">{errors.raidId}</p>}
            </div>

            {difficulties.length > 0 && (
              <div className="flex-[2] min-w-0">
                <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">난이도</label>
                <div className="flex gap-1.5">
                  {difficulties.map(d => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => handleDiffChange(d.key)}
                      className={`flex-1 py-2.5 text-xs rounded-xl border transition-colors ns-bold
                        ${form.difficulty === d.key
                          ? DIFF_SELECTED[d.key] || 'bg-gray-500 border-gray-500 text-white'
                          : DIFF_IDLE[d.key]     || 'border-gray-200 dark:border-[#333] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                    >
                      {DIFF_LABEL[d.key] || d.key}
                    </button>
                  ))}
                </div>
                {errors.difficulty && <p className="text-xs text-red-500 mt-1">{errors.difficulty}</p>}
              </div>
            )}
          </div>

          {/* 시작 시간 + 소요 시간 한 줄 */}
          <div className="flex items-start gap-3">
            <div className="flex-[3] min-w-0">
              <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">시작 시간</label>
              <DateTimePicker
                value={form.scheduledAt}
                onChange={v => setForm(f => ({ ...f, scheduledAt: v }))}
              />
              {errors.scheduledAt && <p className="text-xs text-red-500 mt-1">{errors.scheduledAt}</p>}
            </div>
            <div className="flex-[2] min-w-0">
              <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">소요 시간</label>
              <div className="relative">
                <input
                  type="text"
                  inputMode="numeric"
                  value={form.durationMinutes === 0 ? '' : form.durationMinutes}
                  onChange={e => {
                    const raw = e.target.value.replace(/[^0-9]/g, '')
                    const n = raw === '' ? 0 : Math.min(Number(raw), 720)
                    setForm(f => ({ ...f, durationMinutes: n }))
                  }}
                  placeholder="0 ~ 720"
                  className="w-full pl-3.5 pr-8 py-2.5 text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 hover:border-gray-300 dark:hover:border-[#444] focus-visible:border-[var(--accent-400)] focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]/30 outline-none transition-colors"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">분</span>
              </div>
            </div>
          </div>

          {/* 내 참가 캐릭터 */}
          <div>
            <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">내 참가 캐릭터</label>
            <div className="space-y-1.5 max-h-44 overflow-y-auto">
              {!form.raidId || !form.difficulty ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-1">레이드와 난이도를 먼저 선택하세요</p>
              ) : eligibleChars.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 py-1">
                  대시보드에서 이 레이드를 등록한 캐릭터가 없습니다
                </p>
              ) : eligibleChars.map(char => {
                const complete = isRaidComplete(char)
                const isSelected = form.creatorCharacterId === char.id
                const isSupport = SUPPORT_CLASSES.has(char.class)
                return (
                  <button
                    key={char.id}
                    type="button"
                    disabled={complete}
                    onClick={() => setForm(f => ({
                      ...f,
                      creatorCharacterId: char.id,
                      creatorRole: defaultRole(char.class),
                    }))}
                    className={`w-full flex items-center gap-2 px-3 py-2 rounded-xl border text-left transition-colors
                      ${complete
                        ? 'border-gray-100 dark:border-[#2a2a2a] opacity-40 cursor-not-allowed'
                        : isSelected
                          ? 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                          : 'border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525]'}`}
                  >
                    {getClassIcon(char.class) && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={getClassIcon(char.class)} alt={char.class} className="w-5 h-5 object-contain flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-gray-800 dark:text-gray-100 truncate">{char.name}</span>
                        {complete && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full ns-bold bg-gray-100 dark:bg-[#333] text-gray-400 flex-shrink-0">완료</span>
                        )}
                        {isSupport && isSelected && !complete && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full ns-bold flex-shrink-0
                            ${form.creatorRole === 'support'
                              ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]'
                              : 'bg-gray-100 dark:bg-[#333] text-gray-500'}`}>
                            {form.creatorRole === 'support' ? '서포터' : '딜러'}
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">{char.class} · {Number(char.itemLevel).toFixed(2)}</div>
                    </div>
                  </button>
                )
              })}
            </div>

            {/* 서포터 역할 토글 */}
            {selectedIsSupport && form.creatorCharacterId && (
              <div className="mt-2 flex items-center gap-2">
                <span className="text-xs text-gray-500 dark:text-gray-400">역할:</span>
                <div className="flex rounded-lg overflow-hidden border border-gray-200 dark:border-[#333] text-xs">
                  {['support','dealer'].map(r => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setForm(f => ({ ...f, creatorRole: r }))}
                      className={`px-3 py-1 transition-colors
                        ${form.creatorRole === r
                          ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold'
                          : 'bg-white dark:bg-[#252525] text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}
                    >
                      {r === 'support' ? '서포터' : '딜러'}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {errors.creatorCharacterId && <p className="text-xs text-red-500 mt-1">{errors.creatorCharacterId}</p>}
          </div>

          {/* 메모 */}
          <div>
            <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1">
              메모 <span className="text-gray-400 font-normal">({form.memo.length}/140)</span>
            </label>
            <textarea
              rows={4}
              maxLength={140}
              placeholder="공략 링크, 요구 사항 등"
              value={form.memo}
              onChange={e => setForm(f => ({ ...f, memo: e.target.value }))}
              className="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#252525] text-gray-800 dark:text-gray-100 resize-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)] outline-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 dark:border-[#333] text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors">
              취소
            </button>
            <button type="submit" disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {submitting ? '등록 중...' : '일정 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

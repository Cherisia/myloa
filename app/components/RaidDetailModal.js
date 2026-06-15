'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import { RAID_MAP } from '@/lib/raidData'
import { getClassIcon, DIFF_COLOR } from '@/app/dashboard/_constants'
import { saveRaidCompletion } from '@/app/dashboard/_raidHelpers'
import { IconX, IconTrophy, IconCrown } from '@/app/dashboard/_icons'

const DIFF_BADGE_DEFAULT = 'bg-gray-100 text-gray-600 dark:bg-[#333] dark:text-gray-300'

// ── AvatarImg ─────────────────────────────────────────────────────────────────
function AvatarImg({ src, name, size = 36 }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || '/default-avatar.svg'}
      alt={name || ''}
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className="rounded-full object-cover flex-shrink-0 bg-gray-100 dark:bg-zinc-800"
      onError={e => { e.currentTarget.src = '/default-avatar.svg' }}
    />
  )
}

// ── CharChip ──────────────────────────────────────────────────────────────────
export function CharChip({ itemLevel, combatPower, className, children, onClick }) {
  const ref = useRef(null)
  const [pos, setPos] = useState(null)
  return (
    <div
      ref={ref}
      className={`relative flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ns-bold ${onClick ? 'cursor-pointer' : 'cursor-default'} ${className}`}
      onClick={onClick}
      onMouseEnter={() => {
        if (ref.current) {
          const r = ref.current.getBoundingClientRect()
          setPos({ x: r.left, y: r.top })
        }
      }}
      onMouseLeave={() => setPos(null)}
    >
      {children}
      {pos && (
        <div
          className="pointer-events-none fixed z-[9999] flex flex-col gap-1 bg-gray-800 dark:bg-gray-700 text-white rounded-md px-2.5 py-2 whitespace-nowrap shadow-md text-[11px] ns-bold"
          style={{ left: pos.x, top: pos.y - 8, transform: 'translateY(-100%)' }}
        >
          <div className="flex items-center gap-1">
            <IconTrophy className="text-gray-400 flex-shrink-0" />
            <span>{Number(itemLevel).toFixed(2)}</span>
          </div>
          {combatPower != null && (
            <div className="flex items-center gap-1">
              <Image src="/combat-power.svg" alt="전투력" width={12} height={12} unoptimized />
              <span>{Math.round(Number(combatPower)).toLocaleString('ko-KR')}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── RaidRow ───────────────────────────────────────────────────────────────────
// chars: [{ id, name, itemLevel, combatPower, charClass, status }]
export function RaidRow({ raidId, difficulty, chars, highlight, completed, noWrap }) {
  const raid = RAID_MAP[raidId]
  const diff = raid?.difficulties?.find(d => d.key === difficulty)
  const name = raid?.name || raidId
  const diffLabel = diff?.label || difficulty
  const image = raid?.image || null
  const badgeCls = DIFF_COLOR[difficulty] || DIFF_BADGE_DEFAULT

  const chips = chars.map((ch, i) => {
    const icon = getClassIcon(ch.charClass)
    return (
      <CharChip key={i} itemLevel={ch.itemLevel} combatPower={ch.combatPower}
        className={completed
          ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
          : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}
      >
        {completed && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />}
        <span>{ch.name}</span>
      </CharChip>
    )
  })

  const header = (
    <div className="flex items-center gap-2 px-3.5 py-2.5 bg-[#f9fafb] dark:bg-[#404040] rounded-t-xl">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image && <img src={image} alt={name} className="w-4 h-4 rounded object-cover flex-shrink-0 opacity-70" />}
      <span className="text-[13px] ns-bold text-gray-900 dark:text-white flex-1 truncate">{name}</span>
      <span className={`text-[10px] ns-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>{diffLabel}</span>
    </div>
  )

  if (highlight) {
    return (
      <div className={noWrap ? '' : 'rounded-xl shadow-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.35)]'}>
        {header}
        <div className="px-3.5 py-2.5 bg-white dark:bg-[#1e1e1e] flex flex-wrap gap-1.5">{chips}</div>
      </div>
    )
  }
  return (
    <div className="rounded-xl shadow-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
      {header}
      <div className="px-3.5 py-2.5 flex flex-wrap gap-1.5 bg-white dark:bg-[#1e1e1e] rounded-b-xl">{chips}</div>
    </div>
  )
}

function EmptyTabMsg({ msg }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{msg}</p>
    </div>
  )
}

// ── RaidDetailModal ───────────────────────────────────────────────────────────
// Props:
//   name, image, discordUsername           — 헤더 사용자 정보
//   repChar: { name }                      — 대표 캐릭터 (optional)
//   headerBadge: ReactNode                 — 역할 뱃지 슬롯 (optional, 길드장 등)
//   isPrivate: boolean                     — 비공개 여부
//   togetherRaids, incompleteRaids,
//     completedRaids: Array<{              — 사전 계산된 레이드 목록
//       raidId, difficulty,
//       chars: [{ id, name, itemLevel, combatPower, charClass, status }]
//     }>
//   myUser: { name, image }                — "함께" 탭 펼침 섹션의 내 정보
//   myRepChar: { name }                    — 내 대표 캐릭터 (optional)
//   myCharsForRaid(raidId, difficulty)     — 펼침 섹션용 내 캐릭터 반환 함수
//     => [{ id, name, itemLevel, combatPower, charClass, characterRaids }]
//   persistedToggles, onCharToggle, onClose
export default function RaidDetailModal({
  name, image, discordUsername, repChar, headerBadge,
  isPrivate,
  togetherRaids = [], incompleteRaids = [], completedRaids = [],
  myUser, myRepChar, myCharsForRaid,
  persistedToggles = {}, onCharToggle, onClose, isDemo = false,
}) {
  const [activeTab, setActiveTab] = useState('together')
  const [localDone, setLocalDone] = useState({})

  function handleMyCharToggle(char, raidId, difficulty) {
    const key = `${char.id}:${raidId}:${difficulty}`
    const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
    if (!entry) return
    const currentDone = key in localDone ? localDone[key] : (persistedToggles[key] ?? false)
    const newDone = !currentDone
    setLocalDone(prev => ({ ...prev, [key]: newDone }))
    onCharToggle?.(key, newDone)
    if (isDemo) return
    saveRaidCompletion(char.id, entry, newDone)
  }

  const hasAnyRaid = incompleteRaids.length > 0 || completedRaids.length > 0

  const MODAL_TABS = [
    { id: 'together',   label: '함께할 수 있는 레이드', count: togetherRaids.reduce((s, r) => s + r.chars.length, 0) },
    { id: 'incomplete', label: '미완료한 레이드',        count: incompleteRaids.reduce((s, r) => s + r.chars.length, 0) },
    { id: 'completed',  label: '완료한 레이드',          count: completedRaids.reduce((s, r) => s + r.chars.length, 0) },
  ]

  function renderMySection(raidId, difficulty) {
    const myChars = myCharsForRaid?.(raidId, difficulty) || []
    if (!myChars.length) return null
    return (
      <div className="border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
        <div className="px-4 py-3">
          <div className="flex items-center gap-2 mb-2">
            <AvatarImg src={myUser?.image} name={myUser?.name || '나'} size={22} />
            <span className="text-[12px] ns-bold text-gray-800 dark:text-gray-200 flex-1">{myUser?.name || '나'}</span>
            {myRepChar && (
              <div className="flex items-center gap-0.5 text-[var(--accent-500)] flex-shrink-0">
                <IconCrown />
                <span className="text-[10px] ns-bold text-gray-400 dark:text-gray-500 truncate max-w-[80px]">{myRepChar.name}</span>
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1">
            {myChars.map((c, ci) => {
              const icon = getClassIcon(c.charClass)
              const charKey = `${c.id}:${raidId}:${difficulty}`
              const effectiveDone = charKey in localDone ? localDone[charKey] : (persistedToggles[charKey] ?? false)
              return (
                <CharChip key={ci} itemLevel={c.itemLevel} combatPower={c.combatPower}
                  onClick={() => handleMyCharToggle(c, raidId, difficulty)}
                  className={effectiveDone
                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                    : 'bg-white dark:bg-[#242424] text-gray-700 dark:text-gray-300 shadow-border'}
                >
                  {effectiveDone && (
                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  )}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />}
                  <span>{c.name}</span>
                </CharChip>
              )
            })}
          </div>
        </div>
      </div>
    )
  }

  function renderTabContent() {
    if (activeTab === 'together') {
      if (!togetherRaids.length) return <EmptyTabMsg msg="함께할 수 있는 레이드가 없어요" />
      return togetherRaids.map(r => (
        <div key={`${r.raidId}__${r.difficulty}`} className="rounded-xl overflow-hidden shadow-border shadow-[0_1px_4px_rgba(0,0,0,0.06)] dark:shadow-[0_1px_6px_rgba(0,0,0,0.35)]">
          <RaidRow raidId={r.raidId} difficulty={r.difficulty} chars={r.chars} highlight noWrap />
          {renderMySection(r.raidId, r.difficulty)}
        </div>
      ))
    }
    if (activeTab === 'incomplete') {
      if (!incompleteRaids.length) return <EmptyTabMsg msg="미완료한 레이드가 없어요" />
      return incompleteRaids.map(r => <RaidRow key={`${r.raidId}-${r.difficulty}`} {...r} />)
    }
    if (!completedRaids.length) return <EmptyTabMsg msg="완료한 레이드가 없어요" />
    return completedRaids.map(r => <RaidRow key={`${r.raidId}-${r.difficulty}`} {...r} completed />)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md h-[90vh] sm:h-[82vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:shadow-border overflow-hidden">

        {/* 모바일 핸들 */}
        <div className="sm:hidden flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-4 flex-shrink-0 flex items-center gap-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <AvatarImg src={image} name={name} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base ns-bold text-gray-900 dark:text-white truncate">{name}</span>
              {headerBadge}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {repChar && (
                <div className="flex items-center gap-0.5 flex-shrink-0 text-[var(--accent-500)]">
                  <IconCrown />
                  <span className="text-xs ns-bold text-gray-700 dark:text-gray-300">{repChar.name}</span>
                </div>
              )}
              {repChar && discordUsername && (
                <span className="text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
              )}
              {discordUsername && (
                <p className="text-xs text-gray-400">@{discordUsername}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
          >
            <IconX />
          </button>
        </div>

        {/* 본문 */}
        {isPrivate ? (
          <div className="flex-1 flex items-center justify-center py-10">
            <div className="text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-gray-100 dark:bg-[#252525] flex items-center justify-center text-2xl">🔒</div>
              <div>
                <p className="text-sm ns-bold text-gray-700 dark:text-gray-300">레이드 현황 비공개</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">이 멤버는 레이드 정보를 공유하지 않고 있어요</p>
              </div>
            </div>
          </div>
        ) : !hasAnyRaid ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">등록된 레이드가 없어요</p>
          </div>
        ) : (
          <>
            {/* 탭 바 */}
            <div className="flex-shrink-0 flex border-b border-gray-100 dark:border-[#2a2a2a] px-3 pt-1">
              {MODAL_TABS.map(t => (
                <button key={t.id} type="button"
                  onClick={() => setActiveTab(t.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-[12px] ns-bold transition-colors whitespace-nowrap
                    ${activeTab === t.id
                      ? 'text-gray-900 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
                    }`}
                >
                  {t.label}
                  {t.count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full ns-bold
                      ${activeTab === t.id
                        ? 'bg-gray-900 text-white dark:bg-zinc-400 dark:text-gray-900'
                        : 'bg-gray-200 dark:bg-zinc-600 text-gray-600 dark:text-white'
                      }`}
                    >
                      {t.count}
                    </span>
                  )}
                  {activeTab === t.id && (
                    <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-gray-900 dark:bg-white rounded-full" />
                  )}
                </button>
              ))}
            </div>

            {/* 탭 콘텐츠 */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
              {renderTabContent()}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

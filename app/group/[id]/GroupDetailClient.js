'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { RAIDS } from '@/lib/raidData'
import { getGroupRaidList, raidStatusOf } from '@/lib/groupRaidShare'
import { CLASS_ICON, getClassIcon } from '@/app/dashboard/_constants'

// ── Icons ─────────────────────────────────────────────────────────────────────
const IconBack = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
)
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
  </svg>
)
const IconStar = ({ filled, size = 14 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
)
const IconCrown = () => (
  <svg width="12" height="11" viewBox="0 0 24 22" fill="currentColor" className="text-[var(--accent-500)] flex-shrink-0">
    <path d="M2 19h20v2H2zM22 3.27l-5.5 6.5L12 2 7.5 9.77 2 3.27V18h20V3.27z"/>
  </svg>
)
const IconTrophy = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400 flex-shrink-0">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>
  </svg>
)
const IconPower = () => (
  <Image src="/combat-power.svg" alt="전투력" width={12} height={12} unoptimized />
)
const IconCheck = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
)
const IconX = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)
const IconRegen = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
)

// ── Helpers ───────────────────────────────────────────────────────────────────
function adaptMember(m) {
  return {
    ...m,
    displayName: m.user?.nickname || m.user?.name || m.user?.discordUsername || '알 수 없음',
    expeditions: (m.user?.loaExpeditions || []).map(exp => ({
      characters: (exp.characters || []).map(c => ({
        name: c.name,
        itemLevel: c.itemLevel,
        characterClass: c.class,
        combatPower: c.combatPower,
        raids: c.characterRaids || [],
      })),
    })),
  }
}

function getMemberIncompleteChars(member, raidId, difficulty) {
  if (member.visibility === 'none') return []
  const chars = []
  for (const exp of member.expeditions || []) {
    for (const c of exp.characters || []) {
      const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      const s = raidStatusOf(entry)
      if (s === 'incomplete' || s === 'partial') chars.push(c)
    }
  }
  return chars
}

function getMemberCompletedChars(member, raidId, difficulty) {
  if (member.visibility === 'none') return []
  const chars = []
  for (const exp of member.expeditions || []) {
    for (const c of exp.characters || []) {
      const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      if (raidStatusOf(entry) === 'complete') chars.push(c)
    }
  }
  return chars
}

const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.id, r]))
function getRaidLabel(raidId, difficulty) {
  const raid = RAID_MAP[raidId]
  const diff = raid?.difficulties?.find(d => d.key === difficulty)
  return { name: raid?.name || raidId, diff: diff?.label || difficulty, image: raid?.image || null }
}

// ── 난이도 색상 맵 ───────────────────────────────────────────────────────────
const DIFF_COLORS = {
  nightmare: { badge: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',         bar: 'from-rose-400 to-rose-300',     pct: 'text-rose-600 dark:text-rose-300' },
  hard:      { badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', bar: 'from-violet-400 to-purple-300', pct: 'text-violet-600 dark:text-violet-300' },
  normal:    { badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',             bar: 'from-sky-400 to-cyan-300',      pct: 'text-sky-600 dark:text-sky-300' },
  stage3:    { badge: 'bg-rose-100 text-rose-600 dark:bg-rose-900/30 dark:text-rose-300',         bar: 'from-rose-400 to-rose-300',     pct: 'text-rose-600 dark:text-rose-300' },
  stage2:    { badge: 'bg-violet-100 text-violet-600 dark:bg-violet-900/30 dark:text-violet-300', bar: 'from-violet-400 to-purple-300', pct: 'text-violet-600 dark:text-violet-300' },
  stage1:    { badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-300',             bar: 'from-sky-400 to-cyan-300',      pct: 'text-sky-600 dark:text-sky-300' },
}
const DIFF_COLOR_DEFAULT = { badge: 'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400', bar: 'from-gray-400 to-gray-300', pct: 'text-gray-700 dark:text-gray-200' }

function Avatar({ user, size = 28 }) {
  const name    = user?.nickname || user?.name || user?.discordUsername || '?'
  const initial = name[0].toUpperCase()
  const sz      = { width: size, height: size, fontSize: Math.round(size * 0.42) }
  if (user?.image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={user.image} alt={name} style={sz}
        className="rounded-full flex-shrink-0 object-cover"
        onError={e => { e.target.style.display = 'none' }}
      />
    )
  }
  return (
    <div style={sz}
      className="rounded-full flex-shrink-0 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] flex items-center justify-center ns-bold"
    >
      {initial}
    </div>
  )
}

// ── RaidRow (MemberDetailModal 내부 레이드 행) ────────────────────────────────
function RaidRow({ raidId, difficulty, chars, highlight, completed }) {
  const { name, diff, image } = getRaidLabel(raidId, difficulty)
  const c = DIFF_COLORS[difficulty] || DIFF_COLOR_DEFAULT

  const chips = chars.map((ch, i) => {
    const icon = getClassIcon(ch.characterClass)
    return (
      <div key={i} className="relative group cursor-default flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ns-bold bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300">
        {completed && (
          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        )}
        {icon && <img src={icon} alt="" className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />}
        <span>{ch.name}</span>
        <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col gap-1 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] text-gray-700 dark:text-gray-200 rounded-lg px-2.5 py-2 whitespace-nowrap shadow-md z-50">
          <div className="flex items-center gap-1 text-[11px] ns-bold">
            <IconTrophy />
            <span>{Number(ch.itemLevel).toFixed(2)}</span>
          </div>
          {ch.combatPower != null && (
            <div className="flex items-center gap-1 text-[11px] ns-bold">
              <IconPower />
              <span>{Math.round(Number(ch.combatPower)).toLocaleString('ko-KR')}</span>
            </div>
          )}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-[#2a2a2a]" />
        </div>
      </div>
    )
  })

  if (highlight) {
    return (
      <div className="rounded-xl border border-gray-100 dark:border-[#2a2a2a]">
        <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-[#252525] rounded-t-xl">
          {image && <img src={image} alt={name} className="w-4 h-4 rounded object-cover flex-shrink-0 opacity-70" />}
          <span className="text-[13px] ns-bold text-gray-900 dark:text-white flex-1 truncate">{name}</span>
          <span className={`text-[10px] ns-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.badge}`}>{diff}</span>
        </div>
        <div className="px-3.5 py-2.5 bg-white dark:bg-[#1e1e1e] flex flex-wrap gap-1.5 rounded-b-xl">
          {chips}
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-100 dark:border-[#2a2a2a]">
      <div className="flex items-center gap-2 px-3.5 py-2.5 bg-gray-50 dark:bg-[#252525] rounded-t-xl">
        {image && <img src={image} alt={name} className="w-4 h-4 rounded object-cover flex-shrink-0 opacity-70" />}
        <span className="text-[13px] ns-bold text-gray-900 dark:text-white flex-1 truncate">{name}</span>
        <span className={`text-[10px] ns-bold px-2 py-0.5 rounded-full flex-shrink-0 ${c.badge}`}>{diff}</span>
      </div>
      <div className="px-3.5 py-2.5 flex flex-wrap gap-1.5 bg-white dark:bg-[#1e1e1e] rounded-b-xl">
        {chips}
      </div>
    </div>
  )
}

// ── MemberDetailModal ─────────────────────────────────────────────────────────
function MemberDetailModal({ member, role, myMember, raidList, onClose }) {
  const isPrivate = member.visibility === 'none'
  const repChar = member.expeditions?.[0]?.characters?.[0] || null
  const [activeTab, setActiveTab] = useState('together')

  const memberRaidData = raidList.map(({ raidId, difficulty }) => {
    const chars = []
    for (const exp of member.expeditions || []) {
      for (const c of exp.characters || []) {
        const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (!entry) continue
        chars.push({ ...c, status: raidStatusOf(entry) })
      }
    }
    return { raidId, difficulty, chars }
  }).filter(r => r.chars.length > 0)

  const incompleteRaids = memberRaidData
    .map(r => ({ ...r, chars: r.chars.filter(c => c.status !== 'complete') }))
    .filter(r => r.chars.length > 0)

  const completedRaids = memberRaidData
    .map(r => ({ ...r, chars: r.chars.filter(c => c.status === 'complete') }))
    .filter(r => r.chars.length > 0)

  const togetherRaids = incompleteRaids.filter(({ raidId, difficulty }) => {
    for (const exp of myMember?.expeditions || []) {
      for (const c of exp.characters || []) {
        const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (!entry) continue
        if (raidStatusOf(entry) !== 'complete') return true
      }
    }
    return false
  })

  const MODAL_TABS = [
    { id: 'together',   label: '함께할 수 있는 레이드', count: togetherRaids.length },
    { id: 'incomplete', label: '미완료한 레이드',        count: incompleteRaids.length },
    { id: 'completed',  label: '완료한 레이드',          count: completedRaids.length },
  ]

  const tabEmptyMsg = {
    together:   '함께할 수 있는 레이드가 없어요',
    incomplete: '미완료한 레이드가 없어요',
    completed:  '완료한 레이드가 없어요',
  }

  function renderTabContent() {
    if (activeTab === 'together') {
      if (!togetherRaids.length) return <EmptyTabMsg msg={tabEmptyMsg.together} />
      return togetherRaids.map(r => <RaidRow key={`${r.raidId}-${r.difficulty}`} {...r} highlight />)
    }
    if (activeTab === 'incomplete') {
      if (!incompleteRaids.length) return <EmptyTabMsg msg={tabEmptyMsg.incomplete} />
      return incompleteRaids.map(r => <RaidRow key={`${r.raidId}-${r.difficulty}`} {...r} />)
    }
    if (!completedRaids.length) return <EmptyTabMsg msg={tabEmptyMsg.completed} />
    return completedRaids.map(r => <RaidRow key={`${r.raidId}-${r.difficulty}`} {...r} completed />)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full sm:max-w-md h-[90vh] sm:h-[82vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-hidden">

        {/* 모바일 핸들 */}
        <div className="sm:hidden flex justify-center pt-3 flex-shrink-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>

        {/* 헤더 */}
        <div className="px-5 pt-4 pb-4 flex-shrink-0 flex items-center gap-3 border-b border-gray-100 dark:border-[#2a2a2a]">
          <Avatar user={member.user} size={44} />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-base ns-bold text-gray-900 dark:text-white truncate">{member.user?.nickname || member.user?.name || '알 수 없음'}</span>
              {role === 'leader'  && <span className="text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-2 py-0.5 rounded-full">공격대장</span>}
              {role === 'officer' && <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부공격대장</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              {repChar && (
                <div className="flex items-center gap-0.5 flex-shrink-0 text-[var(--accent-500)]">
                  <IconCrown />
                  <span className="text-xs ns-bold text-gray-700 dark:text-gray-300">{repChar.name}</span>
                </div>
              )}
              {repChar && member.user?.discordUsername && (
                <span className="text-[10px] text-gray-300 dark:text-gray-600 flex-shrink-0">·</span>
              )}
              {member.user?.discordUsername && (
                <p className="text-xs text-gray-400">@{member.user.discordUsername}</p>
              )}
            </div>
          </div>
          <button type="button" onClick={onClose}
            className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a2a2a] text-gray-400 transition-colors flex-shrink-0"
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
        ) : memberRaidData.length === 0 ? (
          <div className="flex-1 flex items-center justify-center">
            <p className="text-sm text-gray-400 dark:text-gray-500">등록된 레이드가 없어요</p>
          </div>
        ) : (
          <>
            {/* 탭 바 */}
            <div className="flex-shrink-0 flex border-b border-gray-100 dark:border-[#2a2a2a] px-3 pt-1">
              {MODAL_TABS.map(t => (
                <button
                  key={t.id}
                  type="button"
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
                        ? 'bg-gray-900 dark:bg-white text-white dark:text-gray-900'
                        : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400'
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

function EmptyTabMsg({ msg }) {
  return (
    <div className="py-10 text-center">
      <p className="text-sm text-gray-400 dark:text-gray-500">{msg}</p>
    </div>
  )
}

// ── 탭 정의 ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'raids',    label: '레이드현황' },
  { id: 'members',  label: '멤버' },
  { id: 'pending',  label: '대기중' },
  { id: 'settings', label: '설정' },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GroupDetailClient({ expedition: init, userId, myMembership }) {
  const router = useRouter()
  const [expedition,   setExpedition]   = useState(init)
  const [tab,          setTab]          = useState('raids')
  const [loading,      setLoading]      = useState(null)
  const [copied,       setCopied]       = useState(false)
  const [settingsForm, setSettingsForm] = useState({
    name:        init.name,
    description: init.description || '',
    notice:      init.notice      || '',
    autoAccept:  init.autoAccept  ?? false,
  })
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [regenLoading, setRegenLoading] = useState(false)
  const [regenConfirm, setRegenConfirm] = useState(false)
  const [raidModal,     setRaidModal]     = useState(null)
  const [memberModal,   setMemberModal]   = useState(null)
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput,   setDeleteInput]   = useState('')

  const isLeader  = expedition.leaderId === userId
  const isOfficer = isLeader || myMembership.role === 'officer'

  const activeMembers  = expedition.members.filter(m => m.status === 'active')
  const pendingMembers = expedition.members.filter(m => m.status === 'pending')

  const adaptedActive  = useMemo(() => activeMembers.map(adaptMember), [activeMembers])
  const raidList       = useMemo(() => getGroupRaidList(adaptedActive), [adaptedActive])
  const visibleMembers = useMemo(() => adaptedActive.filter(m => m.visibility !== 'none'), [adaptedActive])

  const raidStats = useMemo(() => raidList.map(({ raidId, difficulty }) => {
    let totalWithRaid = 0, incompleteMembers = 0, totalChars = 0, incompleteChars = 0
    for (const m of visibleMembers) {
      let memberCharCount = 0, memberIncompleteCount = 0
      for (const exp of m.expeditions || []) {
        for (const c of exp.characters || []) {
          const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry) continue
          memberCharCount++
          const s = raidStatusOf(entry)
          if (s === 'incomplete' || s === 'partial') memberIncompleteCount++
        }
      }
      if (memberCharCount === 0) continue
      totalWithRaid++
      totalChars += memberCharCount
      if (memberIncompleteCount > 0) { incompleteMembers++; incompleteChars += memberIncompleteCount }
    }
    const completedMembers = totalWithRaid - incompleteMembers
    const completedChars   = totalChars - incompleteChars
    const pct = totalWithRaid > 0 ? Math.round((completedMembers / totalWithRaid) * 100) : 0
    return { raidId, difficulty, totalWithRaid, incompleteMembers, incompleteChars, completedMembers, completedChars, totalChars, pct }
  }), [raidList, visibleMembers])

  // ── Actions ──────────────────────────────────────────────────────────────
  async function toggleFavorite(targetUserId) {
    const isFav  = expedition.favoritedUserIds?.includes(targetUserId)
    const method = isFav ? 'DELETE' : 'POST'
    setExpedition(prev => ({
      ...prev,
      favoritedUserIds: isFav
        ? prev.favoritedUserIds.filter(id => id !== targetUserId)
        : [...(prev.favoritedUserIds || []), targetUserId],
    }))
    await fetch(`/api/expedition/${expedition.id}/favorites`, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetUserId }),
    })
  }

  async function memberAction(targetUserId, action) {
    setLoading(`${action}-${targetUserId}`)
    try {
      const res = await fetch(`/api/expedition/${expedition.id}/members`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: targetUserId, action }),
      })
      if (!res.ok) return
      setExpedition(prev => ({
        ...prev,
        members: prev.members.map(m => {
          if (m.userId !== targetUserId) return m
          if (action === 'accept')  return { ...m, status: 'active',   joinedAt: new Date().toISOString() }
          if (action === 'reject')  return { ...m, status: 'rejected' }
          if (action === 'kick')    return { ...m, status: 'rejected' }
          if (action === 'promote') return { ...m, role: 'officer' }
          if (action === 'demote')  return { ...m, role: 'member'  }
          return m
        }),
      }))
    } finally { setLoading(null) }
  }

  async function changeVisibility(visibility) {
    await fetch(`/api/expedition/${expedition.id}/members`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, visibility }),
    })
    setExpedition(prev => ({
      ...prev,
      members: prev.members.map(m => m.userId === userId ? { ...m, visibility } : m),
    }))
  }

  async function regenCode() {
    setRegenConfirm(false)
    setRegenLoading(true)
    try {
      const res = await fetch(`/api/expedition/${expedition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerateCode: true }),
      })
      if (res.ok) {
        const updated = await res.json()
        setExpedition(prev => ({ ...prev, inviteCode: updated.inviteCode }))
      }
    } finally { setRegenLoading(false) }
  }

  async function saveSettings() {
    setLoading('settings')
    try {
      const res = await fetch(`/api/expedition/${expedition.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settingsForm),
      })
      if (res.ok) {
        const updated = await res.json()
        setExpedition(prev => ({ ...prev, ...updated }))
        setSaveSuccess(true)
      }
    } finally { setLoading(null) }
  }

  async function leaveOrDelete(isDelete) {
    if (isDelete) {
      setDeleteInput('')
      setDeleteConfirm(true)
      return
    }
    if (!confirm('공격대에서 탈퇴하시겠습니까?')) return
    await fetch(`/api/expedition/${expedition.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    })
    router.push('/group')
    router.refresh()
  }

  async function performDelete() {
    await fetch(`/api/expedition/${expedition.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    router.push('/group')
    router.refresh()
  }

  function copyCode() {
    navigator.clipboard.writeText(expedition.inviteCode || '')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // ── 대기 중 상태 ──────────────────────────────────────────────────────────
  const myStatus = expedition.members.find(m => m.userId === userId)?.status
  if (myStatus === 'pending') {
    return (
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">
        <button type="button" onClick={() => router.push('/group')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <IconBack /> 공격대 목록
        </button>
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-sm px-6 py-16 text-center space-y-3">
          <p className="text-4xl">⏳</p>
          <p className="text-base ns-extrabold text-gray-900 dark:text-white">{expedition.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">가입 승인 대기 중이에요</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">공격대장이 수락하면 입장할 수 있어요</p>
        </div>
      </div>
    )
  }

  // ── 탭 컨텐츠 렌더 함수 ──────────────────────────────────────────────────

  function renderRaids() {
    if (raidList.length === 0 || visibleMembers.length === 0) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-sm py-16 text-center space-y-2">
          <p className="text-3xl">⚔️</p>
          <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">공개된 레이드 정보가 없어요</p>
          <p className="text-xs text-gray-400 dark:text-gray-600">멤버들이 레이드를 등록하면 여기에 표시돼요</p>
        </div>
      )
    }

    const grouped = []
    const raidIndexMap = new Map()
    for (const stat of raidStats) {
      if (!raidIndexMap.has(stat.raidId)) {
        raidIndexMap.set(stat.raidId, grouped.length)
        grouped.push({ raidId: stat.raidId, difficulties: [] })
      }
      grouped[raidIndexMap.get(stat.raidId)].difficulties.push(stat)
    }

    return (
      <div className="space-y-6">
        {grouped.map(({ raidId, difficulties }) => {
          const { name, image } = getRaidLabel(raidId, difficulties[0].difficulty)
          const baseName = name.replace(' EX', '')
          const isEX = name.includes(' EX')

          return (
            <div key={raidId} className="space-y-2.5">
              {/* 레이드 섹션 제목 */}
              <div className="flex items-center gap-2 px-1">
                {image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={image} alt="" width={18} height={18} className="flex-shrink-0 opacity-60 dark:opacity-40 object-contain" />
                )}
                <span className="text-[14px] ns-extrabold text-gray-900 dark:text-white">{baseName}</span>
                {isEX && (
                  <span className="text-[9px] ns-extrabold px-1.5 py-0.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-300 text-gray-900 leading-none">EX</span>
                )}
              </div>

              {/* 난이도별 카드 */}
              <div className="flex gap-2.5">
                {difficulties.map(stat => {
                  const { diff } = getRaidLabel(stat.raidId, stat.difficulty)
                  const key = `${stat.raidId}__${stat.difficulty}`
                  const allDone = stat.incompleteMembers === 0 && stat.totalWithRaid > 0
                  const c = DIFF_COLORS[stat.difficulty] || DIFF_COLOR_DEFAULT

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRaidModal(key)}
                      className="flex-1 min-w-0 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm hover:shadow-md active:shadow-sm hover:-translate-y-0.5 active:translate-y-0 px-4 py-4 text-left transition-all duration-150"
                    >
                      {/* 난이도 뱃지 */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className={`text-[10px] ns-extrabold px-2.5 py-0.5 rounded-full leading-none ${c.badge}`}>
                          {diff}
                        </span>
                        {allDone && (
                          <span className="text-[10px] ns-bold text-gray-400 dark:text-gray-500">모두 완료</span>
                        )}
                      </div>

                      {/* 완료율 숫자 — 크고 굵게 */}
                      <p className={`text-2xl ns-extrabold tabular-nums leading-none mb-0.5 ${c.pct}`}>
                        {stat.totalWithRaid > 0 ? stat.pct : '—'}
                        {stat.totalWithRaid > 0 && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-0.5">%</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3">
                        {stat.totalWithRaid > 0 ? `${stat.completedMembers}/${stat.totalWithRaid}명 완료` : '데이터 없음'}
                      </p>

                      {/* 프로그레스 바 */}
                      <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden mb-3">
                        <div
                          className={`h-full rounded-full transition-all duration-500 bg-gradient-to-r ${c.bar}`}
                          style={{ width: stat.totalWithRaid > 0 ? `${stat.pct}%` : '0%' }}
                        />
                      </div>

                      {/* 캐릭터 수 보조 통계 */}
                      <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500">
                        <span className="ns-bold text-gray-600 dark:text-gray-400">{stat.totalChars > 0 ? `${stat.completedChars}/${stat.totalChars}` : '—'}</span>
                        <span>캐릭터</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  function renderMembers() {
    const myVis = expedition.members.find(m => m.userId === userId)?.visibility || 'all'

    const sorted = [...activeMembers].sort((a, b) => {
      const aFav = expedition.favoritedUserIds?.includes(a.userId) ? 0 : 1
      const bFav = expedition.favoritedUserIds?.includes(b.userId) ? 0 : 1
      return aFav - bFav
    })

    return (
      <div className="space-y-4">
        {/* 내 공개 설정 */}
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-5 py-4 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm ns-bold text-gray-900 dark:text-white">레이드 현황 공개</p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">켜면 다른 멤버에게 내 현황이 보여요</p>
          </div>
          <button
            type="button"
            onClick={() => changeVisibility(myVis === 'all' ? 'none' : 'all')}
            className={`relative w-12 h-6.5 rounded-full flex-shrink-0 transition-colors ${myVis === 'all' ? 'bg-[var(--accent-400)]' : 'bg-gray-200 dark:bg-[#383838]'}`}
            style={{ height: '26px', width: '46px' }}
          >
            <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${myVis === 'all' ? 'translate-x-5' : 'translate-x-0'}`} />
          </button>
        </div>

        {/* 멤버 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.map(m => {
            const role   = expedition.leaderId === m.userId ? 'leader' : m.role
            const isFav  = expedition.favoritedUserIds?.includes(m.userId)
            const isSelf = m.userId === userId

            const repChar = (m.user?.loaExpeditions?.[0]?.characters || [])[0] || null

            return (
              <div key={m.userId}
                className={`relative rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-4 py-4 ${!isSelf ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1 active:translate-y-0 active:shadow-sm transition-all duration-150' : ''}`}
                onClick={() => {
                  if (isSelf) return
                  const adapted = adaptedActive.find(a => a.userId === m.userId)
                  if (adapted) setMemberModal({ member: adapted, role })
                }}
              >
                {/* 즐겨찾기 별표 */}
                {!isSelf && (
                  <button type="button"
                    onClick={e => { e.stopPropagation(); toggleFavorite(m.userId) }}
                    className={`absolute top-3 right-3 p-1.5 rounded-xl transition-colors ${isFav ? 'text-[var(--accent-400)]' : 'text-gray-200 dark:text-gray-700 hover:text-[var(--accent-300)]'}`}
                  >
                    <IconStar filled={isFav} size={15} />
                  </button>
                )}

                <div className="flex items-center gap-3 pr-8">
                  <Avatar user={m.user} size={40} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[15px] ns-bold text-gray-900 dark:text-white truncate">{m.user?.nickname || m.user?.name || '알 수 없음'}</span>
                      {role === 'leader'  && <span className="text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-2 py-0.5 rounded-full">공격대장</span>}
                      {role === 'officer' && <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부공격대장</span>}
                    </div>
                    <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
                      {repChar && (
                        <div className="flex items-center gap-0.5 flex-shrink-0 text-[var(--accent-500)]">
                          <IconCrown />
                          <span className="text-xs ns-bold text-gray-700 dark:text-gray-300 truncate">{repChar.name}</span>
                        </div>
                      )}
                    </div>
                    {m.user?.discordUsername && (
                      <p className="text-xs text-gray-400 truncate">@{m.user.discordUsername}</p>
                    )}
                    {repChar && (
                      <div className="flex items-center gap-2.5 mt-1">
                        <div className="flex items-center gap-0.5">
                          <IconTrophy />
                          <span className="text-xs ns-bold text-gray-700 dark:text-gray-300">
                            {Number(repChar.itemLevel).toFixed(2)}
                          </span>
                        </div>
                        {repChar.combatPower != null && (
                          <div className="flex items-center gap-0.5">
                            <IconPower />
                            <span className="text-xs ns-bold text-gray-500 dark:text-gray-400">
                              {Math.round(Number(repChar.combatPower)).toLocaleString('ko-KR')}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            )
          })}
        </div>
      </div>
    )
  }

  function renderPending() {
    if (!isOfficer) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-sm py-14 text-center space-y-2">
          <p className="text-sm text-gray-400">권한이 없습니다.</p>
        </div>
      )
    }
    if (pendingMembers.length === 0) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-sm py-14 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">대기 중인 신청이 없어요</p>
        </div>
      )
    }
    return (
      <div className="space-y-2.5">
        {pendingMembers.map(m => (
          <div key={m.userId} className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-5 py-4 flex items-center gap-3">
            <Avatar user={m.user} size={36} />
            <div className="flex-1 min-w-0">
              <p className="text-sm ns-bold text-gray-900 dark:text-white truncate">{m.user?.nickname || m.user?.name || '알 수 없음'}</p>
              {m.user?.discordUsername && <p className="text-xs text-gray-400">@{m.user.discordUsername}</p>}
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <button type="button" disabled={loading === `reject-${m.userId}`}
                onClick={() => memberAction(m.userId, 'reject')}
                className="flex items-center gap-1 text-xs ns-bold px-3 py-2 rounded-xl bg-gray-100 dark:bg-[#252525] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors disabled:opacity-50"
              ><IconX /> 거절</button>
              <button type="button" disabled={loading === `accept-${m.userId}`}
                onClick={() => memberAction(m.userId, 'accept')}
                className="flex items-center gap-1 text-xs ns-bold px-3 py-2 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all disabled:opacity-50"
              ><IconCheck /> 수락</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderSettings() {
    return (
      <div className="space-y-3">
        {/* 초대 코드 */}
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-5 py-4 space-y-3">
          <p className="text-xs ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">초대 코드</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-base ns-extrabold text-gray-900 dark:text-white tracking-[0.3em] bg-gray-50 dark:bg-[#252525] rounded-xl px-4 py-3 text-center min-w-0">
              {expedition.inviteCode}
            </code>
            <button type="button" onClick={copyCode}
              className={`flex items-center justify-center gap-1.5 text-xs ns-bold w-[72px] py-3 rounded-xl transition-all flex-shrink-0 ${
                copied
                  ? 'bg-emerald-400 text-white'
                  : 'bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              <IconCopy /> {copied ? '복사됨' : '복사'}
            </button>
            {isLeader && (
              <button type="button" onClick={() => setRegenConfirm(true)} disabled={regenLoading}
                className="flex items-center justify-center gap-1.5 text-xs ns-bold w-[96px] py-3 rounded-xl flex-shrink-0 bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-all disabled:opacity-50"
              >
                <IconRegen /> {regenLoading ? '재발급 중...' : '재발급'}
              </button>
            )}
          </div>
        </div>

        {isLeader && (
          <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-5 py-4 space-y-4">
            <p className="text-xs ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">공격대 설정</p>
            <div>
              <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 block mb-1.5">공격대 이름</label>
              <input value={settingsForm.name} maxLength={30}
                onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#252525] border border-transparent focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1a1a1a] text-sm dark:text-white outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 block mb-1.5">소개</label>
              <textarea value={settingsForm.description} maxLength={200} rows={2}
                onChange={e => setSettingsForm(p => ({ ...p, description: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#252525] border border-transparent focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1a1a1a] text-sm dark:text-white outline-none transition-all resize-none"
              />
            </div>
            <div>
              <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 block mb-1.5">공지사항</label>
              <textarea value={settingsForm.notice} maxLength={300} rows={3}
                onChange={e => setSettingsForm(p => ({ ...p, notice: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-gray-50 dark:bg-[#252525] border border-transparent focus:border-[var(--accent-400)] focus:bg-white dark:focus:bg-[#1a1a1a] text-sm dark:text-white outline-none transition-all resize-none"
              />
            </div>
            <div className="flex items-center justify-between gap-4 py-1">
              <div>
                <p className="text-sm ns-bold text-gray-900 dark:text-white">즉시 가입</p>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">초대 코드 입력 시 승인 없이 바로 가입돼요</p>
              </div>
              <button
                type="button"
                onClick={() => setSettingsForm(p => ({ ...p, autoAccept: !p.autoAccept }))}
                className={`relative flex-shrink-0 rounded-full transition-colors ${settingsForm.autoAccept ? 'bg-[var(--accent-400)]' : 'bg-gray-200 dark:bg-[#383838]'}`}
                style={{ height: '26px', width: '46px' }}
              >
                <span className={`absolute top-[3px] left-[3px] w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${settingsForm.autoAccept ? 'translate-x-5' : 'translate-x-0'}`} />
              </button>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button type="button" onClick={saveSettings} disabled={loading === 'settings'}
                className="rounded-xl py-3 px-6 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all disabled:opacity-60"
              >
                {loading === 'settings' ? '저장 중...' : '저장하기'}
              </button>
            </div>
          </div>
        )}

        {/* 탈퇴 / 삭제 */}
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-sm px-5 py-4">
          <button type="button" onClick={() => leaveOrDelete(isLeader)}
            className="text-sm ns-bold text-red-500 hover:text-red-600 transition-colors"
          >
            {isLeader ? '공격대 삭제' : '공격대 탈퇴'}
          </button>
        </div>
      </div>
    )
  }

  // ── 레이드 모달 ──────────────────────────────────────────────────────────
  function renderRaidModal() {
    if (!raidModal) return null
    const [selRaidId, selDiff] = raidModal.split('__')
    const stat = raidStats.find(s => `${s.raidId}__${s.difficulty}` === raidModal)
    const { name, diff } = getRaidLabel(selRaidId, selDiff)

    const sorted = [...visibleMembers].sort((a, b) => {
      const aFav = expedition.favoritedUserIds?.includes(a.userId) ? 0 : 1
      const bFav = expedition.favoritedUserIds?.includes(b.userId) ? 0 : 1
      return aFav - bFav
    })

    const rows = sorted
      .map(m => ({ m, chars: getMemberIncompleteChars(m, selRaidId, selDiff) }))
      .filter(({ chars }) => chars.length > 0)
      .slice(0, 100)

    const completedRows = sorted
      .map(m => ({ m, chars: getMemberCompletedChars(m, selRaidId, selDiff) }))
      .filter(({ chars }) => chars.length > 0)
      .slice(0, 100)

    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4">
        <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-[2px]" onClick={() => setRaidModal(null)} />

        <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl overflow-hidden">
          {/* 모바일 핸들 */}
          <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
          </div>

          {/* 헤더 */}
          <div className="px-5 pt-4 pb-4 border-b border-gray-100 dark:border-[#252525] flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base ns-extrabold text-gray-900 dark:text-white">{name.replace(' EX', '')}</h2>
                  <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400">{diff}</span>
                </div>
                <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                  미완료{' '}
                  <span className="ns-bold text-[var(--accent-600)] dark:text-[var(--accent-400)]">{stat?.incompleteMembers}명</span>
                  {' · '}
                  <span className="ns-bold text-[var(--accent-600)] dark:text-[var(--accent-400)]">{stat?.incompleteChars}캐릭터</span>
                </p>
              </div>
              <div className="flex items-start gap-2 flex-shrink-0">
                <div className="text-right">
                  <p className="text-2xl ns-extrabold leading-none text-gray-900 dark:text-white">
                    {stat?.pct}<span className="text-sm text-gray-400 dark:text-gray-500">%</span>
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{stat?.completedMembers}/{stat?.totalWithRaid}명 완료</p>
                </div>
                <button
                  type="button"
                  onClick={() => setRaidModal(null)}
                  className="mt-0.5 p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-[#2a2a2a] transition-colors flex-shrink-0"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
            </div>
            <div className="mt-3 h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 bg-gradient-to-r from-[var(--accent-400)] to-[var(--accent-300)]"
                style={{ width: `${stat?.pct ?? 0}%` }}
              />
            </div>
          </div>

          {/* 본문 스크롤 */}
          <div className="overflow-y-auto flex-1 overscroll-contain">
            {rows.length === 0 && completedRows.length === 0 ? (
              <div className="py-14 text-center space-y-2">
                <p className="text-3xl">✅</p>
                <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">미완료 캐릭터가 없어요</p>
              </div>
            ) : (
              <div>
                {/* 미완료 멤버 */}
                {rows.length === 0 ? (
                  <div className="py-10 text-center space-y-1 border-b border-gray-50 dark:border-[#1f1f1f]">
                    <p className="text-2xl">✅</p>
                    <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">미완료 캐릭터가 없어요</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-50 dark:divide-[#1f1f1f]">
                    {rows.map(({ m, chars }) => {
                      const isFav = expedition.favoritedUserIds?.includes(m.userId)
                      const repChar = m.expeditions?.[0]?.characters?.[0] || null
                      return (
                        <div
                          key={m.userId}
                          className={`px-5 py-4 ${isFav ? 'bg-[var(--accent-50)]/30 dark:bg-[var(--accent-900)]/5' : ''}`}
                        >
                          <div className="flex items-center gap-2 mb-2.5">
                            <div className="relative flex-shrink-0">
                              <Avatar user={m.user} size={28} />
                              {isFav && (
                                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1a1a1a] flex items-center justify-center shadow-sm">
                                  <IconStar filled size={8} />
                                </span>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <span className="text-sm ns-bold text-gray-900 dark:text-white truncate block">{m.displayName}</span>
                              {repChar && (
                                <div className="flex items-center gap-0.5 text-[var(--accent-500)] mt-0.5">
                                  <IconCrown />
                                  <span className="text-[11px] ns-bold text-gray-500 dark:text-gray-400 truncate">{repChar.name}</span>
                                </div>
                              )}
                            </div>
                            <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-400)] flex-shrink-0">
                              {chars.length}캐릭터 미완료
                            </span>
                          </div>

                          <div className="flex flex-wrap gap-1.5">
                            {chars.map((c, ci) => {
                              const iconFile = CLASS_ICON[c.characterClass]
                              return (
                                <div key={ci} className="relative group cursor-default flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ns-bold bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300">
                                  {iconFile && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={`/class/${iconFile}.svg`} alt={c.characterClass} className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />
                                  )}
                                  <span>{c.name}</span>
                                  <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col gap-1 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] text-gray-700 dark:text-gray-200 rounded-lg px-2.5 py-2 whitespace-nowrap shadow-md z-50">
                                    <div className="flex items-center gap-1 text-[11px] ns-bold">
                                      <IconTrophy />
                                      <span>{Number(c.itemLevel).toFixed(2)}</span>
                                    </div>
                                    {c.combatPower != null && (
                                      <div className="flex items-center gap-1 text-[11px] ns-bold">
                                        <IconPower />
                                        <span>{Math.round(Number(c.combatPower)).toLocaleString('ko-KR')}</span>
                                      </div>
                                    )}
                                    <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-[#2a2a2a]" />
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

                {/* 완료한 멤버 */}
                {completedRows.length > 0 && (
                  <>
                    <div className="px-5 pt-4 pb-2 border-t border-gray-100 dark:border-[#252525]">
                      <div className="flex items-center gap-2">
                        <h3 className="text-[11px] ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">완료한 레이드</h3>
                        <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400">{completedRows.length}</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-[#1f1f1f]">
                      {completedRows.map(({ m, chars }) => {
                        const isFav = expedition.favoritedUserIds?.includes(m.userId)
                        const repChar = m.expeditions?.[0]?.characters?.[0] || null
                        return (
                          <div
                            key={m.userId}
                            className={`px-5 py-4 ${isFav ? 'bg-[var(--accent-50)]/30 dark:bg-[var(--accent-900)]/5' : ''}`}
                          >
                            <div className="flex items-center gap-2 mb-2.5">
                              <div className="relative flex-shrink-0">
                                <Avatar user={m.user} size={28} />
                                {isFav && (
                                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full bg-white dark:bg-[#1a1a1a] flex items-center justify-center shadow-sm">
                                    <IconStar filled size={8} />
                                  </span>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <span className="text-sm ns-bold text-gray-400 dark:text-gray-500 truncate block">{m.displayName}</span>
                                {repChar && (
                                  <div className="flex items-center gap-0.5 text-[var(--accent-500)]/70 mt-0.5">
                                    <IconCrown />
                                    <span className="text-[11px] ns-bold text-gray-400 dark:text-gray-500 truncate">{repChar.name}</span>
                                  </div>
                                )}
                              </div>
                              <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 flex-shrink-0 flex items-center gap-1">
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                  <polyline points="20 6 9 17 4 12" />
                                </svg>
                                {chars.length}캐릭터 완료
                              </span>
                            </div>

                            <div className="flex flex-wrap gap-1.5">
                              {chars.map((c, ci) => {
                                const iconFile = CLASS_ICON[c.characterClass]
                                return (
                                  <div key={ci} className="relative group cursor-default flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] ns-bold bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {iconFile && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={`/class/${iconFile}.svg`} alt={c.characterClass} className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />
                                    )}
                                    <span>{c.name}</span>
                                    <div className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:flex flex-col gap-1 bg-white dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#3a3a3a] text-gray-700 dark:text-gray-200 rounded-lg px-2.5 py-2 whitespace-nowrap shadow-md z-50">
                                      <div className="flex items-center gap-1 text-[11px] ns-bold">
                                        <IconTrophy />
                                        <span>{Number(c.itemLevel).toFixed(2)}</span>
                                      </div>
                                      {c.combatPower != null && (
                                        <div className="flex items-center gap-1 text-[11px] ns-bold">
                                          <IconPower />
                                          <span>{Math.round(Number(c.combatPower)).toLocaleString('ko-KR')}</span>
                                        </div>
                                      )}
                                      <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-white dark:border-t-[#2a2a2a]" />
                                    </div>
                                  </div>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-5">
        {/* 헤더 */}
        <div>
          <button type="button" onClick={() => router.push('/group')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <IconBack /> 공격대 목록
          </button>
          <h1 className="text-xl ns-extrabold text-gray-900 dark:text-white truncate">{expedition.name}</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {expedition.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 truncate">{expedition.description}</p>
            )}
            <span className="text-xs text-gray-400 dark:text-gray-500 flex-shrink-0">
              멤버 {activeMembers.length}명
            </span>
          </div>
        </div>

        {/* 공지 */}
        {expedition.notice && (
          <div className="rounded-2xl bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 border border-[var(--accent-200)] dark:border-[var(--accent-900)]/30 px-5 py-4">
            <p className="text-[11px] ns-extrabold text-[var(--accent-600)] dark:text-[var(--accent-400)] uppercase tracking-wider mb-1.5">공지</p>
            <p className="text-xs text-[var(--accent-800)] dark:text-[var(--accent-300)] whitespace-pre-wrap leading-relaxed">{expedition.notice}</p>
          </div>
        )}

        {/* 탭 바 — 세그먼트 컨트롤 */}
        <div className="flex gap-1 p-1 bg-gray-100 dark:bg-[#252525] rounded-2xl">
          {TABS.map(t => (
            <button key={t.id} type="button" onClick={() => setTab(t.id)}
              className={`flex-1 relative rounded-xl px-2 py-2.5 text-xs ns-bold transition-all duration-150 ${
                tab === t.id
                  ? 'bg-white dark:bg-[#1e1e1e] text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
              {t.id === 'pending' && pendingMembers.length > 0 && (
                <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[9px] ns-bold bg-red-500 text-white rounded-full">{pendingMembers.length}</span>
              )}
            </button>
          ))}
        </div>

        {/* 탭 컨텐츠 */}
        <div>
          {tab === 'raids'    && renderRaids()}
          {tab === 'members'  && renderMembers()}
          {tab === 'pending'  && renderPending()}
          {tab === 'settings' && renderSettings()}
        </div>
      </div>
      {renderRaidModal()}
      {regenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRegenConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2 space-y-1.5">
              <p className="text-base ns-extrabold text-gray-900 dark:text-white">초대 코드 재발급</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">기존 초대 코드는 사용할 수 없게 돼요. 계속할까요?</p>
            </div>
            <div className="flex gap-2 px-6 pb-6 pt-4">
              <button type="button" onClick={() => setRegenConfirm(false)}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
              >취소</button>
              <button type="button" onClick={regenCode}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all"
              >재발급</button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-2 space-y-1.5">
              <p className="text-base ns-extrabold text-gray-900 dark:text-white">공격대 삭제</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                이 작업은 되돌릴 수 없어요.<br />삭제하려면 아래에 <span className="ns-bold text-gray-700 dark:text-gray-300">삭제합니다</span>를 입력하세요.
              </p>
            </div>
            <div className="px-6 pt-3 pb-1">
              <input
                type="text"
                value={deleteInput}
                onChange={e => setDeleteInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && deleteInput === '삭제합니다') performDelete() }}
                placeholder="삭제합니다"
                className="w-full rounded-xl px-4 py-2.5 text-sm ns-bold border border-gray-200 dark:border-[#3a3a3a] bg-gray-50 dark:bg-[#252525] text-gray-900 dark:text-white placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:border-red-400 dark:focus:border-red-500 transition-colors"
              />
            </div>
            <div className="flex gap-2 px-6 pb-6 pt-3">
              <button type="button" onClick={() => setDeleteConfirm(false)}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
              >취소</button>
              <button type="button" onClick={performDelete} disabled={deleteInput !== '삭제합니다'}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              >삭제</button>
            </div>
          </div>
        </div>
      )}
      {memberModal && (
        <MemberDetailModal
          member={memberModal.member}
          role={memberModal.role}
          myMember={adaptedActive.find(m => m.userId === userId)}
          raidList={raidList}
          onClose={() => setMemberModal(null)}
        />
      )}
      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSaveSuccess(false)} />
          <div className="relative z-10 w-full max-w-xs mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl overflow-hidden">
            <div className="px-6 pt-8 pb-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-base ns-extrabold text-gray-900 dark:text-white">저장 완료</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">공격대 설정이 저장되었어요</p>
              </div>
              <button
                type="button"
                onClick={() => setSaveSuccess(false)}
                className="w-full rounded-xl py-3 text-sm ns-bold bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-gray-900 transition-all mt-2"
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { RAID_MAP } from '@/lib/raidData'
import { getGroupRaidList, raidStatusOf, adaptMember } from '@/lib/groupRaidShare'
import { CLASS_ICON } from '@/app/dashboard/_constants'
import { saveRaid } from '@/app/dashboard/_raidHelpers'
import RaidDetailModal, { CharChip } from '@/app/components/RaidDetailModal'
import { IconCrown, IconTrophy, IconX, IconBack, IconCopy, IconStar, IconPower, IconCheck, IconRegen } from '@/app/dashboard/_icons'

// ── Helpers ───────────────────────────────────────────────────────────────────
function isHidden(member) {
  return member.visibility === 'none' || member.user?.raidPublic === false
}

function getMemberIncompleteChars(member, raidId, difficulty) {
  if (isHidden(member)) return []
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
  if (isHidden(member)) return []
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

function getRaidLabel(raidId, difficulty) {
  const raid = RAID_MAP[raidId]
  const diff = raid?.difficulties?.find(d => d.key === difficulty)
  return { name: raid?.name || raidId, diff: diff?.label || difficulty, image: raid?.image || null }
}

// ── 난이도 색상 맵 ───────────────────────────────────────────────────────────
const DIFF_COLORS = {
  nightmare: { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', bar: 'from-violet-400 to-purple-300', pct: 'text-violet-600 dark:text-violet-400' },
  hard:      { badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',             bar: 'from-red-400 to-red-300',       pct: 'text-red-600 dark:text-red-400' },
  normal:    { badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',             bar: 'from-sky-400 to-cyan-300',      pct: 'text-sky-600 dark:text-sky-400' },
  stage3:    { badge: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400', bar: 'from-violet-400 to-purple-300', pct: 'text-violet-600 dark:text-violet-400' },
  stage2:    { badge: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',             bar: 'from-red-400 to-red-300',       pct: 'text-red-600 dark:text-red-400' },
  stage1:    { badge: 'bg-sky-100 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',             bar: 'from-sky-400 to-cyan-300',      pct: 'text-sky-600 dark:text-sky-400' },
}
const DIFF_COLOR_DEFAULT = { badge: 'bg-gray-100 text-gray-600 dark:bg-[#333] dark:text-gray-300', bar: 'from-gray-400 to-gray-300', pct: 'text-gray-700 dark:text-gray-200' }

function Avatar({ user, size = 28 }) {
  const name = user?.nickname || user?.name || user?.discordUsername || '?'
  const sz   = { width: size, height: size }
  const src  = user?.image || '/default-avatar.svg'
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={name} style={sz}
      className="rounded-full flex-shrink-0 object-cover"
      onError={e => { e.currentTarget.src = '/default-avatar.svg' }}
    />
  )
}

// ── GuildMemberRaidModal — RaidDetailModal 어댑터 ─────────────────────────────
function GuildMemberRaidModal({ member, role, myMember, raidList, persistedToggles = {}, onCharToggle, onClose }) {
  const repChar   = member.expeditions?.[0]?.characters?.[0] || null
  const myRepChar = myMember?.expeditions?.[0]?.characters?.[0] || null

  const memberRaidData = useMemo(() => raidList.map(({ raidId, difficulty }) => {
    const chars = []
    for (const exp of member.expeditions || []) {
      for (const c of exp.characters || []) {
        const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (!entry) continue
        chars.push({ ...c, charClass: c.characterClass, status: raidStatusOf(entry) })
      }
    }
    return { raidId, difficulty, chars }
  }).filter(r => r.chars.length > 0), [member, raidList])

  const incompleteRaids = useMemo(() =>
    memberRaidData.map(r => ({ ...r, chars: r.chars.filter(c => c.status !== 'complete') })).filter(r => r.chars.length > 0),
    [memberRaidData])

  const completedRaids = useMemo(() =>
    memberRaidData.map(r => ({ ...r, chars: r.chars.filter(c => c.status === 'complete') })).filter(r => r.chars.length > 0),
    [memberRaidData])

  const togetherRaids = useMemo(() =>
    incompleteRaids.filter(({ raidId, difficulty }) => {
      for (const exp of myMember?.expeditions || []) {
        for (const c of exp.characters || []) {
          const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (entry && raidStatusOf(entry) !== 'complete') return true
        }
      }
      return false
    }),
    [incompleteRaids, myMember])

  const headerBadge = role === 'leader'
    ? <span className="text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-2 py-0.5 rounded-full">길드장</span>
    : role === 'officer'
    ? <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부길드장</span>
    : null

  function myCharsForRaid(raidId, difficulty) {
    if (!myMember) return []
    const result = []
    for (const exp of myMember.expeditions || []) {
      for (const c of exp.characters || []) {
        const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (!entry || raidStatusOf(entry) === 'complete') continue
        result.push({ ...c, charClass: c.characterClass, characterRaids: c.raids })
      }
    }
    return result
  }

  return (
    <RaidDetailModal
      name={member.user?.nickname || member.user?.name || '알 수 없음'}
      image={member.user?.image}
      discordUsername={member.user?.discordUsername}
      repChar={repChar}
      headerBadge={headerBadge}
      isPrivate={member.visibility === 'none'}
      togetherRaids={togetherRaids}
      incompleteRaids={incompleteRaids}
      completedRaids={completedRaids}
      myUser={{ name: myMember?.displayName, image: myMember?.user?.image }}
      myRepChar={myRepChar ? { name: myRepChar.name } : null}
      myCharsForRaid={myCharsForRaid}
      persistedToggles={persistedToggles}
      onCharToggle={onCharToggle}
      onClose={onClose}
    />
  )
}

// ── 탭 정의 ──────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'raids',    label: '레이드현황', leaderOnly: false },
  { id: 'members',  label: '멤버',       leaderOnly: false },
  { id: 'manage',   label: '멤버관리',   leaderOnly: true  },
  { id: 'pending',  label: '대기중',     leaderOnly: true  },
  { id: 'settings', label: '설정',       leaderOnly: true  },
]

// ── Main ──────────────────────────────────────────────────────────────────────
export default function GuildDetailClient({ expedition: init, userId, myMembership }) {
  const router = useRouter()
  const [expedition,   setExpedition]   = useState(init)
  const [favSortIds,   setFavSortIds]   = useState(() => init.favoritedUserIds || [])
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
  const [raidModal,         setRaidModal]         = useState(null)
  const [raidModalLocalDone, setRaidModalLocalDone] = useState({})
  const [memberModal,   setMemberModal]   = useState(null)
  const [myCharToggles, setMyCharToggles] = useState({})
  const handleCharToggle = (key, val) => setMyCharToggles(prev => ({ ...prev, [key]: val }))
  const [deleteConfirm, setDeleteConfirm] = useState(false)
  const [deleteInput,   setDeleteInput]   = useState('')
  const [kickConfirm,   setKickConfirm]   = useState(null) // { userId, displayName }
  const [memberSearch,  setMemberSearch]  = useState('')
  const [manageSearch,  setManageSearch]  = useState('')

  const anyModalOpen = !!raidModal || !!memberModal || !!kickConfirm || regenConfirm || deleteConfirm || saveSuccess
  useEffect(() => {
    document.body.style.overflow = anyModalOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [anyModalOpen])

  const isLeader  = expedition.leaderId === userId
  const isOfficer = isLeader || myMembership.role === 'officer'

  const activeMembers  = expedition.members.filter(m => m.status === 'active')
  const pendingMembers = expedition.members.filter(m => m.status === 'pending')

  const adaptedActive  = useMemo(() => activeMembers.map(adaptMember), [activeMembers])
  const raidList       = useMemo(() => getGroupRaidList(adaptedActive), [adaptedActive])
  const visibleMembers = useMemo(() => adaptedActive.filter(m => !isHidden(m)), [adaptedActive])

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
    const pct = totalChars > 0 ? Math.round((completedChars / totalChars) * 100) : 0
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
    const trimmedName = settingsForm.name?.trim() || ''
    if (!trimmedName) { alert('길드 이름을 입력하세요'); return }
    if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/.test(trimmedName)) { alert('길드 이름은 한글, 영어, 숫자만 사용 가능합니다.'); return }
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
    if (!confirm('길드에서 탈퇴하시겠습니까?')) return
    await fetch(`/api/expedition/${expedition.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'leave' }),
    })
    router.push('/guild')
    router.refresh()
  }

  async function performDelete() {
    await fetch(`/api/expedition/${expedition.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    })
    router.push('/guild')
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
        <button type="button" onClick={() => router.push('/guild')}
          className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        >
          <IconBack /> 길드 목록
        </button>
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-6 py-16 text-center space-y-3">
          <p className="text-4xl">⏳</p>
          <p className="text-base ns-extrabold text-gray-900 dark:text-white">{expedition.name}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">가입 승인 대기 중이에요</p>
          <p className="text-xs text-gray-400 dark:text-gray-500">길드장이 수락하면 입장할 수 있어요</p>
        </div>
      </div>
    )
  }

  // ── 탭 컨텐츠 렌더 함수 ──────────────────────────────────────────────────

  function renderRaids() {
    if (raidList.length === 0 || visibleMembers.length === 0) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] py-16 text-center space-y-2">
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

              {/* 난이도별 카드 — 항상 3열 고정, 카드마다 1/3 너비 */}
              <div className="grid grid-cols-3 gap-2.5">
                {difficulties.map(stat => {
                  const { diff } = getRaidLabel(stat.raidId, stat.difficulty)
                  const key = `${stat.raidId}__${stat.difficulty}`
                  const allDone = stat.incompleteChars === 0 && stat.totalChars > 0
                  const c = DIFF_COLORS[stat.difficulty] || DIFF_COLOR_DEFAULT

                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRaidModal(key)}
                      className="group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.06)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.4)] hover:shadow-[0_8px_24px_rgba(0,0,0,0.12)] dark:hover:shadow-[0_8px_28px_rgba(0,0,0,0.55)] hover:-translate-y-1 active:translate-y-0 px-4 pt-5 pb-4 text-left transition-all duration-200"
                    >
                      {/* 상단 컬러 액센트 바 */}
                      <span className={`absolute inset-x-0 top-0 h-[3px] bg-gradient-to-r ${c.bar}`} />

                      {/* 난이도 뱃지 */}
                      <span className={`inline-flex text-[10px] ns-extrabold px-2.5 py-0.5 rounded-full leading-none mb-3 ${c.badge}`}>
                        {diff}
                      </span>

                      {/* 완료율 */}
                      <p className={`text-3xl ns-extrabold tabular-nums leading-none mb-0.5 ${c.pct}`}>
                        {stat.totalWithRaid > 0 ? stat.pct : '—'}
                        {stat.totalWithRaid > 0 && <span className="text-sm font-normal text-gray-400 dark:text-gray-500 ml-0.5">%</span>}
                      </p>
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mb-3.5">
                        {stat.totalChars > 0 ? `${stat.completedChars}/${stat.totalChars}캐릭터 완료` : '데이터 없음'}
                      </p>

                      {/* 프로그레스 바 */}
                      <div className="h-1 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 bg-gradient-to-r ${c.bar}`}
                          style={{ width: stat.totalWithRaid > 0 ? `${stat.pct}%` : '0%' }}
                        />
                      </div>

                      {allDone && (
                        <div className="mt-2.5 flex items-center gap-1">
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500 flex-shrink-0">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span className="text-[10px] ns-bold text-emerald-500">모두 완료</span>
                        </div>
                      )}
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

    const q = memberSearch.trim().toLowerCase()
    const sorted = [...activeMembers]
      .filter(m => {
        if (!q) return true
        const name = (m.user?.nickname || m.user?.name || '').toLowerCase()
        const discord = (m.user?.discordUsername || '').toLowerCase()
        const repCharName = ((m.user?.loaExpeditions?.[0]?.characters || [])[0]?.name || '').toLowerCase()
        return name.includes(q) || discord.includes(q) || repCharName.includes(q)
      })
      .sort((a, b) => {
        const aFav = favSortIds.includes(a.userId) ? 0 : 1
        const bFav = favSortIds.includes(b.userId) ? 0 : 1
        return aFav - bFav
      })

    return (
      <div className="space-y-4">
        {/* 내 공개 설정 */}
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4 flex items-center justify-between gap-4">
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

        {/* 검색 */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={memberSearch}
            onChange={e => setMemberSearch(e.target.value)}
            placeholder="닉네임, 디스코드, 대표 캐릭터 검색"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#2a2a2a] focus:border-[var(--accent-400)] text-sm dark:text-white outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm"
          />
        </div>

        {/* 멤버 그리드 */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sorted.length === 0 ? (
            <div className="col-span-full py-10 text-center">
              <p className="text-sm text-gray-400 dark:text-gray-500">검색 결과가 없어요</p>
            </div>
          ) : null}
          {sorted.map(m => {
            const role   = expedition.leaderId === m.userId ? 'leader' : m.role
            const isFav  = expedition.favoritedUserIds?.includes(m.userId)
            const isSelf = m.userId === userId

            const repChar = (m.user?.loaExpeditions?.[0]?.characters || [])[0] || null

            return (
              <div key={m.userId}
                className={`relative rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-4 py-4 ${!isSelf ? 'cursor-pointer hover:shadow-[0_8px_28px_rgba(0,0,0,0.11)] dark:hover:shadow-[0_8px_32px_rgba(0,0,0,0.6)] hover:-translate-y-1 active:translate-y-0 transition-all duration-150' : ''}`}
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
                      {role === 'leader'  && <span className="text-[10px] ns-bold bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] px-2 py-0.5 rounded-full">길드장</span>}
                      {role === 'officer' && <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부길드장</span>}
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
                          <IconTrophy className="text-gray-400 flex-shrink-0" />
                          <span className="text-xs ns-bold text-gray-700 dark:text-gray-300">
                            {Number(repChar.itemLevel).toFixed(2)}
                          </span>
                        </div>
                        {repChar.combatPower != null && (
                          <div className="flex items-center gap-0.5">
                            <IconPower size={12} />
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
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] py-14 text-center space-y-2">
          <p className="text-sm text-gray-400">권한이 없습니다.</p>
        </div>
      )
    }
    if (pendingMembers.length === 0) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] py-14 text-center space-y-2">
          <p className="text-2xl">✅</p>
          <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">대기 중인 신청이 없어요</p>
        </div>
      )
    }
    return (
      <div className="space-y-2.5">
        {pendingMembers.map(m => (
          <div key={m.userId} className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4 flex items-center gap-3">
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
              ><IconCheck size={12} strokeWidth={2.5} /> 수락</button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  function renderManageMembers() {
    if (!isLeader) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] py-14 text-center space-y-2">
          <p className="text-sm text-gray-400">권한이 없습니다.</p>
        </div>
      )
    }
    const kickableMembers = activeMembers.filter(m => m.userId !== userId)
    if (kickableMembers.length === 0) {
      return (
        <div className="rounded-3xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] py-14 text-center space-y-2">
          <p className="text-2xl">👥</p>
          <p className="text-sm ns-bold text-gray-500 dark:text-gray-400">관리할 멤버가 없어요</p>
        </div>
      )
    }
    const mq = manageSearch.trim().toLowerCase()
    const filteredKickable = kickableMembers.filter(m => {
      if (!mq) return true
      const name = (m.user?.nickname || m.user?.name || '').toLowerCase()
      const discord = (m.user?.discordUsername || '').toLowerCase()
      const repCharName = ((m.user?.loaExpeditions?.[0]?.characters || [])[0]?.name || '').toLowerCase()
      return name.includes(mq) || discord.includes(mq) || repCharName.includes(mq)
    })
    return (
      <div className="space-y-2.5">
        {/* 검색 */}
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 dark:text-gray-600 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={manageSearch}
            onChange={e => setManageSearch(e.target.value)}
            placeholder="닉네임, 디스코드, 대표 캐릭터 검색"
            className="w-full pl-8 pr-4 py-2.5 rounded-xl bg-white dark:bg-[#1e1e1e] border border-gray-100 dark:border-[#2a2a2a] focus:border-[var(--accent-400)] text-sm dark:text-white outline-none transition-all placeholder:text-gray-300 dark:placeholder:text-gray-600 shadow-sm"
          />
        </div>
        {filteredKickable.length === 0 && (
          <div className="py-10 text-center rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)]">
            <p className="text-sm text-gray-400 dark:text-gray-500">검색 결과가 없어요</p>
          </div>
        )}
        {filteredKickable.map(m => {
          const role     = expedition.leaderId === m.userId ? 'leader' : m.role
          const repChar  = (m.user?.loaExpeditions?.[0]?.characters || [])[0] || null
          const dispName = m.user?.nickname || m.user?.name || '알 수 없음'
          return (
            <div key={m.userId} className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4 flex items-center gap-3">
              <Avatar user={m.user} size={36} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-sm ns-bold text-gray-900 dark:text-white truncate">{dispName}</span>
                  {role === 'officer' && <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full">부길드장</span>}
                </div>
                {repChar && (
                  <div className="flex items-center gap-0.5 mt-0.5 text-[var(--accent-500)]">
                    <IconCrown />
                    <span className="text-xs ns-bold text-gray-500 dark:text-gray-400 truncate">{repChar.name}</span>
                  </div>
                )}
                {m.user?.discordUsername && <p className="text-xs text-gray-400">@{m.user.discordUsername}</p>}
              </div>
              <button
                type="button"
                disabled={loading === `kick-${m.userId}`}
                onClick={() => setKickConfirm({ userId: m.userId, displayName: dispName })}
                className="flex-shrink-0 text-xs ns-bold px-3 py-2 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors disabled:opacity-50"
              >
                추방
              </button>
            </div>
          )
        })}
      </div>
    )
  }

  function renderSettings() {
    return (
      <div className="space-y-3">
        {/* 초대 코드 */}
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4 space-y-3">
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
          <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4 space-y-4">
            <p className="text-xs ns-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-wider">길드 설정</p>
            <div>
              <label className="text-xs ns-bold text-gray-500 dark:text-gray-400 block mb-1.5">길드 이름</label>
              <input value={settingsForm.name} maxLength={12}
                onChange={e => setSettingsForm(p => ({ ...p, name: e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/g, '') }))}
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
        <div className="rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] px-5 py-4">
          <button type="button" onClick={() => leaveOrDelete(isLeader)}
            className="text-sm ns-bold text-red-500 hover:text-red-600 transition-colors"
          >
            {isLeader ? '길드 삭제' : '길드 탈퇴'}
          </button>
        </div>
      </div>
    )
  }

  // ── 레이드 모달 ──────────────────────────────────────────────────────────
  function handleGuildRaidMyCharToggle(char, raidId, difficulty) {
    const key = `${char.id}:${raidId}:${difficulty}`
    const entry = char.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
    if (!entry) return
    const currentDone = key in raidModalLocalDone ? raidModalLocalDone[key] : false
    const newDone = !currentDone
    setRaidModalLocalDone(prev => ({ ...prev, [key]: newDone }))
    const gateCount = entry.gateClears?.length
      || RAID_MAP[entry.raidId]?.difficulties?.find(d => d.key === entry.difficulty)?.gates
      || 1
    saveRaid(char.id, {
      raidId: entry.raidId,
      difficulty: entry.difficulty,
      gateClears: Array.from({ length: gateCount }, () => newDone),
      isGoldCheck: entry.isGoldCheck,
      moreDone: newDone ? entry.moreDone : false,
      moreFrom: entry.moreFrom,
    })
  }

  function renderRaidModal() {
    if (!raidModal) return null
    const [selRaidId, selDiff] = raidModal.split('__')
    const stat = raidStats.find(s => `${s.raidId}__${s.difficulty}` === raidModal)
    const { name, diff } = getRaidLabel(selRaidId, selDiff)

    const sorted = [...visibleMembers].sort((a, b) => {
      const aFav = favSortIds.includes(a.userId) ? 0 : 1
      const bFav = favSortIds.includes(b.userId) ? 0 : 1
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

        <div className="relative z-10 w-full sm:max-w-2xl max-h-[92vh] sm:max-h-[85vh] flex flex-col rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1a1a1a] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:shadow-border overflow-hidden">
          {/* 모바일 핸들 */}
          <div className="sm:hidden flex justify-center pt-3 pb-0 flex-shrink-0">
            <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
          </div>

          {/* 헤더 */}
          <div className="px-5 pt-4 pb-4 border-b border-gray-200 dark:border-[#2d2d2d] flex-shrink-0">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base ns-extrabold text-gray-900 dark:text-white">{name.replace(' EX', '')}</h2>
                  <span className="text-[10px] ns-bold px-2 py-0.5 rounded-full bg-gray-100 dark:bg-[#333] text-gray-500 dark:text-gray-300">{diff}</span>
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
                      const isMyRow = m.userId === userId
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
                              const charKey = `${c.id}:${selRaidId}:${selDiff}`
                              const effectiveDone = isMyRow ? (charKey in raidModalLocalDone ? raidModalLocalDone[charKey] : false) : false
                              return (
                                <CharChip
                                  key={ci}
                                  itemLevel={c.itemLevel}
                                  combatPower={c.combatPower}
                                  onClick={isMyRow ? () => handleGuildRaidMyCharToggle(c, selRaidId, selDiff) : undefined}
                                  className={effectiveDone
                                    ? 'bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-400 dark:border-emerald-600 text-emerald-700 dark:text-emerald-400'
                                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-700 dark:text-gray-300'}>
                                  {effectiveDone && (
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                  )}
                                  {iconFile && (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img src={`/class/${iconFile}.svg`} alt={c.characterClass} className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />
                                  )}
                                  <span>{c.name}</span>
                                </CharChip>
                              )
                            })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {/* 완료한 멤버 - 숨김 */}
                {false && completedRows.length > 0 && (
                  <>
                    <div className="px-5 pt-4 pb-2 border-t border-gray-200 dark:border-[#2d2d2d]">
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
                                  <CharChip key={ci} itemLevel={c.itemLevel} combatPower={c.combatPower} className="bg-gray-100 dark:bg-[#2a2a2a] text-gray-400 dark:text-gray-500">
                                    <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
                                      <polyline points="20 6 9 17 4 12" />
                                    </svg>
                                    {iconFile && (
                                      // eslint-disable-next-line @next/next/no-img-element
                                      <img src={`/class/${iconFile}.svg`} alt={c.characterClass} className="w-3.5 h-3.5 object-contain flex-shrink-0 class-icon" />
                                    )}
                                    <span>{c.name}</span>
                                  </CharChip>
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
          <button type="button" onClick={() => router.push('/guild')}
            className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors mb-3"
          >
            <IconBack /> 길드 목록
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
          {TABS.filter(t => !t.leaderOnly || isLeader).map(t => (
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
          {tab === 'manage'   && renderManageMembers()}
          {tab === 'pending'  && renderPending()}
          {tab === 'settings' && renderSettings()}
        </div>
      </div>
      {renderRaidModal()}
      {kickConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setKickConfirm(null)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 pt-6 pb-2 space-y-1.5">
              <p className="text-base ns-extrabold text-gray-900 dark:text-white">멤버 추방</p>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                <span className="ns-bold text-gray-700 dark:text-gray-300">{kickConfirm.displayName}</span>님을 길드에서 추방할까요?
              </p>
            </div>
            <div className="flex gap-2 px-6 pb-6 pt-4">
              <button type="button" onClick={() => setKickConfirm(null)}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-gray-100 dark:bg-[#252525] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#2a2a2a] transition-colors"
              >취소</button>
              <button
                type="button"
                disabled={loading === `kick-${kickConfirm.userId}`}
                onClick={async () => {
                  const target = kickConfirm
                  setKickConfirm(null)
                  await memberAction(target.userId, 'kick')
                }}
                className="flex-1 rounded-xl py-3 text-sm ns-bold bg-red-500 hover:bg-red-600 active:bg-red-700 text-white transition-all disabled:opacity-50"
              >추방</button>
            </div>
          </div>
        </div>
      )}
      {regenConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setRegenConfirm(false)} />
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
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
          <div className="relative z-10 w-full max-w-sm mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 pt-6 pb-2 space-y-1.5">
              <p className="text-base ns-extrabold text-gray-900 dark:text-white">길드 삭제</p>
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
        <GuildMemberRaidModal
          member={memberModal.member}
          role={memberModal.role}
          myMember={adaptedActive.find(m => m.userId === userId)}
          raidList={raidList}
          persistedToggles={myCharToggles}
          onCharToggle={handleCharToggle}
          onClose={() => setMemberModal(null)}
        />
      )}
      {saveSuccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center sm:p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSaveSuccess(false)} />
          <div className="relative z-10 w-full max-w-xs mx-4 rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-border shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] overflow-hidden">
            <div className="px-6 pt-8 pb-6 text-center space-y-3">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
              <div>
                <p className="text-base ns-extrabold text-gray-900 dark:text-white">저장 완료</p>
                <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">길드 설정이 저장되었어요</p>
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

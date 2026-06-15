'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import RaidDetailModal from '@/app/components/RaidDetailModal'
import { RAID_ORDER_MAP } from '@/lib/raidData'
import { HIDDEN_RAID_IDS } from '@/app/dashboard/_constants'

const DIFF_SORT = { nightmare: 0, hard: 1, stage3: 0, stage2: 1, stage1: 2, normal: 2 }

function raidStatusOf(entry) {
  if (!entry) return 'none'
  if (entry.gateClears.length === 0) return 'incomplete'
  if (entry.gateClears.every(Boolean)) return 'complete'
  if (entry.gateClears.some(Boolean)) return 'partial'
  return 'incomplete'
}

function getRepChar(user) {
  if (!user) return null
  for (const exp of user.loaExpeditions || []) {
    for (const c of exp.characters || []) {
      if (c.id === user.repCharId) return c
    }
  }
  return (user.loaExpeditions?.[0]?.characters || [])[0] ?? null
}

// ── AdminUserRaidModal ────────────────────────────────────────────────────────
function AdminUserRaidModal({ user, me, onClose }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  const { incompleteRaids, completedRaids, togetherRaids } = useMemo(() => {
    const raidKeys = new Set()
    for (const exp of user.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        for (const raid of char.characterRaids || []) {
          if (!HIDDEN_RAID_IDS.has(raid.raidId)) {
            raidKeys.add(`${raid.raidId}__${raid.difficulty}`)
          }
        }
      }
    }

    const sortedKeys = [...raidKeys].sort((a, b) => {
      const [aId, aDiff] = a.split('__')
      const [bId, bDiff] = b.split('__')
      const ro = (RAID_ORDER_MAP[aId] ?? 99) - (RAID_ORDER_MAP[bId] ?? 99)
      return ro !== 0 ? ro : (DIFF_SORT[aDiff] ?? 9) - (DIFF_SORT[bDiff] ?? 9)
    })

    const raidData = sortedKeys.map(key => {
      const [raidId, difficulty] = key.split('__')
      const chars = []
      for (const exp of user.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (!entry) continue
          chars.push({ ...char, charClass: char.class, status: raidStatusOf(entry) })
        }
      }
      return { raidId, difficulty, chars }
    }).filter(r => r.chars.length > 0)

    const incompleteRaids = raidData
      .map(r => ({ ...r, chars: r.chars.filter(c => c.status !== 'complete') }))
      .filter(r => r.chars.length > 0)

    const completedRaids = raidData
      .map(r => ({ ...r, chars: r.chars.filter(c => c.status === 'complete') }))
      .filter(r => r.chars.length > 0)

    const togetherRaids = incompleteRaids.filter(({ raidId, difficulty }) => {
      for (const exp of me?.loaExpeditions || []) {
        for (const char of exp.characters || []) {
          const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
          if (entry && raidStatusOf(entry) !== 'complete') return true
        }
      }
      return false
    })

    return { incompleteRaids, completedRaids, togetherRaids }
  }, [user, me])

  function myCharsForRaid(raidId, difficulty) {
    if (!me) return []
    const result = []
    for (const exp of me.loaExpeditions || []) {
      for (const char of exp.characters || []) {
        const entry = char.characterRaids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
        if (entry && raidStatusOf(entry) !== 'complete') {
          result.push({ ...char, charClass: char.class })
        }
      }
    }
    return result
  }

  const repChar = getRepChar(user)
  const meRepChar = getRepChar(me)
  const displayName = user.nickname || user.name || user.discordUsername || '-'
  const meDisplayName = me?.nickname || me?.name || me?.discordUsername || '관리자'

  return (
    <RaidDetailModal
      name={displayName}
      image={user.image}
      discordUsername={user.discordUsername}
      repChar={repChar ? { name: repChar.name } : null}
      togetherRaids={togetherRaids}
      incompleteRaids={incompleteRaids}
      completedRaids={completedRaids}
      myUser={{ name: meDisplayName, image: me?.image }}
      myRepChar={meRepChar ? { name: meRepChar.name } : null}
      myCharsForRaid={myCharsForRaid}
      onClose={onClose}
    />
  )
}

// ── 유틸 ─────────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '-'
  return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })
}

function formatDateTime(d) {
  if (!d) return '-'
  return new Date(d).toLocaleString('ko-KR', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  })
}

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-4 flex flex-col gap-1">
      <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-2xl font-bold text-gray-900 dark:text-gray-100 ns-bold">{value}</span>
      {sub && <span className="text-xs text-gray-400 dark:text-gray-500">{sub}</span>}
    </div>
  )
}

function Avatar({ src, name }) {
  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className="w-8 h-8 rounded-full object-cover flex-shrink-0"
        onError={e => { e.currentTarget.style.display = 'none' }}
      />
    )
  }
  return (
    <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-zinc-600 flex items-center justify-center flex-shrink-0 text-xs text-gray-500 dark:text-gray-400">
      {(name || '?')[0]}
    </div>
  )
}

// ── AdminClient ───────────────────────────────────────────────────────────────

export default function AdminClient({ userStats, guildStats, totalUsers, totalGuilds, adminUser }) {
  const [tab, setTab] = useState('users')
  const [userSearch, setUserSearch] = useState('')
  const [guildSearch, setGuildSearch] = useState('')
  const [userSort, setUserSort] = useState('lastRaidAt_desc')

  // 레이드 모달
  const [raidModal, setRaidModal] = useState(null)   // 로딩된 user 객체
  const [loadingUserId, setLoadingUserId] = useState(null)

  const openRaidModal = useCallback(async (userId) => {
    if (loadingUserId) return
    setLoadingUserId(userId)
    try {
      const res = await fetch(`/api/admin/user/${userId}`)
      if (!res.ok) return
      const data = await res.json()
      setRaidModal(data)
    } finally {
      setLoadingUserId(null)
    }
  }, [loadingUserId])

  const activeUsers = useMemo(
    () => userStats.filter(u => u.charCount > 0).length,
    [userStats],
  )
  const totalChars = useMemo(
    () => userStats.reduce((s, u) => s + u.charCount, 0),
    [userStats],
  )
  const totalGuildMembers = useMemo(
    () => guildStats.reduce((s, g) => s + g.memberCount, 0),
    [guildStats],
  )

  const filteredUsers = useMemo(() => {
    const q = userSearch.trim().toLowerCase()
    let list = q
      ? userStats.filter(u =>
          (u.name || '').toLowerCase().includes(q) ||
          (u.nickname || '').toLowerCase().includes(q) ||
          (u.discordUsername || '').toLowerCase().includes(q) ||
          (u.email || '').toLowerCase().includes(q),
        )
      : [...userStats]

    const [field, dir] = userSort.split('_')
    list.sort((a, b) => {
      let av, bv
      if (field === 'createdAt') { av = new Date(a.createdAt); bv = new Date(b.createdAt) }
      else if (field === 'charCount') { av = a.charCount; bv = b.charCount }
      else if (field === 'lastRaidAt') { av = a.lastRaidAt ? new Date(a.lastRaidAt) : new Date(0); bv = b.lastRaidAt ? new Date(b.lastRaidAt) : new Date(0) }
      else if (field === 'lastHomeworkAt') { av = a.lastHomeworkAt ? new Date(a.lastHomeworkAt) : new Date(0); bv = b.lastHomeworkAt ? new Date(b.lastHomeworkAt) : new Date(0) }
      else { av = a.createdAt; bv = b.createdAt }
      return dir === 'desc' ? (bv > av ? 1 : -1) : (av > bv ? 1 : -1)
    })
    return list
  }, [userStats, userSearch, userSort])

  const filteredGuilds = useMemo(() => {
    const q = guildSearch.trim().toLowerCase()
    if (!q) return guildStats
    return guildStats.filter(g =>
      g.name.toLowerCase().includes(q) ||
      (g.leaderName || '').toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q),
    )
  }, [guildStats, guildSearch])

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-900">
      {/* 헤더 */}
      <div className="bg-white dark:bg-zinc-800 border-b border-gray-200 dark:border-zinc-700">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <h1 className="text-xl ns-bold text-gray-900 dark:text-gray-100">관리자 페이지</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">myloa 서비스 현황</p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* 요약 카드 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard label="총 가입자" value={totalUsers.toLocaleString('ko-KR')} sub="전체 계정 수" />
          <StatCard label="활성 사용자" value={activeUsers.toLocaleString('ko-KR')} sub="캐릭터 1개 이상" />
          <StatCard label="총 캐릭터" value={totalChars.toLocaleString('ko-KR')} sub="활성 캐릭터 합계" />
          <StatCard label="공격대" value={totalGuilds.toLocaleString('ko-KR')} sub={`멤버 합계 ${totalGuildMembers}명`} />
        </div>

        {/* 탭 */}
        <div className="flex gap-1 bg-gray-100 dark:bg-zinc-800 rounded-lg p-1 w-fit">
          {[
            { key: 'users', label: `사용자 (${totalUsers})` },
            { key: 'guilds', label: `공격대 (${totalGuilds})` },
          ].map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-4 py-1.5 rounded-md text-sm transition-colors ${
                tab === t.key
                  ? 'bg-white dark:bg-zinc-700 text-gray-900 dark:text-gray-100 shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── 사용자 탭 ── */}
        {tab === 'users' && (
          <div className="space-y-3">
            {/* 검색 + 정렬 */}
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="이름, 닉네임, 디스코드, 이메일 검색"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="flex-1 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
              />
              <select
                value={userSort}
                onChange={e => setUserSort(e.target.value)}
                className="px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
              >
                <option value="lastRaidAt_desc">최근 레이드순</option>
                <option value="lastHomeworkAt_desc">최근 숙제순</option>
                <option value="createdAt_desc">가입일 최신순</option>
                <option value="createdAt_asc">가입일 오래된순</option>
                <option value="charCount_desc">캐릭터 많은순</option>
              </select>
            </div>

            <div className="text-xs text-gray-400 dark:text-gray-500">{filteredUsers.length}명 · 클릭하면 레이드 현황을 볼 수 있어요</div>

            {/* 테이블 (데스크탑) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
              <table className="w-full text-sm bg-white dark:bg-zinc-800">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-700 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">사용자</th>
                    <th className="px-4 py-3 font-medium">이메일</th>
                    <th className="px-4 py-3 font-medium text-right">캐릭터</th>
                    <th className="px-4 py-3 font-medium text-right">원정대</th>
                    <th className="px-4 py-3 font-medium text-right">마지막 일일숙제</th>
                    <th className="px-4 py-3 font-medium text-right">마지막 주간숙제</th>
                    <th className="px-4 py-3 font-medium text-right">마지막 레이드</th>
                    <th className="px-4 py-3 font-medium text-right">가입일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((u, i) => (
                    <tr
                      key={u.id}
                      onClick={() => openRaidModal(u.id)}
                      className={`border-b border-gray-100 dark:border-zinc-700/50 hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/10 transition-colors cursor-pointer ${
                        i === filteredUsers.length - 1 ? 'border-b-0' : ''
                      } ${loadingUserId === u.id ? 'opacity-60' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Avatar src={u.image} name={u.name} />
                          <div className="min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[140px]">
                              {u.nickname || u.name || '-'}
                            </div>
                            {u.discordUsername && (
                              <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[140px]">
                                @{u.discordUsername}
                              </div>
                            )}
                          </div>
                          {loadingUserId === u.id && (
                            <svg className="animate-spin w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                            </svg>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400 text-xs max-w-[160px] truncate">
                        {u.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`text-sm font-medium ${u.charCount > 0 ? 'text-gray-900 dark:text-gray-100' : 'text-gray-400 dark:text-gray-500'}`}>
                          {u.charCount}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right text-sm text-gray-600 dark:text-gray-300">
                        {u.expeditionCount}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDateTime(u.lastDailyAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDateTime(u.lastWeeklyAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDateTime(u.lastRaidAt)}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDate(u.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                        검색 결과가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden space-y-2">
              {filteredUsers.map(u => (
                <button
                  key={u.id}
                  onClick={() => openRaidModal(u.id)}
                  disabled={!!loadingUserId}
                  className="w-full text-left bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-3 hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-900)]/10 active:scale-[0.99] transition-all disabled:opacity-60 focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar src={u.image} name={u.name} />
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-gray-900 dark:text-gray-100 truncate">
                        {u.nickname || u.name || '-'}
                      </div>
                      {u.discordUsername && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">@{u.discordUsername}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      {loadingUserId === u.id && (
                        <svg className="animate-spin w-3.5 h-3.5 text-gray-400" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z" />
                        </svg>
                      )}
                      <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDate(u.createdAt)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-1 text-xs mt-1">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-500">캐릭터</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{u.charCount}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-500">마지막 일일숙제</span>
                      <span className="text-gray-500 dark:text-gray-400">{formatDateTime(u.lastDailyAt)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400 dark:text-gray-500">마지막 주간숙제</span>
                      <span className="text-gray-500 dark:text-gray-400">{formatDateTime(u.lastWeeklyAt)}</span>
                    </div>
                  </div>
                  {u.email && (
                    <div className="mt-2 text-xs text-gray-400 dark:text-gray-500 truncate">{u.email}</div>
                  )}
                </button>
              ))}
              {filteredUsers.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">검색 결과가 없습니다</div>
              )}
            </div>
          </div>
        )}

        {/* ── 공격대 탭 ── */}
        {tab === 'guilds' && (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="공격대명, 리더, 소개 검색"
              value={guildSearch}
              onChange={e => setGuildSearch(e.target.value)}
              className="w-full max-w-sm px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
            />

            <div className="text-xs text-gray-400 dark:text-gray-500">{filteredGuilds.length}개</div>

            {/* 테이블 (데스크탑) */}
            <div className="hidden md:block overflow-x-auto rounded-xl border border-gray-200 dark:border-zinc-700">
              <table className="w-full text-sm bg-white dark:bg-zinc-800">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-zinc-700 text-left text-xs text-gray-500 dark:text-gray-400">
                    <th className="px-4 py-3 font-medium">공격대명</th>
                    <th className="px-4 py-3 font-medium">리더</th>
                    <th className="px-4 py-3 font-medium text-right">활성 멤버</th>
                    <th className="px-4 py-3 font-medium text-right">대기중</th>
                    <th className="px-4 py-3 font-medium text-center">자동수락</th>
                    <th className="px-4 py-3 font-medium text-right">생성일</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGuilds.map((g, i) => (
                    <tr
                      key={g.id}
                      className={`border-b border-gray-100 dark:border-zinc-700/50 hover:bg-gray-50 dark:hover:bg-zinc-700/30 transition-colors ${
                        i === filteredGuilds.length - 1 ? 'border-b-0' : ''
                      }`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{g.name}</div>
                        {g.description && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[200px] mt-0.5">{g.description}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{g.leaderName}</div>
                        {g.leaderEmail && (
                          <div className="text-xs text-gray-400 dark:text-gray-500 truncate max-w-[120px]">{g.leaderEmail}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className="font-medium text-gray-900 dark:text-gray-100">{g.memberCount}</span>
                        <span className="text-gray-400 dark:text-gray-500">/{g.maxMembers}</span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {g.pendingCount > 0
                          ? <span className="text-amber-600 dark:text-amber-400 font-medium">{g.pendingCount}</span>
                          : <span className="text-gray-300 dark:text-gray-600">-</span>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {g.autoAccept
                          ? <span className="text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full">ON</span>
                          : <span className="text-xs bg-gray-100 dark:bg-zinc-700 text-gray-500 dark:text-gray-400 px-2 py-0.5 rounded-full">OFF</span>}
                      </td>
                      <td className="px-4 py-3 text-right text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                        {formatDate(g.createdAt)}
                      </td>
                    </tr>
                  ))}
                  {filteredGuilds.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-gray-400 dark:text-gray-500 text-sm">
                        검색 결과가 없습니다
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* 모바일 카드 */}
            <div className="md:hidden space-y-2">
              {filteredGuilds.map(g => (
                <div key={g.id} className="bg-white dark:bg-zinc-800 rounded-xl border border-gray-200 dark:border-zinc-700 p-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-medium text-gray-900 dark:text-gray-100 truncate">{g.name}</div>
                    <div className="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">{formatDate(g.createdAt)}</div>
                  </div>
                  {g.description && (
                    <div className="text-xs text-gray-400 dark:text-gray-500 mb-2 line-clamp-2">{g.description}</div>
                  )}
                  <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-300">
                    <span>리더: {g.leaderName}</span>
                    <span>멤버 {g.memberCount}/{g.maxMembers}</span>
                    {g.pendingCount > 0 && <span className="text-amber-600 dark:text-amber-400">대기 {g.pendingCount}</span>}
                  </div>
                </div>
              ))}
              {filteredGuilds.length === 0 && (
                <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">검색 결과가 없습니다</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 레이드 모달 */}
      {raidModal && (
        <AdminUserRaidModal
          user={raidModal}
          me={adminUser}
          onClose={() => setRaidModal(null)}
        />
      )}
    </div>
  )
}

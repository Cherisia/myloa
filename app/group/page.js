'use client'

import { useState } from 'react'
import { RAIDS, CLASS_COLOR, calcGold } from '@/lib/raidData'

// ── 목업 데이터 ───────────────────────────────────────────────────────────────
const MY_ID = '1'

const MOCK_GROUP = {
  id: 'grp1',
  name: '카제로스 주민들',
  leaderId: '1',
  inviteCode: 'LOAK4B2Z',
  inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  maxMembers: 8,
}

const MOCK_MEMBERS = [
  {
    id: '1', nickname: '칼라', isLeader: true, visibility: 'all',
    characters: [
      { name: '칼라디엘', class: '소서리스', itemLevel: 1684 },
      { name: '아르테미스', class: '호크아이', itemLevel: 1661 },
    ],
    raids: [
      { raidId: 'echidna', difficulty: 'hard', gateClears: [true, false] },
      { raidId: 'behemoth', difficulty: 'hard', gateClears: [false, false] },
    ],
  },
  {
    id: '2', nickname: '철갑이', isLeader: false, visibility: 'all',
    characters: [
      { name: '철갑의수호자', class: '워로드', itemLevel: 1645 },
      { name: '빛의성전사', class: '홀리나이트', itemLevel: 1622 },
    ],
    raids: [
      { raidId: 'echidna', difficulty: 'normal', gateClears: [true, true] },
      { raidId: 'illiakan', difficulty: 'hard', gateClears: [false, false, false] },
    ],
  },
  {
    id: '3', nickname: '리퍼짱', isLeader: false, visibility: 'leader_only',
    characters: [
      { name: '그림자춤꾼', class: '리퍼', itemLevel: 1622 },
    ],
    raids: [
      { raidId: 'echidna', difficulty: 'normal', gateClears: [false, false] },
    ],
  },
  {
    id: '4', nickname: '바람', isLeader: false, visibility: 'all',
    characters: [
      { name: '바람사냥꾼', class: '호크아이', itemLevel: 1660 },
      { name: '번개술사', class: '기상술사', itemLevel: 1640 },
      { name: '바람의춤', class: '도화가', itemLevel: 1622 },
    ],
    raids: [
      { raidId: 'echidna', difficulty: 'hard', gateClears: [true, true] },
      { raidId: 'behemoth', difficulty: 'hard', gateClears: [true, false] },
      { raidId: 'illiakan', difficulty: 'hard', gateClears: [true, true, false] },
    ],
  },
]

const MOCK_PENDING = [
  { id: '5', nickname: '신입모험가' },
]

// ── 헬퍼 ─────────────────────────────────────────────────────────────────────
function getMemberGold(member) {
  let earned = 0, total = 0
  member.raids.forEach(({ raidId, difficulty, gateClears }) => {
    const raid = RAIDS.find(r => r.id === raidId)
    const diff = raid?.difficulties.find(d => d.key === difficulty)
    if (!diff) return
    earned += calcGold(diff.gold, gateClears)
    total += diff.gold.reduce((s, g) => s + g, 0)
  })
  return { earned, total }
}

// ── 아이콘 ────────────────────────────────────────────────────────────────────
const IconCopy = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
  </svg>
)
const IconShield = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
)
const IconPlus = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)

// ── 멤버 카드 ─────────────────────────────────────────────────────────────────
function MemberCard({ member, isMe }) {
  const isLeader = member.id === MOCK_GROUP.leaderId
  const hidden = member.visibility === 'leader_only' && !isMe && MY_ID !== MOCK_GROUP.leaderId
  const { earned, total } = getMemberGold(member)
  const pct = total > 0 ? Math.round(earned / total * 100) : 0

  const raidSummary = member.raids.map(({ raidId, difficulty, gateClears }) => {
    const raid = RAIDS.find(r => r.id === raidId)
    const diff = raid?.difficulties.find(d => d.key === difficulty)
    if (!raid || !diff) return null
    const cleared = gateClears.filter(Boolean).length
    return { name: raid.name, diff: diff.label, cleared, total: gateClears.length, allDone: cleared === gateClears.length }
  }).filter(Boolean)

  return (
    <div className={`rounded-lg border bg-white dark:bg-[#222222] overflow-hidden
      ${isMe ? 'border-yellow-400/60 dark:border-yellow-500/40' : 'border-gray-200 dark:border-[#383838]'}`}>
      {isMe && <div className="h-0.5 bg-yellow-400"/>}
      <div className="p-4 space-y-3">
        {/* 멤버 정보 */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className={`h-9 w-9 rounded-full flex items-center justify-center text-sm ns-extrabold
              ${isLeader ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400' : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500'}`}>
              {member.nickname[0]}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="ns-bold text-sm text-gray-800 dark:text-gray-100">{member.nickname}</span>
                {isLeader && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] ns-bold bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 px-1.5 py-0.5 rounded-full">
                    <IconShield /> 그룹장
                  </span>
                )}
                {isMe && <span className="text-[10px] ns-bold bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded-full">나</span>}
              </div>
              <div className="flex flex-wrap gap-1 mt-0.5">
                {member.characters.map(c => (
                  <span key={c.name} className={`text-[10px] px-1 py-0.5 rounded ns-bold ${CLASS_COLOR[c.class] || 'bg-gray-100 text-gray-500'}`}>
                    {c.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
          {isMe && (
            <button className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors border border-gray-200 dark:border-[#383838] rounded px-2 py-1">
              공개설정
            </button>
          )}
        </div>

        {/* 골드 or 비공개 */}
        {hidden ? (
          <div className="rounded bg-gray-50 dark:bg-[#2a2a2a] py-2 text-center">
            <p className="text-xs text-gray-400">🔒 그룹장에게만 공개</p>
          </div>
        ) : (
          <>
            <div className="space-y-1">
              <div className="flex justify-between text-[11px]">
                <span className="text-gray-400">주간 골드</span>
                <span className="ns-bold text-yellow-600 dark:text-yellow-400">{earned.toLocaleString()}/{total.toLocaleString()}G</span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#383838] overflow-hidden">
                <div className={`h-full rounded-full transition-all duration-300
                  ${pct >= 80 ? 'bg-green-400' : pct >= 40 ? 'bg-yellow-400' : 'bg-red-400'}`}
                  style={{ width: `${pct}%` }}/>
              </div>
            </div>
            <div className="flex flex-wrap gap-1">
              {raidSummary.map((r, i) => (
                <span key={i} className={`text-[11px] px-2 py-0.5 rounded-full ns-bold
                  ${r.allDone
                    ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                    : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400'
                  }`}>
                  {r.allDone ? '✓ ' : ''}{r.name} {r.diff[0]} ({r.cleared}/{r.total})
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

// ── 그룹 만들기 모달 ──────────────────────────────────────────────────────────
function CreateModal({ onClose }) {
  const [name, setName] = useState('')
  const [max, setMax] = useState(8)
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">그룹 만들기</span>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">그룹 이름</label>
            <input className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={name} onChange={e => setName(e.target.value)} placeholder="예: 카제로스 주민들" />
          </div>
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">최대 인원</label>
            <select className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-2 text-sm bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={max} onChange={e => setMax(Number(e.target.value))}>
              {[4, 6, 8, 10, 12, 16].map(n => <option key={n} value={n}>{n}명</option>)}
            </select>
          </div>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#383838]">
          <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">취소</button>
          <button onClick={onClose} className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors">만들기</button>
        </div>
      </div>
    </div>
  )
}

// ── 코드로 참가 모달 ──────────────────────────────────────────────────────────
function JoinModal({ onClose }) {
  const [code, setCode] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-xs rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#383838]">
          <span className="ns-bold text-gray-900 dark:text-white">그룹 참가</span>
          <button onClick={onClose} className="text-gray-400 text-lg leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">초대 코드</label>
          <input
            className="w-full rounded border border-gray-200 dark:border-[#383838] px-3 py-3 text-lg ns-extrabold text-center tracking-widest uppercase bg-white dark:bg-[#181818] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
            value={code} onChange={e => setCode(e.target.value.toUpperCase())} placeholder="XXXXXXXX" maxLength={8} />
          <p className="text-xs text-center text-gray-400">그룹장에게 초대 코드를 받아 입력하세요</p>
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#383838]">
          <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#383838] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">취소</button>
          <button onClick={onClose} className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors">참가 신청</button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 그룹 페이지 ──────────────────────────────────────────────────────────
export default function GroupPage() {
  const [tab, setTab] = useState('members')
  const [copied, setCopied] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [showJoin, setShowJoin] = useState(false)
  const [pending, setPending] = useState(MOCK_PENDING)

  const group = MOCK_GROUP
  const members = MOCK_MEMBERS

  const handleCopy = () => {
    navigator.clipboard.writeText(group.inviteCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const totalGold = members
    .filter(m => m.visibility !== 'leader_only' || m.id === MY_ID)
    .reduce((sum, m) => sum + getMemberGold(m).earned, 0)

  // 레이드 현황 매트릭스용
  const raidKeys = [
    { id: 'echidna',  diff: 'normal', label: '에키드나 N' },
    { id: 'echidna',  diff: 'hard',   label: '에키드나 H' },
    { id: 'behemoth', diff: 'hard',   label: '베히모스 H' },
    { id: 'illiakan', diff: 'hard',   label: '일리아칸 H' },
  ]

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">그룹</h1>
          <p className="text-xs text-gray-400 mt-0.5">{group.name}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowJoin(true)}
            className="rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            코드로 참가
          </button>
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-1 rounded bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 text-xs ns-bold text-gray-900 transition-colors">
            <IconPlus /> 그룹 만들기
          </button>
        </div>
      </div>

      {/* 그룹 정보 카드 */}
      <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-3 flex-1">
            <div className="h-12 w-12 rounded-xl bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center text-2xl flex-shrink-0">🏰</div>
            <div>
              <p className="ns-extrabold text-gray-900 dark:text-white">{group.name}</p>
              <p className="text-xs text-gray-400 mt-0.5">
                {members.length}/{group.maxMembers}명 · 주간 {totalGold.toLocaleString()}G 획득 중
              </p>
            </div>
          </div>
          {/* 초대 코드 */}
          <div className="flex flex-col sm:items-end gap-0.5">
            <p className="text-[11px] text-gray-400">초대 코드</p>
            <div className="flex items-center gap-2">
              <span className="font-mono ns-extrabold text-base tracking-widest text-gray-800 dark:text-gray-100">
                {group.inviteCode}
              </span>
              <button onClick={handleCopy}
                className={`flex items-center gap-1 rounded px-2 py-1 text-xs ns-bold transition-colors
                  ${copied ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2d333b]'}`}>
                <IconCopy />{copied ? '복사됨' : '복사'}
              </button>
            </div>
            <p className="text-[10px] text-gray-400">7일 후 만료</p>
          </div>
        </div>
      </div>

      {/* 탭 */}
      <div className="flex gap-0 border-b border-gray-200 dark:border-[#383838]">
        {[
          { key: 'members',  label: `멤버 (${members.length})` },
          { key: 'pending',  label: `대기중 (${pending.length})` },
          { key: 'overview', label: '전체 현황' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`px-4 py-2.5 text-sm ns-bold border-b-2 transition-colors
              ${tab === t.key
                ? 'border-yellow-500 text-yellow-600 dark:text-yellow-400'
                : 'border-transparent text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* 멤버 탭 */}
      {tab === 'members' && (
        <div className="grid sm:grid-cols-2 gap-3">
          {members.map(m => (
            <MemberCard key={m.id} member={m} isMe={m.id === MY_ID} />
          ))}
        </div>
      )}

      {/* 대기 탭 */}
      {tab === 'pending' && (
        <div className="space-y-2">
          {pending.length === 0 ? (
            <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] py-12 text-center">
              <p className="text-gray-400 text-sm">대기 중인 가입 신청이 없습니다</p>
            </div>
          ) : (
            pending.map(m => (
              <div key={m.id} className="flex items-center justify-between rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-sm ns-bold text-gray-500">
                    {m.nickname[0]}
                  </div>
                  <div>
                    <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">{m.nickname}</p>
                    <p className="text-xs text-gray-400">가입 신청 중</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setPending(p => p.filter(x => x.id !== m.id))}
                    className="rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                    거절
                  </button>
                  <button onClick={() => setPending(p => p.filter(x => x.id !== m.id))}
                    className="rounded bg-yellow-400 hover:bg-yellow-300 px-3 py-1.5 text-xs ns-bold text-gray-900 transition-colors">
                    수락
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 전체 현황 탭 */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* 골드 순위 */}
          <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
              <p className="text-sm ns-bold text-gray-700 dark:text-gray-200">주간 골드 현황</p>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
              {members
                .filter(m => m.visibility !== 'leader_only' || m.id === MY_ID)
                .sort((a, b) => getMemberGold(b).earned - getMemberGold(a).earned)
                .map((m, rank) => {
                  const { earned, total } = getMemberGold(m)
                  const pct = total > 0 ? Math.round(earned / total * 100) : 0
                  return (
                    <div key={m.id} className="flex items-center gap-3 px-4 py-3">
                      <span className={`text-sm ns-extrabold w-4 text-center ${rank === 0 ? 'text-yellow-500' : rank === 1 ? 'text-gray-400' : rank === 2 ? 'text-orange-700' : 'text-gray-300'}`}>
                        {rank + 1}
                      </span>
                      <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-[#2a2a2a] flex items-center justify-center text-sm ns-bold text-gray-500 flex-shrink-0">
                        {m.nickname[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm ns-bold text-gray-700 dark:text-gray-200">{m.nickname}</span>
                          <span className="text-sm ns-bold text-yellow-600 dark:text-yellow-400">{earned.toLocaleString()}G</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#383838] overflow-hidden">
                          <div className="h-full rounded-full bg-yellow-400" style={{ width: `${pct}%` }}/>
                        </div>
                      </div>
                      <span className="text-xs text-gray-400 w-7 text-right">{pct}%</span>
                    </div>
                  )
                })}
            </div>
          </div>

          {/* 레이드 완료 매트릭스 */}
          <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 dark:border-[#2a2a2a]">
              <p className="text-sm ns-bold text-gray-700 dark:text-gray-200">레이드 완료 현황</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a]">
                    <th className="text-left px-4 py-2 text-xs ns-bold text-gray-400">멤버</th>
                    {raidKeys.map(r => (
                      <th key={`${r.id}_${r.diff}`} className="px-3 py-2 text-xs ns-bold text-gray-400 text-center whitespace-nowrap">{r.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {members.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
                      <td className="px-4 py-2.5 text-sm ns-bold text-gray-700 dark:text-gray-200">{m.nickname}</td>
                      {raidKeys.map(r => {
                        const entry = m.raids.find(e => e.raidId === r.id && e.difficulty === r.diff)
                        if (!entry) return (
                          <td key={`${r.id}_${r.diff}`} className="px-3 py-2.5 text-center">
                            <span className="text-gray-200 dark:text-gray-700 text-xs">—</span>
                          </td>
                        )
                        const allDone = entry.gateClears.every(Boolean)
                        const cleared = entry.gateClears.filter(Boolean).length
                        return (
                          <td key={`${r.id}_${r.diff}`} className="px-3 py-2.5 text-center">
                            <span className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-[11px] ns-bold mx-auto
                              ${allDone ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400'
                                : cleared > 0 ? 'bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400'
                                : 'bg-gray-100 dark:bg-[#2a2a2a] text-gray-400'}`}>
                              {allDone ? '✓' : `${cleared}/${entry.gateClears.length}`}
                            </span>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {showCreate && <CreateModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinModal onClose={() => setShowJoin(false)} />}
    </div>
  )
}

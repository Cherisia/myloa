'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'

// ── 시너지 타입 정의 ──────────────────────────────────────────────────────────
const SYNERGY_TYPES = [
  { key: 'all',        label: '전체' },
  { key: 'dmgup',     label: '피해량 증가' },
  { key: 'crit',      label: '치명타 적중' },
  { key: 'critdmg',   label: '치명타 피해' },
  { key: 'defdown',   label: '방어력 감소' },
  { key: 'atk',       label: '공격력 증가' },
  { key: 'backhead',  label: '백헤드' },
  { key: 'atkspd',    label: '공격속도' },
  { key: 'movspd',    label: '이동속도' },
  { key: 'mana',      label: '마나 회복' },
]

const SYNERGY_BADGE = {
  dmgup:      { label: '피해량 증가',     bg: 'bg-orange-100 dark:bg-orange-900/30',  text: 'text-orange-600 dark:text-orange-400' },
  crit:       { label: '치명타 적중',     bg: 'bg-yellow-100 dark:bg-yellow-900/30',  text: 'text-yellow-600 dark:text-yellow-500' },
  critdmg:    { label: '치명타 피해',     bg: 'bg-red-100 dark:bg-red-900/30',        text: 'text-red-600 dark:text-red-400' },
  defdown:    { label: '방어력 감소',     bg: 'bg-sky-100 dark:bg-sky-900/30',        text: 'text-sky-600 dark:text-sky-400' },
  atk:        { label: '공격력 증가',     bg: 'bg-amber-100 dark:bg-amber-900/30',    text: 'text-amber-600 dark:text-amber-400' },
  backhead:   { label: '백헤드',          bg: 'bg-indigo-100 dark:bg-indigo-900/30',  text: 'text-indigo-600 dark:text-indigo-400' },
  atkspd:     { label: '공격속도',        bg: 'bg-green-100 dark:bg-green-900/30',    text: 'text-green-600 dark:text-green-400' },
  movspd:     { label: '이동속도',        bg: 'bg-teal-100 dark:bg-teal-900/30',      text: 'text-teal-600 dark:text-teal-400' },
  mana:       { label: '마나 회복',       bg: 'bg-blue-100 dark:bg-blue-900/30',      text: 'text-blue-600 dark:text-blue-400' },
  mitigation: { label: '받는 피해 감소',  bg: 'bg-slate-100 dark:bg-slate-900/30',    text: 'text-slate-600 dark:text-slate-400' },
  atkdown:    { label: '적 공격력 감소',  bg: 'bg-purple-100 dark:bg-purple-900/30',  text: 'text-purple-600 dark:text-purple-400' },
}

// ── 직업 시너지 데이터 (출처: daloa.xyz/synergy, 2026-01-24 기준) ───────────────
const SYNERGY_DATA = [
  // ── 전사(남) ─────────────────────────────────────────────────────────────────
  {
    class: '워로드', icon: 'gunlancer', group: '전사(남)',
    skills: ['고독한 기사', '전투 태세'],
    synergies: [
      { type: 'dmgup',    value: '+4%',  condition: '공통' },
      { type: 'backhead', value: '+5%',  condition: '공통' },
      { type: 'defdown',  value: '-12%', condition: '전투 태세' },
    ],
  },
  {
    class: '버서커', icon: 'berserker', group: '전사(남)',
    skills: ['광전사의 비기', '광기'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '홀리나이트', icon: 'paladin', group: '전사(남)',
    skills: ['심판자', '축복의 오라'],
    synergies: [
      { type: 'critdmg', value: '+8%', condition: '공통' },
    ],
  },
  {
    class: '디스트로이어', icon: 'destroyer', group: '전사(남)',
    skills: ['분노의 망치', '중력 수련'],
    synergies: [
      { type: 'defdown', value: '-12%', condition: '공통' },
    ],
  },
  // ── 전사(여) ─────────────────────────────────────────────────────────────────
  {
    class: '슬레이어', icon: 'slayer', group: '전사(여)',
    skills: ['처단자', '포식자'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '발키리', icon: 'valkyrie', group: '전사(여)',
    skills: ['빛의 기사', '해방자'],
    synergies: [
      { type: 'critdmg', value: '+8%', condition: '공통' },
    ],
  },
  {
    class: '가디언나이트', icon: 'guardianknight', group: '전사(여)',
    skills: ['업화의 계승자', '드레드 로어'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  // ── 무도가(남) ───────────────────────────────────────────────────────────────
  {
    class: '스트라이커', icon: 'striker', group: '무도가(남)',
    skills: ['오의난무', '일격필살'],
    synergies: [
      { type: 'crit',   value: '+10%', condition: '공통' },
      { type: 'atkspd', value: '+8%',  condition: '공통' },
    ],
  },
  {
    class: '브레이커', icon: 'breaker', group: '무도가(남)',
    skills: ['권왕파천무', '수라의 길'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  // ── 무도가(여) ───────────────────────────────────────────────────────────────
  {
    class: '배틀마스터', icon: 'wardancer', group: '무도가(여)',
    skills: ['초심', '오의 강화'],
    synergies: [
      { type: 'crit',   value: '+10%', condition: '공통' },
      { type: 'atkspd', value: '+8%',  condition: '공통' },
      { type: 'movspd', value: '+16%', condition: '공통' },
    ],
  },
  {
    class: '인파이터', icon: 'scrapper', group: '무도가(여)',
    skills: ['극의: 체술', '충격 단련'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '기공사', icon: 'soulfist', group: '무도가(여)',
    skills: ['세맥타통', '역천지체'],
    synergies: [
      { type: 'atk',        value: '+6%',  condition: '공통' },
      { type: 'mitigation', value: '+25%', condition: '내공 방출 스킬 채용 시' },
    ],
  },
  {
    class: '창술사', icon: 'glaivier', group: '무도가(여)',
    skills: ['절제', '절정'],
    synergies: [
      { type: 'critdmg', value: '+8%', condition: '공통' },
    ],
  },
  // ── 헌터(남) ─────────────────────────────────────────────────────────────────
  {
    class: '데빌헌터', icon: 'deadeye', group: '헌터(남)',
    skills: ['전술 탄환', '핸드거너'],
    synergies: [
      { type: 'crit', value: '+10%', condition: '공통' },
    ],
  },
  {
    class: '블래스터', icon: 'artillerist', group: '헌터(남)',
    skills: ['포격 강화', '화력 강화'],
    synergies: [
      { type: 'defdown', value: '-12%', condition: '공통' },
    ],
  },
  {
    class: '호크아이', icon: 'sharpshooter', group: '헌터(남)',
    skills: ['죽음의 습격', '두 번째 동료'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
      { type: 'movspd', value: '+8%', condition: '두 번째 동료' },
    ],
  },
  {
    class: '스카우터', icon: 'machinist', group: '헌터(남)',
    skills: ['진화의 유산', '아르데타인의 기술'],
    synergies: [
      { type: 'atk', value: '+6%', condition: '공통' },
    ],
  },
  // ── 헌터(여) ─────────────────────────────────────────────────────────────────
  {
    class: '건슬링어', icon: 'gunslinger', group: '헌터(여)',
    skills: ['피스메이커', '사냥의 시간'],
    synergies: [
      { type: 'crit', value: '+10%', condition: '공통' },
    ],
  },
  // ── 마법사 ───────────────────────────────────────────────────────────────────
  {
    class: '서머너', icon: 'summoner', group: '마법사',
    skills: ['넘치는 교감', '상급 소환사'],
    synergies: [
      { type: 'defdown', value: '-12%', condition: '공통' },
      { type: 'mana',    value: '+40%', condition: '트포 선택 시' },
    ],
  },
  {
    class: '아르카나', icon: 'arcanist', group: '마법사',
    skills: ['황후의 은총', '황제의 칙령'],
    synergies: [
      { type: 'crit', value: '+10%', condition: '공통' },
    ],
  },
  {
    class: '소서리스', icon: 'sorceress', group: '마법사',
    skills: ['점화', '환류'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  // ── 암살자 ───────────────────────────────────────────────────────────────────
  {
    class: '블레이드', icon: 'deathblade', group: '암살자',
    skills: ['버스트', '잔재된 기운'],
    synergies: [
      { type: 'dmgup',    value: '+4%',    condition: '공통' },
      { type: 'backhead', value: '+5%',    condition: '공통' },
      { type: 'atkspd',   value: '+12.8%', condition: '공통' },
      { type: 'movspd',   value: '+12.8%', condition: '공통' },
    ],
  },
  {
    class: '소울이터', icon: 'souleater', group: '암살자',
    skills: ['만월의 집행자', '그믐의 경계'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '데모닉', icon: 'shadowhunter', group: '암살자',
    skills: ['멈출 수 없는 충동', '완벽한 억제'],
    synergies: [
      { type: 'dmgup', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '리퍼', icon: 'reaper', group: '암살자',
    skills: ['달의 소리', '갈증'],
    synergies: [
      { type: 'defdown', value: '-12%', condition: '공통' },
    ],
  },
  // ── 스페셜리스트 ─────────────────────────────────────────────────────────────
  {
    class: '기상술사', icon: 'aeromancer', group: '스페셜리스트',
    skills: ['질풍노도', '이슬비'],
    synergies: [
      { type: 'crit',    value: '+10%', condition: '공통' },
      { type: 'atkspd',  value: '+12%', condition: '질풍노도' },
      { type: 'movspd',  value: '+12%', condition: '질풍노도' },
      { type: 'atkdown', value: '-10%', condition: '이슬비' },
    ],
  },
  {
    class: '도화가', icon: 'artist', group: '스페셜리스트',
    skills: ['만개', '회귀'],
    synergies: [
      { type: 'atk', value: '+6%', condition: '공통' },
    ],
  },
  {
    class: '환수사', icon: 'wildsoul', group: '스페셜리스트',
    skills: ['야성', '환수 각성'],
    synergies: [
      { type: 'defdown', value: '-12%', condition: '공통' },
    ],
  },
]

const GROUPS = ['전체', '전사(남)', '전사(여)', '무도가(남)', '무도가(여)', '헌터(남)', '헌터(여)', '마법사', '암살자', '스페셜리스트']

export default function SynergyClient() {
  const [filterType, setFilterType]   = useState('all')
  const [filterGroup, setFilterGroup] = useState('전체')
  const [search, setSearch]           = useState('')

  const filtered = useMemo(() => {
    return SYNERGY_DATA.filter((c) => {
      const matchType   = filterType === 'all' || c.synergies.some((s) => s.type === filterType)
      const matchGroup  = filterGroup === '전체' || c.group === filterGroup
      const matchSearch = !search || c.class.includes(search)
      return matchType && matchGroup && matchSearch
    })
  }, [filterType, filterGroup, search])


  return (
    <div className="min-h-screen">
      <div className="max-w-5xl mx-auto px-4 py-8">

        {/* 헤더 */}
        <div className="mb-6">
          <h1 className="text-2xl ns-bold text-gray-900 dark:text-gray-100">직업 시너지</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            파티 구성 시 참고하세요. 각인 선택에 따라 시너지가 달라질 수 있습니다.
          </p>
        </div>

        {/* 시너지 타입 탭 */}
        <div className="flex flex-wrap gap-2 mb-3">
          {SYNERGY_TYPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={[
                'px-3 py-1.5 rounded-full text-sm transition-all',
                filterType === key
                  ? 'bg-[var(--accent-400)] text-[var(--accent-900)] ns-bold shadow-sm'
                  : 'bg-white dark:bg-[#242424] text-gray-500 dark:text-gray-400 shadow-border hover:bg-gray-50 dark:hover:bg-[#2a2a2a]',
              ].join(' ')}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 직업군 탭 + 검색 */}
        <div className="flex flex-wrap items-center gap-2 mb-6">
          <div className="flex flex-wrap gap-1.5">
            {GROUPS.map((g) => (
              <button
                key={g}
                onClick={() => setFilterGroup(g)}
                className={[
                  'px-2.5 py-1 rounded-md text-xs transition-all',
                  filterGroup === g
                    ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-700)] dark:text-[var(--accent-300)] ns-bold'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300',
                ].join(' ')}
              >
                {g}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="직업 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="ml-auto w-36 px-3 py-1.5 text-sm rounded-lg bg-white dark:bg-[#242424] shadow-border text-gray-700 dark:text-gray-300 placeholder-gray-300 dark:placeholder-gray-600 outline-none focus:shadow-[0_0_0_2px_var(--accent-400)]"
          />
        </div>

        {filtered.length === 0
          ? <p className="text-sm text-gray-400 dark:text-gray-600 text-center py-16">해당하는 직업이 없습니다.</p>
          : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
              {filtered.map((c) => (
                <ClassCard key={c.class} data={c} highlightType={filterType} />
              ))}
            </div>
          )
        }
      </div>
    </div>
  )
}

function ClassCard({ data, highlightType }) {
  const { class: name, icon, skills, synergies } = data
  const displaySynergies = highlightType === 'all'
    ? synergies
    : synergies.filter((s) => s.type === highlightType)

  return (
    <div className="bg-white dark:bg-[#242424] rounded-xl shadow-border p-3 flex flex-col gap-2 hover:shadow-md transition-shadow">
      {/* 아이콘 + 이름 */}
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] flex items-center justify-center flex-shrink-0">
          <Image
            src={`/class/${icon}.svg`}
            alt={name}
            width={26}
            height={26}
            className="object-contain"
            style={{ filter: 'brightness(0) saturate(100%) invert(40%) sepia(10%) saturate(500%) hue-rotate(180deg)' }}
            unoptimized
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm ns-bold text-gray-800 dark:text-gray-100 leading-tight truncate">{name}</p>
          <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-tight truncate" title={skills.join(' / ')}>
            {skills.join(' / ')}
          </p>
        </div>
      </div>

      {/* 시너지 뱃지들 */}
      <div className="flex flex-col gap-1">
        {displaySynergies.map((s, i) => {
          const badge = SYNERGY_BADGE[s.type]
          if (!badge) return null
          return (
            <div key={i} className={`rounded-md px-2 py-1 ${badge.bg}`}>
              <div className="flex items-center justify-between gap-1">
                <span className={`text-xs ${badge.text}`}>{badge.label}</span>
                <span className={`text-xs ns-bold ${badge.text}`}>{s.value}</span>
              </div>
              {s.condition !== '공통' && (
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5 truncate" title={s.condition}>
                  {s.condition}
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

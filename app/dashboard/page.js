'use client'

import { useState, useMemo } from 'react'
import { RAIDS, CLASS_COLOR, calcGold } from '@/lib/raidData'

// ── 목업 데이터 ───────────────────────────────────────────────────────────────
const MOCK_CHARS = [
  { id: '1', name: '칼라디엘',     class: '소서리스', server: '카제로스', itemLevel: 1684.17, level: 60, combatPower: 321540, account: '본계정' },
  { id: '2', name: '아르테미스',   class: '호크아이', server: '카제로스', itemLevel: 1661.50, level: 60, combatPower: 298720, account: '본계정' },
  { id: '3', name: '철갑의수호자', class: '워로드',   server: '카제로스', itemLevel: 1645.00, level: 60, combatPower: 281350, account: '본계정' },
  { id: '4', name: '그림자춤꾼',   class: '리퍼',     server: '카제로스', itemLevel: 1622.33, level: 60, combatPower: 255890, account: '본계정' },
  { id: '5', name: '서브바드',     class: '바드',     server: '루페온',   itemLevel: 1585.00, level: 58, combatPower: 218640, account: '부계정' },
]

const MOCK_RAIDS = {
  '1': [
    { raidId: 'echidna',  difficulty: 'hard',   gateClears: [true, false],                isGoldCheck: true },
    { raidId: 'behemoth', difficulty: 'hard',   gateClears: [false, false],               isGoldCheck: true },
    { raidId: 'egir',     difficulty: 'normal', gateClears: [false, false, false, false],  isGoldCheck: true },
    { raidId: 'illiakan', difficulty: 'hard',   gateClears: [true, false, false],          isGoldCheck: true },
  ],
  '2': [
    { raidId: 'echidna',  difficulty: 'normal', gateClears: [true, true],                 isGoldCheck: true },
    { raidId: 'illiakan', difficulty: 'hard',   gateClears: [true, false, false],          isGoldCheck: true },
  ],
  '3': [
    { raidId: 'echidna',  difficulty: 'normal', gateClears: [false, false],               isGoldCheck: true },
    { raidId: 'abrelshud',difficulty: 'hard',   gateClears: [true, true, false, false],   isGoldCheck: true },
  ],
  '4': [
    { raidId: 'illiakan', difficulty: 'normal', gateClears: [true, true, true],            isGoldCheck: true },
  ],
  '5': [
    { raidId: 'kayangel', difficulty: 'normal', gateClears: [false, false, false],         isGoldCheck: true },
  ],
}

// ── 초기 표시 레이드: 목업 데이터에 등록된 것들 ─────────────────────────────
function getInitialVisibleKeys(raidsData) {
  const keys = new Set()
  Object.values(raidsData).forEach(list =>
    list.forEach(e => keys.add(`${e.raidId}_${e.difficulty}`))
  )
  return keys
}

// ── 레이드 설정 모달 (전체 캐릭터 공통) ──────────────────────────────────────
function RaidSettingsModal({ visibleKeys, onToggle, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <div>
            <span className="ns-bold text-gray-900 dark:text-white">레이드 설정</span>
            <span className="ml-2 text-xs text-gray-400">표시할 레이드를 선택하세요</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        <div className="px-5 py-4 space-y-5 max-h-[65vh] overflow-y-auto">
          {RAIDS.map(raid => (
            <div key={raid.id}>
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400 mb-2 uppercase tracking-wide">
                {raid.name}
                <span className="ml-1.5 text-gray-300 dark:text-gray-600 ns-light normal-case">
                  ({raid.minItemLevel}+)
                </span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {raid.difficulties.map(diff => {
                  const key  = `${raid.id}_${diff.key}`
                  const on   = visibleKeys.has(key)
                  const gold = diff.gold.reduce((s, g) => s + g, 0)
                  return (
                    <button
                      key={key}
                      onClick={() => onToggle(key)}
                      className={`flex items-center justify-between rounded border px-3 py-2.5 cursor-pointer transition-colors
                        ${on
                          ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10'
                          : 'border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-500'
                        }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* 토글 인디케이터 */}
                        <div className={`h-4 w-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors
                          ${on ? 'bg-yellow-400 border-yellow-400' : 'border-gray-300 dark:border-[#30363d]'}`}>
                          {on && (
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
                              <polyline points="20 6 9 17 4 12"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-sm ns-bold ${on ? 'text-gray-800 dark:text-gray-100' : 'text-gray-500 dark:text-gray-500'}`}>
                          {diff.label}
                        </span>
                      </div>
                      <span className={`text-xs ns-bold ${on ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}>
                        {gold.toLocaleString()}G
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 dark:border-[#30363d]">
          <button
            onClick={onClose}
            className="w-full rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 아이콘 ────────────────────────────────────────────────────────────────────
const IconPlus = ({ size = 13 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
)
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
)
const IconKey = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/>
  </svg>
)
const IconRefresh = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/>
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
  </svg>
)
const IconInfo = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>
  </svg>
)
// 직업 아이콘 (임시 placeholder — 방패 모양)
const IconClass = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
    <path d="M12 2L4 6v6c0 5.25 3.75 10.2 8 11 4.25-.8 8-5.75 8-11V6L12 2z"/>
  </svg>
)
// 전투력 아이콘 (임시 placeholder — 번개)
const IconPower = () => (
  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" className="opacity-70">
    <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
  </svg>
)

// ── 레이드 셀 (체크박스 + 골드) ───────────────────────────────────────────────
function RaidCell({ entry, totalGold, onToggle, onAdd }) {
  // 미등록 → + 버튼
  if (!entry) {
    return (
      <button
        onClick={onAdd}
        className="w-full h-full min-h-[68px] flex items-center justify-center text-gray-200 dark:text-gray-800 hover:text-yellow-400 dark:hover:text-yellow-400 hover:bg-yellow-50/60 dark:hover:bg-yellow-900/10 transition-colors rounded"
      >
        <IconPlus size={12} />
      </button>
    )
  }

  const allDone = entry.gateClears.every(Boolean)

  return (
    <button
      onClick={onToggle}
      className={`w-full min-h-[68px] flex flex-col items-center justify-center gap-1.5 rounded cursor-pointer transition-colors
        ${allDone
          ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
          : 'hover:bg-gray-50 dark:hover:bg-[#21262d]'
        }`}
    >
      {/* 체크박스 */}
      <div className={`h-6 w-6 rounded border-2 flex items-center justify-center transition-all
        ${allDone
          ? 'bg-yellow-400 border-yellow-400 text-gray-900 shadow-sm'
          : 'border-gray-300 dark:border-[#30363d]'
        }`}>
        {allDone && <IconCheck />}
      </div>

      {/* 클리어 골드 */}
      <span className={`text-[11px] ns-bold leading-tight
        ${allDone ? 'text-yellow-600 dark:text-yellow-400' : 'text-gray-300 dark:text-gray-700'}`}>
        {totalGold.toLocaleString()}G
      </span>
    </button>
  )
}

// ── API 키 발급 가이드 모달 ────────────────────────────────────────────────────
function ApiKeyGuideModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4 bg-black/50">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="ns-bold text-gray-900 dark:text-white">API 키 발급 가이드</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 내용 */}
        <div className="px-5 py-5 space-y-4">
          <ol className="space-y-3">
            {[
              { n: 1, title: '스토브 계정 로그인', desc: '개발자 포털에 접속해 스토브(Stove) 계정으로 로그인합니다. 별도의 추가 가입은 필요 없습니다.' },
              { n: 2, title: '클라이언트 생성', desc: '로그인 후 "클라이언트 생성" 버튼을 클릭해 클라이언트 이름·서비스 URL·설명을 입력합니다.' },
              { n: 3, title: '이용약관 동의 및 등록', desc: '이용약관과 개인정보처리방침에 동의 후 등록하면 JWT 토큰이 즉시 발급됩니다.' },
              { n: 4, title: 'JWT 복사 후 입력', desc: '발급된 JWT(eyJ…)를 복사해 API 키 입력란에 붙여 넣으면 됩니다.' },
            ].map(({ n, title, desc }) => (
              <li key={n} className="flex gap-3">
                <span className="h-5 w-5 flex-shrink-0 mt-0.5 rounded-full bg-yellow-400 text-gray-900 text-[11px] ns-bold flex items-center justify-center">
                  {n}
                </span>
                <div>
                  <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">{title}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="flex gap-2 rounded bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-3">
            <span className="text-blue-400 flex-shrink-0 mt-0.5"><IconInfo /></span>
            <p className="text-xs text-blue-600 dark:text-blue-400">
              API 키는 서버에 암호화 저장되며 분당 100회 호출 제한이 있습니다. 절대 타인과 공유하지 마세요.
            </p>
          </div>

          <a
            href="https://developer-lostark.game.onstove.com/"
            target="_blank"
            rel="noreferrer"
            className="flex items-center justify-center gap-1.5 w-full rounded border border-dashed border-yellow-400/50 py-2.5 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors"
          >
            🔗 로스트아크 개발자 포털 열기
          </a>
        </div>

        <div className="px-5 pb-5">
          <button
            onClick={onClose}
            className="w-full rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 레이드 추가 모달 ──────────────────────────────────────────────────────────
function AddRaidModal({ char, existingKeys, onAdd, onClose }) {
  const [selected, setSelected] = useState({})
  const toggle = (key) => setSelected(p => ({ ...p, [key]: !p[key] }))

  const handleAdd = () => {
    Object.entries(selected).forEach(([key, on]) => {
      if (!on) return
      const sep = key.indexOf('_')
      const raidId = key.slice(0, sep), difficulty = key.slice(sep + 1)
      const raid = RAIDS.find(r => r.id === raidId)
      const diff = raid?.difficulties.find(d => d.key === difficulty)
      if (diff) onAdd({ raidId, difficulty, gateClears: new Array(diff.gates).fill(false), isGoldCheck: true })
    })
    onClose()
  }

  const anyAvailable = RAIDS.some(raid =>
    raid.difficulties.some(d => char.itemLevel >= raid.minItemLevel && !existingKeys.has(`${raid.id}_${d.key}`))
  )

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <div>
            <span className="ns-bold text-gray-900 dark:text-white">레이드 추가</span>
            <span className="ml-2 text-xs text-gray-400">{char.name}</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {!anyAvailable ? (
            <p className="text-sm text-center text-gray-400 py-8">추가 가능한 레이드가 없습니다</p>
          ) : RAIDS.map(raid => {
            const diffs = raid.difficulties.filter(
              d => char.itemLevel >= raid.minItemLevel && !existingKeys.has(`${raid.id}_${d.key}`)
            )
            if (!diffs.length) return null
            return (
              <div key={raid.id}>
                <p className="text-xs ns-bold text-gray-400 dark:text-gray-500 mb-2">
                  {raid.name} <span className="ns-light">({raid.minItemLevel}+)</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {diffs.map(d => {
                    const key = `${raid.id}_${d.key}`, on = !!selected[key]
                    const total = d.gold.reduce((s, g) => s + g, 0)
                    return (
                      <button key={key} onClick={() => toggle(key)}
                        className={`flex items-center justify-between rounded border px-3 py-2.5 text-sm cursor-pointer transition-colors
                          ${on ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/10' : 'border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-500'}`}>
                        <span className="ns-bold text-gray-800 dark:text-gray-100">{d.label}</span>
                        <span className="text-xs text-yellow-600 dark:text-yellow-400">{total.toLocaleString()}G</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#30363d]">
          <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">취소</button>
          <button onClick={handleAdd} className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors">추가</button>
        </div>
      </div>
    </div>
  )
}

// ── API 키 연동 모달 ──────────────────────────────────────────────────────────
function ApiKeyModal({ onClose }) {
  const [step, setStep] = useState(1)
  const [label, setLabel] = useState('본계정')
  const [apiKey, setApiKey] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="ns-bold text-gray-900 dark:text-white">로스트아크 계정 연동</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div className="flex items-center gap-1.5">
            {['발급 안내', 'API 키 입력', '캐릭터 선택'].map((s, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[11px] ns-bold transition-colors
                  ${step >= i + 1 ? 'bg-yellow-400 text-gray-900' : 'bg-gray-100 dark:bg-[#30363d] text-gray-400'}`}>
                  {step > i + 1 ? '✓' : i + 1}
                </div>
                <span className={`text-xs ${step === i + 1 ? 'ns-bold text-gray-700 dark:text-gray-200' : 'text-gray-400'}`}>{s}</span>
                {i < 2 && <div className={`h-px w-4 ${step > i + 1 ? 'bg-yellow-400' : 'bg-gray-200 dark:bg-[#30363d]'}`}/>}
              </div>
            ))}
          </div>
          {step === 1 && (
            <div className="space-y-3">
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800/30 p-4">
                <p className="text-sm ns-bold text-yellow-800 dark:text-yellow-300 mb-2">API 키 발급 방법</p>
                <ol className="text-sm text-yellow-700 dark:text-yellow-400/90 space-y-1.5 list-decimal list-inside">
                  <li>개발자 포털 접속 후 <span className="ns-bold">스토브(Stove) 계정</span>으로 로그인</li>
                  <li><span className="ns-bold">클라이언트 생성</span> 클릭 → 이름·서비스 URL·설명 입력</li>
                  <li>이용약관 동의 후 등록 → <span className="ns-bold">JWT 토큰 즉시 발급</span></li>
                  <li>발급된 JWT를 아래 API 키 입력란에 붙여 넣기</li>
                </ol>
              </div>
              <a href="https://developer-lostark.game.onstove.com/" target="_blank" rel="noreferrer"
                className="flex items-center justify-center gap-1.5 w-full rounded border border-dashed border-yellow-400/50 py-2.5 text-sm text-yellow-600 dark:text-yellow-400 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors">
                🔗 개발자 포털 열기
              </a>
              <div className="flex gap-2 rounded bg-blue-50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-800/30 p-3">
                <span className="text-blue-400 flex-shrink-0 mt-0.5"><IconInfo /></span>
                <p className="text-xs text-blue-600 dark:text-blue-400">API 키는 암호화되어 저장됩니다. 절대 타인과 공유하지 마세요.</p>
              </div>
            </div>
          )}
          {step === 2 && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1.5">계정 별칭</label>
                <input className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
                  value={label} onChange={e => setLabel(e.target.value)} placeholder="본계정 / 부계정1" />
              </div>
              <div>
                <label className="block text-xs ns-bold text-gray-600 dark:text-gray-400 mb-1.5">API 키</label>
                <input type="password" className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm font-mono bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
                  value={apiKey} onChange={e => setApiKey(e.target.value)} placeholder="eyJ0eXAiOiJKV1Qi..." />
              </div>
            </div>
          )}
          {step === 3 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">관리할 캐릭터를 선택하세요</p>
              {MOCK_CHARS.map(c => (
                <label key={c.id} className="flex items-center gap-3 rounded border border-gray-200 dark:border-[#30363d] px-3 py-2.5 cursor-pointer hover:border-yellow-400/50 transition-colors">
                  <input type="checkbox" defaultChecked className="accent-yellow-500 w-3.5 h-3.5"/>
                  <span className={`text-[11px] px-1.5 py-0.5 rounded ns-bold ${CLASS_COLOR[c.class] || 'bg-gray-100 text-gray-600'}`}>{c.class}</span>
                  <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 flex-1">{c.name}</span>
                  <span className="text-xs text-yellow-600 dark:text-yellow-400 ns-bold">{c.itemLevel}</span>
                </label>
              ))}
            </div>
          )}
        </div>
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#30363d]">
          {step > 1
            ? <button onClick={() => setStep(s => s - 1)} className="flex-1 rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">이전</button>
            : <button onClick={onClose} className="flex-1 rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">취소</button>
          }
          {step < 3
            ? <button onClick={() => setStep(s => s + 1)} className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors">다음</button>
            : <button onClick={onClose} className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 py-2 text-sm ns-bold text-gray-900 transition-colors">완료</button>
          }
        </div>
      </div>
    </div>
  )
}

// ── 캐릭터 추가 모달 (LOA API 검색) ──────────────────────────────────────────
function CharacterAddModal({ existingNames, onAdd, onClose }) {
  const [charName,   setCharName]   = useState('')
  const [apiKey,     setApiKey]     = useState('')
  const [loading,    setLoading]    = useState(false)
  const [error,      setError]      = useState('')
  const [results,    setResults]    = useState(null)   // null = 아직 검색 전
  const [selected,   setSelected]   = useState(new Set())
  const [showGuide,  setShowGuide]  = useState(false)

  const search = async () => {
    if (!charName.trim()) return setError('캐릭터명을 입력하세요')
    if (!apiKey.trim())   return setError('API 키를 입력하세요')
    setLoading(true)
    setError('')
    setResults(null)
    setSelected(new Set())
    try {
      const res  = await fetch(`/api/loa?characterName=${encodeURIComponent(charName.trim())}&apiKey=${encodeURIComponent(apiKey.trim())}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || '알 수 없는 오류')
      setResults(data)
      // 이미 추가된 캐릭터 제외하고 전체 선택 기본값
      setSelected(new Set(data.filter(c => !existingNames.has(c.name)).map(c => c.name)))
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const toggleSelect = (name) =>
    setSelected(prev => {
      const next = new Set(prev)
      next.has(name) ? next.delete(name) : next.add(name)
      return next
    })

  const handleAdd = () => {
    const toAdd = (results || []).filter(c => selected.has(c.name))
    onAdd(toAdd)
    onClose()
  }

  const newCount = results ? results.filter(c => selected.has(c.name)).length : 0

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
      <div className="w-full max-w-md rounded-xl border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] shadow-xl">

        {/* 헤더 */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-[#30363d]">
          <span className="ns-bold text-gray-900 dark:text-white">캐릭터 추가</span>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* 검색 영역 */}
        <div className="px-5 pt-4 space-y-3">
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">캐릭터명</label>
            <input
              className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={charName}
              onChange={e => setCharName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="보유 캐릭터명 아무거나 입력"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-xs ns-bold text-gray-500 dark:text-gray-400 mb-1.5">
              로스트아크 API 키
              <a href="https://developer-lostark.game.onstove.com/" target="_blank" rel="noreferrer"
                className="ml-2 text-yellow-500 dark:text-yellow-400 ns-light hover:underline">발급 방법 →</a>
            </label>
            <input
              type="password"
              className="w-full rounded border border-gray-200 dark:border-[#30363d] px-3 py-2 text-sm font-mono bg-white dark:bg-[#0d1117] dark:text-gray-100 outline-none focus:border-yellow-400 transition-colors"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && search()}
              placeholder="eyJ0eXAiOiJKV1Qi..."
            />
          </div>

          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}

          <button
            onClick={search}
            disabled={loading}
            className="w-full rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                </svg>
                검색 중…
              </>
            ) : '원정대 캐릭터 검색'}
          </button>
        </div>

        {/* 검색 결과 */}
        {results !== null && (
          <div className="px-5 pt-3 pb-1">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">
                원정대 캐릭터 {results.length}개
              </p>
              <button
                onClick={() => setSelected(new Set(results.filter(c => !existingNames.has(c.name)).map(c => c.name)))}
                className="text-[10px] text-yellow-500 hover:underline"
              >
                신규만 전체선택
              </button>
            </div>
            <div className="space-y-1 max-h-64 overflow-y-auto pr-1">
              {results.map(c => {
                const already  = existingNames.has(c.name)
                const checked  = selected.has(c.name)
                const ilvlColor = c.itemLevel >= 1660 ? 'text-orange-500'
                                : c.itemLevel >= 1640 ? 'text-yellow-500'
                                : c.itemLevel >= 1620 ? 'text-green-500'
                                : 'text-gray-400'
                return (
                  <label
                    key={c.name}
                    className={`flex items-center gap-3 rounded border px-3 py-2 cursor-pointer transition-colors
                      ${already
                        ? 'border-gray-100 dark:border-[#21262d] opacity-40 cursor-not-allowed'
                        : checked
                          ? 'border-yellow-400/60 bg-yellow-50/50 dark:bg-yellow-900/10'
                          : 'border-gray-200 dark:border-[#30363d] hover:border-gray-300 dark:hover:border-gray-500'
                      }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={already}
                      onChange={() => !already && toggleSelect(c.name)}
                      className="accent-yellow-500 w-3.5 h-3.5 flex-shrink-0"
                    />
                    {/* 직업 배지 */}
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ns-bold leading-tight flex-shrink-0
                      ${CLASS_COLOR[c.class] || 'bg-gray-100 text-gray-600'}`}>
                      {c.class}
                    </span>
                    {/* 이름 */}
                    <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 flex-1 min-w-0 truncate">
                      {c.name}
                    </span>
                    {/* 아이템 레벨 */}
                    <span className={`text-[11px] ns-bold flex-shrink-0 ${ilvlColor}`}>
                      {c.itemLevel.toFixed(2)}
                    </span>
                    {already && (
                      <span className="text-[10px] text-gray-400 flex-shrink-0">추가됨</span>
                    )}
                  </label>
                )
              })}
            </div>
          </div>
        )}

        {/* 하단 버튼 */}
        <div className="flex gap-2 px-5 py-4 border-t border-gray-100 dark:border-[#30363d] mt-3">
          <button onClick={onClose}
            className="flex-1 rounded border border-gray-200 dark:border-[#30363d] py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={newCount === 0}
            className="flex-1 rounded bg-yellow-400 hover:bg-yellow-300 disabled:opacity-40 disabled:cursor-not-allowed py-2 text-sm ns-bold text-gray-900 transition-colors"
          >
            {newCount > 0 ? `${newCount}개 추가` : '추가'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── 메인 대시보드 ─────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const [chars, setChars] = useState(MOCK_CHARS)
  const [raids, setRaids] = useState(MOCK_RAIDS)
  // 표시할 레이드 키 집합 (전체 캐릭터 공통)
  const [visibleKeys, setVisibleKeys]           = useState(() => getInitialVisibleKeys(MOCK_RAIDS))
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAddChar, setShowAddChar]           = useState(false)
  const [showApiModal, setShowApiModal]         = useState(false)

  // 캐릭터 추가 (API 검색 결과에서)
  const addChars = (newChars) => {
    setChars(prev => {
      const existingNames = new Set(prev.map(c => c.name))
      const toAdd = newChars
        .filter(c => !existingNames.has(c.name))
        .map((c, i) => ({
          id: `api_${Date.now()}_${i}`,
          name: c.name,
          class: c.class,
          server: c.server,
          itemLevel: c.itemLevel,
          combatPower: null,   // API에서 미제공
          account: '본계정',
        }))
      return [...prev, ...toAdd]
    })
  }

  // 레이드 설정 토글
  const toggleRaidKey = (key) =>
    setVisibleKeys(prev => {
      const next = new Set(prev)
      next.has(key) ? next.delete(key) : next.add(key)
      return next
    })

  // 행 목록: RAIDS 순서 × visibleKeys 필터
  const raidRows = useMemo(() =>
    RAIDS.flatMap(raid =>
      raid.difficulties
        .filter(diff => visibleKeys.has(`${raid.id}_${diff.key}`))
        .map(diff => ({
          key: `${raid.id}_${diff.key}`,
          raidId: raid.id, diffKey: diff.key,
          raidName: raid.name, diffLabel: diff.label,
          gates: diff.gates,
          totalGold: diff.gold.reduce((s, g) => s + g, 0),
        }))
    ),
  [visibleKeys])

  // 요약 통계
  const { allEarned, completedCount } = useMemo(() => {
    let allEarned = 0, completedCount = 0
    Object.values(raids).forEach(list =>
      list.forEach(entry => {
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (diff) {
          allEarned += calcGold(diff.gold, entry.gateClears)
          if (entry.gateClears.every(Boolean)) completedCount++
        }
      })
    )
    return { allEarned, completedCount }
  }, [raids])

  // 레이드 체크 토글 (전체 클리어 ↔ 전체 해제)
  const toggleRaid = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry   = { ...list[idx] }
      const allDone = entry.gateClears.every(Boolean)
      entry.gateClears = new Array(entry.gateClears.length).fill(!allDone)
      list[idx] = entry
      return { ...prev, [charId]: list }
    })
  }

  // 셀에서 직접 레이드 추가 (해당 raid+difficulty를 바로 추가)
  const addRaidDirect = (charId, raidId, diffKey) => {
    const raid = RAIDS.find(r => r.id === raidId)
    const diff = raid?.difficulties.find(d => d.key === diffKey)
    if (!diff) return
    setRaids(prev => ({
      ...prev,
      [charId]: [...(prev[charId] || []), {
        raidId, difficulty: diffKey,
        gateClears: new Array(diff.gates).fill(false),
        isGoldCheck: true,
      }]
    }))
  }

  return (
    <div className="space-y-5">

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">원정대</h1>
          <p className="text-xs text-gray-400 mt-0.5">주간 초기화 · 매주 수요일 06:00</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRaidSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            레이드 설정
          </button>
          <button
            onClick={() => setShowAddChar(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            <IconPlus size={12} /> 캐릭터 추가
          </button>
          <button onClick={() => setShowApiModal(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#21262d] transition-colors">
            <IconKey /> 계정 연동
          </button>
          <button className="flex items-center gap-1.5 rounded border border-gray-200 dark:hover:bg-[#21262d] dark:border-[#30363d] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 transition-colors">
            <IconRefresh /> 캐릭터 갱신
          </button>
        </div>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: '원정대 캐릭터', value: `${chars.length}개` },
          { label: '이번 주 획득',  value: `${allEarned.toLocaleString()}G`, color: 'text-yellow-600 dark:text-yellow-400' },
          { label: '완료 레이드',   value: `${completedCount}건` },
        ].map(item => (
          <div key={item.label} className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] px-4 py-3">
            <p className="text-xs text-gray-400 dark:text-gray-500">{item.label}</p>
            <p className={`ns-extrabold text-xl mt-0.5 ${item.color || 'text-gray-800 dark:text-gray-100'}`}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* ── 숙제 테이블 (가로: 캐릭터 / 세로: 레이드) ── */}
      <div className="rounded-lg border border-gray-200 dark:border-[#30363d] bg-white dark:bg-[#161b22] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="border-collapse w-full" style={{ minWidth: 'max-content' }}>

            {/* ── 캐릭터 헤더 (가로) ── */}
            <thead>
              <tr className="border-b border-gray-200 dark:border-[#30363d] bg-gray-50 dark:bg-[#0d1117]">

                {/* 좌상단 빈 셀 */}
                <th className="sticky left-0 z-30 bg-gray-50 dark:bg-[#0d1117] w-[148px] min-w-[148px] border-r border-gray-200 dark:border-[#21262d]"/>

                {/* 캐릭터 열 헤더 */}
                {chars.map(char => {
                  const classColor = CLASS_COLOR[char.class] || 'bg-gray-100 text-gray-600'
                  const iconColor  = classColor.split(' ').find(c => c.startsWith('text-')) || 'text-gray-500'
                  return (
                    <th key={char.id}
                      className="min-w-[108px] w-[108px] px-2 py-3 border-r border-gray-100 dark:border-[#21262d] last:border-r-0 align-top">
                      <div className="flex flex-col items-center gap-1.5">

                        {/* 캐릭터명 */}
                        <span className="text-sm ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center break-keep">
                          {char.name}
                        </span>

                        {/* 직업 아이콘 + 아이템 레벨 */}
                        <div className="flex items-center gap-1">
                          <span className={iconColor}><IconClass /></span>
                          <span className="text-[11px] ns-bold text-gray-600 dark:text-gray-300">
                            {char.itemLevel.toFixed(2)}
                          </span>
                        </div>

                        {/* 전투력 아이콘 + 전투력 */}
                        <div className="flex items-center gap-1">
                          <span className="text-yellow-500 dark:text-yellow-400"><IconPower /></span>
                          <span className="text-[11px] text-gray-500 dark:text-gray-400">
                            {char.combatPower != null ? char.combatPower.toLocaleString() : '—'}
                          </span>
                        </div>

                      </div>
                    </th>
                  )
                })}

              </tr>
            </thead>

            {/* ── 레이드 행 (세로) ── */}
            <tbody className="divide-y divide-gray-100 dark:divide-[#21262d]">
              {raidRows.map(row => (
                <tr key={row.key} className="group">

                  {/* 레이드명 (sticky left) */}
                  <td className="sticky left-0 z-10 bg-white dark:bg-[#161b22] border-r border-gray-100 dark:border-[#21262d] px-3 py-2 min-w-[148px] w-[148px]">
                    <div className="space-y-1">
                      <div className="text-sm ns-bold text-gray-800 dark:text-gray-100">{row.raidName}</div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[10px] ns-bold px-1.5 py-0.5 rounded leading-tight
                          ${row.diffKey === 'hard'
                            ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400'
                            : 'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
                          }`}>
                          {row.diffLabel}
                        </span>
                        <span className="text-[11px] ns-bold text-yellow-600 dark:text-yellow-500">
                          {row.totalGold.toLocaleString()}G
                        </span>
                      </div>
                    </div>
                  </td>

                  {/* 캐릭터별 셀 */}
                  {chars.map(char => {
                    const entry = (raids[char.id] || []).find(
                      e => e.raidId === row.raidId && e.difficulty === row.diffKey
                    )
                    return (
                      <td key={char.id}
                        className="border-r border-gray-100 dark:border-[#21262d] last:border-r-0 p-1 min-w-[108px] w-[108px]">
                        <RaidCell
                          entry={entry}
                          totalGold={row.totalGold}
                          onToggle={() => toggleRaid(char.id, row.raidId, row.diffKey)}
                          onAdd={() => addRaidDirect(char.id, row.raidId, row.diffKey)}
                        />
                      </td>
                    )
                  })}

                </tr>
              ))}

              {/* 빈 상태 */}
              {raidRows.length === 0 && (
                <tr>
                  <td colSpan={chars.length + 1} className="py-16 text-center">
                    <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                    <p className="text-xs text-gray-300 dark:text-gray-700">상단 레이드 설정 버튼으로 추가하세요</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 모달 ── */}
      {showRaidSettings && (
        <RaidSettingsModal
          visibleKeys={visibleKeys}
          onToggle={toggleRaidKey}
          onClose={() => setShowRaidSettings(false)}
        />
      )}
      {showAddChar && (
        <CharacterAddModal
          existingNames={new Set(chars.map(c => c.name))}
          onAdd={addChars}
          onClose={() => setShowAddChar(false)}
        />
      )}
      {showApiModal && <ApiKeyModal onClose={() => setShowApiModal(false)} />}
    </div>
  )
}

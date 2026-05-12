'use client'

import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import DiscordIcon from '@/components/DiscordIcon'
import { RAIDS, CLASS_COLOR, calcGold, calcGoldBound, calcGoldTrade, calcGoldMore } from '@/lib/raidData'
import { EX_RAID_IDS, HIDDEN_RAID_IDS, GOLD_RAID_LIMIT, GOLD_CHAR_LIMIT, AUTO_PRESETS, REST_GAUGE_NAMES, getClassIcon, CUSTOM_MAX } from './_constants'
import { IconCrown, IconPlus, IconCheck, IconRefresh, IconInfo, IconClass, IconItemLevel, IconPower, IconGrip } from './_icons'
import { saveRaid, deleteRaid, computeAutoRaids } from './_raidHelpers'
import RaidSettingsModal from './modals/RaidSettingsModal'
import CharacterEditModal from './modals/CharacterEditModal'
import AutoSetupModal from './modals/AutoSetupModal'
import CustomSettingsModal from './modals/CustomSettingsModal'
import AnimatedGold from './components/AnimatedGold'
import CharGoldBadges from './components/CharGoldBadges'
import RaidCell from './components/RaidCell'
import Confetti from './components/Confetti'

/** 카드 레이어보다 나중에 깜박이는 img 아이콘을 줄이기 위해 브라우저 캐시에 선적재한다. */
function collectDashboardImageUrls(chars, raidsByCharId, customByCharId = {}) {
  const urls = []
  for (const char of chars) {
    const clsIcon = getClassIcon(char.class)
    if (clsIcon) urls.push(clsIcon)
    for (const entry of raidsByCharId[char.id] || []) {
      const raid = RAIDS.find(r => r.id === entry.raidId)
      if (raid?.image) urls.push(raid.image)
    }
    for (const item of customByCharId[char.id] || []) {
      if (item?.image) urls.push(item.image)
    }
  }
  return urls
}

function prefetchImageUrls(rawUrls, timeoutMs = 12_000) {
  const uniq = [...new Set((rawUrls || []).filter(Boolean))]
  if (uniq.length === 0) return Promise.resolve()
  const deadline = new Promise(resolve => setTimeout(resolve, timeoutMs))
  const loadAll = Promise.all(
    uniq.map(src => new Promise(resolve => {
      const img = new Image()
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    }))
  )
  return Promise.race([loadAll, deadline])
}

export default function DashboardClient({ initialChars = [], initialRaids = {}, isLoggedIn = false, initialCustomItems = {}, initialExpNames = {} }) {
  const isDemo = !isLoggedIn
  const [chars, setChars] = useState(initialChars)
  const [raids, setRaids] = useState(initialRaids)
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAutoSetup,    setShowAutoSetup]    = useState(false)
  const [showCharEdit,     setShowCharEdit]     = useState(false)
  const [charEditOpenAdd,  setCharEditOpenAdd]  = useState(false)
  const [showNoChar,       setShowNoChar]       = useState(false)
  const [showLoginGuide,      setShowLoginGuide]      = useState(false)
  const [confirmDeleteCharId, setConfirmDeleteCharId] = useState(null)
  const [confirmDeletePageId, setConfirmDeletePageId] = useState(null) // 탭 삭제 확인
  const [syncing, setSyncing]                   = useState(false)
  const [addingChars, setAddingChars]           = useState(false)
  const [showConfetti, setShowConfetti]         = useState(false)
  const [exRaidError, setExRaidError]           = useState(null) // { raidName, conflictCharName }
  const [cardView, setCardView]                 = useState(true)
  const [fitMode, setFitMode]                   = useState(false)

  const [dragCharId, setDragCharId]             = useState(null) // 드래그 중인 캐릭터 id
  const [dropCharId, setDropCharId]             = useState(null) // 드롭 대상 캐릭터 id
  const [selectedRaid, setSelectedRaid]         = useState(null) // { raidId, diffKey } — 레이드 필터
  const [showCustomSettings, setShowCustomSettings] = useState(false)
  const [gearMenuCharId, setGearMenuCharId]     = useState(null) // 카드 톱니바퀴 메뉴
  const [raidSettingsCharId, setRaidSettingsCharId] = useState(null)
  const [customSettingsCharId, setCustomSettingsCharId] = useState(null)
  // 원정대 페이지
  const [activePageId, setActivePageId]         = useState(null)
  const [editingPageId, setEditingPageId]       = useState(null) // 이름 편집 중인 페이지 id
  const [editingPageName, setEditingPageName]   = useState('')
  const [expNames, setExpNames]                 = useState(initialExpNames)   // expeditionId -> 사용자 지정 탭 이름
  const [customItems, setCustomItems]           = useState(initialCustomItems) // {charId: [{id, name, type, image}]}
  const [customChecks, setCustomChecks]         = useState({})   // {charId: {itemId: bool}}
  const [restGauge, setRestGauge]               = useState({})   // {charId: {itemId: 0-100}}
  const [restGaugeDeducted, setRestGaugeDeducted] = useState({}) // {charId: {itemId: bool}} — 체크 시 실제 차감 여부
  const [lsReady, setLsReady]                   = useState(false) // localStorage 로드 완료 여부
  const wasCompleteRef                          = useRef(false)
  const tableWrapRef                            = useRef(null)
  const [tableContainerWidth, setTableContainerWidth] = useState(0)

  // 원정대 탭 = chars의 expeditionId 기준으로 자동 파생
  const expPages = useMemo(() => {
    const expIds = []
    const seen = new Set()
    chars.forEach(c => {
      if (c.expeditionId && !seen.has(c.expeditionId)) {
        seen.add(c.expeditionId)
        expIds.push(c.expeditionId)
      }
    })
    return expIds.map((id, i) => ({
      id,
      name: expNames[id] || `원정대 ${i + 1}`,
    }))
  }, [chars, expNames])

  // 원정대 탭 초기화 — activePageId만 localStorage 복원 (expNames는 DB 우선)
  useEffect(() => {
    try {
      setActivePageId(localStorage.getItem('myloa_active_page') || null) // 빈 문자열·null → 전체보기
    } catch {}
  }, [])
  useEffect(() => {
    try { localStorage.setItem('myloa_active_page', activePageId ?? '') } catch {}
  }, [activePageId])
  // activePageId가 더 이상 유효하지 않으면 전체보기(null)로 조정
  useEffect(() => {
    if (activePageId && !expPages.find(p => p.id === activePageId)) {
      setActivePageId(null)
    }
  }, [expPages]) // eslint-disable-line react-hooks/exhaustive-deps

  // 커스텀 항목 localStorage 로드 — useLayoutEffect로 첫 paint 전에 동기 실행
  useLayoutEffect(() => {
    try {
      const items    = localStorage.getItem('myloa_custom_items')
      const checks   = localStorage.getItem('myloa_custom_checks')
      const gauge    = localStorage.getItem('myloa_rest_gauge')
      const deducted = localStorage.getItem('myloa_rest_gauge_deducted')
      if (items)    setCustomItems(JSON.parse(items))
      if (checks)   setCustomChecks(JSON.parse(checks))
      if (gauge)    setRestGauge(JSON.parse(gauge))
      if (deducted) setRestGaugeDeducted(JSON.parse(deducted))
    } catch {}
    setLsReady(true)
  }, [])
  // 저장 — lsReady 이전엔 실행하지 않아 초기 {} 로 덮어쓰는 버그 방지
  useEffect(() => {
    if (!lsReady) return
    try { localStorage.setItem('myloa_custom_items', JSON.stringify(customItems)) } catch {}
  }, [customItems, lsReady])
  useEffect(() => {
    if (!lsReady) return
    try { localStorage.setItem('myloa_custom_checks', JSON.stringify(customChecks)) } catch {}
  }, [customChecks, lsReady])
  useEffect(() => {
    if (!lsReady) return
    try { localStorage.setItem('myloa_rest_gauge', JSON.stringify(restGauge)) } catch {}
  }, [restGauge, lsReady])
  useEffect(() => {
    if (!lsReady) return
    try { localStorage.setItem('myloa_rest_gauge_deducted', JSON.stringify(restGaugeDeducted)) } catch {}
  }, [restGaugeDeducted, lsReady])

  // 테이블 컨테이너 너비 추적 (한눈에 보기 스케일 계산용)
  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setTableContainerWidth(entry.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // 페이지별 캐릭터 필터링 — activePageId가 null이면 전체보기
  const activeChars = useMemo(() => {
    if (!activePageId) return chars
    return chars.filter(c => c.expeditionId === activePageId)
  }, [chars, activePageId])

  // 탭 삭제 — 내부 캐릭터·레이드 모두 제거
  const deleteExpPage = (pageId) => {
    const pageChars = chars.filter(c => c.expeditionId === pageId)
    const deletedIds = new Set(pageChars.map(c => c.id))

    if (activePageId === pageId) {
      setActivePageId(null) // 전체보기로 이동
    }

    setChars(prev => prev.filter(c => !deletedIds.has(c.id)))
    setRaids(prev => { const n = { ...prev }; deletedIds.forEach(id => delete n[id]); return n })
    setCustomItems(prev => { const n = { ...prev }; deletedIds.forEach(id => delete n[id]); return n })

    if (isLoggedIn) {
      pageChars.forEach(c => fetch(`/api/characters?id=${c.id}`, { method: 'DELETE' }).catch(() => {}))
    }
  }

  // 페이지 이름 저장 — DB + 클라이언트 state 동시 갱신 (실패 시 DB 기준 이름으로 되돌림)
  const savePageName = () => {
    const pageId = editingPageId
    if (!pageId) return
    const trimmed = editingPageName.trim()
    const hadStoredName = Object.prototype.hasOwnProperty.call(expNames, pageId)
    const previous = expNames[pageId]

    const closeEditor = () => {
      setEditingPageId(null)
      setEditingPageName('')
    }

    if (!trimmed) {
      closeEditor()
      return
    }

    setExpNames(prev => ({ ...prev, [pageId]: trimmed }))
    closeEditor()

    if (!isLoggedIn) return

    fetch(`/api/expeditions/${encodeURIComponent(pageId)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ customName: trimmed }),
    }).then(res => {
      if (res.ok) return
      setExpNames(prev => {
        const next = { ...prev }
        if (hadStoredName) next[pageId] = previous
        else delete next[pageId]
        return next
      })
    }).catch(() => {
      setExpNames(prev => {
        const next = { ...prev }
        if (hadStoredName) next[pageId] = previous
        else delete next[pageId]
        return next
      })
    })
  }

  // 톱니바퀴 메뉴 외부 클릭 시 닫기
  useEffect(() => {
    if (!gearMenuCharId) return
    const close = () => setGearMenuCharId(null)
    document.addEventListener('click', close)
    return () => document.removeEventListener('click', close)
  }, [gearMenuCharId])

  // 비로그인(데모) 시 DB 저장 스킵 래퍼
  const persistRaid   = (charId, entry)           => { if (isLoggedIn) saveRaid(charId, entry) }
  const persistDelete = (charId, raidId, diffKey) => { if (isLoggedIn) deleteRaid(charId, raidId, diffKey) }

  // 커스텀 항목 CRUD
  const addCustomItem = (charId, name, type = 'weekly', image) => {
    setCustomItems(prev => {
      const list = prev[charId] || []
      if (list.length >= CUSTOM_MAX) return prev
      if (list.some(it => it.name === name)) return prev
      const item = { id: `c-${Date.now()}`, name, type }
      if (image) item.image = image
      return { ...prev, [charId]: [...list, item] }
    })
  }
  const deleteCustomItem = (charId, itemId) => {
    setCustomItems(prev => ({ ...prev, [charId]: (prev[charId] || []).filter(it => it.id !== itemId) }))
    setCustomChecks(prev => {
      const { [itemId]: _, ...rest } = prev[charId] || {}
      return { ...prev, [charId]: rest }
    })
  }
  const deleteCustomItemAll = (name) => {
    setCustomItems(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(cid => { next[cid] = (next[cid] || []).filter(it => it.name !== name) })
      return next
    })
    setCustomChecks(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(cid => {
        const itemIds = (customItems[cid] || []).filter(it => it.name === name).map(it => it.id)
        if (!itemIds.length) return
        const charChecks = { ...next[cid] }
        itemIds.forEach(id => { delete charChecks[id] })
        next[cid] = charChecks
      })
      return next
    })
  }
  const reorderCustomItems = (charId, newItems) => {
    setCustomItems(prev => ({ ...prev, [charId]: newItems }))
  }
  const toggleCustomCheck = (charId, itemId) => {
    const item = (customItems[charId] || []).find(it => it.id === itemId)
    const currentChecked = !!(customChecks[charId]?.[itemId])
    const newChecked = !currentChecked

    if (item && REST_GAUGE_NAMES.has(item.name)) {
      const cur = restGauge[charId]?.[itemId] ?? 0
      if (newChecked) {
        // 체크: 게이지 20 이상일 때만 차감, 차감 여부 기록
        const didDeduct = cur >= 20
        setRestGaugeDeducted(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: didDeduct } }))
        if (didDeduct) {
          setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: cur - 20 } }))
        }
      } else {
        // 체크 해제: 이전에 실제로 차감했을 때만 복원
        const wasDeducted = restGaugeDeducted[charId]?.[itemId] ?? false
        setRestGaugeDeducted(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: false } }))
        if (wasDeducted) {
          setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: Math.min(100, cur + 20) } }))
        }
      }
    }

    setCustomChecks(prev => {
      const charChecks = prev[charId] || {}
      return { ...prev, [charId]: { ...charChecks, [itemId]: newChecked } }
    })
  }
  const adjustRestGauge = (charId, itemId, delta) => {
    setRestGauge(prev => {
      const cur = prev[charId]?.[itemId] ?? 0
      const next = Math.max(0, Math.min(100, cur + delta))
      return { ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: next } }
    })
  }
  const setRestGaugeValue = (charId, itemId, value) => {
    setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: Math.max(0, Math.min(100, value)) } }))
  }

  // 대표 캐릭터 — 아이템레벨 최고 캐릭터
  const repCharId = useMemo(
    () => chars.length === 0 ? null : chars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b).id,
    [chars]
  )

  // ── 레이드 필터 — 활성 계정 캐릭터에 등록된 고유 레이드 목록 ──────────────
  const allRegisteredRaids = useMemo(() => {
    const seen = new Map()
    for (const char of activeChars) {
      for (const r of (raids[char.id] || [])) {
        if (HIDDEN_RAID_IDS.has(r.raidId)) continue
        const key = `${r.raidId}:${r.difficulty}`
        if (!seen.has(key)) {
          const raidDef = RAIDS.find(x => x.id === r.raidId)
          const diffDef = raidDef?.difficulties.find(x => x.key === r.difficulty)
          seen.set(key, {
            raidId:    r.raidId,
            diffKey:   r.difficulty,
            raidName:  raidDef?.name   ?? r.raidId,
            diffLabel: diffDef?.label  ?? r.difficulty,
            gates:     diffDef?.gates  ?? 0,
            incomplete: 0,
          })
        }
        const clears = r.gateClears
        if (!Array.isArray(clears) || !clears.every(Boolean)) seen.get(key).incomplete++
      }
    }
    return [...seen.values()].sort((a, b) =>
      RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId)
    )
  }, [chars, raids])

  // 선택된 레이드에서 미완료 캐릭터 목록
  const raidIncompleteChars = useMemo(() => {
    if (!selectedRaid) return []
    return activeChars.flatMap(char => {
      const entry = (raids[char.id] || []).find(
        r => r.raidId === selectedRaid.raidId && r.difficulty === selectedRaid.diffKey
      )
      if (!entry) return []
      const clears = Array.isArray(entry.gateClears) ? entry.gateClears : []
      if (clears.every(Boolean)) return [] // 전부 완료
      return [{ char, gateClears: clears }]
    })
  }, [selectedRaid, chars, raids])

  // 캐릭터가 있다가 0이 되면 빈 상태 모달 자동 표시 (초기 0은 제외)
  // CharacterEditModal을 완료로 닫은 직후에는 억제 (이미 빈 상태임을 알고 닫은 것)
  const hadCharsRef      = useRef(initialChars.length > 0)
  const prevCharEditRef  = useRef(false)
  useEffect(() => {
    const wasEditOpen = prevCharEditRef.current
    prevCharEditRef.current = showCharEdit
    if (isDemo) return
    if (chars.length > 0) { hadCharsRef.current = true; return }
    if (hadCharsRef.current && !showCharEdit && !wasEditOpen) setShowNoChar(true)
  }, [chars.length, showCharEdit, isDemo])

  // 캐릭터별 레이드 토글 (설정 모달에서 사용) — 레이드당 난이도 하나만 허용
  const toggleCharRaid = (charId, raidId, diffKey) => {
    // EX 레이드: 같은 계정에서 캐릭터 하나만 선택 가능
    if (EX_RAID_IDS.has(raidId)) {
      const currentChar = chars.find(c => c.id === charId)
      const alreadyHas = (raids[charId] || []).some(e => e.raidId === raidId)
      if (!alreadyHas && currentChar) {
        const accountKey = currentChar.expeditionId || 'unknown'
        const conflict = chars.find(c => {
          if (c.id === charId) return false
          const cKey = c.expeditionId || 'unknown'
          return cKey === accountKey && (raids[c.id] || []).some(e => e.raidId === raidId)
        })
        if (conflict) {
          const raidName = RAIDS.find(r => r.id === raidId)?.name || raidId
          setExRaidError({ raidName, conflictCharName: conflict.name })
          return
        }
      }
    }

    setRaids(prev => {
      let list = [...(prev[charId] || [])]
      const sameIdx = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (sameIdx >= 0) {
        // 이미 선택된 난이도 → 해제 후 DB 삭제
        list.splice(sameIdx, 1)
        persistDelete(charId, raidId, diffKey)
      } else {
        // 같은 레이드의 다른 난이도가 있으면 먼저 제거
        const oldEntry = list.find(e => e.raidId === raidId)
        if (oldEntry) persistDelete(charId, raidId, oldEntry.difficulty)
        list = list.filter(e => e.raidId !== raidId)
        // 새 난이도 추가 후 DB 저장
        const raid = RAIDS.find(r => r.id === raidId)
        const diff = raid?.difficulties.find(d => d.key === diffKey)
        if (diff) {
          // EX 레이드는 항상 골드, 일반 레이드는 캐릭터/계정 한도 기준으로 결정
          const currentGoldCount  = list.filter(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
          const charAlreadyHasGold = currentGoldCount > 0
          const curChar  = chars.find(c => c.id === charId)
          const curAcctKey = curChar?.expeditionId || 'unknown'
          const acctGoldChars = chars.filter(c =>
            c.id !== charId &&
            (c.expeditionId || 'unknown') === curAcctKey &&
            (prev[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
          ).length
          const isGoldCheck = EX_RAID_IDS.has(raidId) ? true
            : currentGoldCount < GOLD_RAID_LIMIT && (charAlreadyHasGold || acctGoldChars < GOLD_CHAR_LIMIT)
          const newEntry = { raidId, difficulty: diffKey, gateClears: new Array(diff.gates).fill(false), isGoldCheck, moreDone: false, moreFrom: 'bound' }
          list.push(newEntry)
          persistRaid(charId, newEntry)
        }
      }
      return { ...prev, [charId]: list }
    })
  }

  // 골드 보상 토글 (설정 모달에서 사용) — EX 레이드는 항상 골드 고정
  const toggleCharRaidGold = (charId, raidId, diffKey) => {
    if (EX_RAID_IDS.has(raidId)) return // EX는 골드 해제 불가
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev

      const turningOn = !list[idx].isGoldCheck
      if (turningOn) {
        // 캐릭터당 한도 검사
        const currentGoldCount = list.filter((e, i) => i !== idx && e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)).length
        if (currentGoldCount >= GOLD_RAID_LIMIT) return prev
        // 계정당 한도 검사 (이 캐릭터에 다른 골드 레이드가 없는 경우에만)
        const charHasOtherGold = list.some((e, i) => i !== idx && e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
        if (!charHasOtherGold) {
          const curChar = chars.find(c => c.id === charId)
          const curAcctKey = curChar?.expeditionId || 'unknown'
          const acctGoldChars = chars.filter(c =>
            c.id !== charId &&
            (c.expeditionId || 'unknown') === curAcctKey &&
            (prev[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
          ).length
          if (acctGoldChars >= GOLD_CHAR_LIMIT) return prev
        }
      }

      const updated = { ...list[idx], isGoldCheck: turningOn }
      list[idx] = updated
      persistRaid(charId, updated)
      return { ...prev, [charId]: list }
    })
  }

  // 레이드 완료 토글 (테이블 셀 클릭)
  // 더보기 있는 레이드: 미완료 → 완료 → 더보기완료 → 미완료
  // 더보기 없는 레이드: 미완료 → 완료 → 미완료
  const toggleRaid = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry    = { ...list[idx] }
      const allDone  = entry.gateClears.every(Boolean)
      const moreDone = entry.moreDone || false

      const raid     = RAIDS.find(r => r.id === raidId)
      const diff     = raid?.difficulties.find(d => d.key === diffKey)
      const allGates = diff ? new Array(diff.gates).fill(true) : []
      const hasMore  = diff ? calcGoldMore(diff, allGates) > 0 : false

      if (!allDone) {
        entry.gateClears = new Array(entry.gateClears.length).fill(true)
        entry.moreDone   = false
      } else if (!moreDone && hasMore) {
        entry.moreDone  = true
        entry.moreFrom  = 'bound'
      } else {
        entry.gateClears = new Array(entry.gateClears.length).fill(false)
        entry.moreDone   = false
      }
      list[idx] = entry
      persistRaid(charId, entry)
      return { ...prev, [charId]: list }
    })
  }

  // 더보기 차감 출처 토글 (귀속 ↔ 거래)
  const toggleMoreFrom = (charId, raidId, diffKey) => {
    setRaids(prev => {
      const list = [...(prev[charId] || [])]
      const idx  = list.findIndex(e => e.raidId === raidId && e.difficulty === diffKey)
      if (idx === -1) return prev
      const entry = { ...list[idx] }
      entry.moreFrom = (entry.moreFrom || 'bound') === 'bound' ? 'trade' : 'bound'
      list[idx] = entry
      persistRaid(charId, entry)
      return { ...prev, [charId]: list }
    })
  }

  // 자동 설정 적용
  const applyAutoSetup = async (selectedChars, raidsByName, apiKey) => {
    // 1. 선택된 모든 캐릭터를 DB에 추가 (레이드 배정 여부와 무관)
    const charsWithRaids = selectedChars.filter(c => (raidsByName[c.name] || []).length > 0)
    const existingNames  = new Set(chars.map(c => c.name))
    const toAdd          = selectedChars.filter(c => !existingNames.has(c.name))
    if (toAdd.length > 0) {
      try {
        await fetch('/api/characters', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ apiKey, characters: toAdd }),
        })
      } catch {}
    }
    // 2. 최신 캐릭터 목록 재조회 (ID 확보)
    let updatedChars = chars
    let didFetchChars = false
    try {
      const res = await fetch('/api/characters')
      if (res.ok) {
        const data = await res.json()
        if (Array.isArray(data)) {
          updatedChars = data
          didFetchChars = true
        }
      }
    } catch {}
    // 3. 이름 → ID 매핑 후 레이드 배정 + DB 저장
    const newRaids = { ...raids }
    charsWithRaids.forEach(sc => {
      const char = updatedChars.find(c => c.name === sc.name)
      if (!char) return
      const entries = raidsByName[sc.name] || []
      newRaids[char.id] = entries
      entries.forEach(entry => persistRaid(char.id, entry))
    })

    const affectedChars = charsWithRaids.map(sc => updatedChars.find(c => c.name === sc.name)).filter(Boolean)
    const raidsForPrefetch = {}
    affectedChars.forEach(c => {
      const list = newRaids[c.id]
      if (list?.length) raidsForPrefetch[c.id] = list
    })
    await prefetchImageUrls(collectDashboardImageUrls(affectedChars, raidsForPrefetch, {}))

    if (didFetchChars) setChars(updatedChars)
    setRaids(newRaids)
  }

  // expeditionId로 탭 이름 조회 (null → 새 탭 생성 예정)
  const getTargetTabName = (expeditionId) => expPages.find(p => p.id === expeditionId)?.name ?? null

  // 개별 캐릭터 삭제
  const deleteChar = (charId) => {
    setChars(prev => {
      const deletedChar = prev.find(c => c.id === charId)
      const updatedChars = prev.filter(c => c.id !== charId)

      // 탭 자동 정리: 삭제 후 해당 탭이 비면 전체보기로 이동
      if (activePageId) {
        const deletedExpId = deletedChar?.expeditionId
        if (deletedExpId && activePageId === deletedExpId) {
          const stillHasChar = updatedChars.some(c => c.expeditionId === deletedExpId)
          if (!stillHasChar) setActivePageId(null)
        }
      }

      return updatedChars
    })
    setRaids(prev => { const n = { ...prev }; delete n[charId]; return n })
    if (isLoggedIn) fetch(`/api/characters?id=${charId}`, { method: 'DELETE' }).catch(() => {})
  }

  // 캐릭터 순서 저장
  const saveCharOrder = async (ordered) => {
    setChars(ordered)
    if (!isLoggedIn || ordered.some(c => String(c.id).startsWith('tmp'))) return
    try {
      await fetch('/api/characters', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: ordered.map((c, i) => ({ id: c.id, sortOrder: i })) }),
      })
    } catch {}
  }

  // 레이드 설정 모달 확인 (금지 초과 검사 통과 후 호출)
  const handleRaidSettingsConfirm = () => {
    setShowRaidSettings(false)
  }

  // 캐릭터 정렬: 계정 등록 순서(sortOrder 최솟값) → 아이템레벨 내림차순 → 이름 가나다 순
  const sortChars = (arr) => {
    // 계정별 최소 sortOrder 계산 (tmp 캐릭터는 배열 인덱스를 fallback으로 사용)
    const acctMinOrder = {}
    arr.forEach((c, idx) => {
      const key   = c.expeditionId || 'unknown'
      const order = c.sortOrder != null ? c.sortOrder : 1_000_000 + idx
      if (!(key in acctMinOrder) || order < acctMinOrder[key]) acctMinOrder[key] = order
    })
    return [...arr].sort((a, b) => {
      const aKey = a.expeditionId || 'unknown'
      const bKey = b.expeditionId || 'unknown'
      const acctDiff = (acctMinOrder[aKey] ?? 9_999_999) - (acctMinOrder[bKey] ?? 9_999_999)
      if (acctDiff !== 0) return acctDiff
      if (b.itemLevel !== a.itemLevel) return b.itemLevel - a.itemLevel
      return a.name.localeCompare(b.name, 'ko-KR')
    })
  }

  // 캐릭터 추가
  const addChars = async (newChars, apiKey, raidsByName = {}, repCharName = null, siblingNames = []) => {
    const isManual      = Object.keys(raidsByName).length === 0
    const existingNames = new Set(chars.map(c => c.name))
    const freshChars    = newChars.filter(c => !existingNames.has(c.name))
    if (freshChars.length === 0) return

    // ── 비로그인(데모): 로컬 상태만 업데이트 ──────────────────────────────────
    if (!isLoggedIn) {
      const ts       = Date.now()
      const newNames = new Set(freshChars.map(c => c.name))
      const demoChars = freshChars.map((c, i) => ({
        id: `demo_${ts}_${i}`,
        name: c.name, class: c.class, server: c.server,
        itemLevel: c.itemLevel, combatPower: c.combatPower ?? null,
        expeditionId: c.expeditionId ?? activePageId ?? 'demo',
      }))
      const demoRaids = {}
      if (!isManual) {
        demoChars.forEach(dc => {
          const entries = raidsByName[dc.name]
          if (entries?.length > 0) demoRaids[dc.id] = entries
        })
      } else {
        const allForAcct = [...chars, ...demoChars]
        const acctTopMap = new Map()
        const acctHasEx  = new Map()
        allForAcct.forEach(c => {
          const key = c.expeditionId || 'default'
          const cur = acctTopMap.get(key)
          if (!cur || c.itemLevel > cur.itemLevel) acctTopMap.set(key, c)
          if (!newNames.has(c.name) && (raids[c.id] || []).some(e => EX_RAID_IDS.has(e.raidId)))
            acctHasEx.set(key, true)
        })
        demoChars.forEach(dc => {
          const key    = dc.expeditionId || 'default'
          const isTop  = acctTopMap.get(key)?.id === dc.id && !acctHasEx.get(key)
          const entries = computeAutoRaids(dc, isTop)
          if (entries.length > 0) demoRaids[dc.id] = entries
        })
      }
      const demoCustom = {}
      demoChars.forEach(dc => {
        const existing    = customItems[dc.id] || []
        const existingSet = new Set(existing.map(it => it.name))
        const toAdd       = AUTO_PRESETS.filter(p => !existingSet.has(p.name))
        if (toAdd.length > 0)
          demoCustom[dc.id] = [
            ...toAdd.map(p => ({ id: `preset-${p.name.replace(/\s/g, '')}-${dc.id}`, ...p })),
            ...existing,
          ]
      })
      await prefetchImageUrls(collectDashboardImageUrls(demoChars, demoRaids, demoCustom))
      setChars(prev => sortChars([...prev, ...demoChars]))
      if (Object.keys(demoRaids).length  > 0) setRaids(prev      => ({ ...prev, ...demoRaids  }))
      if (Object.keys(demoCustom).length > 0) setCustomItems(prev => ({ ...prev, ...demoCustom }))
      return
    }

    // ── 로그인: 로딩 오버레이 표시 후 실제 저장 ───────────────────────────────
    setAddingChars(true)
    try {
      await fetch('/api/characters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, repCharName, characters: newChars, siblingNames }),
      })

      const res = await fetch('/api/characters')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      const newNames    = new Set(freshChars.map(c => c.name))
      const addedChars  = data.filter(d => newNames.has(d.name))

      // 레이드 계산 (실제 ID 기준)
      const newRaids = {}
      if (!isManual) {
        addedChars.forEach(c => {
          const entries = raidsByName[c.name]
          if (entries?.length > 0) newRaids[c.id] = entries
        })
      } else {
        const allForAcct = [...chars, ...addedChars]
        const acctTopMap = new Map()
        const acctHasEx  = new Map()
        allForAcct.forEach(c => {
          const key = c.expeditionId || 'default'
          const cur = acctTopMap.get(key)
          if (!cur || c.itemLevel > cur.itemLevel) acctTopMap.set(key, c)
          if (!newNames.has(c.name) && (raids[c.id] || []).some(e => EX_RAID_IDS.has(e.raidId)))
            acctHasEx.set(key, true)
        })
        addedChars.forEach(c => {
          const key    = c.expeditionId || 'default'
          const isTop  = acctTopMap.get(key)?.id === c.id && !acctHasEx.get(key)
          const entries = computeAutoRaids(c, isTop)
          if (entries.length > 0) newRaids[c.id] = entries
        })
      }

      // 커스텀 항목
      const newCustom = {}
      addedChars.forEach(c => {
        const existing    = customItems[c.id] || []
        const existingSet = new Set(existing.map(it => it.name))
        const toAdd       = AUTO_PRESETS.filter(p => !existingSet.has(p.name))
        if (toAdd.length > 0)
          newCustom[c.id] = [
            ...toAdd.map(p => ({ id: `preset-${p.name.replace(/\s/g, '')}-${c.id}`, ...p })),
            ...existing,
          ]
      })

      // 탭 라우팅: 추가된 캐릭터의 expeditionId 탭으로 이동 (expPages는 chars useMemo로 자동 갱신)
      const addedExpId = addedChars[0]?.expeditionId
      if (addedExpId && addedExpId !== activePageId) setActivePageId(addedExpId)

      // 레이드 DB 저장 (실제 ID 확정 후)
      await prefetchImageUrls(collectDashboardImageUrls(addedChars, newRaids, newCustom))

      Object.entries(newRaids).forEach(([charId, entries]) => {
        entries.forEach(entry => persistRaid(charId, entry))
      })

      // 상태 일괄 업데이트
      setChars(sortChars(data))
      if (Object.keys(newRaids).length  > 0) setRaids(prev      => ({ ...prev, ...newRaids  }))
      if (Object.keys(newCustom).length > 0) setCustomItems(prev => ({ ...prev, ...newCustom }))
    } catch {} finally {
      setAddingChars(false)
    }
  }

  // 전체 캐릭터 갱신
  const syncChars = async () => {
    if (syncing) return
    setSyncing(true)
    try {
      const res  = await fetch('/api/characters/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.characters)) setChars(data.characters)
    } catch {} finally { setSyncing(false) }
  }

  // 캐릭터별 획득 골드 맵 (isGoldCheck인 레이드만, 더보기 차감 반영)
  const charGoldMap = useMemo(() => {
    const map = {}
    chars.forEach(char => {
      let bound = 0, trade = 0, boundTotal = 0, tradeTotal = 0
      ;(raids[char.id] || []).forEach(entry => {
        if (!entry.isGoldCheck) return
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        const allGates   = new Array(diff.gates).fill(true)
        const moreDone   = entry.moreDone || false
        const moreFrom   = entry.moreFrom || 'bound'
        const moreDeduct = moreDone ? calcGoldMore(diff, allGates) : 0
        bound      += calcGoldBound(diff, entry.gateClears) - (moreDone && moreFrom === 'bound' ? moreDeduct : 0)
        trade      += calcGoldTrade(diff, entry.gateClears) - (moreDone && moreFrom === 'trade' ? moreDeduct : 0)
        boundTotal += calcGoldBound(diff, allGates)
        tradeTotal += calcGoldTrade(diff, allGates)
      })
      map[char.id] = { bound, trade, boundTotal, tradeTotal }
    })
    return map
  }, [chars, raids])

  // 테이블 행 — 레이드 단위로 합산, RAIDS 순서 유지 (캐릭터마다 난이도가 다를 수 있음)
  const raidRows = useMemo(() => {
    const activeRaidIds = new Set()
    Object.values(raids).forEach(list =>
      list.forEach(e => activeRaidIds.add(e.raidId))
    )
    return RAIDS
      .filter(raid => activeRaidIds.has(raid.id) && !HIDDEN_RAID_IDS.has(raid.id))
      .map(raid => ({ key: raid.id, raidId: raid.id, raidName: raid.name }))
  }, [raids])

  // 요약 통계 — activeChars 기준 (계정 탭에 따라 필터링)
  const { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount } = useMemo(() => {
    const activeIds = new Set(activeChars.map(c => c.id))
    let earnedBound = 0, earnedTrade = 0
    Object.entries(charGoldMap).forEach(([id, { bound, trade }]) => {
      if (activeIds.has(id)) { earnedBound += bound; earnedTrade += trade }
    })
    let totalBound = 0, totalTrade = 0, completedCount = 0, totalCount = 0
    Object.entries(raids).forEach(([charId, list]) => {
      if (!activeIds.has(charId)) return
      list.forEach(entry => {
        if (!entry.isGoldCheck) return
        const raid = RAIDS.find(r => r.id === entry.raidId)
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        const allGates = new Array(diff.gates).fill(true)
        totalBound += calcGoldBound(diff, allGates)
        totalTrade += calcGoldTrade(diff, allGates)
        totalCount++
        if (entry.gateClears.every(Boolean)) completedCount++
      })
    })
    return { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount }
  }, [charGoldMap, raids, activeChars])

  // 100% 달성 시 폭죽 트리거 (처음 완료되는 순간에만)
  useEffect(() => {
    const isComplete = totalCount > 0 && completedCount === totalCount
    if (isComplete && !wasCompleteRef.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    }
    wasCompleteRef.current = isComplete
  }, [completedCount, totalCount])

  return (
    <div className="space-y-5">
      <Confetti active={showConfetti} />

      {/* ── 캐릭터 추가 로딩 오버레이 ── */}
      {addingChars && (
        <>
          <style>{`
            @keyframes bar-wave-add {
              0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
              50%       { transform: scaleY(1);   opacity: 1;   }
            }
          `}</style>
          <div className="fixed inset-0 z-[200] flex items-center justify-center bg-white/70 dark:bg-[#181818]/80 backdrop-blur-[2px]">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-end gap-1.5" style={{ height: 28 }}>
                {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4, height: '100%', borderRadius: 9999,
                      backgroundColor: '#facc15', transformOrigin: 'bottom',
                      animation: 'bar-wave-add 0.9s ease-in-out infinite',
                      animationDelay: `${delay}s`,
                    }}
                  />
                ))}
              </div>
              <p className="text-xs ns-bold text-gray-500 dark:text-gray-400">캐릭터 추가 중…</p>
            </div>
          </div>
        </>
      )}

      {/* ── 데모 모드 안내 배너 ── */}
      {isDemo && (
        <div className="flex items-center gap-3 rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-3.5 py-2.5 text-xs">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-yellow-400 dark:bg-yellow-500" />
          <span className="text-gray-500 dark:text-gray-400">
            <span className="ns-bold text-gray-700 dark:text-gray-200">미리보기 모드</span>
            {' '}· 샘플 데이터가 표시되고 있어요. 체크 상태는 저장되지 않아요.
          </span>
          <button
            onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
            className="ml-auto flex-shrink-0 flex items-center gap-1 ns-bold text-yellow-500 dark:text-yellow-400 hover:text-yellow-600 dark:hover:text-yellow-300 transition-colors"
          >
            로그인하기 →
          </button>
        </div>
      )}

      {/* ── 헤더 ── */}
      <div className="flex items-center justify-between">
        <div>
          {/* 원정대 페이지 탭 */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {/* 전체보기 탭 */}
            <button
              onClick={() => { setActivePageId(null); setEditingPageId(null) }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ns-bold transition-colors ${
                activePageId === null
                  ? 'bg-yellow-300 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-300'
                  : 'border border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
              }`}
            >
              전체
            </button>
            {expPages.map(page => {
              const isActive = page.id === activePageId
              return (
                <div
                  key={page.id}
                  className="group/tab relative flex-shrink-0"
                >
                  {editingPageId === page.id ? (
                    /* 이름 편집 중: input을 button 밖에 독립적으로 렌더 */
                    <input
                      autoFocus
                      value={editingPageName}
                      onChange={e => setEditingPageName(e.target.value)}
                      onBlur={savePageName}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); savePageName() }
                        if (e.key === 'Escape') { setEditingPageId(null); setEditingPageName('') }
                      }}
                      className="px-3 py-1.5 rounded-full text-xs ns-bold bg-yellow-300 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-300 outline-none w-28"
                    />
                  ) : (
                    <button
                      onClick={() => { setActivePageId(page.id); setEditingPageId(null) }}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ns-bold transition-colors ${
                        isActive
                          ? 'bg-yellow-300 dark:bg-yellow-500/30 text-yellow-900 dark:text-yellow-300'
                          : 'border border-gray-200 dark:border-[#383838] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                      }`}
                    >
                      <span>{page.name}</span>
                      {isActive && (
                        <span
                          onClick={e => { e.stopPropagation(); setEditingPageId(page.id); setEditingPageName(page.name) }}
                          className="opacity-60 hover:opacity-100 transition-opacity cursor-pointer"
                          title="이름 편집"
                        >
                          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </span>
                      )}
                    </button>
                  )}
                  {/* 탭 삭제 버튼 — 탭이 2개 이상일 때만 표시 */}
                  {expPages.length > 1 && (
                    <button
                      onClick={e => {
                        e.stopPropagation()
                        const hasChars = chars.some(c => c.expeditionId === page.id)
                        if (hasChars) {
                          setConfirmDeletePageId(page.id)
                        } else {
                          deleteExpPage(page.id)
                        }
                      }}
                      title="원정대 삭제"
                      className={`absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full bg-gray-200 dark:bg-[#444] text-gray-500 dark:text-gray-400 hover:bg-red-400 dark:hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors
                        ${isActive ? 'opacity-100' : 'opacity-0 group-hover/tab:opacity-100'}`}
                    >
                      <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round">
                        <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                      </svg>
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          {/* 현재 페이지 제목 + 캐릭터 수 */}
          <div className="flex items-center gap-2 mt-2">
            <h1 className="ns-extrabold text-lg text-gray-900 dark:text-white">
              {activePageId === null ? '전체' : (expPages.find(p => p.id === activePageId)?.name || '원정대')}
            </h1>
            <span className="text-xs text-gray-400 dark:text-gray-500">· 캐릭터 수 {activeChars.length}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRaidSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            레이드 설정
          </button>
          <button onClick={() => activeChars.length === 0 ? setShowNoChar(true) : setShowCustomSettings(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            커스텀 설정
          </button>
          <button onClick={() => setShowCharEdit(true)}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            캐릭터 설정
          </button>
          <button
            onClick={() => isLoggedIn ? (chars.length === 0 ? setShowNoChar(true) : syncChars()) : setShowLoginGuide(true)}
            disabled={isLoggedIn && syncing}
            className="flex items-center gap-1.5 rounded border border-gray-200 dark:hover:bg-[#2a2a2a] dark:border-[#383838] px-3 py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            <span className={isLoggedIn && syncing ? 'animate-spin' : ''}><IconRefresh /></span>
            {isLoggedIn && syncing ? '갱신 중…' : '캐릭터 갱신'}
          </button>
        </div>
      </div>

      {/* ── 요약 카드 ── */}
      <div className="grid grid-cols-3 gap-3 max-w-[50%]">
        {/* 원정대 캐릭터 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3 flex flex-col">
          {isLoggedIn && activeChars.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 py-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <p className="text-[11px] ns-bold text-gray-400 dark:text-gray-500">캐릭터를 설정해주세요</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center leading-relaxed">상단 캐릭터 설정 버튼으로<br/>원정대를 추가하세요</p>
            </div>
          )}
          {isLoggedIn && activeChars.length > 0 && (() => {
            const repChar = activeChars.find(c => c.id === repCharId)
              || activeChars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b)
            return (
              <div className="flex items-start gap-1.5 flex-1">
                <span className="text-yellow-400 flex-shrink-0 mt-px"><IconCrown /></span>
                {repChar ? (
                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs ns-bold text-gray-800 dark:text-gray-100 truncate">{repChar.name}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className="text-[10px] text-gray-400 dark:text-gray-500">{repChar.class}</span>
                        {repChar.itemLevel != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="flex items-center justify-center text-gray-400 dark:text-gray-500"><IconItemLevel /></span>
                            <span className="text-[10px] ns-bold text-gray-600 dark:text-gray-300">{repChar.itemLevel.toFixed(2)}</span>
                          </span>
                        )}
                        {repChar.combatPower != null && (
                          <span className="flex items-center gap-0.5">
                            <img src="/combat-power.svg" alt="" className="w-[10px] h-[10px] object-contain flex-shrink-0" />
                            <span className="text-[10px] text-gray-500 dark:text-gray-400">{Math.round(repChar.combatPower).toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-auto pt-3">원정대 캐릭터 <span className="ns-bold text-gray-600 dark:text-gray-300">{activeChars.length}개</span></p>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">미설정</p>
                )}
              </div>
            )
          })()}
        </div>

        {/* 이번 주 획득 골드 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-2">이번 주 획득</p>
          {/* 그리드로 두 행 컬럼 정렬: [뱃지] [spacer] [획득량] [/] [합계G] */}
          <div className="grid items-baseline gap-y-1.5" style={{ gridTemplateColumns: 'auto 1fr auto auto auto', columnGap: '4px' }}>
            <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-500 dark:text-orange-400">귀속</span>
            <span />
            <AnimatedGold value={earnedBound} className="ns-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums text-right" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">/</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-right">{totalBound.toLocaleString()}G</span>

            <span className="text-[10px] ns-bold px-1.5 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400">거래</span>
            <span />
            <AnimatedGold value={earnedTrade} className="ns-bold text-sm text-yellow-600 dark:text-yellow-400 tabular-nums text-right" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500">/</span>
            <span className="text-[10px] text-gray-400 dark:text-gray-500 tabular-nums text-right">{totalTrade.toLocaleString()}G</span>
          </div>
        </div>

        {/* 완료 레이드 */}
        <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-gray-400 dark:text-gray-500">완료 레이드</p>
            <span className="text-xs ns-bold text-gray-500 dark:text-gray-400">
              {completedCount} / {totalCount}
            </span>
          </div>
          {/* 프로그레스 바 */}
          <div className="w-full h-2 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden mb-1.5">
            <div
              className="h-full rounded-full bg-yellow-400 transition-all duration-500"
              style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
            />
          </div>
          <p className="ns-extrabold text-xl text-gray-800 dark:text-gray-100">
            {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
          </p>
        </div>
      </div>

      {/* ── 숙제 테이블 / 카드 ── */}
      <div ref={tableWrapRef}>
      {(() => {
        const COL_RAID = 140
        const COL_CHAR = 148

        const nameSize = (name) => {
          const korLen = [...name].filter(c => /[가-힣ᄀ-ᇿ㄰-㆏]/.test(c)).length
          if (korLen <= 5) return 'text-sm'
          if (korLen <= 7) return 'text-xs'
          return 'text-[10px]'
        }

        // ── 드래그앤드랍 순서 변경 ────────────────────────────────────────
        const saveCharOrder = async (ordered) => {
          // tmp ID(낙관적 업데이트 중)가 섞인 경우 스킵
          if (ordered.some(c => String(c.id).startsWith('tmp-'))) return
          try {
            await fetch('/api/characters', {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ order: ordered.map((c, i) => ({ id: c.id, sortOrder: i })) }),
            })
          } catch {}
        }

        const handleCharDragStart = (e, charId) => {
          setDragCharId(charId)
          e.dataTransfer.effectAllowed = 'move'

          // ── 전체 컬럼 ghost 생성 ──────────────────────────────────
          const char     = chars.find(c => c.id === charId)
          const charRaids = (raids[charId] || [])
            .filter(entry => !HIDDEN_RAID_IDS.has(entry.raidId))
            .sort((a, b) => RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId))

          const isDark = document.documentElement.classList.contains('dark')
          const col    = { bg: isDark ? '#222222' : '#ffffff', hdr: isDark ? '#181818' : '#f9fafb', bdr: isDark ? '#2a2a2a' : '#f0f0f0', txt: isDark ? '#e0e0e0' : '#111827', sub: isDark ? '#888' : '#6b7280' }

          const ghost = document.createElement('div')
          ghost.setAttribute('aria-hidden', 'true')
          ghost.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${COL_CHAR}px;background:${col.bg};border:2px solid #fbbf24;border-radius:8px;box-shadow:0 24px 56px rgba(0,0,0,0.35),0 8px 20px rgba(0,0,0,0.2);overflow:hidden;font-family:NanumSquareR,sans-serif;pointer-events:none;`

          // 캐릭터 헤더
          const hdr = document.createElement('div')
          hdr.style.cssText = `background:${col.hdr};padding:8px 6px 6px;text-align:center;border-bottom:2px solid #fbbf24;`
          hdr.innerHTML = `<div style="font-size:11px;font-weight:bold;color:${col.txt};line-height:1.4;">${char?.name || ''}</div><div style="font-size:10px;color:${col.sub};margin-top:1px;">${char?.itemLevel?.toFixed(2) || ''}</div>`
          ghost.appendChild(hdr)

          // 레이드 행
          charRaids.forEach(entry => {
            const raid   = RAIDS.find(r => r.id === entry.raidId)
            if (!raid) return
            const allDone = entry.gateClears.every(Boolean)
            const row = document.createElement('div')
            row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid ${col.bdr};background:${allDone ? (isDark ? 'rgba(253,224,71,0.08)' : 'rgba(254,252,232,0.7)') : col.bg};`
            const chk = document.createElement('div')
            chk.style.cssText = `width:13px;height:13px;flex-shrink:0;border-radius:3px;border:2px solid ${allDone ? '#fbbf24' : (isDark ? '#444' : '#d1d5db')};background:${allDone ? '#fbbf24' : 'transparent'};`
            const lbl = document.createElement('span')
            lbl.style.cssText = `font-size:10px;color:${allDone ? '#d97706' : col.txt};`
            lbl.textContent = raid.name
            row.appendChild(chk)
            row.appendChild(lbl)
            ghost.appendChild(row)
          })

          // 레이드 없을 때 빈 셀
          if (charRaids.length === 0) {
            const empty = document.createElement('div')
            empty.style.cssText = `padding:14px 8px;text-align:center;font-size:10px;color:${col.sub};`
            empty.textContent = '레이드 없음'
            ghost.appendChild(empty)
          }

          document.body.appendChild(ghost)
          e.dataTransfer.setDragImage(ghost, Math.floor(COL_CHAR / 2), 28)
          setTimeout(() => { ghost.remove() }, 0)
        }

        const handleCharDragOver = (e, charId) => {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (charId !== dropCharId) setDropCharId(charId)
        }

        const handleCharDrop = (e, charId) => {
          e.preventDefault()
          if (!dragCharId || dragCharId === charId) return
          setChars(prev => {
            const arr      = [...prev]
            const fromIdx  = arr.findIndex(c => c.id === dragCharId)
            const toIdx    = arr.findIndex(c => c.id === charId)
            if (fromIdx === -1 || toIdx === -1) return prev
            const [moved]  = arr.splice(fromIdx, 1)
            arr.splice(toIdx, 0, moved)
            saveCharOrder(arr)
            return arr
          })
        }

        const handleCharDragEnd = () => {
          setDragCharId(null)
          setDropCharId(null)
        }

        // ── 카드 뷰 ────────────────────────────────────────────────────────
        const renderCardView = () => (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3">
            {activeChars.map(char => {
              const charRaids = [...(raids[char.id] || [])]
                .filter(e => !HIDDEN_RAID_IDS.has(e.raidId))
                .filter(e => !selectedRaid || (e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
                .sort((a, b) => RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId))
              if (selectedRaid && charRaids.length === 0) return null

              const isDragging = dragCharId === char.id
              const isDragOver = dropCharId === char.id && dragCharId !== char.id

              // 일일 숙제 항목 (휴식게이지 대상)
              const dailyItems = !selectedRaid
                ? (customItems[char.id] || []).filter(it => REST_GAUGE_NAMES.has(it.name))
                : []
              // 주간 레이드 완료 카운트
              const raidDoneCount = charRaids.filter(e => e.gateClears.every(Boolean)).length
              // 일일 숙제 완료 카운트
              const dailyDoneCount = dailyItems.filter(it => !!(customChecks[char.id]?.[it.id])).length
              // 주간 숙제 항목 (비 휴식게이지)
              const weeklyItems = !selectedRaid
                ? (customItems[char.id] || []).filter(it => !REST_GAUGE_NAMES.has(it.name))
                : []
              const weeklyDoneCount = weeklyItems.filter(it => !!(customChecks[char.id]?.[it.id])).length

              return (
                <div
                  key={char.id}
                  draggable
                  onDragStart={(e) => handleCharDragStart(e, char.id)}
                  onDragOver={(e) => handleCharDragOver(e, char.id)}
                  onDrop={(e) => handleCharDrop(e, char.id)}
                  onDragEnd={handleCharDragEnd}
                  className={`relative rounded-xl border bg-white dark:bg-[#222222] overflow-hidden transition-all select-none flex flex-col ${
                    isDragging  ? 'opacity-40 border-gray-200 dark:border-[#383838]' :
                    isDragOver  ? 'border-yellow-400 dark:border-yellow-600 ring-2 ring-yellow-300/50 dark:ring-yellow-700/30' :
                                  'border-gray-200 dark:border-[#383838]'
                  }`}
                >
                  {/* ── 캐릭터 헤더 ── */}
                  <div className="flex items-center gap-1.5 px-2.5 bg-gray-50 dark:bg-[#181818] h-[52px] overflow-hidden">
                    <span className="text-gray-300 dark:text-gray-600 flex-shrink-0 cursor-grab"><IconGrip /></span>
                    {getClassIcon(char.class)
                      ? <img src={getClassIcon(char.class)} alt={char.class} className="class-icon w-7 h-7 object-contain flex-shrink-0" />
                      : <span className="w-7 h-7 flex items-center justify-center text-gray-400 flex-shrink-0"><IconClass /></span>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        <p className={`${nameSize(char.name)} ns-bold text-gray-900 dark:text-white truncate`}>{char.name}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-400 dark:text-gray-500 overflow-hidden">
                        <span className="flex items-center gap-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                          <IconItemLevel />
                          <span className="tabular-nums ns-bold text-gray-600 dark:text-gray-300">{char.itemLevel.toFixed(2)}</span>
                        </span>
                        {char.combatPower != null && (
                          <span className="flex items-center gap-0.5 min-w-0 truncate">
                            <IconPower />
                            <span className="tabular-nums truncate">{Math.round(char.combatPower).toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* ⚙ 설정 버튼 */}
                    <button
                      onClick={e => { e.stopPropagation(); setRaidSettingsCharId(char.id); setShowRaidSettings(true) }}
                      title="레이드 설정"
                      className="p-1 rounded hover:bg-gray-200 dark:hover:bg-[#2a2a2a] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
                    >
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="3"/>
                        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                      </svg>
                    </button>
                    {/* × 삭제 버튼 */}
                    <button
                      onClick={e => { e.stopPropagation(); setConfirmDeleteCharId(char.id) }}
                      title="캐릭터 삭제"
                      className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 text-base leading-none"
                    >×</button>
                  </div>

                  {/* 골드 요약 */}
                  <div className="px-2.5 py-1.5 border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#181818]/50">
                    <CharGoldBadges
                      bound={charGoldMap[char.id]?.bound ?? 0}
                      trade={charGoldMap[char.id]?.trade ?? 0}
                      boundTotal={charGoldMap[char.id]?.boundTotal ?? 0}
                      tradeTotal={charGoldMap[char.id]?.tradeTotal ?? 0}
                    />
                  </div>

                  {/* ── 일일 숙제 섹션 ── */}
                  {dailyItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/40">
                        <span className="text-[10px] ns-bold text-yellow-700 dark:text-yellow-400">일일 숙제</span>
                        <span className="text-[10px] text-yellow-500 dark:text-yellow-500">({dailyDoneCount}/{dailyItems.length})</span>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                        {dailyItems.map(item => {
                          const checked = !!(customChecks[char.id]?.[item.id])
                          const gauge   = restGauge[char.id]?.[item.id] ?? 0
                          return (
                            <div key={item.id} className={`transition-colors ${checked ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                              <div
                                onClick={() => toggleCustomCheck(char.id, item.id)}
                                className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer ${
                                  checked ? 'hover:bg-yellow-100 dark:hover:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                                }`}
                              >
                                {item.image && <img src={item.image} alt="" className="w-[16px] h-[16px] object-contain flex-shrink-0" />}
                                <div className="flex-1 min-w-0">
                                  <p className={`text-[11px] ns-bold truncate ${checked ? 'text-yellow-700 dark:text-yellow-400 line-through' : 'text-gray-700 dark:text-gray-200'}`}>{item.name}</p>
                                  {/* 휴식 게이지 */}
                                  <div className="flex items-center gap-1 mt-0.5">
                                    <div className="flex-1 flex gap-px">
                                      {Array.from({ length: 10 }).map((_, i) => (
                                        <div
                                          key={i}
                                          onClick={e => { e.stopPropagation(); setRestGaugeValue(char.id, item.id, (i + 1) * 10) }}
                                          className={`h-1.5 flex-1 cursor-pointer transition-colors ${gauge > i * 10 ? 'bg-green-400 dark:bg-green-500 hover:bg-green-300' : 'bg-gray-200 dark:bg-[#2e2e2e] hover:bg-gray-300'} ${i === 0 ? 'rounded-l-full' : ''} ${i === 9 ? 'rounded-r-full' : ''}`}
                                        />
                                      ))}
                                    </div>
                                    <span className="text-[9px] tabular-nums ns-bold text-green-500 dark:text-green-400 flex-shrink-0">{gauge}</span>
                                  </div>
                                </div>
                                {/* 체크박스 — 오른쪽 */}
                                <div className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                  checked ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'border-gray-300 dark:border-[#555]'
                                }`}>
                                  {checked && <IconCheck />}
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── 주간 레이드 섹션 ── */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/40">
                      <span className="text-[10px] ns-bold text-yellow-700 dark:text-yellow-400">주간 레이드</span>
                      <span className="text-[10px] text-yellow-500 dark:text-yellow-500">({raidDoneCount}/{charRaids.length})</span>
                    </div>
                    {charRaids.length === 0 ? (
                      <div className="py-3 text-center text-[10px] text-gray-300 dark:text-gray-600">레이드 미설정</div>
                    ) : (
                      <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                        {charRaids.map(entry => {
                          const raid = RAIDS.find(r => r.id === entry.raidId)
                          const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                          if (!raid || !diff) return null
                          const allGates  = new Array(diff.gates).fill(true)
                          const allDone   = entry.gateClears.every(Boolean)
                          const moreDone  = entry.moreDone || false
                          const moreFrom  = entry.moreFrom || 'bound'
                          const totalGold = calcGold(diff, allGates)
                          const moreGold  = calcGoldMore(diff, allGates)
                          const diffBadge =
                            entry.difficulty === 'nightmare' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-500 dark:text-purple-400' :
                            entry.difficulty === 'hard'      ? 'bg-red-100 dark:bg-red-900/30 text-red-500 dark:text-red-400' :
                                                               'bg-blue-100 dark:bg-blue-900/30 text-blue-500 dark:text-blue-400'
                          return (
                            <div
                              key={`${entry.raidId}:${entry.difficulty}`}
                              onClick={() => toggleRaid(char.id, entry.raidId, entry.difficulty)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer transition-colors ${
                                moreDone ? 'bg-yellow-100 dark:bg-yellow-900/20 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                : allDone ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20'
                                : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              {raid.image && <img src={raid.image} alt={raid.name} className="w-[16px] h-[16px] object-contain flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <p className={`text-[10px] ns-bold truncate ${allDone ? 'text-yellow-700 dark:text-yellow-400' : 'text-gray-700 dark:text-gray-200'}`}>{raid.name}</p>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[8px] ns-bold px-1 py-px rounded leading-tight ${diffBadge}`}>{diff.label}</span>
                                  {entry.isGoldCheck && (
                                    <span className={`text-[9px] ns-bold tabular-nums ${
                                      moreDone ? 'text-yellow-600 dark:text-yellow-500'
                                      : allDone ? 'text-yellow-500 dark:text-yellow-400'
                                      : 'text-gray-300 dark:text-gray-600'
                                    }`}>{totalGold.toLocaleString()}G</span>
                                  )}
                                  {/* 더보기 토글 */}
                                  {moreDone && (
                                    <button
                                      onClick={e => { e.stopPropagation(); toggleMoreFrom(char.id, entry.raidId, entry.difficulty) }}
                                      className={`text-[7px] ns-bold px-1 py-px rounded-full border leading-none ${
                                        moreFrom === 'bound'
                                          ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-200 dark:border-orange-800/40 text-orange-500 dark:text-orange-400'
                                          : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/40 text-blue-500 dark:text-blue-400'
                                      }`}
                                      title={`더보기 -${moreGold.toLocaleString()}G`}
                                    >
                                      {moreFrom === 'bound' ? '귀속' : '거래'}더보기
                                    </button>
                                  )}
                                </div>
                              </div>
                              {/* 체크박스 — 오른쪽 */}
                              <div className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                moreDone ? 'bg-yellow-500 border-yellow-500 text-yellow-900'
                                : allDone ? 'bg-yellow-400 border-yellow-400 text-yellow-900'
                                : 'border-gray-300 dark:border-[#383838]'
                              }`}>
                                {allDone && <IconCheck />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>

                  {/* ── 주간 숙제 섹션 ── */}
                  {weeklyItems.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 px-2.5 py-1 bg-yellow-50 dark:bg-yellow-900/20 border-t border-yellow-100 dark:border-yellow-900/40">
                        <span className="text-[10px] ns-bold text-yellow-700 dark:text-yellow-400">주간 숙제</span>
                        <span className="text-[10px] text-yellow-500 dark:text-yellow-500">({weeklyDoneCount}/{weeklyItems.length})</span>
                      </div>
                      <div className="divide-y divide-gray-50 dark:divide-[#2a2a2a]">
                        {weeklyItems.map(item => {
                          const checked = !!(customChecks[char.id]?.[item.id])
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleCustomCheck(char.id, item.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer transition-colors ${
                                checked ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              {item.image && <img src={item.image} alt="" className="w-[16px] h-[16px] object-contain flex-shrink-0" />}
                              <span className={`flex-1 text-[11px] ns-bold truncate ${
                                checked ? 'text-yellow-700 dark:text-yellow-400 line-through' : 'text-gray-700 dark:text-gray-200'
                              }`}>{item.name}</span>
                              {/* 체크박스 — 오른쪽 */}
                              <div className={`h-4 w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                checked ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'border-gray-300 dark:border-[#555]'
                              }`}>
                                {checked && <IconCheck />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                </div>
              )
            })}
          </div>
        )

        // ── 테이블 뷰 ────────────────────────────────────────────────────────
        const renderCustomRow = (name, charMap, meta, chars) => (
          <tr key={name} className="group">
            <td style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-100 dark:border-[#2a2a2a] px-2 py-2">
              <div className="flex items-center gap-1.5">
                {meta.image && <img src={meta.image} alt="" className="w-[18px] h-[18px] object-contain flex-shrink-0" />}
                <span className="text-xs ns-bold text-gray-500 dark:text-gray-400 truncate">{name}</span>
              </div>
            </td>
            {chars.map(char => {
              const itemId  = charMap.get(char.id)
              const checked = !!(itemId && customChecks[char.id]?.[itemId])
              const gauge   = itemId ? (restGauge[char.id]?.[itemId] ?? 0) : 0
              const isRest  = REST_GAUGE_NAMES.has(name)
              return (
                <td key={char.id} style={{ width: COL_CHAR, maxWidth: COL_CHAR }} className="border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1">
                  {itemId ? (
                    <div className="flex flex-col gap-0.5">
                      <div onClick={() => toggleCustomCheck(char.id, itemId)} className={`flex items-center justify-center h-7 rounded cursor-pointer transition-colors ${checked ? 'bg-yellow-50 dark:bg-yellow-900/10 hover:bg-yellow-100 dark:hover:bg-yellow-900/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}>
                        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-yellow-400 border-yellow-400 text-yellow-900' : 'border-gray-300 dark:border-[#555]'}`}>{checked && <IconCheck />}</div>
                      </div>
                      {isRest && (
                        <div className="px-1 pt-0.5">
                          <div className="flex gap-px mb-0.5">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div
                                key={i}
                                onClick={e => { e.stopPropagation(); setRestGaugeValue(char.id, itemId, (i + 1) * 10) }}
                                className={`h-1.5 flex-1 cursor-pointer transition-colors ${gauge > i * 10 ? 'bg-green-400 dark:bg-green-500 hover:bg-green-300 dark:hover:bg-green-400' : 'bg-gray-200 dark:bg-[#2e2e2e] hover:bg-gray-100 dark:hover:bg-[#3a3a3a]'} ${i === 0 ? 'rounded-l-full' : ''} ${i === 9 ? 'rounded-r-full' : ''}`}
                              />
                            ))}
                          </div>
                          <div className="flex items-center justify-between">
                            <button onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, itemId, -10) }} disabled={gauge <= 0} className="text-[8px] text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">−</button>
                            <span className="text-[8px] tabular-nums ns-bold text-green-500 dark:text-green-400">{gauge}</span>
                            <button onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, itemId, 10) }} disabled={gauge >= 100} className="text-[8px] text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">+</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="h-8 flex items-center justify-center"><span className="text-gray-200 dark:text-gray-700">—</span></div>
                  )}
                </td>
              )
            })}
          </tr>
        )

        const renderTable = (charSubset, isSplit = false) => {
          const filteredChars = selectedRaid
            ? charSubset.filter(char => (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
            : charSubset

          if (filteredChars.length === 0) return null

          // 이 청크에 속한 캐릭터들이 가진 레이드 행만 표시
          const chunkRaidRows = raidRows.filter(row =>
            filteredChars.some(char => (raids[char.id] || []).some(e => e.raidId === row.raidId))
          )

          // 레이드도 커스텀 항목도 없으면 빈 뼈대를 남기지 않음
          const hasCustom = filteredChars.some(c => (customItems[c.id] || []).length > 0)
          if (chunkRaidRows.length === 0 && !hasCustom) return null

          const tableNaturalWidth = COL_RAID + COL_CHAR * filteredChars.length
          const tableScale = (fitMode && tableContainerWidth > 0)
            ? Math.min(1, tableContainerWidth / tableNaturalWidth)
            : 1

          return (
          <div
            className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden"
            style={fitMode ? { width: '100%' } : isSplit ? { width: tableNaturalWidth } : { width: 'fit-content', maxWidth: '100%', marginLeft: 'auto', marginRight: 'auto' }}
          >
            <div
              style={fitMode
                ? { zoom: tableScale, transformOrigin: 'top left', width: `${tableNaturalWidth}px` }
                : {}
              }
            >
              <table className="border-collapse" style={{ tableLayout: 'fixed', width: COL_RAID + COL_CHAR * filteredChars.length }}>
                <thead>
                  {/* 1행: 캐릭터 이름 + 스탯 */}
                  <tr className="border-b border-gray-100 dark:border-[#2a2a2a] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {filteredChars.map(char => {
                      const isDragging = dragCharId === char.id
                      const isDragOver = dropCharId === char.id && dragCharId !== char.id
                      return (
                        <th
                          key={char.id}
                          draggable
                          onDragStart={(e) => handleCharDragStart(e, char.id)}
                          onDragOver={(e) => handleCharDragOver(e, char.id)}
                          onDrop={(e) => handleCharDrop(e, char.id)}
                          onDragEnd={handleCharDragEnd}
                          style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                          className={`px-2 py-2 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 align-top select-none cursor-default transition-colors ${
                            isDragging ? 'bg-yellow-100/80 dark:bg-yellow-900/25' :
                            isDragOver ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                            dragCharId ? 'opacity-50' : ''
                          }`}
                        >
                          <div className="flex flex-col items-center gap-0.5 w-full overflow-hidden">
                            <span className="text-gray-300 dark:text-gray-600 mb-0.5"><IconGrip /></span>
                            {getClassIcon(char.class) && (
                              <img src={getClassIcon(char.class)} alt={char.class} className="class-icon w-5 h-5 object-contain flex-shrink-0" />
                            )}
                            <div className="flex items-center gap-0.5 w-full justify-center overflow-hidden">
                              <span className={`${nameSize(char.name)} ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center truncate`}>{char.name}</span>
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500"><IconItemLevel /></span>
                                <span className="text-[10px] ns-bold text-gray-600 dark:text-gray-300">{char.itemLevel.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <img src="/combat-power.svg" alt="전투력" className="w-[11px] h-[11px] object-contain flex-shrink-0" />
                                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                                  {char.combatPower != null ? char.combatPower.toFixed(2) : '—'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </th>
                      )
                    })}
                  </tr>
                  {/* 2행: 캐릭터별 획득 골드 */}
                  <tr className="border-b border-gray-200 dark:border-[#383838] bg-gray-50 dark:bg-[#181818]">
                    <th style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-30 bg-gray-50 dark:bg-[#181818] border-r border-gray-200 dark:border-[#2a2a2a]"/>
                    {filteredChars.map(char => (
                      <th
                        key={char.id}
                        onDragOver={(e) => handleCharDragOver(e, char.id)}
                        onDrop={(e) => handleCharDrop(e, char.id)}
                        style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                        className={`px-2 py-1.5 border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 transition-colors ${
                          dragCharId === char.id     ? 'bg-yellow-100/70 dark:bg-yellow-900/20' :
                          dropCharId === char.id     ? 'bg-yellow-50 dark:bg-yellow-900/10' :
                          dragCharId                 ? 'opacity-50' : ''
                        }`}
                      >
                        <CharGoldBadges
                          bound={charGoldMap[char.id]?.bound ?? 0}
                          trade={charGoldMap[char.id]?.trade ?? 0}
                          boundTotal={charGoldMap[char.id]?.boundTotal ?? 0}
                          tradeTotal={charGoldMap[char.id]?.tradeTotal ?? 0}
                        />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-[#2a2a2a]">
                  {/* 커스텀 항목 공통 헬퍼: byName 맵 생성 */}
                  {!selectedRaid && (() => {
                    const byName = new Map()
                    filteredChars.forEach(char => {
                      ;(customItems[char.id] || []).forEach(it => {
                        if (!byName.has(it.name)) byName.set(it.name, { charMap: new Map(), meta: { image: it.image, type: it.type } })
                        byName.get(it.name).charMap.set(char.id, it.id)
                      })
                    })
                    // REST_GAUGE 행만 여기(레이드 앞)에 렌더링
                    return [...byName.entries()]
                      .filter(([name]) => REST_GAUGE_NAMES.has(name))
                      .map(([name, { charMap, meta }]) => renderCustomRow(name, charMap, meta, filteredChars))
                  })()}
                  {(selectedRaid ? chunkRaidRows.filter(row => row.raidId === selectedRaid.raidId) : chunkRaidRows).map(row => {
                    const raidData = RAIDS.find(r => r.id === row.raidId)
                    return (
                      <tr key={row.key} className="group">
                        <td style={{ width: COL_RAID, minWidth: COL_RAID }} className="sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-100 dark:border-[#2a2a2a] px-2 py-1.5">
                          <div className="flex items-center gap-1.5">
                            {raidData?.image && (
                              <img src={raidData.image} alt={row.raidName} className="w-[18px] h-[18px] object-contain flex-shrink-0" />
                            )}
                            <span className="text-xs ns-bold text-gray-800 dark:text-gray-100 truncate">{row.raidName}</span>
                          </div>
                        </td>
                        {filteredChars.map(char => {
                          const entry = (raids[char.id] || []).find(e => e.raidId === row.raidId)
                          const diff  = raidData?.difficulties.find(d => d.key === entry?.difficulty)
                          return (
                            <td
                              key={char.id}
                              onDragOver={(e) => handleCharDragOver(e, char.id)}
                              onDrop={(e) => handleCharDrop(e, char.id)}
                              style={{ width: COL_CHAR, maxWidth: COL_CHAR, overflow: 'hidden' }}
                              className={`border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1 transition-colors ${
                                dragCharId === char.id ? 'bg-yellow-100/50 dark:bg-yellow-900/15' :
                                dropCharId === char.id ? 'bg-yellow-50/70 dark:bg-yellow-900/8' :
                                dragCharId            ? 'opacity-50' : ''
                              }`}
                            >
                              <RaidCell
                                entry={entry}
                                diff={diff}
                                onToggle={() => entry && toggleRaid(char.id, row.raidId, entry.difficulty)}
                                onToggleMoreFrom={() => entry && toggleMoreFrom(char.id, row.raidId, entry.difficulty)}
                              />
                            </td>
                          )
                        })}
                      </tr>
                    )
                  })}
                  {chunkRaidRows.length === 0 && !filteredChars.some(c => (customItems[c.id] || []).length > 0) && (
                    <tr>
                      <td colSpan={filteredChars.length + 1} className="py-16 text-center">
                        <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                        <p className="text-xs text-gray-300 dark:text-gray-700">캐릭터를 추가하여 숙제를 관리해보세요!</p>
                      </td>
                    </tr>
                  )}
                  {/* 커스텀 항목 행 (기타) — REST_GAUGE 제외, 레이드 필터 선택 시 숨김 */}
                  {!selectedRaid && (() => {
                    const byName = new Map()
                    filteredChars.forEach(char => {
                      ;(customItems[char.id] || []).filter(it => !REST_GAUGE_NAMES.has(it.name)).forEach(it => {
                        if (!byName.has(it.name)) byName.set(it.name, { charMap: new Map(), meta: { image: it.image, type: it.type } })
                        byName.get(it.name).charMap.set(char.id, it.id)
                      })
                    })
                    return [...byName.entries()].map(([name, { charMap, meta }]) => renderCustomRow(name, charMap, meta, filteredChars))
                  })()}
                </tbody>
              </table>
            </div>
          </div>
          )
        }

        return (
          <div className="space-y-2">
            {/* ── 레이드 필터 ── */}
            {allRegisteredRaids.length > 0 && (
              <div className="rounded-lg border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] overflow-hidden">
                {/* 레이드 버튼 행 */}
                {(() => {
                  const diffBg = (diffKey, isActive) =>
                    isActive ? (
                      diffKey === 'nightmare'     ? 'bg-violet-200 dark:bg-violet-800/60 text-violet-900 dark:text-violet-100' :
                      diffKey === 'hard'          ? 'bg-rose-200 dark:bg-rose-800/60 text-rose-900 dark:text-rose-100' :
                      diffKey.startsWith('stage') ? 'bg-amber-200 dark:bg-amber-800/60 text-amber-900 dark:text-amber-100' :
                                                    'bg-sky-200 dark:bg-sky-800/60 text-sky-900 dark:text-sky-100'
                    ) : (
                      diffKey === 'nightmare'     ? 'bg-violet-50 dark:bg-violet-950/30 text-violet-500 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40' :
                      diffKey === 'hard'          ? 'bg-rose-50 dark:bg-rose-950/30 text-rose-500 dark:text-rose-400 hover:bg-rose-100 dark:hover:bg-rose-900/40' :
                      diffKey.startsWith('stage') ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40' :
                                                    'bg-sky-50 dark:bg-sky-950/30 text-sky-500 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/40'
                    )
                  const raidGroups = allRegisteredRaids.reduce((acc, r) => {
                    const g = acc.find(x => x.raidId === r.raidId)
                    if (g) g.diffs.push(r)
                    else acc.push({ raidId: r.raidId, raidName: r.raidName, diffs: [r] })
                    return acc
                  }, [])
                  return (
                    <div className="flex flex-wrap items-center gap-y-2 px-3 py-2.5">
                      {raidGroups.map((group, gi) => (
                        <div key={group.raidId} className="flex items-center gap-2">
                          {gi > 0 && <div className="w-px h-4 bg-gray-200 dark:bg-[#383838] mx-2 flex-shrink-0" />}
                          <span className="text-[10px] text-gray-400 dark:text-gray-500 whitespace-nowrap mr-0.5">{group.raidName}</span>
                          <div className="flex items-center gap-1">
                            {group.diffs.map(r => {
                              const isActive = selectedRaid?.raidId === r.raidId && selectedRaid?.diffKey === r.diffKey
                              return (
                                <button
                                  key={r.diffKey}
                                  onClick={() => setSelectedRaid(isActive ? null : { raidId: r.raidId, diffKey: r.diffKey })}
                                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] ns-bold transition-all ${diffBg(r.diffKey, isActive)}`}
                                >
                                  <span>{r.diffLabel}</span>
                                  <span className="inline-flex items-center justify-center w-4">
                                    {r.incomplete > 0 ? (
                                      <span className={`tabular-nums text-[9px] ns-bold ${isActive ? 'opacity-70' : 'text-gray-400 dark:text-gray-500'}`}>
                                        {r.incomplete}
                                      </span>
                                    ) : (
                                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-emerald-500 dark:text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                  </span>
                                </button>
                              )
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}

                {/* 선택된 레이드 캐릭터 완료 현황 — 항상 동일 높이 유지 */}
                {selectedRaid && (() => {
                  const incompleteIds = new Set(raidIncompleteChars.map(({ char }) => char.id))
                  // 해당 레이드가 등록된 캐릭터만 표시
                  const relevantChars = activeChars.filter(char =>
                    (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                  )
                  return (
                  <div className="border-t border-gray-100 dark:border-[#2a2a2a]">
                    <div className="flex flex-wrap gap-x-1 gap-y-1 px-2.5 py-2">
                      {relevantChars.map(char => {
                        const incomplete = incompleteIds.has(char.id)
                        const entry      = (raids[char.id] || []).find(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                        const gateClears = entry?.gateClears || []
                        const partialCount = gateClears.filter(Boolean).length
                        const isPartial  = incomplete && partialCount > 0
                        return (
                          <div key={char.id} className={`flex items-center gap-1 rounded-full px-2 py-1 ${
                            incomplete
                              ? 'bg-gray-50 dark:bg-[#2a2a2a]'
                              : 'bg-emerald-50 dark:bg-emerald-900/20'
                          }`}>
                            {incomplete ? (
                              getClassIcon(char.class)
                                ? <img src={getClassIcon(char.class)} alt="" className="class-icon w-3.5 h-3.5 object-contain flex-shrink-0" />
                                : <span className="w-3.5 h-3.5 text-gray-300 flex-shrink-0"><IconClass /></span>
                            ) : (
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 dark:text-emerald-400 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                            )}
                            <span className={`text-[10px] ns-bold ${incomplete ? 'text-gray-700 dark:text-gray-200' : 'text-emerald-600 dark:text-emerald-400'}`}>
                              {char.name}
                            </span>
                            {isPartial && (
                              <span className="text-[9px] text-gray-400 dark:text-gray-500 tabular-nums">
                                {partialCount}/{gateClears.length}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                  )
                })()}
              </div>
            )}

            {/* 카드 / 테이블 뷰 토글 + 한눈에 보기 — 캐릭터 있을 때만 */}
            {activeChars.length > 0 && <div className="flex items-center justify-end gap-2">
              {/* 한눈에 보기 — 테이블 모드에서만 표시 */}
              {!cardView && (
                <button
                  onClick={() => setFitMode(v => !v)}
                  title={fitMode ? '원래 크기로' : '한눈에 보기'}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs ns-bold transition-colors ${
                    fitMode
                      ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/15 text-yellow-600 dark:text-yellow-400'
                      : 'border-gray-200 dark:border-[#383838] text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 bg-gray-50 dark:bg-[#181818]'
                  }`}
                >
                  {fitMode ? (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>
                    </svg>
                  ) : (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                      <path d="M8 3H5a2 2 0 0 0-2 2v3M21 8V5a2 2 0 0 0-2-2h-3M3 16v3a2 2 0 0 0 2 2h3M16 21h3a2 2 0 0 0 2-2v-3"/>
                    </svg>
                  )}
                  {fitMode ? '원래 크기' : '한눈에 보기'}
                </button>
              )}

              <div className="flex gap-1 rounded-lg border border-gray-200 dark:border-[#383838] p-0.5 w-fit bg-gray-50 dark:bg-[#181818]">
                <button
                  onClick={() => setCardView(false)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ns-bold transition-colors ${
                    !cardView
                      ? 'bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-200 shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="1"/>
                    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>
                  </svg>
                  테이블
                </button>
                <button
                  onClick={() => setCardView(true)}
                  className={`flex items-center gap-1.5 rounded px-2.5 py-1 text-xs ns-bold transition-colors ${
                    cardView
                      ? 'bg-white dark:bg-[#222222] text-gray-700 dark:text-gray-200 shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="3" width="9" height="9" rx="1"/><rect x="13" y="3" width="9" height="9" rx="1"/>
                    <rect x="2" y="14" width="9" height="7" rx="1"/><rect x="13" y="14" width="9" height="7" rx="1"/>
                  </svg>
                  카드
                </button>
              </div>
            </div>}
            {activeChars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-sm text-gray-400 dark:text-gray-600">표시할 레이드가 없습니다</p>
                <p className="text-xs text-gray-300 dark:text-gray-700">레이드 설정에서 캐릭터별로 참여할 레이드를 추가하세요</p>
              </div>
            ) : (
              cardView ? renderCardView() : (() => {
                if (fitMode) return renderTable(activeChars)
                // 화면 너비에 맞춰 청크 분할 — 스크롤 없이 테이블 세로 적층
                // tableContainerWidth가 0이면 적당한 기본값(6) 사용
                const containerW   = tableContainerWidth > 0 ? tableContainerWidth : COL_RAID + COL_CHAR * 6
                const charsPerTable = Math.max(1, Math.floor((containerW - COL_RAID) / COL_CHAR))
                const chunks = []
                for (let i = 0; i < activeChars.length; i += charsPerTable)
                  chunks.push(activeChars.slice(i, i + charsPerTable))
                if (chunks.length === 1) return renderTable(chunks[0])
                // 첫 번째 테이블 너비로 좌측 여백 계산 (가운데 정렬 기준)
                const topTableW  = COL_RAID + COL_CHAR * chunks[0].length
                const leftOffset = Math.max(0, Math.floor((containerW - topTableW) / 2))
                return (
                  <div className="space-y-3">
                    {chunks.map((chunk, idx) => (
                      <div
                        key={idx}
                        style={idx === 0
                          ? { width: 'fit-content', margin: '0 auto' }
                          : { marginLeft: leftOffset }
                        }
                      >
                        {renderTable(chunk, true)}
                      </div>
                    ))}
                  </div>
                )
              })()
            )}
          </div>
        )
      })()}
      </div>

      {/* ── 모달 ── */}
      {showRaidSettings && (
        <RaidSettingsModal
          chars={activeChars}
          raids={raids}
          expPages={expPages}
          onToggle={toggleCharRaid}
          onToggleGold={toggleCharRaidGold}
          onClose={() => { setShowRaidSettings(false); setRaidSettingsCharId(null) }}
          onConfirm={handleRaidSettingsConfirm}
          exRaidError={exRaidError}
          onClearExRaidError={() => setExRaidError(null)}
          onOpenCharAdd={() => { setCharEditOpenAdd(true); setShowCharEdit(true) }}
          initialCharId={raidSettingsCharId}
        />
      )}
      {showNoChar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25" onClick={() => setShowNoChar(false)}>
          <div className="relative w-full max-w-md rounded-xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowNoChar(false)}
              className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none"
            >×</button>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
            <button
              onClick={() => { setShowNoChar(false); setCharEditOpenAdd(true); setShowCharEdit(true) }}
              className="mt-6 px-4 py-2 rounded bg-yellow-200 hover:bg-yellow-300 dark:bg-[#2e2e2e] dark:hover:bg-[#383838] text-sm ns-bold text-yellow-900 dark:text-gray-300 transition-colors">
              캐릭터 추가
            </button>
          </div>
        </div>
      )}
      {showCharEdit && (
        <CharacterEditModal
          chars={chars}
          raids={raids}
          onAdd={addChars}
          onDelete={deleteChar}
          onReorder={saveCharOrder}
          initialShowAdd={charEditOpenAdd}
          onClose={() => { setShowCharEdit(false); setCharEditOpenAdd(false) }}
          isDemo={isDemo}
          onLoginRequired={() => { setShowCharEdit(false); setShowLoginGuide(true) }}
          activeTabExpeditionId={activeChars[0]?.expeditionId ?? null}
          getTargetTabName={getTargetTabName}
        />
      )}
      {showAutoSetup && (
        <AutoSetupModal
          onApply={applyAutoSetup}
          onClose={() => setShowAutoSetup(false)}
          existingRaids={raids}
          existingChars={chars}
        />
      )}

      {showCustomSettings && (
        <CustomSettingsModal
          chars={activeChars}
          customItems={customItems}
          onAdd={addCustomItem}
          onDelete={deleteCustomItem}
          onDeleteAll={deleteCustomItemAll}
          onReorder={reorderCustomItems}
          onClose={() => { setShowCustomSettings(false); setCustomSettingsCharId(null) }}
          initialCharId={customSettingsCharId}
        />
      )}

      {/* ── 데모 모드 로그인 유도 모달 ── */}
      {/* ── 캐릭터 삭제 확인 모달 ── */}
      {confirmDeleteCharId && (() => {
        const target = chars.find(c => c.id === confirmDeleteCharId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setConfirmDeleteCharId(null)}>
            <div
              className="relative w-full max-w-xs rounded-2xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConfirmDeleteCharId(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
              <div className="space-y-1.5">
                <p className="text-sm ns-bold text-gray-900 dark:text-white">캐릭터 삭제</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  <span className="ns-bold text-gray-800 dark:text-gray-200">{target?.name}</span> 캐릭터와<br/>
                  설정된 모든 레이드 숙제가 삭제됩니다.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setConfirmDeleteCharId(null)}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-[#444] px-4 py-2 text-xs ns-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >취소</button>
                <button
                  onClick={() => { deleteChar(confirmDeleteCharId); setConfirmDeleteCharId(null) }}
                  className="flex-1 rounded-lg bg-red-500 hover:bg-red-400 px-4 py-2 text-xs ns-bold text-white transition-colors"
                >삭제</button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── 원정대 탭 삭제 확인 모달 ── */}
      {confirmDeletePageId && (() => {
        const page = expPages.find(p => p.id === confirmDeletePageId)
        const pageChars = chars.filter(c => c.expeditionId === confirmDeletePageId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setConfirmDeletePageId(null)}>
            <div
              className="relative w-full max-w-xs rounded-2xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConfirmDeletePageId(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
              <div className="space-y-1.5">
                <p className="text-sm ns-bold text-gray-900 dark:text-white">원정대 삭제</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                  <span className="ns-bold text-gray-800 dark:text-gray-200">{page?.name}</span> 원정대를 삭제하면<br/>
                  캐릭터 <span className="ns-bold text-red-500">{pageChars.length}개</span>와 설정된 모든 레이드 숙제가<br/>
                  함께 삭제됩니다.
                </p>
              </div>
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => setConfirmDeletePageId(null)}
                  className="flex-1 rounded-lg border border-gray-200 dark:border-[#444] px-4 py-2 text-xs ns-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
                >취소</button>
                <button
                  onClick={() => { deleteExpPage(confirmDeletePageId); setConfirmDeletePageId(null) }}
                  className="flex-1 rounded-lg bg-red-500 hover:bg-red-400 px-4 py-2 text-xs ns-bold text-white transition-colors"
                >삭제</button>
              </div>
            </div>
          </div>
        )
      })()}

      {showLoginGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowLoginGuide(false)}>
          <div
            className="relative w-full max-w-sm rounded-2xl border border-gray-200 dark:border-[#383838] bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowLoginGuide(false)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-lg leading-none">×</button>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                지금 보이는 원정대는 샘플 데이터에요.<br/>
                디스코드 로그인 후 내 캐릭터를 직접 등록하고<br/>
                레이드 숙제를 관리해 보세요!
              </p>
            </div>

            <button
              onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-yellow-400 hover:bg-yellow-300 px-5 py-2.5 text-sm ns-bold text-gray-900 transition-colors"
            >
              <DiscordIcon size={16} />
              디스코드 로그인
            </button>

            <button onClick={() => setShowLoginGuide(false)} className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              계속 둘러보기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
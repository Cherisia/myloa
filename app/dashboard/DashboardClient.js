'use client'

import Image from 'next/image'
import { useState, useMemo, useEffect, useLayoutEffect, useRef } from 'react'
import { signIn } from 'next-auth/react'
import DiscordIcon from '@/components/DiscordIcon'
import AdSense from '@/components/AdSense'
import { RAIDS, RAID_MAP, RAID_ORDER_MAP, CLASS_COLOR, calcGold, calcGoldBound, calcGoldTrade, calcGoldMore } from '@/lib/raidData'
import { EX_RAID_IDS, HIDDEN_RAID_IDS, GOLD_RAID_LIMIT, GOLD_CHAR_LIMIT, AUTO_PRESETS, REST_GAUGE_NAMES, KURZAN_NAMES, DAILY_PRESET_ORDER, orderedDailyCustomItems, isWeeklyCustomItem, getClassIcon, getKurzanPreset, CUSTOM_MAX } from './_constants'
import { IconCrown, IconPlus, IconCheck, IconRefresh, IconInfo, IconClass, IconItemLevel, IconPower, IconGrip } from './_icons'
import { saveRaid, deleteRaid, computeAutoRaids } from './_raidHelpers'
import RaidSettingsModal from './modals/RaidSettingsModal'
import CharacterEditModal from './modals/CharacterEditModal'
import AutoSetupModal from './modals/AutoSetupModal'
import AnimatedGold from './components/AnimatedGold'
import CharGoldBadges from './components/CharGoldBadges'
import RaidCell from './components/RaidCell'
import Confetti, { GoldConfetti } from './components/Confetti'


/** 카드 레이어보다 나중에 깜박이는 img 아이콘을 줄이기 위해 브라우저 캐시에 선적재한다. */
function collectDashboardImageUrls(chars, raidsByCharId, customByCharId = {}) {
  const urls = []
  for (const char of chars) {
    const clsIcon = getClassIcon(char.class)
    if (clsIcon) urls.push(clsIcon)
    for (const entry of raidsByCharId[char.id] || []) {
      const raid = RAID_MAP[entry.raidId]
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
      const img = document.createElement('img')
      img.onload = () => resolve()
      img.onerror = () => resolve()
      img.src = src
    }))
  )
  return Promise.race([loadAll, deadline])
}

/** 표용: 조건에 맞는 커스텀 숙제를 이름별로 묶음 */
function buildCustomHomeworkRowMap(filteredChars, customItems, includeItem) {
  const byName = new Map()
  filteredChars.forEach((char) => {
    (customItems[char.id] || []).filter(includeItem).forEach((it) => {
      if (!byName.has(it.name)) byName.set(it.name, { charMap: new Map(), meta: { image: it.image, type: it.type } })
      byName.get(it.name).charMap.set(char.id, it.id)
    })
  })
  return byName
}

export default function DashboardClient({ initialChars = [], initialRaids = {}, isLoggedIn = false, initialHasApiKey = false, initialCustomItems = {}, initialCustomChecks = {}, initialRestGauge = {}, initialRestGaugeDeducted = {}, initialExpNames = {}, initialRepCharId = null }) {
  const isDemo = !isLoggedIn
  const [chars, setChars] = useState(initialChars)
  const [raids, setRaids] = useState(initialRaids)
  const [showRaidSettings, setShowRaidSettings] = useState(false)
  const [showAutoSetup,    setShowAutoSetup]    = useState(false)
  const [showCharEdit,     setShowCharEdit]     = useState(false)
  const [charEditOpenAdd,  setCharEditOpenAdd]  = useState(false)
  const [showNoChar,       setShowNoChar]       = useState(false)
  const [showLoginGuide,      setShowLoginGuide]      = useState(false)
  const [showGoldLimitNotice, setShowGoldLimitNotice] = useState(false)
  const [confirmDeleteCharId, setConfirmDeleteCharId] = useState(null)
  const [confirmDeletePageId, setConfirmDeletePageId] = useState(null) // 탭 삭제 확인
  const [syncing, setSyncing]                   = useState(false)
  const [addingChars, setAddingChars]           = useState(false)
  const [hasApiKey, setHasApiKey]               = useState(initialHasApiKey)
  const [syncCooldownSec, setSyncCooldownSec]   = useState(0)
  const [showConfetti, setShowConfetti]         = useState(false)
  const [showGoldConfetti, setShowGoldConfetti] = useState(false)
  const [exRaidError, setExRaidError]           = useState(null) // { raidName, conflictCharName }
  const [cardView, setCardView]                 = useState(() => {
    if (typeof window === 'undefined') return true
    const saved = localStorage.getItem('dashboard_cardView')
    return saved === null ? true : saved === 'true'
  })

  const [dragCharId, setDragCharId]             = useState(null) // 드래그 중인 캐릭터 id
  const [dropCharId, setDropCharId]             = useState(null) // 드롭 대상 캐릭터 id
  const [dragExpId,  setDragExpId]              = useState(null) // 드래그 중인 원정대 id
  const [dropExpId,  setDropExpId]              = useState(null) // 드롭 대상 원정대 id
  const [selectedRaid, setSelectedRaid]         = useState(null) // { raidId, diffKey } — 레이드 필터
  const [remainFilter, setRemainFilter]         = useState(null) // null | 'gold' | 'all' — 남은 레이드 필터
  const frozenRemainRaidsRef = useRef(null) // 필터 활성 시점 스냅샷: Set<'charId:raidId:difficulty'>
  const [gearMenuCharId, setGearMenuCharId]     = useState(null) // 카드 톱니바퀴 메뉴
  const [raidSettingsCharId, setRaidSettingsCharId] = useState(null)
  const [allTabSort, setAllTabSort]                 = useState(() => {
    if (typeof window === 'undefined') return 'expedition'
    return localStorage.getItem('dashboard_allTabSort') || 'expedition'
  }) // 'expedition' | 'itemLevel'
  // 원정대 페이지
  const [activePageId, setActivePageId]         = useState(null)
  const [editingPageId, setEditingPageId]       = useState(null) // 이름 편집 중인 페이지 id
  const [editingPageName, setEditingPageName]   = useState('')
  const [expNames, setExpNames]                 = useState(initialExpNames)   // expeditionId -> 사용자 지정 탭 이름
  const [customItems, setCustomItems]           = useState(initialCustomItems) // {charId: [{id, name, type, image}]}
  const [customChecks, setCustomChecks]         = useState(initialCustomChecks)   // {charId: {itemId: bool}}
  const [restGauge, setRestGauge]               = useState(initialRestGauge)   // {charId: {itemId: 0-100}}
  const [restGaugeDeducted, setRestGaugeDeducted] = useState(initialRestGaugeDeducted) // {charId: {itemId: bool}} — 체크 시 실제 차감 여부
  const [lsReady, setLsReady]                   = useState(false) // localStorage 로드 완료 여부
  const [isMobile, setIsMobile]                 = useState(false) // 모바일 여부 (< 768px)
  const wasCompleteRef                          = useRef(false)
  const wasGoldCompleteRef                      = useRef(false)
  const confettiInitRef                         = useRef(false)
  const goldConfettiInitRef                     = useRef(false)
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

  // sync 쿨다운 초기화 (localStorage 기반)
  useEffect(() => {
    if (!isLoggedIn) return
    try {
      const lastAt  = parseInt(localStorage.getItem('myloa_last_sync_at') || '0', 10)
      const remain  = Math.ceil((60_000 - (Date.now() - lastAt)) / 1000)
      if (remain > 0) setSyncCooldownSec(remain)
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // sync 쿨다운 카운트다운
  useEffect(() => {
    if (syncCooldownSec <= 0) return
    const t = setTimeout(() => setSyncCooldownSec(s => Math.max(0, s - 1)), 1000)
    return () => clearTimeout(t)
  }, [syncCooldownSec])

  // 원정대 탭 초기화 — activePageId만 localStorage 복원 (expNames는 DB 우선)
  // useLayoutEffect: paint 전에 동기 실행 → 전체→저장탭 플래시 없음
  // 비로그인(데모) 모드: 항상 전체보기(null)로 시작 / 로그인 상태: 저장된 탭 복원
  useLayoutEffect(() => {
    try {
      if (isLoggedIn) {
        setActivePageId(localStorage.getItem('myloa_active_page') || null) // 빈 문자열·null → 전체보기
      }
      // 데모 모드는 null(전체보기) 초기값 유지
    } catch {}
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!isLoggedIn) return // 데모 모드에서는 로그인 탭 상태 덮어쓰지 않음
    try { localStorage.setItem('myloa_active_page', activePageId ?? '') } catch {}
  }, [activePageId]) // eslint-disable-line react-hooks/exhaustive-deps
  // activePageId가 더 이상 유효하지 않으면 전체보기(null)로 조정
  useEffect(() => {
    if (activePageId && !expPages.find(p => p.id === activePageId)) {
      setActivePageId(null)
    }
  }, [expPages]) // eslint-disable-line react-hooks/exhaustive-deps
  // 탭 변경 시 remainFilter 초기화
  useEffect(() => { setRemainFilter(null); frozenRemainRaidsRef.current = null }, [activePageId])
  // 탭 전환 시 선택된 레이드가 새 탭에 없으면 초기화
  useEffect(() => {
    if (!selectedRaid) return
    const stillExists = activeChars.some(char =>
      (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
    )
    if (!stillExists) setSelectedRaid(null)
  }, [activePageId]) // eslint-disable-line react-hooks/exhaustive-deps

  // 모바일 감지 (< 768px)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 커스텀 항목 로드/마이그레이션
  // - 비로그인(데모): localStorage에서 로드
  // - 로그인 + DB 비어있음: localStorage에서 DB로 마이그레이션
  // - 로그인 + DB 있음: initialCustomItems 등 props 그대로 사용 (이미 state 초기값으로 설정됨)
  useLayoutEffect(() => {
    if (!isLoggedIn) {
      // 데모 모드: localStorage에서 로드
      try {
        const items    = localStorage.getItem('myloa_custom_items')
        const checks   = localStorage.getItem('myloa_custom_checks')
        const gauge    = localStorage.getItem('myloa_rest_gauge')
        const deducted = localStorage.getItem('myloa_rest_gauge_deducted')
        if (items)    setCustomItems(JSON.parse(items))
        if (checks)   setCustomChecks(JSON.parse(checks))
        if (gauge)    setRestGauge(JSON.parse(gauge))
        if (deducted) setRestGaugeDeducted(JSON.parse(deducted))
      } catch (e) { console.error('[migration:load]', e) }
    } else if (Object.keys(initialCustomItems).length === 0) {
      // 로그인 상태이지만 DB가 비어있음: localStorage → DB 마이그레이션
      try {
        const lsItems = localStorage.getItem('myloa_custom_items')
        if (lsItems) {
          const items  = JSON.parse(lsItems)
          const checks = JSON.parse(localStorage.getItem('myloa_custom_checks') || '{}')
          const gauge  = JSON.parse(localStorage.getItem('myloa_rest_gauge') || '{}')
          const ded    = JSON.parse(localStorage.getItem('myloa_rest_gauge_deducted') || '{}')

          // 임시 ID로 state 즉시 반영 (마이그레이션 중 UI 유지)
          setCustomItems(items)
          setCustomChecks(checks)
          setRestGauge(gauge)
          setRestGaugeDeducted(ded)

          // DB에 비동기 저장 후 실제 ID로 교체
          ;(async () => {
            const newCI = {}, newCC = {}, newRG = {}, newRGD = {}
            for (const [charId, charItems] of Object.entries(items)) {
              newCI[charId] = []
              for (let i = 0; i < charItems.length; i++) {
                const it = charItems[i]
                try {
                  const res = await fetch('/api/custom-items', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      characterId: charId, name: it.name, type: it.type, image: it.image, sortOrder: i,
                      done:      checks[charId]?.[it.id] ?? false,
                      restGauge: gauge[charId]?.[it.id]  ?? 0,
                      deducted:  ded[charId]?.[it.id]    ?? false,
                    }),
                  })
                  if (res.ok) {
                    const d = await res.json()
                    newCI[charId].push({ id: d.id, name: d.name, type: d.type, image: d.image })
                    if (d.done)      { if (!newCC[charId]) newCC[charId] = {};  newCC[charId][d.id]  = true }
                    if (d.restGauge) { if (!newRG[charId]) newRG[charId] = {};  newRG[charId][d.id]  = d.restGauge }
                    if (d.deducted)  { if (!newRGD[charId]) newRGD[charId] = {}; newRGD[charId][d.id] = true }
                  }
                } catch (e) { console.error('[migration]', e) }
              }
            }
            setCustomItems(newCI)
            setCustomChecks(newCC)
            setRestGauge(newRG)
            setRestGaugeDeducted(newRGD)
            ;['myloa_custom_items', 'myloa_custom_checks', 'myloa_rest_gauge', 'myloa_rest_gauge_deducted']
              .forEach(k => { try { localStorage.removeItem(k) } catch {} })
          })()
        }
      } catch (e) { console.error('[migration:db]', e) }
    }
    setLsReady(true)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  // 저장 — 데모 모드에서만 localStorage 사용, lsReady 이전엔 실행 안 함
  useEffect(() => {
    if (!lsReady || isLoggedIn) return
    try { localStorage.setItem('myloa_custom_items', JSON.stringify(customItems)) } catch {}
  }, [customItems, lsReady])
  useEffect(() => {
    if (!lsReady || isLoggedIn) return
    try { localStorage.setItem('myloa_custom_checks', JSON.stringify(customChecks)) } catch {}
  }, [customChecks, lsReady])
  useEffect(() => {
    if (!lsReady || isLoggedIn) return
    try { localStorage.setItem('myloa_rest_gauge', JSON.stringify(restGauge)) } catch {}
  }, [restGauge, lsReady])
  useEffect(() => {
    if (!lsReady || isLoggedIn) return
    try { localStorage.setItem('myloa_rest_gauge_deducted', JSON.stringify(restGaugeDeducted)) } catch {}
  }, [restGaugeDeducted, lsReady])

  // 테이블 컨테이너 너비 추적 (청크 분할용)
  useEffect(() => {
    const el = tableWrapRef.current
    if (!el) return
    const obs = new ResizeObserver(([entry]) => setTableContainerWidth(entry.contentRect.width))
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  // 페이지별 캐릭터 필터링 — activePageId가 null이면 전체보기
  const activeChars = useMemo(() => {
    if (!activePageId) {
      if (allTabSort === 'itemLevel') return [...chars].sort((a, b) => b.itemLevel - a.itemLevel)
      return chars
    }
    return chars.filter(c => c.expeditionId === activePageId)
  }, [chars, activePageId, allTabSort])

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
      pageChars.forEach(c => fetch(`/api/characters?id=${c.id}`, { method: 'DELETE' }).catch(e => console.error('[deleteExpPage]', e)))
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
  const addCustomItem = async (charId, name, type = 'weekly', image) => {
    const list = customItems[charId] || []
    if (list.length >= CUSTOM_MAX) return
    if (list.some(it => it.name === name)) return
    if (!isLoggedIn) {
      const item = { id: `c-${Date.now()}`, name, type }
      if (image) item.image = image
      setCustomItems(prev => ({ ...prev, [charId]: [...(prev[charId] || []), item] }))
      return
    }
    try {
      const res = await fetch('/api/custom-items', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId: charId, name, type, image, sortOrder: list.length }),
      })
      if (!res.ok) return
      const d = await res.json()
      setCustomItems(prev => ({ ...prev, [charId]: [...(prev[charId] || []), { id: d.id, name: d.name, type: d.type, image: d.image }] }))
    } catch {}
  }
  const deleteCustomItem = (charId, itemId) => {
    setCustomItems(prev => ({ ...prev, [charId]: (prev[charId] || []).filter(it => it.id !== itemId) }))
    setCustomChecks(prev => {
      const { [itemId]: _, ...rest } = prev[charId] || {}
      return { ...prev, [charId]: rest }
    })
    if (isLoggedIn) fetch(`/api/custom-items/${itemId}`, { method: 'DELETE' }).catch(e => console.error('[deleteCustomItem]', e))
  }
  const deleteCustomItemAll = (name) => {
    const itemIds = []
    Object.values(customItems).forEach(items => items.filter(it => it.name === name).forEach(it => itemIds.push(it.id)))
    setCustomItems(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(cid => { next[cid] = (next[cid] || []).filter(it => it.name !== name) })
      return next
    })
    setCustomChecks(prev => {
      const next = { ...prev }
      Object.keys(next).forEach(cid => {
        const charChecks = { ...next[cid] }
        itemIds.forEach(id => { delete charChecks[id] })
        next[cid] = charChecks
      })
      return next
    })
    if (isLoggedIn) itemIds.forEach(id => fetch(`/api/custom-items/${id}`, { method: 'DELETE' }).catch(e => console.error('[deleteCustomItemAll]', e)))
  }
  const reorderCustomItems = (charId, newItems) => {
    setCustomItems(prev => ({ ...prev, [charId]: newItems }))
    if (isLoggedIn) newItems.forEach((it, i) => fetch(`/api/custom-items/${it.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ sortOrder: i }) }).catch(e => console.error('[reorderCustomItems]', e)))
  }
  const toggleCustomCheck = (charId, itemId) => {
    const item = (customItems[charId] || []).find(it => it.id === itemId)
    const currentChecked = !!(customChecks[charId]?.[itemId])
    const newChecked = !currentChecked
    let newRestGaugeVal = restGauge[charId]?.[itemId] ?? 0
    let newDeducted = false

    if (item && REST_GAUGE_NAMES.has(item.name)) {
      const cur = newRestGaugeVal
      if (newChecked) {
        // 체크: 게이지 20 이상일 때만 차감, 차감 여부 기록
        const didDeduct = cur >= 20
        newDeducted = didDeduct
        if (didDeduct) newRestGaugeVal = cur - 20
      } else {
        // 체크 해제: 이전에 실제로 차감했을 때만 복원
        const wasDeducted = restGaugeDeducted[charId]?.[itemId] ?? false
        if (wasDeducted) newRestGaugeVal = Math.min(100, cur + 20)
        newDeducted = false
      }
      setRestGaugeDeducted(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: newDeducted } }))
      setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: newRestGaugeVal } }))
    }

    setCustomChecks(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: newChecked } }))
    if (isLoggedIn) fetch(`/api/custom-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ done: newChecked, restGauge: newRestGaugeVal, deducted: newDeducted }) }).catch(e => console.error('[toggleCustomCheck]', e))
  }
  const adjustRestGauge = (charId, itemId, delta) => {
    const cur = restGauge[charId]?.[itemId] ?? 0
    const next = Math.max(0, Math.min(100, cur + delta))
    setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: next } }))
    if (isLoggedIn) fetch(`/api/custom-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restGauge: next }) }).catch(e => console.error('[adjustRestGauge]', e))
  }
  const setRestGaugeValue = (charId, itemId, value) => {
    const next = Math.max(0, Math.min(100, value))
    setRestGauge(prev => ({ ...prev, [charId]: { ...(prev[charId] || {}), [itemId]: next } }))
    if (isLoggedIn) fetch(`/api/custom-items/${itemId}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ restGauge: next }) }).catch(e => console.error('[setRestGaugeValue]', e))
  }

  // 대표 캐릭터 — 전체 탭: 첫 번째 원정대의 accountRepChar / 개별 탭: 해당 원정대의 accountRepChar / 데모: initialRepCharId 우선
  const repCharId = useMemo(() => {
    if (chars.length === 0) return null
    if (initialRepCharId && chars.some(c => c.id === initialRepCharId)) return initialRepCharId

    const targetExpId = activePageId ?? expPages[0]?.id ?? null
    if (targetExpId) {
      const expRepName = chars.find(c => c.expeditionId === targetExpId)?.accountRepChar
      if (expRepName) {
        const repChar = chars.find(c => c.name === expRepName && c.expeditionId === targetExpId)
        if (repChar) return repChar.id
      }
      const expChars = chars.filter(c => c.expeditionId === targetExpId)
      if (expChars.length > 0) return expChars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b).id
    }
    return chars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b).id
  }, [chars, initialRepCharId, activePageId, expPages])

  // ── 레이드 필터 — 활성 계정 캐릭터에 등록된 고유 레이드 목록 ──────────────
  const allRegisteredRaids = useMemo(() => {
    const seen = new Map()
    for (const char of activeChars) {
      for (const r of (raids[char.id] || [])) {
        if (HIDDEN_RAID_IDS.has(r.raidId)) continue
        const key = `${r.raidId}:${r.difficulty}`
        if (!seen.has(key)) {
          const raidDef = RAID_MAP[r.raidId]
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
        if (!Array.isArray(clears) || clears.length === 0 || !clears.every(Boolean)) seen.get(key).incomplete++
      }
    }
    return [...seen.values()].sort((a, b) =>
      (RAID_ORDER_MAP[a.raidId] ?? -1) - (RAID_ORDER_MAP[b.raidId] ?? -1)
    )
  }, [activeChars, raids])

  // 선택된 레이드에서 미완료 캐릭터 목록
  const raidIncompleteChars = useMemo(() => {
    if (!selectedRaid) return []
    return activeChars.flatMap(char => {
      const entry = (raids[char.id] || []).find(
        r => r.raidId === selectedRaid.raidId && r.difficulty === selectedRaid.diffKey
      )
      if (!entry) return []
      const clears = Array.isArray(entry.gateClears) ? entry.gateClears : []
      if (clears.length > 0 && clears.every(Boolean)) return [] // 전부 완료
      return [{ char, gateClears: clears }]
    })
  }, [selectedRaid, activeChars, raids])

  // 레이드 필터 활성 시 미완료 캐릭터를 앞으로 정렬 (필터 선택 시점 순서 동결 — 체크해도 재정렬 안 함)
  const frozenOrderRef = useRef(null)      // { key: 'raidId:diffKey', charIds: string[] }
  const frozenBadgeOrderRef = useRef(null) // { key: 'raidId:diffKey', charIds: string[] } — 필터 배지 순서 동결
  const sortedActiveChars = useMemo(() => {
    const filterKey = selectedRaid ? `${selectedRaid.raidId}:${selectedRaid.diffKey}` : null
    const frozen = frozenOrderRef.current

    if (!selectedRaid) {
      // 필터 해제 시 ref를 null로 지우지 않고 active=false 로만 표시 — 같은 필터 재선택 시 이력 활용
      if (frozen) frozenOrderRef.current = { ...frozen, active: false }
      // 배지 순서는 필터 해제 시 초기화 — 재선택 시 완료 캐릭터가 뒤로 재정렬되도록
      frozenBadgeOrderRef.current = null
      return activeChars
    }

    const isSameKey = frozen?.key === filterKey

    // 필터 활성 중이고 같은 키 → 동결 순서 유지 (체크해도 재정렬 안 함)
    if (isSameKey && frozen.active) {
      const charMap = new Map(activeChars.map(c => [c.id, c]))
      const frozenSet = new Set(frozen.charIds)
      const ordered = frozen.charIds.map(id => charMap.get(id)).filter(Boolean)
      activeChars.forEach(c => { if (!frozenSet.has(c.id)) ordered.push(c) })
      return ordered
    }

    // 처음 적용하거나 필터 재선택 시 새로 정렬
    const incompleteIds = new Set(raidIncompleteChars.map(({ char }) => char.id))
    // 이전에 미완료였던 캐릭터 이력 — 재선택 시 완료 그룹 내 맨 뒤로
    const prevInitialIncompleteIds = isSameKey ? frozen.initialIncompleteIds : incompleteIds
    const sorted = [...activeChars].sort((a, b) => {
      const aInc = incompleteIds.has(a.id)
      const bInc = incompleteIds.has(b.id)
      if (aInc !== bInc) return aInc ? -1 : 1
      // 둘 다 완료: 이전 필터 적용 시점에 미완료였던 캐릭터를 완료 그룹 내 맨 뒤로
      if (!aInc && !bInc) {
        const aPrevInc = prevInitialIncompleteIds.has(a.id)
        const bPrevInc = prevInitialIncompleteIds.has(b.id)
        if (aPrevInc !== bPrevInc) return aPrevInc ? 1 : -1
      }
      return 0
    })
    frozenOrderRef.current = {
      key: filterKey,
      charIds: sorted.map(c => c.id),
      // 같은 필터 재선택이면 최초 이력 유지, 새 필터면 현재 미완료를 이력으로 저장
      initialIncompleteIds: isSameKey ? frozen.initialIncompleteIds : incompleteIds,
      active: true,
    }
    return sorted
  }, [selectedRaid, activeChars, raidIncompleteChars])

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
          const raidName = RAID_MAP[raidId]?.name || raidId
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
        const raid = RAID_MAP[raidId]
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
      const allDone  = entry.gateClears.length > 0 && entry.gateClears.every(Boolean)
      const moreDone = entry.moreDone || false

      const raid     = RAID_MAP[raidId]
      const diff     = raid?.difficulties.find(d => d.key === diffKey)
      const allGates = diff ? new Array(diff.gates).fill(true) : []
      const hasMore  = diff ? calcGoldMore(diff, allGates) > 0 : false

      if (!allDone) {
        entry.gateClears = new Array(diff?.gates ?? entry.gateClears.length).fill(true)
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

    if (didFetchChars) setChars(sortChars(updatedChars))
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
    if (isLoggedIn) fetch(`/api/characters?id=${charId}`, { method: 'DELETE' }).catch(e => console.error('[deleteChar]', e))
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

  // 원정대 탭 순서 변경 — 드래그앤드랍 후 chars 전체를 새 expedition 순서 기준으로 재정렬
  const reorderExpeditions = (fromId, toId) => {
    const fromIdx = expPages.findIndex(p => p.id === fromId)
    const toIdx   = expPages.findIndex(p => p.id === toId)
    if (fromIdx === -1 || toIdx === -1 || fromIdx === toIdx) return

    const newOrder = [...expPages]
    const [moved]  = newOrder.splice(fromIdx, 1)
    newOrder.splice(toIdx, 0, moved)

    // 새 원정대 순서 기준으로 chars 재배열 (원정대 내 순서는 유지)
    const byExp = new Map()
    chars.forEach(c => {
      const id = c.expeditionId || 'unknown'
      if (!byExp.has(id)) byExp.set(id, [])
      byExp.get(id).push(c)
    })
    const reordered = []
    newOrder.forEach(p => reordered.push(...(byExp.get(p.id) || [])))
    chars.forEach(c => { if (!newOrder.some(p => p.id === c.expeditionId)) reordered.push(c) })

    saveCharOrder(reordered.map((c, i) => ({ ...c, sortOrder: i })))
  }

  // 레이드 설정 모달 확인 (금지 초과 검사 통과 후 호출)
  const handleRaidSettingsConfirm = () => {
    setShowRaidSettings(false)
  }

  // 캐릭터 정렬: 계정 등록 순서(sortOrder 최솟값) → 입력 배열 첫 등장 순서(생성일 순) → 아이템레벨 내림차순 → 이름 가나다 순
  const sortChars = (arr) => {
    // 계정별 최소 sortOrder + 첫 등장 인덱스 계산 (tmp 캐릭터는 배열 인덱스를 fallback으로 사용)
    const acctMinOrder = {}
    const acctFirstIdx = {}
    arr.forEach((c, idx) => {
      const key   = c.expeditionId || 'unknown'
      const order = c.sortOrder != null ? c.sortOrder : 1_000_000 + idx
      if (!(key in acctMinOrder) || order < acctMinOrder[key]) acctMinOrder[key] = order
      if (!(key in acctFirstIdx)) acctFirstIdx[key] = idx
    })
    return [...arr].sort((a, b) => {
      const aKey = a.expeditionId || 'unknown'
      const bKey = b.expeditionId || 'unknown'
      const acctDiff = (acctMinOrder[aKey] ?? 9_999_999) - (acctMinOrder[bKey] ?? 9_999_999)
      if (acctDiff !== 0) return acctDiff
      // sortOrder 동률 시: 입력 배열의 첫 등장 순서(= expedition 생성일 순)로 타이 브레이킹
      const idxDiff = (acctFirstIdx[aKey] ?? 9_999_999) - (acctFirstIdx[bKey] ?? 9_999_999)
      if (idxDiff !== 0) return idxDiff
      if (b.itemLevel !== a.itemLevel) return b.itemLevel - a.itemLevel
      return a.name.localeCompare(b.name, 'ko-KR')
    })
  }

  // 캐릭터 추가
  const addChars = async (newChars, apiKey, raidsByName = {}, repCharName = null, siblingNames = [], existingGoldOverrides = {}) => {
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
      // 사용자가 명시적으로 미수령 지정한 기존 캐릭터 먼저 처리
      const demoExistingRevocations = {}
      const demoUserOverriddenIds = new Set(Object.keys(existingGoldOverrides))
      demoUserOverriddenIds.forEach(charId => {
        demoExistingRevocations[charId] = (raids[charId] || []).map(e =>
          EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false }
        )
      })

      // 전체 원정대 기준 골드 재배분 — 아이템레벨 높은 순 GOLD_CHAR_LIMIT 캐릭터만 골드 수령
      let demoGoldLimitHit = false
      const demoExpIds = new Set(demoChars.filter(dc => demoRaids[dc.id]).map(dc => dc.expeditionId || 'default'))
      demoExpIds.forEach(expId => {
        const goldWanters = []
        chars.filter(c => (c.expeditionId || 'default') === expId && !demoUserOverriddenIds.has(c.id)).forEach(c => {
          if ((raids[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
            goldWanters.push({ id: c.id, itemLevel: c.itemLevel, isNew: false })
        })
        demoChars.filter(dc => (dc.expeditionId || 'default') === expId && demoRaids[dc.id]).forEach(dc => {
          if (demoRaids[dc.id].some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
            goldWanters.push({ id: dc.id, itemLevel: dc.itemLevel, isNew: true })
        })
        goldWanters.sort((a, b) => b.itemLevel - a.itemLevel)
        goldWanters.slice(GOLD_CHAR_LIMIT).forEach(c => {
          demoGoldLimitHit = true
          if (c.isNew) {
            demoRaids[c.id] = demoRaids[c.id].map(e => EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false })
          } else {
            demoExistingRevocations[c.id] = (raids[c.id] || []).map(e => EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false })
          }
        })
      })
      if (demoGoldLimitHit) setShowGoldLimitNotice(true)

      const demoCustom = {}
      demoChars.forEach(dc => {
        const existing    = customItems[dc.id] || []
        const existingSet = new Set(existing.map(it => it.name))
        const toAdd       = [getKurzanPreset(dc.itemLevel), ...AUTO_PRESETS].filter(p => !existingSet.has(p.name) && (p.name !== '할의 모래시계' || dc.itemLevel >= 1730))
        if (toAdd.length > 0)
          demoCustom[dc.id] = [
            ...toAdd.map(p => ({ id: `preset-${p.name.replace(/\s/g, '')}-${dc.id}`, ...p })),
            ...existing,
          ]
      })
      await prefetchImageUrls(collectDashboardImageUrls(demoChars, demoRaids, demoCustom))
      setChars(prev => sortChars([...prev, ...demoChars]))
      const demoRaidUpdates = { ...demoRaids, ...demoExistingRevocations }
      if (Object.keys(demoRaidUpdates).length  > 0) setRaids(prev  => ({ ...prev, ...demoRaidUpdates  }))
      if (Object.keys(demoCustom).length > 0) setCustomItems(prev => ({ ...prev, ...demoCustom }))
      return
    }

    // ── 로그인: 로딩 오버레이 표시 후 실제 저장 ───────────────────────────────
    setAddingChars(true)
    try {
      const postRes = await fetch('/api/characters', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, repCharName, characters: newChars, siblingNames }),
      })
      const postData = postRes.ok ? await postRes.json() : null

      const res = await fetch('/api/characters')
      if (!res.ok) return
      const data = await res.json()
      if (!Array.isArray(data)) return

      const newNames    = new Set(freshChars.map(c => c.name))
      const prevIds     = new Set(chars.map(c => c.id))
      // ID 기반 비교: 이름 매칭만으로는 기존 캐릭터와 구분이 안 될 수 있음
      const addedChars  = data.filter(d => !prevIds.has(d.id) && newNames.has(d.name))

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

      // EX 레이드 중복 해소: 새 캐릭터가 EX를 받으면 같은 원정대 기존 캐릭터의 EX 제거
      const exRemovals = {}
      if (!isManual) {
        addedChars.forEach(c => {
          if (!(newRaids[c.id] || []).some(e => EX_RAID_IDS.has(e.raidId))) return
          const expId = c.expeditionId || 'default'
          chars.filter(existing =>
            (existing.expeditionId || 'default') === expId &&
            (raids[existing.id] || []).some(e => EX_RAID_IDS.has(e.raidId))
          ).forEach(existing => {
            ;(raids[existing.id] || [])
              .filter(e => EX_RAID_IDS.has(e.raidId))
              .forEach(e => persistDelete(existing.id, e.raidId, e.difficulty))
            exRemovals[existing.id] = (raids[existing.id] || []).filter(e => !EX_RAID_IDS.has(e.raidId))
          })
        })
      }

      // 사용자가 명시적으로 미수령 지정한 기존 캐릭터 먼저 처리
      const existingGoldRevocations = {}
      const userOverriddenIds = new Set(Object.keys(existingGoldOverrides))
      userOverriddenIds.forEach(charId => {
        existingGoldRevocations[charId] = (raids[charId] || []).map(e =>
          EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false }
        )
      })

      // 전체 원정대 기준 골드 재배분 — 아이템레벨 높은 순 GOLD_CHAR_LIMIT 캐릭터만 골드 수령
      let goldLimitHit = false
      const expIds = new Set(addedChars.filter(c => newRaids[c.id]).map(c => c.expeditionId || 'default'))
      expIds.forEach(expId => {
        const goldWanters = []
        chars.filter(c => (c.expeditionId || 'default') === expId && !userOverriddenIds.has(c.id)).forEach(c => {
          if ((raids[c.id] || []).some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
            goldWanters.push({ id: c.id, itemLevel: c.itemLevel, isNew: false })
        })
        addedChars.filter(c => (c.expeditionId || 'default') === expId && newRaids[c.id]).forEach(c => {
          if (newRaids[c.id].some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId)))
            goldWanters.push({ id: c.id, itemLevel: c.itemLevel, isNew: true })
        })
        goldWanters.sort((a, b) => b.itemLevel - a.itemLevel)
        goldWanters.slice(GOLD_CHAR_LIMIT).forEach(c => {
          goldLimitHit = true
          if (c.isNew) {
            newRaids[c.id] = newRaids[c.id].map(e => EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false })
          } else {
            existingGoldRevocations[c.id] = (raids[c.id] || []).map(e => EX_RAID_IDS.has(e.raidId) ? e : { ...e, isGoldCheck: false })
          }
        })
      })
      if (goldLimitHit) setShowGoldLimitNotice(true)

      // 커스텀 항목 DB 저장
      const newCustom = {}
      for (const c of addedChars) {
        const existing    = customItems[c.id] || []
        const existingSet = new Set(existing.map(it => it.name))
        const toAdd       = [getKurzanPreset(c.itemLevel), ...AUTO_PRESETS].filter(p => !existingSet.has(p.name) && (p.name !== '할의 모래시계' || c.itemLevel >= 1730))
        if (toAdd.length > 0) {
          if (!isLoggedIn) {
            newCustom[c.id] = [
              ...toAdd.map(p => ({ id: `preset-${p.name.replace(/\s/g, '')}-${c.id}`, ...p })),
              ...existing,
            ]
          } else {
            const savedItems = await Promise.all(toAdd.map((p, i) =>
              fetch('/api/custom-items', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ characterId: c.id, name: p.name, type: p.type, image: p.image, sortOrder: existing.length + i }),
              }).then(r => r.ok ? r.json() : null).catch(() => null)
            ))
            newCustom[c.id] = [
              ...savedItems.filter(Boolean).map(d => ({ id: d.id, name: d.name, type: d.type, image: d.image })),
              ...existing,
            ]
          }
        }
      }

      // 탭 라우팅: addedChars에서 가져오거나 POST 응답의 expeditionId를 fallback으로 사용
      const addedExpId = addedChars[0]?.expeditionId ?? postData?.expeditionId
      if (addedExpId && addedExpId !== activePageId) setActivePageId(addedExpId)

      // 레이드 DB 저장 (실제 ID 확정 후)
      await prefetchImageUrls(collectDashboardImageUrls(addedChars, newRaids, newCustom))

      Object.entries(newRaids).forEach(([charId, entries]) => {
        entries.forEach(entry => persistRaid(charId, entry))
      })
      Object.entries(existingGoldRevocations).forEach(([charId, entries]) => {
        entries.forEach(entry => {
          if (exRemovals[charId] && EX_RAID_IDS.has(entry.raidId)) return
          persistRaid(charId, entry)
        })
      })

      // 상태 일괄 업데이트
      setChars(sortChars(data))
      const allRaidUpdates = { ...newRaids, ...existingGoldRevocations }
      Object.entries(exRemovals).forEach(([charId, entriesWithoutEx]) => {
        allRaidUpdates[charId] = allRaidUpdates[charId]
          ? allRaidUpdates[charId].filter(e => !EX_RAID_IDS.has(e.raidId))
          : entriesWithoutEx
      })
      if (Object.keys(allRaidUpdates).length  > 0) setRaids(prev  => ({ ...prev, ...allRaidUpdates  }))
      if (Object.keys(newCustom).length > 0) setCustomItems(prev => ({ ...prev, ...newCustom }))
    } catch (e) { console.error('[addChars]', e) } finally {
      setAddingChars(false)
    }
  }

  // 전체 캐릭터 갱신
  const syncChars = async () => {
    if (syncing) return
    const COOLDOWN = 60_000
    try {
      const lastAt = parseInt(localStorage.getItem('myloa_last_sync_at') || '0', 10)
      const remain = Math.ceil((COOLDOWN - (Date.now() - lastAt)) / 1000)
      if (remain > 0) { setSyncCooldownSec(remain); return }
      localStorage.setItem('myloa_last_sync_at', String(Date.now()))
      setSyncCooldownSec(60)
    } catch {}
    setSyncing(true)
    try {
      const res  = await fetch('/api/characters/sync', { method: 'POST' })
      const data = await res.json()
      if (res.ok && Array.isArray(data.characters)) setChars(data.characters)
    } catch {} finally { setSyncing(false) }
  }

  // 캐릭터별 획득 골드 맵 (더보기 차감 반영)
  // 골드 수령 캐릭터(1~6번째): 골드 미수령 레이드도 더보기 시 귀속/거래 골드 차감
  // 초과 캐릭터(7번째~): 더보기 체크 GOLD_RAID_LIMIT개까지는 차감 없음, 초과분부터 차감
  const charGoldMap = useMemo(() => {
    const map = {}
    chars.forEach(char => {
      let bound = 0, trade = 0, boundTotal = 0, tradeTotal = 0
      const charRaids = raids[char.id] || []
      const isGoldChar = charRaids.some(e => e.isGoldCheck && !EX_RAID_IDS.has(e.raidId))
      let moreDoneCount = 0
      charRaids.forEach(entry => {
        const isEX = EX_RAID_IDS.has(entry.raidId)
        const raid = RAID_MAP[entry.raidId]
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        const allGates = new Array(diff.gates).fill(true)
        const moreDone = entry.moreDone || false
        const moreFrom = entry.moreFrom || 'bound'
        let shouldDeductMore = false
        if (moreDone) {
          if (isGoldChar || isEX) {
            shouldDeductMore = true
          } else {
            if (moreDoneCount >= GOLD_RAID_LIMIT) shouldDeductMore = true
            moreDoneCount++
          }
        }
        const moreDeduct = shouldDeductMore ? calcGoldMore(diff, allGates) : 0
        if (entry.isGoldCheck) {
          bound      += calcGoldBound(diff, entry.gateClears) - (shouldDeductMore && moreFrom === 'bound' ? moreDeduct : 0)
          trade      += calcGoldTrade(diff, entry.gateClears) - (shouldDeductMore && moreFrom === 'trade' ? moreDeduct : 0)
          boundTotal += calcGoldBound(diff, allGates)
          tradeTotal += calcGoldTrade(diff, allGates)
        } else {
          bound -= shouldDeductMore && moreFrom === 'bound' ? moreDeduct : 0
          trade -= shouldDeductMore && moreFrom === 'trade' ? moreDeduct : 0
        }
      })
      map[char.id] = { bound, trade, boundTotal, tradeTotal, isGoldChar }
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

  // remainFilter 적용 — 미완료 레이드 행만 남김 (스냅샷 기준으로 필터링 — 체크해도 즉시 사라지지 않음)
  const filteredRaidRows = useMemo(() => {
    if (!remainFilter) return raidRows
    const frozen = frozenRemainRaidsRef.current
    if (!frozen) return raidRows
    // 스냅샷에 포함된 raidId 집합
    const frozenRaidIds = new Set()
    frozen.forEach(key => { const [, raidId] = key.split(':'); frozenRaidIds.add(raidId) })
    return raidRows.filter(row => frozenRaidIds.has(row.raidId))
  }, [raidRows, remainFilter])

  // 요약 통계 — activeChars 기준 (계정 탭에 따라 필터링)
  const { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount, allCompletedCount, allTotalCount } = useMemo(() => {
    const activeIds = new Set(activeChars.map(c => c.id))
    let earnedBound = 0, earnedTrade = 0
    Object.entries(charGoldMap).forEach(([id, { bound, trade }]) => {
      if (activeIds.has(id)) { earnedBound += bound; earnedTrade += trade }
    })
    let totalBound = 0, totalTrade = 0, completedCount = 0, totalCount = 0
    let allCompletedCount = 0, allTotalCount = 0
    Object.entries(raids).forEach(([charId, list]) => {
      if (!activeIds.has(charId)) return
      list.forEach(entry => {
        const raid = RAID_MAP[entry.raidId]
        const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
        if (!diff) return
        allTotalCount++
        if (entry.gateClears.length > 0 && entry.gateClears.every(Boolean)) allCompletedCount++
        if (!entry.isGoldCheck) return
        const allGates = new Array(diff.gates).fill(true)
        totalBound += calcGoldBound(diff, allGates)
        totalTrade += calcGoldTrade(diff, allGates)
        totalCount++
        if (entry.gateClears.length > 0 && entry.gateClears.every(Boolean)) completedCount++
      })
    })
    return { earnedBound, earnedTrade, totalBound, totalTrade, completedCount, totalCount, allCompletedCount, allTotalCount }
  }, [charGoldMap, raids, activeChars])

  // 전체 레이드 100% 달성 시 폭죽 트리거 (처음 완료되는 순간에만, 마운트 시 스킵)
  useEffect(() => {
    const isComplete = allTotalCount > 0 && allCompletedCount === allTotalCount
    if (!confettiInitRef.current) {
      confettiInitRef.current = true
      wasCompleteRef.current = isComplete
      return
    }
    if (isComplete && !wasCompleteRef.current) {
      setShowConfetti(true)
      setTimeout(() => setShowConfetti(false), 4000)
    }
    wasCompleteRef.current = isComplete
  }, [allCompletedCount, allTotalCount])

  // 골드 레이드 100% 달성 시 골드 폭죽 트리거 (두 바 모드일 때만, 마운트 시 스킵)
  useEffect(() => {
    const isTwoBarMode = allTotalCount > totalCount
    const isGoldComplete = isTwoBarMode && totalCount > 0 && completedCount === totalCount
    if (!goldConfettiInitRef.current) {
      goldConfettiInitRef.current = true
      wasGoldCompleteRef.current = isGoldComplete
      return
    }
    if (isGoldComplete && !wasGoldCompleteRef.current) {
      setShowGoldConfetti(true)
      setTimeout(() => setShowGoldConfetti(false), 4000)
    }
    wasGoldCompleteRef.current = isGoldComplete
  }, [completedCount, totalCount, allTotalCount])

  return (
    <>
      {/* ── 캐릭터 추가 로딩 오버레이 ── */}
      {addingChars && (
        <>
          <style>{`
            @keyframes bar-wave-add {
              0%, 100% { transform: scaleY(0.3); opacity: 0.4; }
              50%       { transform: scaleY(1);   opacity: 1;   }
            }
          `}</style>
          <div className="fixed z-[200] flex items-center justify-center bg-white/70 dark:bg-[#181818]/80 backdrop-blur-[2px]"
            style={{ top: 0, left: 0, right: 0, bottom: 0 }}>
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-end gap-1.5" style={{ height: 28 }}>
                {[0, 0.15, 0.3, 0.15, 0].map((delay, i) => (
                  <div
                    key={i}
                    style={{
                      width: 4, height: '100%', borderRadius: 9999,
                      backgroundColor: 'var(--accent-bar)', transformOrigin: 'bottom',
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

      <div className="space-y-5">
      <Confetti active={showConfetti} />
      <GoldConfetti active={showGoldConfetti} />

      {/* ── 데모 모드 안내 배너 ── */}
      {isDemo && (
        <div className="flex items-center gap-3 rounded-lg shadow-border-md bg-white dark:bg-[#222222] px-3.5 py-2.5 text-xs">
          <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--accent-400)]" />
          <span className="text-gray-500 dark:text-gray-400">
            <span className="ns-bold text-gray-700 dark:text-gray-200">미리보기 모드</span>
            {' '}· 샘플 데이터가 표시되고 있어요. 체크 상태는 저장되지 않아요.
          </span>
          <button
            onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
            className="ml-auto flex-shrink-0 flex items-center gap-1 ns-bold text-[var(--accent-500)] hover:text-[var(--accent-600)] transition-colors"
          >
            로그인하기 →
          </button>
        </div>
      )}

      {/* ── 헤더 ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2">
        <div className="min-w-0 flex-1 overflow-hidden">
          {/* 원정대 페이지 탭 */}
          <div className="relative flex items-end gap-0.5 overflow-x-auto scrollbar-thin flex-nowrap pb-px pt-2">
            {/* 하단 구분선 */}
            <span className="absolute bottom-0 left-0 right-0 h-px bg-gray-200 dark:bg-[#2a2a2a] pointer-events-none" />
            {/* 전체보기 탭 */}
            <button
              onClick={() => { setActivePageId(null); setEditingPageId(null) }}
              className={`relative flex-shrink-0 flex items-center gap-1.5 px-4 py-2 text-xs ns-bold transition-all duration-200 whitespace-nowrap rounded-t-lg ${
                activePageId === null
                  ? 'text-[var(--accent-600)] dark:text-[var(--accent-300)] bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--accent-400)] after:rounded-t-full'
                  : 'text-gray-400 dark:text-gray-500 hover:text-[var(--accent-500)] dark:hover:text-[var(--accent-300)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/10'
              }`}
            >
              전체
            </button>
            {expPages.map(page => {
              const isActive   = page.id === activePageId
              const isDragging = dragExpId === page.id
              const isDragOver = dropExpId === page.id && dragExpId !== page.id
              return (
                <div
                  key={page.id}
                  draggable={expPages.length > 1}
                  onDragStart={e => {
                    setDragExpId(page.id)
                    e.dataTransfer.effectAllowed = 'move'
                    e.dataTransfer.setData('text/plain', page.id)
                  }}
                  onDragOver={e => {
                    e.preventDefault()
                    e.dataTransfer.dropEffect = 'move'
                    if (page.id !== dropExpId) setDropExpId(page.id)
                  }}
                  onDrop={e => {
                    e.preventDefault()
                    if (dragExpId && dragExpId !== page.id) reorderExpeditions(dragExpId, page.id)
                    setDragExpId(null); setDropExpId(null)
                  }}
                  onDragEnd={() => { setDragExpId(null); setDropExpId(null) }}
                  className={`group/tab relative flex-shrink-0 transition-all duration-150 ${isDragging ? 'opacity-20 scale-95' : ''}`}
                >
                  {/* 드롭 위치 인디케이터 */}
                  {isDragOver && (
                    <span className="absolute -left-px top-2 bottom-0 w-0.5 rounded-full bg-[var(--accent-400)] pointer-events-none z-10" />
                  )}
                  {editingPageId === page.id ? (
                    <input
                      autoFocus
                      value={editingPageName}
                      onChange={e => setEditingPageName(e.target.value.replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/g, ''))}
                      onBlur={savePageName}
                      onKeyDown={e => {
                        if (e.key === 'Enter') { e.preventDefault(); savePageName() }
                        if (e.key === 'Escape') { setEditingPageId(null); setEditingPageName('') }
                      }}
                      maxLength={12}
                      className="px-3 py-2 rounded-t-lg text-xs ns-bold bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20 text-[var(--accent-600)] dark:text-[var(--accent-300)] outline-none w-24 border-b-2 border-[var(--accent-400)]"
                    />
                  ) : (
                    <button
                      onClick={() => { setActivePageId(page.id); setEditingPageId(null) }}
                      className={`relative flex items-center gap-1.5 px-4 py-2 text-xs ns-bold transition-all duration-200 rounded-t-lg whitespace-nowrap ${
                        isActive
                          ? 'text-[var(--accent-600)] dark:text-[var(--accent-300)] bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[var(--accent-400)] after:rounded-t-full'
                          : 'text-gray-400 dark:text-gray-500 hover:text-[var(--accent-500)] dark:hover:text-[var(--accent-300)] hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/10'
                      } ${isDragOver ? 'translate-x-1' : ''}`}
                    >
                      <span>{page.name}</span>
                      {isActive && (
                        <span
                          onClick={e => { e.stopPropagation(); setEditingPageId(page.id); setEditingPageName(page.name) }}
                          className="flex-shrink-0 opacity-50 hover:opacity-100 transition-opacity cursor-pointer"
                          title="이름 편집"
                        >
                          <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                      className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-100 dark:bg-red-900/40 text-red-400 dark:text-red-400 hover:bg-red-300 dark:hover:bg-red-500/70 hover:text-red-600 dark:hover:text-red-200 flex items-center justify-center transition-colors opacity-0 group-hover/tab:opacity-100 z-10"
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
        </div>
        <div className="flex items-center gap-2 sm:flex-shrink-0">
          {/* 숙제 설정 */}
          <button onClick={() => setShowRaidSettings(true)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1e1e1e] px-3.5 py-2 sm:py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#444] active:scale-95 transition-all whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18"/>
            </svg>
            숙제 설정
          </button>
          {/* 캐릭터 설정 — 보조 액션: 중립 */}
          <button onClick={() => setShowCharEdit(true)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1e1e1e] px-3.5 py-2 sm:py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#444] active:scale-95 transition-all whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
            </svg>
            캐릭터 설정
          </button>
          {/* 캐릭터 갱신 — 보조 액션: 중립 */}
          <button
            onClick={() => isLoggedIn ? (chars.length === 0 ? setShowNoChar(true) : syncChars()) : setShowLoginGuide(true)}
            disabled={isLoggedIn && (syncing || syncCooldownSec > 0)}
            className="flex flex-1 sm:flex-none items-center justify-center gap-1.5 rounded-xl border border-gray-200 dark:border-[#333] bg-white dark:bg-[#1e1e1e] px-3.5 py-2 sm:py-1.5 text-xs ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] hover:border-gray-300 dark:hover:border-[#444] disabled:opacity-50 disabled:cursor-not-allowed active:scale-95 transition-all whitespace-nowrap shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]">
            <span className={isLoggedIn && syncing ? 'animate-spin' : ''}><IconRefresh /></span>
            {isLoggedIn && syncing ? '갱신 중…' : '캐릭터 갱신'}
          </button>
        </div>
      </div>

      {/* ── 요약 카드 + 광고 배너 ── */}
      <div className="flex items-stretch gap-3 sm:mt-1">
      <div className="grid grid-cols-1 gap-2 w-full md:grid-cols-3 md:gap-3 md:max-w-[50%]">
        {/* 원정대 캐릭터 */}
        <div className="relative rounded-xl shadow-border bg-white dark:bg-[#222222] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.35)] px-4 pt-4 pb-3.5 flex flex-col min-h-[88px] md:min-h-0 overflow-hidden">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent-400)] opacity-70" />
          {isLoggedIn && activeChars.length === 0 && (
            <div className="flex flex-col items-center justify-center h-full gap-1.5 py-2">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600">
                <circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/>
              </svg>
              <p className="text-[11px] ns-bold text-gray-400 dark:text-gray-500">캐릭터를 설정해주세요</p>
              <p className="text-[10px] text-gray-300 dark:text-gray-600 text-center leading-relaxed">상단 캐릭터 설정 버튼으로<br/>원정대를 추가하세요</p>
            </div>
          )}
          {activeChars.length > 0 && (() => {
            const repChar = activeChars.find(c => c.id === repCharId)
              || activeChars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b)
            return (
              <div className="flex items-start gap-2.5 flex-1">
                <div className="mt-0.5 p-1.5 rounded-lg bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/25 text-[var(--accent-500)] flex-shrink-0">
                  <IconCrown />
                </div>
                {repChar ? (
                  <div className="min-w-0 flex-1 flex flex-col justify-between h-full">
                    <div>
                      <p className="text-[13px] min-[1920px]:text-sm ns-bold text-gray-900 dark:text-gray-100 truncate leading-tight">{repChar.name}</p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{repChar.class}</p>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        {repChar.itemLevel != null && (
                          <span className="flex items-center gap-0.5">
                            <span className="flex items-center justify-center text-gray-400 dark:text-gray-500"><IconItemLevel /></span>
                            <span className="text-[11px] min-[1920px]:text-xs ns-bold text-gray-700 dark:text-gray-200">{repChar.itemLevel.toFixed(2)}</span>
                          </span>
                        )}
                        {repChar.combatPower != null && (
                          <span className="flex items-center gap-0.5">
                            <Image src="/combat-power.svg" alt="" width={10} height={10} unoptimized className="w-[10px] h-[10px] object-contain flex-shrink-0" />
                            <span className="text-[11px] min-[1920px]:text-xs text-gray-600 dark:text-gray-300">{Math.round(repChar.combatPower).toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mt-auto pt-2.5 flex items-center gap-1.5">
                      <span className="text-[10px] text-gray-400 dark:text-gray-500">{activePageId === null ? '전체 캐릭터' : '원정대 캐릭터'}</span>
                      <span className="w-px h-2.5 bg-gray-200 dark:bg-[#3a3a3a] flex-shrink-0" />
                      <span className="text-[11px] ns-bold text-gray-700 dark:text-gray-200">{activeChars.length}개</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-gray-400 dark:text-gray-500">미설정</p>
                )}
              </div>
            )
          })()}
        </div>

        {/* 이번 주 획득 골드 */}
        <div className="relative rounded-xl shadow-border bg-white dark:bg-[#222222] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.35)] px-4 pt-4 pb-3.5 overflow-hidden flex flex-col">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent-400)] opacity-70" />
          <p className="text-[10px] min-[1920px]:text-xs ns-bold text-gray-400 dark:text-gray-500 mb-2.5 uppercase tracking-wide shrink-0">이번 주 획득</p>
          <div className="flex-1 flex flex-col justify-center gap-2.5">
            {/* 귀속 행 */}
            <div>
              <div className="flex items-center gap-1.5 mb-1 min-w-0">
                <span className="text-[10px] ns-bold px-2 py-0.5 rounded-md bg-[var(--accent-100)] dark:bg-zinc-700/50 text-[var(--accent-600)] dark:text-zinc-300 whitespace-nowrap shrink-0">귀속</span>
                <div className="flex flex-wrap items-baseline gap-x-1 ml-auto justify-end">
                  <AnimatedGold value={earnedBound} className="ns-bold text-xs min-[1920px]:text-sm text-[var(--accent-600)] dark:text-zinc-200 tabular-nums whitespace-nowrap shrink-0" />
                  <span className="text-[10px] min-[1920px]:text-xs text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap shrink-0">/ {totalBound.toLocaleString()}G</span>
                </div>
              </div>
              {totalBound > 0 && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-[var(--accent-400)] to-[var(--accent-200)] dark:from-zinc-500 dark:to-zinc-400 transition-all duration-700" style={{ width: `${Math.min((earnedBound / totalBound) * 100, 100)}%` }} />
                </div>
              )}
            </div>
            {/* 거래 행 */}
            <div>
              <div className="flex items-center gap-1.5 mb-1 min-w-0">
                <span className="text-[10px] ns-bold px-2 py-0.5 rounded-md bg-purple-50 dark:bg-zinc-700/50 text-purple-400 dark:text-zinc-300 whitespace-nowrap shrink-0">거래</span>
                <div className="flex flex-wrap items-baseline gap-x-1 ml-auto justify-end">
                  <AnimatedGold value={earnedTrade} className="ns-bold text-xs min-[1920px]:text-sm text-purple-400 dark:text-zinc-200 tabular-nums whitespace-nowrap shrink-0" />
                  <span className="text-[10px] min-[1920px]:text-xs text-gray-400 dark:text-gray-500 tabular-nums whitespace-nowrap shrink-0">/ {totalTrade.toLocaleString()}G</span>
                </div>
              </div>
              {totalTrade > 0 && (
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-purple-300 to-violet-200 dark:from-zinc-500 dark:to-zinc-400 transition-all duration-700" style={{ width: `${Math.min((earnedTrade / totalTrade) * 100, 100)}%` }} />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 완료 레이드 */}
        <div className="relative rounded-xl shadow-border bg-white dark:bg-[#222222] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.05)] dark:shadow-[0_1px_3px_rgba(0,0,0,0.5),0_4px_12px_rgba(0,0,0,0.35)] px-4 pt-4 pb-3.5 overflow-hidden flex flex-col">
          <span className="absolute inset-x-0 top-0 h-[3px] bg-[var(--accent-400)] opacity-70" />
          <p className="text-[10px] min-[1920px]:text-xs ns-bold text-gray-400 dark:text-gray-500 mb-2.5 uppercase tracking-wide shrink-0">완료 레이드</p>
          {allTotalCount <= totalCount ? (
            /* 골드만 — 뱃지+카운트+퍼센트 한 줄, 바 전체 너비 */
            <div className="flex-1 flex flex-col justify-center gap-1.5">
              <div className="flex items-center gap-1.5 mb-1 min-w-0">
                <span className="text-[10px] ns-bold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-600)] dark:text-[var(--accent-400)]">골드</span>
                <div className="flex items-baseline gap-1 ml-auto shrink-0">
                  <span className="text-[10px] min-[1920px]:text-xs ns-bold text-gray-500 dark:text-gray-400 tabular-nums whitespace-nowrap">{completedCount} / {totalCount}</span>
                  <span className="text-xs min-[1920px]:text-sm ns-bold text-[var(--accent-300)] dark:text-[var(--accent-400)] tabular-nums whitespace-nowrap min-w-[2.25rem] text-right">
                    {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                  </span>
                </div>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[var(--accent-300)] to-[var(--accent-200)] transition-all duration-700"
                  style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                />
              </div>
            </div>
          ) : (
            /* 골드 + 전체 두 개 바 */
            <div className="flex-1 flex flex-col justify-center gap-2.5">
              <div>
                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                  <span className="text-[10px] ns-bold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-600)] dark:text-[var(--accent-400)]">골드</span>
                  <span className="text-[10px] min-[1920px]:text-xs ns-bold text-gray-500 dark:text-gray-400 tabular-nums ml-auto whitespace-nowrap shrink-0">{completedCount} / {totalCount}</span>
                  <span className="text-xs min-[1920px]:text-sm ns-bold text-[var(--accent-300)] dark:text-[var(--accent-400)] tabular-nums whitespace-nowrap shrink-0 min-w-[2.25rem] text-right">
                    {totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[var(--accent-300)] to-[var(--accent-200)] transition-all duration-700"
                    style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%' }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center gap-1.5 mb-1 min-w-0">
                  <span className="text-[10px] ns-bold px-2 py-0.5 rounded-md whitespace-nowrap shrink-0 bg-sky-50 dark:bg-gray-700/50 text-sky-600 dark:text-gray-400">전체</span>
                  <span className="text-[10px] min-[1920px]:text-xs ns-bold text-gray-500 dark:text-gray-400 tabular-nums ml-auto whitespace-nowrap shrink-0">{allCompletedCount} / {allTotalCount}</span>
                  <span className="text-xs min-[1920px]:text-sm ns-bold text-sky-500 dark:text-gray-400 tabular-nums whitespace-nowrap shrink-0 min-w-[2.25rem] text-right">
                    {allTotalCount > 0 ? Math.round((allCompletedCount / allTotalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="h-1.5 rounded-full bg-gray-100 dark:bg-[#2a2a2a] overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-sky-500 to-sky-300 dark:from-gray-500 dark:to-gray-400 transition-all duration-700"
                    style={{ width: allTotalCount > 0 ? `${(allCompletedCount / allTotalCount) * 100}%` : '0%' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
      {/* 노트북/데스크탑 광고 — md 이상에서 요약카드 오른쪽 빈 공간 */}
      <div className="hidden md:flex flex-1 min-w-0 overflow-hidden items-center">
        <AdSense slot="5883193399" />
      </div>
      </div>

      {/* ── 숙제 테이블 / 카드 ── */}
      <div ref={tableWrapRef} className="overflow-x-auto scrollbar-hide md:overflow-x-visible">
      {(() => {
        const COL_RAID = 160
        const COL_CHAR = 150

        const maxKorLen = Math.max(0, ...chars.map(c => [...c.name].filter(ch => /[가-힣ᄀ-ᇿ㄰-㆏]/.test(ch)).length))

        const nameSize = () => {
          if (maxKorLen <= 5) return 'text-sm'
          if (maxKorLen <= 8) return 'text-xs'
          if (maxKorLen <= 12) return 'text-[11px]'
          return 'text-[10px]'
        }
        const nameSizeMd = () => {
          if (maxKorLen <= 5) return 'md:max-[1920px]:text-[14px]'
          if (maxKorLen <= 8) return 'md:max-[1920px]:text-[12px]'
          if (maxKorLen <= 12) return 'md:max-[1920px]:text-[11px]'
          return 'md:max-[1920px]:text-[10px]'
        }
        const nameSizeXl = () => {
          if (maxKorLen <= 5) return 'min-[1920px]:text-base'
          if (maxKorLen <= 8) return 'min-[1920px]:text-[14px]'
          if (maxKorLen <= 12) return 'min-[1920px]:text-[13px]'
          return 'min-[1920px]:text-[12px]'
        }

        // ── 드래그앤드랍 순서 변경 ────────────────────────────────────────
        const saveCharOrder = async (ordered) => {
          // tmp ID(낙관적 업데이트 중)가 섞인 경우 스킵
          if (!isLoggedIn || ordered.some(c => String(c.id).startsWith('tmp-'))) return
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
            .sort((a, b) => (RAID_ORDER_MAP[a.raidId] ?? -1) - (RAID_ORDER_MAP[b.raidId] ?? -1))

          const isDark = document.documentElement.classList.contains('dark')
          const _dTheme       = document.documentElement.dataset.theme || ''
          const _accentBar    = _dTheme === 'pink' ? '#f9a8d4' : _dTheme === 'sky' ? '#7dd3fc' : isDark ? '#888888' : '#fbbf24'
          const _doneBgLight  = _dTheme === 'pink' ? 'rgba(253,242,248,0.8)' : _dTheme === 'sky' ? 'rgba(240,249,255,0.8)' : 'rgba(254,252,232,0.7)'
          const _doneBgDark   = _dTheme === 'pink' ? 'rgba(249,168,212,0.08)' : _dTheme === 'sky' ? 'rgba(125,211,252,0.08)' : 'rgba(253,224,71,0.08)'
          const _doneText     = _dTheme === 'pink' ? '#be185d' : _dTheme === 'sky' ? '#0284c7' : isDark ? '#a0a0a0' : '#d97706'
          const col    = { bg: isDark ? '#222222' : '#ffffff', hdr: isDark ? '#181818' : '#f9fafb', bdr: isDark ? '#2a2a2a' : '#f0f0f0', txt: isDark ? '#e0e0e0' : '#111827', sub: isDark ? '#888' : '#6b7280' }

          const ghost = document.createElement('div')
          ghost.setAttribute('aria-hidden', 'true')
          ghost.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:${COL_CHAR}px;background:${col.bg};border:2px solid ${_accentBar};border-radius:8px;box-shadow:0 24px 56px rgba(0,0,0,0.35),0 8px 20px rgba(0,0,0,0.2);overflow:hidden;font-family:Pretendard,sans-serif;pointer-events:none;`

          // 캐릭터 헤더
          const hdr = document.createElement('div')
          hdr.style.cssText = `background:${col.hdr};padding:8px 6px 6px;text-align:center;border-bottom:2px solid ${_accentBar};`
          hdr.innerHTML = `<div style="font-size:11px;font-weight:bold;color:${col.txt};line-height:1.4;">${char?.name || ''}</div><div style="font-size:10px;color:${col.sub};margin-top:1px;">${char?.itemLevel?.toFixed(2) || ''}</div>`
          ghost.appendChild(hdr)

          // 레이드 행
          charRaids.forEach(entry => {
            const raid   = RAID_MAP[entry.raidId]
            if (!raid) return
            const allDone = entry.gateClears.length > 0 && entry.gateClears.every(Boolean)
            const row = document.createElement('div')
            row.style.cssText = `display:flex;align-items:center;gap:6px;padding:5px 8px;border-bottom:1px solid ${col.bdr};background:${allDone ? (isDark ? _doneBgDark : _doneBgLight) : col.bg};`
            const chk = document.createElement('div')
            chk.style.cssText = `width:13px;height:13px;flex-shrink:0;border-radius:3px;border:2px solid ${allDone ? _accentBar : (isDark ? '#444' : '#d1d5db')};background:${allDone ? _accentBar : 'transparent'};`
            const lbl = document.createElement('span')
            lbl.style.cssText = `font-size:10px;color:${allDone ? _doneText : col.txt};`
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
        const renderCardView = () => {
          const cards = sortedActiveChars.map(char => {
            const charRaids = [...(raids[char.id] || [])]
              .filter(e => !HIDDEN_RAID_IDS.has(e.raidId))
              .filter(e => !selectedRaid || (e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
              .filter(e => {
                if (!remainFilter) return true
                const frozen = frozenRemainRaidsRef.current
                if (frozen) return frozen.has(`${char.id}:${e.raidId}:${e.difficulty}`)
                const isDone = e.gateClears.length > 0 && e.gateClears.every(Boolean)
                if (isDone) return false
                if (remainFilter === 'gold') return e.isGoldCheck
                return true
              })
              .sort((a, b) => (RAID_ORDER_MAP[a.raidId] ?? -1) - (RAID_ORDER_MAP[b.raidId] ?? -1))
            if ((selectedRaid || remainFilter) && charRaids.length === 0) return null

              const isDragging = dragCharId === char.id
              const isDragOver = dropCharId === char.id && dragCharId !== char.id

              const charCustomList = !selectedRaid ? (customItems[char.id] || []) : []
              // 일일 숙제: 쿠르잔·가디언 고정 순 + type==='daily' 기타
              const orderedDaily = (!selectedRaid && !remainFilter) ? orderedDailyCustomItems(charCustomList) : []
              // 주간 레이드 완료 카운트
              const raidDoneCount = charRaids.filter(e => e.gateClears.length > 0 && e.gateClears.every(Boolean)).length
              // 일일 숙제 완료 카운트
              const dailyDoneCount = orderedDaily.filter(it => !!(customChecks[char.id]?.[it.id])).length
              // 주간 숙제 항목
              const weeklyItems = (!selectedRaid && !remainFilter) ? charCustomList.filter(isWeeklyCustomItem) : []
              const weeklyDoneCount = weeklyItems.filter(it => !!(customChecks[char.id]?.[it.id])).length

              return (
                <div
                  key={char.id}
                  draggable={!isMobile}
                  onDragStart={!isMobile ? (e) => handleCharDragStart(e, char.id) : undefined}
                  onDragOver={!isMobile ? (e) => handleCharDragOver(e, char.id) : undefined}
                  onDrop={!isMobile ? (e) => handleCharDrop(e, char.id) : undefined}
                  onDragEnd={!isMobile ? handleCharDragEnd : undefined}
                  className={`relative rounded-xl border bg-white dark:bg-[#222222] overflow-hidden transition-all select-none flex flex-col ${
                    isDragging  ? 'opacity-40 border-gray-200 dark:border-[#383838] shadow-none' :
                    isDragOver  ? 'border-[var(--accent-400)] dark:border-[var(--accent-600)] ring-2 ring-[var(--accent-300)]/50 dark:ring-[var(--accent-700)]/30 shadow-[0_4px_20px_rgba(0,0,0,0.12)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.55)]' :
                                  'border-gray-200 dark:border-[#2d2d2d] shadow-[0_2px_8px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_12px_rgba(0,0,0,0.45)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.1),0_2px_6px_rgba(0,0,0,0.06)] dark:hover:shadow-[0_6px_24px_rgba(0,0,0,0.58)] hover:-translate-y-px'
                  }`}
                >
                  {/* ── 캐릭터 헤더 ── */}
                  <div className="flex items-center gap-1.5 pl-2.5 pr-1 bg-gradient-to-b from-gray-50 to-gray-50/60 dark:from-[#1e1e1e] dark:to-[#1a1a1a] border-b border-gray-200 dark:border-[#2d2d2d] h-[47px] 2xl:h-[56px] overflow-hidden">
                    {getClassIcon(char.class)
                      ? <Image src={getClassIcon(char.class)} alt={char.class} width={28} height={28} unoptimized className="class-icon w-7 h-7 2xl:w-9 2xl:h-9 object-contain flex-shrink-0" />
                      : <span className="w-7 h-7 2xl:w-9 2xl:h-9 flex items-center justify-center text-gray-400 flex-shrink-0"><IconClass /></span>
                    }
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-0.5">
                        <p className={`${nameSize()} ${nameSizeMd()} ${nameSizeXl()} ns-bold text-gray-900 dark:text-white whitespace-nowrap`}>{char.name}</p>
                        {charGoldMap[char.id]?.isGoldChar && (
                          <Image src="/icons/coin.png" alt="골드 획득 캐릭터" title="골드 획득 캐릭터" width={10} height={10} className="w-2.5 h-2.5 md:w-[13px] md:h-[13px] object-contain flex-shrink-0" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] min-[1920px]:text-[12px] text-gray-400 dark:text-gray-500">
                        <span className="flex items-center gap-0.5 flex-shrink-0 text-gray-400 dark:text-gray-500">
                          <IconItemLevel className="md:w-4 md:h-4" />
                          <span className="tabular-nums ns-bold text-gray-600 dark:text-gray-300">{char.itemLevel.toFixed(2)}</span>
                        </span>
                        {char.combatPower != null && (
                          <span className="flex items-center gap-0.5 flex-shrink-0">
                            <IconPower className="md:w-[13px] md:h-[13px]" />
                            <span className="tabular-nums">{Math.round(char.combatPower).toLocaleString()}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    {/* ⚙ 설정 버튼 */}
                    <button
                      onClick={e => { e.stopPropagation(); setRaidSettingsCharId(char.id); setShowRaidSettings(true) }}
                      title="숙제 설정"
                      className="p-1 rounded text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
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
                      className="p-1 rounded text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors flex-shrink-0 text-base leading-none"
                    >×</button>
                  </div>

                  {/* 골드 요약 */}
                  <div className="px-2.5 py-1.5 border-t border-gray-200 dark:border-[#2d2d2d] bg-gray-50/80 dark:bg-[#1c1c1c]/70">
                    <CharGoldBadges
                      bound={charGoldMap[char.id]?.bound ?? 0}
                      trade={charGoldMap[char.id]?.trade ?? 0}
                      boundTotal={charGoldMap[char.id]?.boundTotal ?? 0}
                      tradeTotal={charGoldMap[char.id]?.tradeTotal ?? 0}
                      cardMode
                    />
                  </div>

                  {/* ── 일일 숙제 섹션 ── */}
                  {orderedDaily.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-50)]/40 dark:from-[var(--accent-900)]/25 dark:to-[var(--accent-900)]/5 border-t border-[var(--accent-200)]/70 dark:border-[var(--accent-800)]/30">
                        <span className="text-[10px] md:text-[12px] ns-bold text-[var(--accent-700)] dark:text-[var(--accent-400)]">일일 숙제</span>
                        <span className="text-[10px] md:text-[12px] text-[var(--accent-500)]">({dailyDoneCount}/{orderedDaily.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-[#272727]">
                        {orderedDaily.map(item => {
                          const checked = !!(customChecks[char.id]?.[item.id])
                          const gauge   = restGauge[char.id]?.[item.id] ?? 0
                          const showRestGauge = REST_GAUGE_NAMES.has(item.name)
                          if (showRestGauge) {
                            return (
                              <div key={item.id} className={`transition-colors ${checked ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10' : ''}`}>
                                <div
                                  onClick={() => toggleCustomCheck(char.id, item.id)}
                                  className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer ${
                                    checked ? 'hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                                  }`}
                                >
                                  {item.image && <Image src={item.image} alt="" width={16} height={16} className="w-[16px] h-[16px] md:w-[21px] md:h-[21px] object-contain flex-shrink-0" />}
                                  <div className="flex-1 min-w-0">
                                    <p className={`text-[10px] md:text-[12px] ns-bold truncate ${checked ? 'text-[var(--accent-700)] dark:text-[var(--accent-400)] line-through' : 'text-gray-700 dark:text-gray-200'}`}>{item.name}</p>
                                    <div className="mt-0.5">
                                      <div className="flex gap-px mb-0.5">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                          <div
                                            key={i}
                                            onClick={e => { e.stopPropagation(); setRestGaugeValue(char.id, item.id, (i + 1) * 10) }}
                                            className={`h-1.5 flex-1 cursor-pointer transition-colors ${gauge > i * 10 ? 'bg-green-400 dark:bg-green-500 hover:bg-green-300' : 'bg-gray-200 dark:bg-[#2e2e2e] hover:bg-gray-300'} ${i === 0 ? 'rounded-l-full' : ''} ${i === 9 ? 'rounded-r-full' : ''}`}
                                          />
                                        ))}
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <button type="button" onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, item.id, -10) }} disabled={gauge <= 0} className="text-[9px] md:text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors px-0.5">−</button>
                                        <span className="text-[9px] md:text-[11px] tabular-nums ns-bold text-green-500 dark:text-green-400">{gauge}</span>
                                        <button type="button" onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, item.id, 10) }} disabled={gauge >= 100} className="text-[9px] md:text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-30 transition-colors px-0.5">+</button>
                                      </div>
                                    </div>
                                  </div>
                                  <div className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                    checked ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)]' : 'border-gray-300 dark:border-[#555]'
                                  }`}>
                                    {checked && <IconCheck />}
                                  </div>
                                </div>
                              </div>
                            )
                          }
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleCustomCheck(char.id, item.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer transition-colors ${
                                checked ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              {item.image && <Image src={item.image} alt="" width={16} height={16} className="w-[16px] h-[16px] md:w-[21px] md:h-[21px] object-contain flex-shrink-0" />}
                              <p className={`flex-1 min-w-0 text-[10px] md:text-[12px] ns-bold truncate ${
                                checked ? 'text-[var(--accent-700)] dark:text-[var(--accent-400)] line-through' : 'text-gray-700 dark:text-gray-200'
                              }`}>{item.name}</p>
                              <div className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                checked ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)]' : 'border-gray-300 dark:border-[#555]'
                              }`}>
                                {checked && <IconCheck />}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* ── 주간 레이드 섹션 ── */}
                  <div className="flex-1 flex flex-col">
                    <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-50)]/40 dark:from-[var(--accent-900)]/25 dark:to-[var(--accent-900)]/5 border-t border-[var(--accent-200)]/70 dark:border-[var(--accent-800)]/30">
                      <span className="text-[10px] md:text-[12px] ns-bold text-[var(--accent-700)] dark:text-[var(--accent-400)]">주간 레이드</span>
                      <span className="text-[10px] md:text-[12px] text-[var(--accent-500)]">({raidDoneCount}/{charRaids.length})</span>
                    </div>
                    {charRaids.length === 0 ? (
                      <div className="py-3 text-center text-[10px] md:text-[12px] text-gray-300 dark:text-gray-600">레이드 미설정</div>
                    ) : (
                      <div className="divide-y divide-gray-100 dark:divide-[#272727]">
                        {charRaids.map(entry => {
                          const raid = RAID_MAP[entry.raidId]
                          const diff = raid?.difficulties.find(d => d.key === entry.difficulty)
                          if (!raid || !diff) return null
                          const allGates  = new Array(diff.gates).fill(true)
                          const allDone   = entry.gateClears.length > 0 && entry.gateClears.every(Boolean)
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
                                moreDone ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
                                : allDone ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20'
                                : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              {raid.image && <Image src={raid.image} alt={raid.name} width={16} height={16} className="w-[16px] h-[16px] md:w-[21px] md:h-[21px] object-contain flex-shrink-0" />}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-0.5">
                                  <p className={`text-[10px] md:text-[12px] ns-bold truncate ${allDone ? 'text-[var(--accent-700)] dark:text-[var(--accent-400)]' : 'text-gray-700 dark:text-gray-200'}`}>{raid.name}</p>
                                  {entry.isGoldCheck && <Image src="/icons/gold.png" alt="골드" width={10} height={10} className="w-2.5 h-2.5 md:w-[13px] md:h-[13px] object-contain flex-shrink-0" />}
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[8px] md:text-[10px] ns-bold px-1 py-px rounded leading-tight ${diffBadge}`}>{diff.label}</span>
                                  {entry.isGoldCheck && (
                                    <span className={`text-[9px] md:text-[11px] ns-bold tabular-nums ${
                                      moreDone ? 'text-[var(--accent-600)] dark:text-[var(--accent-500)]'
                                      : allDone ? 'text-[var(--accent-500)] dark:text-[var(--accent-400)]'
                                      : 'text-gray-500 dark:text-gray-400'
                                    }`}>{totalGold.toLocaleString()}G</span>
                                  )}
                                  {/* 더보기 토글 */}
                                  {moreDone && (
                                    <div className="relative group/moretip">
                                      <button
                                        onClick={e => { e.stopPropagation(); toggleMoreFrom(char.id, entry.raidId, entry.difficulty) }}
                                        className="active:scale-95 transition-transform block"
                                        style={{ WebkitTapHighlightColor: 'transparent' }}
                                      >
                                        <div className={`flex items-center rounded-full border transition-colors duration-300 ${
                                          moreFrom === 'bound'
                                            ? 'bg-[var(--accent-100)] dark:bg-zinc-700/50 border-[var(--accent-200)] dark:border-zinc-600/40'
                                            : 'bg-purple-50 dark:bg-zinc-700/50 border-purple-200 dark:border-zinc-600/40'
                                        }`} style={{ height: 17, padding: 2, gap: 2 }}>
                                          {moreFrom === 'bound' ? (
                                            <>
                                              <span className="text-[9px] ns-bold select-none leading-none pl-1.5 text-[var(--accent-600)] dark:text-zinc-300 whitespace-nowrap">귀속</span>
                                              <div className="flex-shrink-0 rounded-full bg-[var(--accent-400)] dark:bg-zinc-500 shadow" style={{ width: 13, height: 13 }} />
                                            </>
                                          ) : (
                                            <>
                                              <div className="flex-shrink-0 rounded-full bg-purple-200 dark:bg-zinc-500 shadow" style={{ width: 13, height: 13 }} />
                                              <span className="text-[9px] ns-bold select-none leading-none pr-1.5 text-purple-400 dark:text-zinc-300 whitespace-nowrap">거래</span>
                                            </>
                                          )}
                                        </div>
                                      </button>
                                      <div className={`pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-1 whitespace-nowrap rounded-lg border px-2 py-0.5 text-[8px] ns-bold shadow-md opacity-0 group-hover/moretip:opacity-100 transition-opacity z-10 ${
                                        moreFrom === 'bound'
                                          ? 'bg-[var(--accent-50)] dark:bg-zinc-800 border-[var(--accent-200)] dark:border-zinc-600/50 text-[var(--accent-600)] dark:text-zinc-300'
                                          : 'bg-purple-50 dark:bg-zinc-800 border-purple-200 dark:border-zinc-600/50 text-purple-500 dark:text-zinc-300'
                                      }`}>
                                        더보기 -{moreGold.toLocaleString()}G
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                              {/* 체크박스 — 오른쪽 */}
                              <div className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                moreDone ? 'bg-[var(--accent-500)] border-[var(--accent-500)] text-[var(--accent-900)]'
                                : allDone ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)]'
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
                      <div className="flex items-center gap-1 px-2.5 py-1.5 bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-50)]/40 dark:from-[var(--accent-900)]/25 dark:to-[var(--accent-900)]/5 border-t border-[var(--accent-200)]/70 dark:border-[var(--accent-800)]/30">
                        <span className="text-[10px] md:text-[12px] ns-bold text-[var(--accent-700)] dark:text-[var(--accent-400)]">주간 숙제</span>
                        <span className="text-[10px] md:text-[12px] text-[var(--accent-500)]">({weeklyDoneCount}/{weeklyItems.length})</span>
                      </div>
                      <div className="divide-y divide-gray-100 dark:divide-[#272727]">
                        {weeklyItems.map(item => {
                          const checked = !!(customChecks[char.id]?.[item.id])
                          return (
                            <div
                              key={item.id}
                              onClick={() => toggleCustomCheck(char.id, item.id)}
                              className={`flex items-center gap-1.5 px-2.5 py-1.5 cursor-pointer transition-colors ${
                                checked ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                              }`}
                            >
                              {item.image && <Image src={item.image} alt="" width={16} height={16} className="w-[16px] h-[16px] md:w-[21px] md:h-[21px] object-contain flex-shrink-0" />}
                              <p className={`flex-1 min-w-0 text-[10px] md:text-[12px] ns-bold truncate ${
                                checked ? 'text-[var(--accent-700)] dark:text-[var(--accent-400)] line-through' : 'text-gray-700 dark:text-gray-200'
                              }`}>{item.name}</p>
                              <div className={`h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0 rounded border-2 flex items-center justify-center transition-all ${
                                checked ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)]' : 'border-gray-300 dark:border-[#555]'
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
            })
          const hasVisible = cards.some(c => c !== null)
          if (!hasVisible && (selectedRaid || remainFilter)) {
            const filterLabel = selectedRaid
              ? `'${RAID_MAP[selectedRaid.raidId]?.name ?? selectedRaid.raidId}' 레이드`
              : remainFilter === 'gold' ? '미완료 골드 레이드' : '미완료 레이드'
            return (
              <div className="flex flex-col items-center justify-center py-20">
                <p className="text-base text-gray-400 dark:text-gray-500">선택한 필터의 레이드를 모두 완료했어요 😊🎉</p>
              </div>
            )
          }
          return (
            <div className="grid grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-3 2xl:gap-4">
              {cards}
            </div>
          )
        }

        // ── 테이블 뷰 ────────────────────────────────────────────────────────
        const renderCustomRow = (name, charMap, meta, chars, compact = false, colW = null, isDaily = false) => {
          const rw = colW?.raid ?? COL_RAID
          const cw = colW?.char ?? COL_CHAR
          const stretch = colW?.stretch ?? false
          const charCellStyle = stretch
            ? { width: cw, minWidth: 0, overflow: 'hidden' }
            : { width: cw, maxWidth: cw, overflow: 'hidden' }
          return (
          <tr key={name} className={compact
            ? 'group border-b border-gray-100 dark:border-[#2a2a2a]'
            : 'group/row transition-colors border-b border-gray-200/70 dark:border-white/[0.09] hover:bg-gray-50/90 dark:hover:bg-white/[0.03]'
          }>
            <td style={{ width: rw, minWidth: stretch ? 0 : COL_RAID }} className={compact
              ? 'sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-100 dark:border-[#2a2a2a] px-2 py-2'
              : 'sticky left-0 z-10 bg-white group-hover/row:bg-gray-50/90 dark:bg-[#222222] dark:group-hover/row:bg-white/[0.03] border-r border-gray-200/70 dark:border-white/[0.10] px-2.5 py-2 shadow-[3px_0_12px_-6px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_12px_-6px_rgba(0,0,0,0.45)]'
            }>
              <div className="flex items-center gap-1.5">
                {meta.image && <Image src={meta.image} alt="" width={18} height={18} className="w-[22px] h-[22px] object-contain flex-shrink-0" />}
                <span className={compact ? 'text-[14px] min-[1920px]:text-[14px] ns-bold text-gray-600 dark:text-gray-300 truncate' : 'text-[13px] min-[1920px]:text-[13px] ns-bold text-gray-700 dark:text-gray-200 truncate'}>{name}</span>
              </div>
            </td>
            {chars.map(char => {
              const itemId  = charMap.get(char.id)
              const checked = !!(itemId && customChecks[char.id]?.[itemId])
              const gauge   = itemId ? (restGauge[char.id]?.[itemId] ?? 0) : 0
              const isRest  = REST_GAUGE_NAMES.has(name)
              return (
                <td key={char.id} style={charCellStyle} className={compact
                  ? 'border-r border-gray-100 dark:border-[#2a2a2a] last:border-r-0 p-1 align-middle'
                  : 'border-r border-gray-200/70 dark:border-white/[0.10] last:border-r-0 p-1.5 align-middle transition-colors group-hover/row:bg-gray-50/50 dark:group-hover/row:bg-white/[0.02]'
                }>
                  {itemId ? (
                    isRest ? (
                      <div className="flex flex-col gap-0.5 min-h-[47px] justify-center">
                        <div onClick={() => toggleCustomCheck(char.id, itemId)} className={`flex items-center justify-center h-7 rounded cursor-pointer transition-colors ${checked ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'}`}>
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${checked ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)]' : 'border-gray-300 dark:border-[#555]'}`}>{checked && <IconCheck />}</div>
                        </div>
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
                            <button type="button" onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, itemId, -10) }} disabled={gauge <= 0} className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">−</button>
                            <span className="text-[10px] tabular-nums ns-bold text-green-500 dark:text-green-400">{gauge}</span>
                            <button type="button" onClick={e => { e.stopPropagation(); adjustRestGauge(char.id, itemId, 10) }} disabled={gauge >= 100} className="text-[10px] text-gray-400 hover:text-gray-600 disabled:opacity-30 transition-colors">+</button>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div
                        onClick={() => toggleCustomCheck(char.id, itemId)}
                        className={`w-full h-[47px] flex items-center justify-center rounded cursor-pointer transition-colors ${
                          checked ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10 hover:bg-[var(--accent-100)] dark:hover:bg-[var(--accent-900)]/20' : 'hover:bg-gray-50 dark:hover:bg-[#2a2a2a]'
                        }`}
                      >
                        <div className={`${isDaily ? 'h-[26px] w-[26px]' : 'h-[20px] w-[20px]'} flex-shrink-0 rounded-md border-2 flex items-center justify-center transition-all ${
                          checked ? 'bg-[var(--accent-400)] border-[var(--accent-400)] text-[var(--accent-900)] shadow-sm' : 'border-gray-200 dark:border-[#383838]'
                        }`}>
                          {checked && <IconCheck />}
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="w-full h-[47px] bg-gray-50/50 dark:bg-[#181818]/30 rounded flex items-center justify-center">
                      <span className="text-gray-200 dark:text-gray-700">—</span>
                    </div>
                  )}
                </td>
              )
            })}
          </tr>
          )
        }

        const renderTable = (charSubset, isSplit = false) => {
          const filteredChars = selectedRaid
            ? charSubset.filter(char => (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
            : charSubset

          if (filteredChars.length === 0) return null

          // 이 청크에 속한 캐릭터들이 가진 레이드 행만 표시 (remainFilter 적용)
          const chunkRaidRows = filteredRaidRows.filter(row =>
            filteredChars.some(char => (raids[char.id] || []).some(e => e.raidId === row.raidId))
          )

          // 레이드도 커스텀 항목도 없으면 빈 뼈대를 남기지 않음
          const hasCustom = filteredChars.some(c => (customItems[c.id] || []).length > 0)
          if (chunkRaidRows.length === 0 && !hasCustom) return null

          const tableNaturalWidth = COL_RAID + COL_CHAR * filteredChars.length
          const colW = { raid: COL_RAID, char: COL_CHAR, stretch: false }

          const glanceSlack = 24
          const glanceTable =
            tableContainerWidth > 0
              ? tableNaturalWidth <= tableContainerWidth + glanceSlack
              : filteredChars.length <= 8

          const colSpan = filteredChars.length + 1
          const restDailyMap = buildCustomHomeworkRowMap(filteredChars, customItems, (it) => REST_GAUGE_NAMES.has(it.name))
          // 쿠르잔 계열(혼돈의 균열·쿠르잔 전선·카오스 던전)을 한 행으로 병합 — 맨 앞 캐릭터의 이름·아이콘 대표 사용
          {
            let primaryKey = null
            const toDelete = []
            for (const [key] of restDailyMap) {
              if (KURZAN_NAMES.has(key)) {
                if (!primaryKey) primaryKey = key
                else toDelete.push(key)
              }
            }
            if (primaryKey) {
              const primary = restDailyMap.get(primaryKey)
              for (const key of toDelete) {
                restDailyMap.get(key).charMap.forEach((id, cid) => primary.charMap.set(cid, id))
                restDailyMap.delete(key)
              }
            }
          }
          const otherDailyMap = buildCustomHomeworkRowMap(
            filteredChars,
            customItems,
            (it) => it.type === 'daily' && !DAILY_PRESET_ORDER.includes(it.name)
          )
          const weeklyMap = buildCustomHomeworkRowMap(filteredChars, customItems, isWeeklyCustomItem)
          const showDailyHeader = !selectedRaid && !remainFilter && (
            DAILY_PRESET_ORDER.some((n) => restDailyMap.has(n)) || otherDailyMap.size > 0
          )
          const raidsToRender = selectedRaid
            ? chunkRaidRows.filter((row) => row.raidId === selectedRaid.raidId)
            : chunkRaidRows
          const showRaidHeader = raidsToRender.length > 0
          const showWeeklyHeader = !selectedRaid && !remainFilter && weeklyMap.size > 0
          const raidSectionTitle = selectedRaid ? '레이드 숙제' : '주간 레이드'

          const theadSticky = glanceTable
            ? 'sticky left-0 z-30 bg-gray-50 dark:bg-[#1c1c1c] border-r border-gray-200 dark:border-[#272727]'
            : 'sticky left-0 z-30 bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-[#1e1e1e] dark:to-[#1a1a1a] border-r border-gray-200/70 dark:border-white/[0.08] shadow-[2px_0_10px_-4px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_10px_-4px_rgba(0,0,0,0.45)]'

          const theadRow1 = glanceTable
            ? 'border-b border-gray-200 dark:border-[#272727] bg-gray-50 dark:bg-[#1c1c1c]'
            : 'border-b border-gray-200 dark:border-white/[0.08] bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-[#1e1e1e] dark:to-[#1a1a1a]'
          const theadRow2 = glanceTable
            ? 'border-b border-gray-200 dark:border-[#272727] bg-gray-50 dark:bg-[#1c1c1c]'
            : 'border-b border-gray-200/80 dark:border-white/[0.1] bg-gradient-to-b from-gray-50 to-gray-50/80 dark:from-[#1e1e1e] dark:to-[#1a1a1a]'
          const thCharPad = glanceTable ? 'px-2 py-2 border-r border-gray-100 dark:border-[#2a2a2a]' : 'px-2.5 py-2.5 border-r border-gray-200/55 dark:border-white/[0.06]'
          const thGoldPad = glanceTable ? 'px-2 py-1.5 border-r border-gray-100 dark:border-[#2a2a2a]' : 'px-2 py-2 border-r border-gray-200/55 dark:border-white/[0.06]'

          const wrapClass = glanceTable
            ? 'rounded-xl shadow-border bg-white dark:bg-[#222222] shadow-[0_1px_3px_rgba(0,0,0,0.05),0_4px_12px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_10px_rgba(0,0,0,0.45)] overflow-hidden'
            : 'rounded-xl shadow-border bg-white dark:bg-[#222222] shadow-[0_2px_12px_rgba(0,0,0,0.08),0_1px_3px_rgba(0,0,0,0.05)] dark:shadow-[0_2px_16px_rgba(0,0,0,0.5)] overflow-hidden'

          const renderSectionHeader = (id, label) => (
            <tr key={`sec-${id}`} className="pointer-events-none">
              <td
                colSpan={colSpan}
                className="sticky left-0 z-20 border-y border-[var(--accent-200)]/70 dark:border-[var(--accent-800)]/30 bg-gradient-to-r from-[var(--accent-50)] to-[var(--accent-50)]/40 dark:from-[var(--accent-900)]/20 dark:to-[var(--accent-900)]/5 px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-block w-[3px] h-3.5 shrink-0 rounded-full bg-[var(--accent-400)] shadow-[0_0_4px_var(--accent-glow)]" aria-hidden />
                  <span className="text-[11px] min-[1920px]:text-[11px] ns-bold text-[var(--accent-800)] tracking-tight">{label}</span>
                </div>
              </td>
            </tr>
          )

          return (
          <div
            className={wrapClass}
            style={isSplit ? { width: tableNaturalWidth } : { width: 'fit-content', maxWidth: '100%' }}
          >
            <div>
              <table className="border-collapse w-full text-left" style={{ tableLayout: 'fixed', width: COL_RAID + COL_CHAR * filteredChars.length }}>
                <thead>
                  {/* 1행: 캐릭터 이름 + 스탯 */}
                  <tr className={theadRow1}>
                    <th style={{ width: colW.raid, minWidth: colW.stretch ? 0 : COL_RAID }} className={`${theadSticky} ${glanceTable ? '' : 'align-middle px-2 py-2'}`}>
                      {!glanceTable && (
                        <span className="block text-center text-[10px] ns-bold tracking-tight text-gray-400 dark:text-gray-500">항목</span>
                      )}
                    </th>
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
                          style={{ width: colW.char, maxWidth: colW.stretch ? undefined : COL_CHAR, minWidth: 0, overflow: 'hidden' }}
                          className={`${thCharPad} last:border-r-0 align-top select-none cursor-default transition-colors ${
                            isDragging ? 'bg-[var(--accent-100)]/80 dark:bg-[var(--accent-900)]/25' :
                            isDragOver ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10' :
                            dragCharId ? 'opacity-50' : ''
                          }`}
                        >
                          <div className={`flex flex-col items-center w-full overflow-hidden ${glanceTable ? 'gap-0.5' : 'gap-1'}`}>
                            {getClassIcon(char.class)
                              ? <Image src={getClassIcon(char.class)} alt={char.class} width={20} height={20} unoptimized className="class-icon w-5 h-5 object-contain flex-shrink-0" />
                              : <span className="w-5 h-5 flex items-center justify-center text-gray-400 dark:text-gray-500 flex-shrink-0"><IconClass /></span>
                            }
                            <div className="flex items-center gap-0.5 w-full justify-center overflow-hidden">
                              <span className={`${nameSize()} ns-bold text-gray-800 dark:text-gray-100 leading-tight text-center truncate`}>{char.name}</span>
                              {charGoldMap[char.id]?.isGoldChar && (
                                <Image src="/icons/coin.png" alt="골드 획득 캐릭터" title="골드 획득 캐릭터" width={8} height={8} className="w-[10px] h-[10px] object-contain flex-shrink-0" />
                              )}
                            </div>
                            <div className="flex flex-col items-start gap-0.5">
                              <div className="flex items-center gap-1">
                                <span className="flex items-center justify-center flex-shrink-0 text-gray-400 dark:text-gray-500"><IconItemLevel /></span>
                                <span className="text-[10px] min-[1920px]:text-[12px] ns-bold text-gray-700 dark:text-gray-200">{char.itemLevel.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Image src="/combat-power.svg" alt="전투력" width={11} height={11} unoptimized className="w-[11px] h-[11px] object-contain flex-shrink-0" />
                                <span className="text-[10px] min-[1920px]:text-[12px] text-gray-600 dark:text-gray-300">
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
                  <tr className={theadRow2}>
                    <th style={{ width: colW.raid, minWidth: colW.stretch ? 0 : COL_RAID }} className={`${theadSticky} ${glanceTable ? 'px-2 py-1.5' : 'px-2 py-2'}`}>
                      {!glanceTable && (
                        <span className="block text-center text-[9px] ns-bold tracking-tight text-gray-400/90 dark:text-gray-500 uppercase">골드</span>
                      )}
                    </th>
                    {filteredChars.map(char => (
                      <th
                        key={char.id}
                        onDragOver={(e) => handleCharDragOver(e, char.id)}
                        onDrop={(e) => handleCharDrop(e, char.id)}
                        style={{ width: colW.char, maxWidth: colW.stretch ? undefined : COL_CHAR, minWidth: 0, overflow: 'hidden' }}
                        className={`${thGoldPad} last:border-r-0 transition-colors ${
                          dragCharId === char.id     ? 'bg-[var(--accent-100)]/70 dark:bg-[var(--accent-900)]/20' :
                          dropCharId === char.id     ? 'bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/10' :
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
                <tbody>
                  {showDailyHeader && renderSectionHeader('daily', '일일 숙제')}
                  {!selectedRaid && !remainFilter && DAILY_PRESET_ORDER.flatMap((name) => {
                    const row = restDailyMap.get(name)
                    if (!row) return []
                    return [renderCustomRow(name, row.charMap, row.meta, filteredChars, glanceTable, colW, true)]
                  })}
                  {!selectedRaid && !remainFilter && [...otherDailyMap.keys()]
                    .sort((a, b) => a.localeCompare(b, 'ko'))
                    .map((name) => {
                      const { charMap, meta } = otherDailyMap.get(name)
                      return renderCustomRow(name, charMap, meta, filteredChars, glanceTable, colW, true)
                    })}
                  {showRaidHeader && renderSectionHeader('raid', raidSectionTitle)}
                  {raidsToRender.map(row => {
                    const raidData = RAID_MAP[row.raidId]
                    return (
                      <tr key={row.key} className={glanceTable ? 'group border-b border-gray-200 dark:border-[#2d2d2d]' : 'group/row transition-colors border-b border-gray-200 dark:border-[#2d2d2d] hover:bg-gray-50/70 dark:hover:bg-white/[0.04]'}>
                        <td style={{ width: colW.raid, minWidth: colW.stretch ? 0 : COL_RAID }} className={glanceTable
                          ? 'sticky left-0 z-10 bg-white dark:bg-[#222222] border-r border-gray-200 dark:border-[#2d2d2d] px-2 py-1.5'
                          : 'sticky left-0 z-10 bg-white group-hover/row:bg-gray-50/70 dark:bg-[#222222] dark:group-hover/row:bg-white/[0.04] border-r border-gray-200 dark:border-[#2d2d2d] px-2.5 py-2 shadow-[3px_0_12px_-6px_rgba(0,0,0,0.08)] dark:shadow-[3px_0_12px_-6px_rgba(0,0,0,0.45)]'
                        }>
                          <div className="flex items-center gap-1.5">
                            {raidData?.image && (
                              <Image src={raidData.image} alt={row.raidName} width={18} height={18} className="w-[22px] h-[22px] object-contain flex-shrink-0" />
                            )}
                            <span className={`ns-bold text-gray-900 dark:text-white truncate ${glanceTable ? 'text-[14px] min-[1920px]:text-[14px]' : 'text-[13px] min-[1920px]:text-[13px]'}`}>{row.raidName}</span>
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
                              style={{ width: colW.char, maxWidth: colW.stretch ? undefined : COL_CHAR, minWidth: 0, overflow: 'hidden' }}
                              className={`${glanceTable ? 'border-r border-gray-200 dark:border-[#2d2d2d] last:border-r-0 p-1' : 'border-r border-gray-200 dark:border-[#2d2d2d] last:border-r-0 p-1.5 group-hover/row:bg-gray-50/50 dark:group-hover/row:bg-white/[0.03]'} transition-colors ${
                                dragCharId === char.id ? 'bg-[var(--accent-100)]/50 dark:bg-[var(--accent-900)]/15' :
                                dropCharId === char.id ? 'bg-[var(--accent-50)]/70 dark:bg-[var(--accent-900)]/8' :
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
                      <td colSpan={colSpan} className="py-16 text-center border-b border-gray-200/70 dark:border-white/[0.09]">
                        <p className="text-gray-400 dark:text-gray-600 text-sm mb-2">표시할 레이드가 없습니다</p>
                        <p className="text-xs text-gray-300 dark:text-gray-700">캐릭터를 추가하여 숙제를 관리해보세요!</p>
                      </td>
                    </tr>
                  )}
                  {showWeeklyHeader && renderSectionHeader('weekly', '주간 숙제')}
                  {!selectedRaid && !remainFilter && [...weeklyMap.keys()]
                    .sort((a, b) => a.localeCompare(b, 'ko'))
                    .map((name) => {
                      const { charMap, meta } = weeklyMap.get(name)
                      return renderCustomRow(name, charMap, meta, filteredChars, glanceTable, colW)
                    })}
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
              <div className={`rounded-xl border transition-all duration-200 overflow-hidden ${selectedRaid ? 'border-[var(--accent-400)]/50 shadow-[0_0_0_1px_var(--accent-400)]/10' : 'border-gray-200 dark:border-[#2e2e2e]'} bg-white dark:bg-[#1e1e1e]`}>
                {/* 레이드 버튼 행 */}
                {(() => {
                  const diffStyle = (diffKey, isActive) => {
                    const base = 'transition-all duration-150 whitespace-nowrap cursor-pointer select-none'
                    if (isActive) {
                      return diffKey === 'nightmare' || diffKey === 'stage3' ? `${base} bg-violet-200 dark:bg-violet-800/60 text-violet-700 dark:text-violet-200` :
                             diffKey === 'hard'      || diffKey === 'stage2' ? `${base} bg-rose-200 dark:bg-rose-800/60 text-rose-700 dark:text-rose-200` :
                                                                               `${base} bg-sky-200 dark:bg-sky-800/60 text-sky-700 dark:text-sky-200`
                    }
                    return diffKey === 'nightmare' || diffKey === 'stage3' ? `${base} text-violet-500 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30` :
                           diffKey === 'hard'      || diffKey === 'stage2' ? `${base} text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30` :
                                                                             `${base} text-sky-500 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30`
                  }
                  const incompleteColor = (diffKey) =>
                    diffKey === 'nightmare' || diffKey === 'stage3' ? 'bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-300' :
                    diffKey === 'hard'      || diffKey === 'stage2' ? 'bg-rose-100 dark:bg-rose-900/40 text-rose-600 dark:text-rose-300' :
                                                                      'bg-sky-100 dark:bg-sky-900/40 text-sky-600 dark:text-sky-300'
                  const DIFF_PRIORITY = { nightmare: 0, hard: 1, stage3: 2, stage2: 3, stage1: 4, normal: 5 }
                  const raidGroups = allRegisteredRaids.reduce((acc, r) => {
                    const g = acc.find(x => x.raidId === r.raidId)
                    if (g) g.diffs.push(r)
                    else acc.push({ raidId: r.raidId, raidName: r.raidName, diffs: [r] })
                    return acc
                  }, [])
                  raidGroups.forEach(g => g.diffs.sort((a, b) => (DIFF_PRIORITY[a.diffKey] ?? 99) - (DIFF_PRIORITY[b.diffKey] ?? 99)))
                  return (
                    <div className="flex flex-col px-2.5 py-2 gap-1.5">
                      {/* 첫 번째 줄 — 미완료 필터 버튼 */}
                      <div className="flex items-center flex-wrap gap-y-1.5">
                        <div className="flex items-center gap-1 pr-2.5 mr-0.5 border-r border-gray-100 dark:border-[#2e2e2e] self-center flex-shrink-0">
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 dark:text-gray-600 flex-shrink-0">
                            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
                          </svg>
                          <span className="text-[10px] min-[1920px]:text-[12px] text-gray-300 dark:text-gray-600 ns-bold tracking-wide whitespace-nowrap">필터</span>
                        </div>
                        <button
                          onClick={() => {
                            const next = remainFilter === 'gold' ? null : 'gold'
                            if (next) {
                              const activeIds = new Set(activeChars.map(c => c.id))
                              const keys = new Set()
                              Object.entries(raids).forEach(([charId, list]) => {
                                if (!activeIds.has(charId)) return
                                list.forEach(e => {
                                  const isDone = e.gateClears.length > 0 && e.gateClears.every(Boolean)
                                  if (isDone) return
                                  if (!e.isGoldCheck) return
                                  keys.add(`${charId}:${e.raidId}:${e.difficulty}`)
                                })
                              })
                              frozenRemainRaidsRef.current = keys
                            } else {
                              frozenRemainRaidsRef.current = null
                            }
                            setRemainFilter(next)
                          }}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] min-[1920px]:text-[13px] transition-all duration-150 whitespace-nowrap cursor-pointer select-none mr-1 ${
                            remainFilter === 'gold'
                              ? 'bg-[var(--accent-200)] dark:bg-[var(--accent-800)]/60 text-[var(--accent-700)] dark:text-[var(--accent-200)]'
                              : 'text-[var(--accent-600)] dark:text-[var(--accent-300)] hover:bg-[var(--accent-50)] dark:hover:bg-[var(--accent-950)]/30'
                          }`}
                        >미완료 골드</button>
                        <button
                          onClick={() => {
                            const next = remainFilter === 'all' ? null : 'all'
                            if (next) {
                              const activeIds = new Set(activeChars.map(c => c.id))
                              const keys = new Set()
                              Object.entries(raids).forEach(([charId, list]) => {
                                if (!activeIds.has(charId)) return
                                list.forEach(e => {
                                  const isDone = e.gateClears.length > 0 && e.gateClears.every(Boolean)
                                  if (isDone) return
                                  keys.add(`${charId}:${e.raidId}:${e.difficulty}`)
                                })
                              })
                              frozenRemainRaidsRef.current = keys
                            } else {
                              frozenRemainRaidsRef.current = null
                            }
                            setRemainFilter(next)
                          }}
                          className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] min-[1920px]:text-[13px] transition-all duration-150 whitespace-nowrap cursor-pointer select-none ${
                            remainFilter === 'all'
                              ? 'bg-blue-200 dark:bg-blue-800/60 text-blue-700 dark:text-blue-200'
                              : 'text-blue-500 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30'
                          }`}
                        >미완료 전체</button>
                      </div>
                      {/* 두 번째 줄 — 레이드 필터 버튼 */}
                      <div className="flex items-center flex-wrap gap-y-1.5">
                        {raidGroups.map((group, gi) => (
                          <div key={group.raidId} className="flex items-center flex-shrink-0">
                            {gi > 0 && <div className="w-px h-4 bg-gray-200 dark:bg-[#3a3a3a] mx-2 flex-shrink-0" />}
                            <div className="flex items-center gap-0.5">
                              <span className="text-[11px] min-[1920px]:text-[13px] text-gray-400 dark:text-gray-500 whitespace-nowrap px-1">{group.raidName}</span>
                              {group.diffs.map(r => {
                                const isActive = selectedRaid?.raidId === r.raidId && selectedRaid?.diffKey === r.diffKey
                                return (
                                  <button
                                    key={r.diffKey}
                                    onClick={() => setSelectedRaid(isActive ? null : { raidId: r.raidId, diffKey: r.diffKey })}
                                    className={`flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] min-[1920px]:text-[13px] ${diffStyle(r.diffKey, isActive)}`}
                                  >
                                    <span>{r.diffLabel}</span>
                                    {r.incomplete > 0 ? (
                                      <span className={`inline-flex items-center justify-center rounded-full min-w-[14px] h-[14px] px-0.5 text-[9px] ns-bold tabular-nums ${incompleteColor(r.diffKey)}`}>
                                        {r.incomplete}
                                      </span>
                                    ) : (
                                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" className="text-emerald-500 dark:text-emerald-400"><polyline points="20 6 9 17 4 12"/></svg>
                                    )}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )
                })()}

                {/* 선택된 레이드 캐릭터 완료 현황 */}
                {selectedRaid && (() => {
                  const incompleteIds = new Set(raidIncompleteChars.map(({ char }) => char.id))
                  const relevantChars = activeChars.filter(char =>
                    (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                  )
                  // 필터 선택 시점 배지 순서 동결 — 체크해도 재정렬 안 함, 필터 변경 시에만 재계산
                  const filterKey = `${selectedRaid.raidId}:${selectedRaid.diffKey}`
                  const frozenBadge = frozenBadgeOrderRef.current
                  let orderedChars
                  if (!frozenBadge || frozenBadge.key !== filterKey) {
                    const incomplete = relevantChars.filter(c =>  incompleteIds.has(c.id))
                    const complete   = relevantChars.filter(c => !incompleteIds.has(c.id))
                    orderedChars = [...incomplete, ...complete]
                    frozenBadgeOrderRef.current = { key: filterKey, charIds: orderedChars.map(c => c.id) }
                  } else {
                    const charMap = new Map(relevantChars.map(c => [c.id, c]))
                    orderedChars = frozenBadge.charIds.map(id => charMap.get(id)).filter(Boolean)
                    // 동결 이후 새로 추가된 캐릭터는 뒤에 추가
                    const frozenSet = new Set(frozenBadge.charIds)
                    relevantChars.forEach(c => { if (!frozenSet.has(c.id)) orderedChars.push(c) })
                  }
                  const renderBadge = (char, incomplete) => {
                    const entry      = (raids[char.id] || []).find(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey)
                    const gateClears = entry?.gateClears || []
                    const partialCount = gateClears.filter(Boolean).length
                    const isPartial  = incomplete && partialCount > 0
                    return (
                      <div key={char.id} className={`flex items-center gap-1 rounded-lg px-2 py-0.5 ${
                        incomplete
                          ? 'bg-gray-50 dark:bg-[#2a2a2a] border border-gray-200 dark:border-[#363636]'
                          : 'bg-emerald-50 dark:bg-emerald-900/15 border border-emerald-200/60 dark:border-emerald-700/25'
                      }`}>
                        {incomplete ? (
                          getClassIcon(char.class)
                            ? <Image src={getClassIcon(char.class)} alt="" width={13} height={13} unoptimized className="class-icon w-3 h-3 object-contain flex-shrink-0 opacity-70" />
                            : <span className="w-3 h-3 text-gray-300 flex-shrink-0"><IconClass /></span>
                        ) : (
                          <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-emerald-500 dark:text-emerald-400 flex-shrink-0"><polyline points="20 6 9 17 4 12"/></svg>
                        )}
                        <span className={`text-[10px] min-[1920px]:text-[12px] ns-bold ${incomplete ? 'text-gray-600 dark:text-gray-300' : 'text-emerald-600 dark:text-emerald-400'}`}>
                          {char.name}
                        </span>
                        {isPartial && (
                          <span className="text-[9px] text-gray-400 dark:text-gray-500 tabular-nums">
                            {partialCount}/{gateClears.length}
                          </span>
                        )}
                      </div>
                    )
                  }
                  const visibleChars = remainFilter
                    ? orderedChars.filter(c => incompleteIds.has(c.id))
                    : orderedChars
                  return (
                    <div className="border-t border-gray-100 dark:border-[#2a2a2a] bg-gray-50/50 dark:bg-[#191919]/60 px-2.5 py-2 flex flex-wrap gap-1.5">
                      {visibleChars.map(c => renderBadge(c, incompleteIds.has(c.id)))}
                    </div>
                  )
                })()}
              </div>
            )}

            {/* 카드 / 테이블 뷰 토글 — 캐릭터 있을 때만 */}
            {activeChars.length > 0 && <div className="hidden md:flex items-center justify-end gap-2">
              {activePageId === null && expPages.length > 1 && (
                <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-[#282828] p-0.5">
                  <button
                    onClick={() => { setAllTabSort('itemLevel'); localStorage.setItem('dashboard_allTabSort', 'itemLevel') }}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ns-bold transition-all duration-150 ${
                      allTabSort === 'itemLevel'
                        ? 'bg-[var(--accent-200)] text-[var(--accent-900)] dark:text-white shadow-sm'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-white/70 dark:hover:bg-[#222222]/70'
                    }`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 4h13M3 8h9M3 12h5"/><path d="M17 4v16m0 0-4-4m4 4 4-4"/>
                    </svg>
                    레벨순
                  </button>
                  <button
                    onClick={() => { setAllTabSort('expedition'); localStorage.setItem('dashboard_allTabSort', 'expedition') }}
                    className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ns-bold transition-all duration-150 ${
                      allTabSort === 'expedition'
                        ? 'bg-[var(--accent-200)] text-[var(--accent-900)] dark:text-white shadow-sm'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-white/70 dark:hover:bg-[#222222]/70'
                    }`}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>
                      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                    </svg>
                    원정대순
                  </button>
                </div>
              )}

              <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 dark:bg-[#1a1a1a] border border-gray-200/80 dark:border-[#282828] p-0.5">
                <button
                  onClick={() => { setCardView(false); localStorage.setItem('dashboard_cardView', 'false') }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ns-bold transition-all duration-150 ${
                    !cardView
                      ? 'bg-[var(--accent-200)] text-[var(--accent-900)] dark:text-white shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-white/70 dark:hover:bg-[#222222]/70'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="3" y="3" width="18" height="18" rx="2"/>
                    <line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/>
                    <line x1="9" y1="3" x2="9" y2="21"/>
                  </svg>
                  테이블
                </button>
                <button
                  onClick={() => { setCardView(true); localStorage.setItem('dashboard_cardView', 'true') }}
                  className={`flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs ns-bold transition-all duration-150 ${
                    cardView
                      ? 'bg-[var(--accent-200)] text-[var(--accent-900)] dark:text-white shadow-sm'
                      : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 hover:bg-white/70 dark:hover:bg-[#222222]/70'
                  }`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <rect x="2" y="3" width="9" height="9" rx="1.5"/><rect x="13" y="3" width="9" height="9" rx="1.5"/>
                    <rect x="2" y="14" width="9" height="7" rx="1.5"/><rect x="13" y="14" width="9" height="7" rx="1.5"/>
                  </svg>
                  카드
                </button>
              </div>
            </div>}
            {activeChars.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-2">
                <p className="text-sm text-gray-400 dark:text-gray-600">표시할 레이드가 없습니다</p>
                <p className="text-xs text-gray-300 dark:text-gray-700">상단 숙제 설정에서 원정대·캐릭터별 레이드와 커스텀 숙제를 추가하세요</p>
              </div>
            ) : (
              (isMobile || cardView) ? renderCardView() : (() => {
                // 화면 너비에 맞춰 청크 분할 — 스크롤 없이 테이블 세로 적층
                // tableContainerWidth가 0이면 적당한 기본값(6) 사용
                const containerW   = tableContainerWidth > 0 ? tableContainerWidth : COL_RAID + COL_CHAR * 6
                const charsPerTable = Math.max(1, Math.floor((containerW - COL_RAID) / COL_CHAR))
                // selectedRaid 필터 활성 시 먼저 캐릭터를 필터링하여 청크 분산 방지
                const charsToChunk = selectedRaid
                  ? sortedActiveChars.filter(char => (raids[char.id] || []).some(e => e.raidId === selectedRaid.raidId && e.difficulty === selectedRaid.diffKey))
                  : sortedActiveChars
                if (remainFilter && filteredRaidRows.length === 0) {
                  return (
                    <div className="flex flex-col items-center justify-center py-20">
                      <p className="text-base text-gray-400 dark:text-gray-500">선택한 필터의 레이드를 모두 완료했어요 😊🎉</p>
                    </div>
                  )
                }
                const chunks = []
                for (let i = 0; i < charsToChunk.length; i += charsPerTable)
                  chunks.push(charsToChunk.slice(i, i + charsPerTable))
                if (chunks.length === 1) return renderTable(chunks[0])
                return (
                  <div className="space-y-8">
                    {chunks.map((chunk, idx) => (
                      <div key={idx}>
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
          chars={chars}
          raids={raids}
          expPages={expPages}
          customItems={customItems}
          onToggle={toggleCharRaid}
          onToggleGold={toggleCharRaidGold}
          onClose={() => { setShowRaidSettings(false); setRaidSettingsCharId(null) }}
          onConfirm={handleRaidSettingsConfirm}
          exRaidError={exRaidError}
          onClearExRaidError={() => setExRaidError(null)}
          onOpenCharAdd={() => { setCharEditOpenAdd(true); setShowCharEdit(true) }}
          initialCharId={raidSettingsCharId}
          onCustomAdd={addCustomItem}
          onCustomDelete={deleteCustomItem}
          onCustomDeleteAll={deleteCustomItemAll}
          onCustomReorder={reorderCustomItems}
        />
      )}
      {showNoChar && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/25">
          <div className="relative w-full max-w-md rounded-xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl px-5 py-10 text-center" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setShowNoChar(false)}
              className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none"
            >×</button>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-1">등록된 캐릭터가 없습니다</p>
            <p className="text-xs text-gray-300 dark:text-gray-600">캐릭터를 먼저 추가해 주세요</p>
            <button
              onClick={() => { setShowNoChar(false); setCharEditOpenAdd(true); setShowCharEdit(true) }}
              className="mt-6 px-4 py-2 rounded bg-[var(--accent-200)] hover:bg-[var(--accent-300)] dark:bg-[#2e2e2e] dark:hover:bg-[#383838] text-sm ns-bold text-[var(--accent-900)] dark:text-gray-300 transition-colors">
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
          hasApiKey={hasApiKey}
          onApiKeyRegistered={() => setHasApiKey(true)}
          onLoginRequired={() => { setShowCharEdit(false); setShowLoginGuide(true) }}
          activeTabExpeditionId={activeChars[0]?.expeditionId ?? null}
          getTargetTabName={getTargetTabName}
          expeditionHasExRaid={chars.some(c =>
            (c.expeditionId || 'default') === (activeChars[0]?.expeditionId || 'default') &&
            (raids[c.id] || []).some(e => EX_RAID_IDS.has(e.raidId))
          )}
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

      {/* ── 데모 모드 로그인 유도 모달 ── */}
      {/* ── 캐릭터 삭제 확인 모달 ── */}
      {confirmDeleteCharId && (() => {
        const target = chars.find(c => c.id === confirmDeleteCharId)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <div
              className="relative w-full max-w-xs rounded-2xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConfirmDeleteCharId(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none">×</button>
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
            <div
              className="relative w-full max-w-xs rounded-2xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
              onClick={e => e.stopPropagation()}
            >
              <button onClick={() => setConfirmDeletePageId(null)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none">×</button>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30">
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowLoginGuide(false)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none">×</button>
            <div className="space-y-2">
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                지금 보이는 원정대는 샘플 데이터에요.<br/>
                디스코드 로그인 후 내 캐릭터를 직접 등록하고<br/>
                레이드 숙제를 관리해 보세요!
              </p>
            </div>

            <button
              onClick={() => signIn('discord', { callbackUrl: '/dashboard' })}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-400)] hover:bg-[var(--accent-300)] px-5 py-2.5 text-sm ns-bold text-gray-900 transition-colors"
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

      {showGoldLimitNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30" onClick={() => setShowGoldLimitNotice(false)}>
          <div
            className="relative w-full max-w-sm rounded-2xl shadow-border-md bg-white dark:bg-[#222222] shadow-xl p-6 flex flex-col items-center gap-4 text-center"
            onClick={e => e.stopPropagation()}
          >
            <button onClick={() => setShowGoldLimitNotice(false)} className="absolute top-3 right-3 text-gray-300 dark:text-gray-600 hover:text-gray-500 dark:hover:text-gray-400 transition-colors text-xl leading-none">×</button>
            <div className="w-10 h-10 rounded-full bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[var(--accent-500)]">
                <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
            </div>
            <div className="space-y-1.5">
              <p className="text-sm ns-bold text-gray-800 dark:text-gray-100">골드 획득 캐릭터 {GOLD_CHAR_LIMIT}개 초과</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                이미 골드 획득 캐릭터 {GOLD_CHAR_LIMIT}개가 지정되어 있어<br/>
                추가된 캐릭터의 골드 획득이 해제된 상태로 등록되었습니다.<br/>
                숙제 설정에서 직접 변경할 수 있어요.
              </p>
            </div>
            <button
              onClick={() => setShowGoldLimitNotice(false)}
              className="w-full rounded shadow-border-md py-2 text-sm ns-bold text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-[#2a2a2a] transition-colors"
            >
              확인
            </button>
          </div>
        </div>
      )}
      </div>
    </>
  )
}
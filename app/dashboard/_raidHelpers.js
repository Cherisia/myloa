import { RAIDS, calcGoldTrade, calcGoldBound } from '@/lib/raidData'
import { EX_RAID_IDS, HIDDEN_RAID_IDS, GOLD_RAID_LIMIT } from './_constants'

// ── 자동 설정 헬퍼 ────────────────────────────────────────────────────────────
export function autoSelectNormalRaids(char, strategy) {
  const eligible = RAIDS
    .filter(r => !HIDDEN_RAID_IDS.has(r.id) && !EX_RAID_IDS.has(r.id))
    .flatMap(raid => {
      // 입장 가능한 난이도 중 가장 높은 것 선택
      const bestDiff = [...raid.difficulties]
        .sort((a, b) => b.minItemLevel - a.minItemLevel)
        .find(d => char.itemLevel >= d.minItemLevel)
      if (!bestDiff) return []
      const allGates  = new Array(bestDiff.gates).fill(true)
      const goldTrade = calcGoldTrade(bestDiff, allGates)
      const goldBound = calcGoldBound(bestDiff, allGates)
      return [{ raid, diff: bestDiff, goldTrade, totalGold: goldTrade + goldBound }]
    })

  // 전략에 따라 top-3 선택 (어떤 레이드를 뽑을지 결정)
  const selected = [...eligible]
    .sort((a, b) => strategy === 'trade' ? b.goldTrade - a.goldTrade : b.totalGold - a.totalGold)
    .slice(0, 3)

  // 표시 순서: 입장 레벨 내림차순 → 전체골드 내림차순 (전략과 무관하게 고정)
  selected.sort((a, b) =>
    b.diff.minItemLevel !== a.diff.minItemLevel
      ? b.diff.minItemLevel - a.diff.minItemLevel
      : b.totalGold - a.totalGold
  )

  return selected.map(({ raid, diff }) => ({
    raidId: raid.id, difficulty: diff.key,
    gateClears: new Array(diff.gates).fill(false),
    isGoldCheck: true, moreDone: false, moreFrom: 'bound',
  }))
}

export function autoSelectExRaid(char) {
  const exRaid = RAIDS.find(r => EX_RAID_IDS.has(r.id) && !HIDDEN_RAID_IDS.has(r.id))
  if (!exRaid) return null
  const bestDiff = [...exRaid.difficulties]
    .sort((a, b) => b.minItemLevel - a.minItemLevel)
    .find(d => char.itemLevel >= d.minItemLevel)
  if (!bestDiff) return null
  return {
    raidId: exRaid.id, difficulty: bestDiff.key,
    gateClears: new Array(bestDiff.gates).fill(false),
    isGoldCheck: true, moreDone: false, moreFrom: 'bound',
  }
}

export function buildAutoRaids(chars, strategy) {
  const raidsByName = {}
  chars.forEach((char, idx) => {
    const entries = autoSelectNormalRaids(char, strategy)
    if (idx === 0) {
      const ex = autoSelectExRaid(char)
      if (ex) entries.push(ex)
    }
    raidsByName[char.name] = entries
  })
  return raidsByName
}

// 캐릭터 아이템 레벨에 맞는 레이드 자동 배정 (최고 골드 순 top 3, isTopChar 이면 EX 레이드 추가)
export function computeAutoRaids(char, isTopChar) {
  const eligible = RAIDS
    .filter(r => !EX_RAID_IDS.has(r.id) && !HIDDEN_RAID_IDS.has(r.id))
    .flatMap(raid => {
      // 입장 가능한 난이도 중 가장 높은 것 선택
      const bestDiff = [...raid.difficulties]
        .sort((a, b) => b.minItemLevel - a.minItemLevel)
        .find(d => char.itemLevel >= d.minItemLevel)
      if (!bestDiff) return []
      const goldTrade = (bestDiff.goldTrade || []).reduce((s, g) => s + g, 0)
      const goldBound = (bestDiff.goldBound || []).reduce((s, g) => s + g, 0)
      return [{ raidId: raid.id, diff: bestDiff, goldTrade, totalGold: goldTrade + goldBound }]
    })

  // 전체골드 기준 top-3 선택 후 입장레벨 내림차순 → 전체골드 내림차순으로 정렬
  const selected = [...eligible]
    .sort((a, b) => b.totalGold - a.totalGold)
    .slice(0, GOLD_RAID_LIMIT)

  selected.sort((a, b) =>
    b.diff.minItemLevel !== a.diff.minItemLevel
      ? b.diff.minItemLevel - a.diff.minItemLevel
      : b.totalGold - a.totalGold
  )

  const qualifying = selected.map(({ raidId, diff }) => ({
    raidId, difficulty: diff.key,
    gateClears: new Array(diff.gates).fill(false),
    isGoldCheck: true, moreDone: false, moreFrom: 'bound',
  }))

  if (isTopChar) {
    const exRaid = RAIDS.find(r => EX_RAID_IDS.has(r.id) && !HIDDEN_RAID_IDS.has(r.id))
    if (exRaid) {
      const exDiff = [...exRaid.difficulties]
        .sort((a, b) => b.minItemLevel - a.minItemLevel)
        .find(d => char.itemLevel >= d.minItemLevel)
      if (exDiff) {
        qualifying.unshift({
          raidId: exRaid.id, difficulty: exDiff.key,
          gateClears: new Array(exDiff.gates).fill(false),
          isGoldCheck: true, moreDone: false, moreFrom: 'bound',
        })
      }
    }
  }
  return qualifying
}

// ── DB 저장 헬퍼 (배치 큐 — 1.5s 디바운스 후 일괄 전송) ──────────────────────────

// key: `${characterId}:${raidId}:${difficulty}` — 같은 키의 op는 최신 것이 덮어씀
const _pendingOps = new Map()
let _flushTimer = null
let _beaconRegistered = false

function _scheduleFlush() {
  if (_flushTimer) clearTimeout(_flushTimer)
  _flushTimer = setTimeout(_flushOps, 1500)
}

async function _flushOps() {
  if (_pendingOps.size === 0) return
  const ops = [..._pendingOps.values()]
  _pendingOps.clear()
  _flushTimer = null
  await fetch('/api/homework/batch', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ops }),
  }).catch(() => {})
}

// 페이지 이탈 직전 미전송 op를 sendBeacon으로 보장 전송
function _registerBeacon() {
  if (_beaconRegistered || typeof window === 'undefined') return
  _beaconRegistered = true
  window.addEventListener('beforeunload', () => {
    if (_pendingOps.size === 0) return
    const ops = [..._pendingOps.values()]
    _pendingOps.clear()
    if (_flushTimer) { clearTimeout(_flushTimer); _flushTimer = null }
    try {
      navigator.sendBeacon(
        '/api/homework/batch',
        new Blob([JSON.stringify({ ops })], { type: 'application/json' }),
      )
    } catch {}
  })
}

export function saveRaid(characterId, entry) {
  _registerBeacon()
  const key = `${characterId}:${entry.raidId}:${entry.difficulty}`
  _pendingOps.set(key, { type: 'upsert', characterId, entry: { ...entry } })
  _scheduleFlush()
}

export function deleteRaid(characterId, raidId, difficulty) {
  _registerBeacon()
  const key = `${characterId}:${raidId}:${difficulty}`
  _pendingOps.set(key, { type: 'delete', characterId, raidId, difficulty })
  _scheduleFlush()
}

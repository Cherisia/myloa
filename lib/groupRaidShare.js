import { RAIDS } from './raidData'
import { HIDDEN_RAID_IDS } from '@/app/dashboard/_constants'

// 레이드 엔트리 완료 상태
export function raidStatusOf(entry) {
  if (!entry) return 'none'
  if (entry.gateClears.length === 0) return 'incomplete'
  if (entry.gateClears.every(Boolean)) return 'complete'
  if (entry.gateClears.some(Boolean)) return 'partial'
  return 'incomplete'
}

// 멤버의 특정 (raidId, difficulty) 전체 캐릭터 집계 상태
export function getMemberRaidStatus(member, raidId, difficulty) {
  if (member.visibility === 'none') return 'hidden'
  let hasIncomplete = false
  let hasComplete = false
  let hasEntry = false
  for (const exp of member.expeditions || []) {
    for (const c of exp.characters || []) {
      const entry = c.raids?.find(r => r.raidId === raidId && r.difficulty === difficulty)
      if (!entry) continue
      hasEntry = true
      const s = raidStatusOf(entry)
      if (s === 'complete') hasComplete = true
      else hasIncomplete = true
    }
  }
  if (!hasEntry) return 'none'
  if (!hasIncomplete) return 'complete'
  if (hasComplete) return 'partial'
  return 'incomplete'
}

const DIFF_SORT = { nightmare: 0, hard: 1, stage3: 0, stage2: 1, stage1: 2, normal: 2 }

// 모든 공개 멤버의 레이드 목록에서 고유 (raidId, difficulty) 쌍 추출 (HIDDEN 제외)
export function getGroupRaidList(members) {
  const seen = new Set()
  const list = []
  for (const m of members) {
    if (m.visibility === 'none') continue
    for (const exp of m.expeditions || []) {
      for (const c of exp.characters || []) {
        for (const r of c.raids || []) {
          if (HIDDEN_RAID_IDS.has(r.raidId)) continue
          const key = `${r.raidId}__${r.difficulty}`
          if (!seen.has(key)) {
            seen.add(key)
            list.push({ raidId: r.raidId, difficulty: r.difficulty })
          }
        }
      }
    }
  }
  const raidOrder = Object.fromEntries(RAIDS.map((r, i) => [r.id, i]))
  list.sort((a, b) => {
    const ro = (raidOrder[a.raidId] ?? 99) - (raidOrder[b.raidId] ?? 99)
    if (ro !== 0) return ro
    return (DIFF_SORT[a.difficulty] ?? 9) - (DIFF_SORT[b.difficulty] ?? 9)
  })
  return list
}

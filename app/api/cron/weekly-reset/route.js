// GET /api/cron/weekly-reset
// 매주 수요일 06:00 KST (UTC 화요일 21:00) Vercel Cron이 호출
// Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { RAID_MAP, getDifficulty, calcGold, calcGoldMore, getNextResetAt } from '@/lib/raidData'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const nextResetAt = getNextResetAt()
  // 이번 주 스냅샷 기준 시각 = 다음 리셋 - 7일 (현재 리셋 시각)
  const weekStart = new Date(nextResetAt.getTime() - 7 * 24 * 60 * 60 * 1000)

  // ─── 주간 기록 스냅샷 (리셋 전 완료 현황 집계) ───────────────────────────────
  const allRaids = await prisma.characterRaid.findMany({
    where: { character: { isActive: true } },
    select: {
      raidId:      true,
      difficulty:  true,
      gateClears:  true,
      isGoldCheck: true,
      moreDone:    true,
      character: {
        select: {
          expedition: { select: { userId: true } },
        },
      },
    },
  })

  // userId별 통계 집계
  const userStats = {}
  for (const raid of allRaids) {
    const userId = raid.character.expedition.userId
    if (!userStats[userId]) userStats[userId] = { totalRaids: 0, goldRaids: 0, configuredTotalRaids: 0, configuredGoldRaids: 0, totalGold: 0, goldMore: 0 }

    const raidDef = RAID_MAP[raid.raidId]
    const diff = getDifficulty(raidDef, raid.difficulty)
    if (!diff) continue

    // 설정된 레이드 수 집계 (완료 여부 무관)
    userStats[userId].configuredTotalRaids++
    if (raid.isGoldCheck) {
      userStats[userId].configuredGoldRaids++
    }

    // 모든 관문 클리어 여부
    const allCleared =
      raid.gateClears.length === diff.gates &&
      raid.gateClears.every(Boolean)
    if (!allCleared) continue

    userStats[userId].totalRaids++

    if (raid.isGoldCheck) {
      userStats[userId].goldRaids++
      userStats[userId].totalGold += calcGold(diff, raid.gateClears)
      if (raid.moreDone) {
        userStats[userId].goldMore += calcGoldMore(diff, raid.gateClears)
      }
    }
  }

  // WeeklyRaidHistory 저장 — 이미 같은 weekStart 기록이 있으면 건드리지 않음
  // (크론 중복 실행, weekStart 오계산 등으로 이전 주 기록이 덮어써지는 것을 방지)
  const entries = Object.entries(userStats)
    .filter(([, stats]) => stats.totalRaids > 0)
    .map(([userId, stats]) => ({ userId, weekStart, ...stats }))
  const { count: historySaved } = await prisma.weeklyRaidHistory.createMany({
    data:           entries,
    skipDuplicates: true,
  })

  // ─── 1. CharacterRaid 전체 리셋 (raw SQL) ────────────────────────────────────
  const raidsReset = await prisma.$executeRaw`
    UPDATE "CharacterRaid"
    SET "gateClears" = '{}'::boolean[],
        "moreDone"   = false,
        "moreFrom"   = 'bound',
        "resetAt"    = ${nextResetAt}
  `

  // ─── 2. CharacterCustomItem type='weekly' 리셋 ───────────────────────────────
  const customReset = await prisma.characterCustomItem.updateMany({
    where: { type: 'weekly' },
    data: {
      done:     false,
      deducted: false,
      resetAt:  nextResetAt,
    },
  })

  return NextResponse.json({
    historySaved,
    raidsReset,
    customReset: customReset.count,
  })
}

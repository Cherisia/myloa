// GET /api/cron/weekly-reset
// 매주 수요일 06:00 KST (UTC 화요일 21:00) Vercel Cron이 호출
// Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { RAID_MAP, getDifficulty, calcGold, getNextResetAt } from '@/lib/raidData'

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
    if (!userStats[userId]) userStats[userId] = { totalRaids: 0, goldRaids: 0, totalGold: 0 }

    const raidDef = RAID_MAP[raid.raidId]
    const diff = getDifficulty(raidDef, raid.difficulty)
    if (!diff) continue

    // 모든 관문 클리어 여부
    const allCleared =
      raid.gateClears.length === diff.gates &&
      raid.gateClears.every(Boolean)
    if (!allCleared) continue

    userStats[userId].totalRaids++

    if (raid.isGoldCheck) {
      userStats[userId].goldRaids++
      userStats[userId].totalGold += calcGold(diff, raid.gateClears)
    }
  }

  // WeeklyRaidHistory upsert (이미 같은 weekStart가 있으면 덮어쓰기)
  let historySaved = 0
  await Promise.all(
    Object.entries(userStats).map(async ([userId, stats]) => {
      // 완료한 레이드가 하나도 없어도 기록 (0으로)
      await prisma.weeklyRaidHistory.upsert({
        where:  { userId_weekStart: { userId, weekStart } },
        create: { userId, weekStart, ...stats },
        update: { ...stats },
      })
      historySaved++
    })
  )

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

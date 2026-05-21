// GET /api/cron/weekly-reset
// 매주 수요일 06:00 KST (UTC 화요일 21:00) Vercel Cron이 호출
// Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getNextResetAt } from '@/lib/raidData'

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const nextResetAt = getNextResetAt()

  // 1. CharacterRaid 전체 리셋 (raw SQL — updateMany로 Boolean[] 빈 배열 설정 시 미동작 방지)
  const raidsReset = await prisma.$executeRaw`
    UPDATE "CharacterRaid"
    SET "gateClears" = '{}'::boolean[],
        "moreDone"   = false,
        "moreFrom"   = 'bound',
        "resetAt"    = ${nextResetAt}
  `

  // 2. CharacterCustomItem type='weekly' 리셋
  const customReset = await prisma.characterCustomItem.updateMany({
    where: { type: 'weekly' },
    data: {
      done:     false,
      deducted: false,
      resetAt:  nextResetAt,
    },
  })

  return NextResponse.json({
    raidsReset,
    customReset: customReset.count,
  })
}

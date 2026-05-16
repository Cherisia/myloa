// GET /api/cron/daily-reset
// 매일 06:00 KST (UTC 21:00) Vercel Cron이 호출
// Authorization: Bearer <CRON_SECRET>

import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getNextDailyResetAt } from '@/lib/raidData'

// 휴식 게이지가 적용되는 항목 이름 (쿠르잔 전선 계열 포함)
const REST_GAUGE_NAMES = new Set(['혼돈의 균열', '쿠르잔 전선', '카오스 던전', '가디언 토벌'])

export async function GET(request) {
  const authHeader = request.headers.get('authorization')
  const secret = process.env.CRON_SECRET
  if (secret && authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: '인증 실패' }, { status: 401 })
  }

  const now = new Date()
  const nextResetAt = getNextDailyResetAt()

  // resetAt < now 인 daily 항목만 처리
  const expiredItems = await prisma.characterCustomItem.findMany({
    where: {
      type: 'daily',
      resetAt: { lt: now },
    },
  })

  if (expiredItems.length === 0) {
    return NextResponse.json({ updated: 0 })
  }

  const updates = expiredItems.map(item => {
    const data = {
      deducted: false,
      resetAt:  nextResetAt,
    }

    if (item.done) {
      // 완료 상태: done만 false로 (휴식 게이지 유지)
      data.done = false
    } else if (REST_GAUGE_NAMES.has(item.name)) {
      // 미완료 + 게이지 대상 항목: 휴식 게이지 +10 (최대 100)
      data.restGauge = Math.min(item.restGauge + 10, 100)
    }

    return prisma.characterCustomItem.update({
      where: { id: item.id },
      data,
    })
  })

  await prisma.$transaction(updates)

  return NextResponse.json({ updated: expiredItems.length })
}

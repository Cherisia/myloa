// GET /api/history
// 현재 로그인 사용자의 주간 숙제 기록 조회 (최근 10주)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const history = await prisma.weeklyRaidHistory.findMany({
    where:   { userId: session.user.id },
    orderBy: { weekStart: 'asc' },
    take:    10,
    select: {
      id:         true,
      weekStart:  true,
      totalRaids: true,
      goldRaids:  true,
      totalGold:  true,
    },
  })

  return NextResponse.json(history)
}

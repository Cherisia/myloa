// GET /api/expedition/[id]/ranking
// 길드 멤버 주간 숙제 랭킹 조회

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '인증 필요' }, { status: 401 })
  }

  const { id } = await params

  // 멤버십 확인
  const membership = await prisma.expeditionMember.findUnique({
    where:  { expeditionId_userId: { expeditionId: id, userId: session.user.id } },
    select: { status: true },
  })
  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  // 멤버 + 히스토리 일괄 조회
  const members = await prisma.expeditionMember.findMany({
    where:  { expeditionId: id, status: 'active' },
    select: {
      userId: true,
      role:   true,
      user: {
        select: {
          id:       true,
          name:     true,
          nickname: true,
          image:    true,
          weeklyRaidHistories: {
            select:  { weekStart: true, totalRaids: true, goldRaids: true, totalGold: true },
            orderBy: { weekStart: 'desc' },
          },
        },
      },
    },
  })

  // 집계
  const ranking = members.map(m => {
    const hs        = m.user.weeklyRaidHistories
    const sumGold      = hs.reduce((s, h) => s + h.totalGold, 0)
    const sumGoldRaids = hs.reduce((s, h) => s + h.goldRaids, 0)
    const sumAllRaids  = hs.reduce((s, h) => s + h.totalRaids, 0)
    const weekCount    = hs.length
    const bestWeek     = hs.reduce((b, h) =>
      h.totalGold > (b?.gold ?? -1) ? { gold: h.totalGold, weekStart: h.weekStart } : b
    , null)

    return {
      userId:       m.userId,
      role:         m.role,
      name:         m.user.nickname || m.user.name || '알 수 없음',
      image:        m.user.image,
      totalGold:      sumGold,
      totalRaids:     sumGoldRaids,
      allRaids:       sumAllRaids,
      weeks:          weekCount,
      avgGold:        weekCount > 0 ? Math.round(sumGold / weekCount) : 0,
      avgRaids:       weekCount > 0 ? Math.round((sumGoldRaids / weekCount) * 10) / 10 : 0,
      completionRate: sumAllRaids > 0 ? Math.round((sumGoldRaids / sumAllRaids) * 100) : 0,
      bestWeek,
    }
  })

  return NextResponse.json(ranking)
}

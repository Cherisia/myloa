// GET  /api/guild/[id]/schedule?week=YYYY-WW  주간 공고 목록
// POST /api/guild/[id]/schedule               공고 작성

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

function cuid() {
  return randomBytes(12).toString('base64url')
}

async function getActiveMember(expeditionId, userId) {
  return prisma.expeditionMember.findFirst({
    where: { expeditionId, userId, status: 'active' },
  })
}

// 월 범위 계산: month = "YYYY-MM" (KST 기준 해당 월 전체)
function getMonthRange(month) {
  let year, mon
  if (month) {
    [year, mon] = month.split('-').map(Number)
  } else {
    const now = new Date()
    const kst = new Date(now.getTime() + 9 * 3600 * 1000)
    year = kst.getUTCFullYear()
    mon  = kst.getUTCMonth() + 1
  }
  // KST 월 첫날 00:00 → UTC
  const startKST = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0))
  const start    = new Date(startKST.getTime() - 9 * 3600 * 1000)
  // KST 다음 달 첫날 00:00 → UTC
  const endKST   = new Date(Date.UTC(year, mon, 1, 0, 0, 0))
  const end      = new Date(endKST.getTime() - 9 * 3600 * 1000)
  return { gte: start, lt: end }
}

export async function GET(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const { searchParams } = new URL(request.url)
  const monthRange = getMonthRange(searchParams.get('month'))

  const posts = await prisma.guildSchedulePost.findMany({
    where: { expeditionId: id, scheduledAt: monthRange },
    include: {
      participants: true,
      partySlots: true,
    },
    orderBy: { scheduledAt: 'asc' },
  })

  return NextResponse.json(posts)
}

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { raidId, difficulty, scheduledAt, durationMinutes, totalSlots, minItemLevel, allowedClasses, memo, closedAt, creatorCharacterId, creatorRole } = body

  if (!raidId || !difficulty || !scheduledAt || !totalSlots || !closedAt) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (!Number.isInteger(totalSlots) || totalSlots < 1 || totalSlots > 15) {
    return NextResponse.json({ error: '모집 인원 초과' }, { status: 400 })
  }

  const postId = cuid()
  const participantId = cuid()

  const [post] = await prisma.$transaction([
    prisma.guildSchedulePost.create({
      data: {
        id: postId,
        expeditionId: id,
        creatorId: session.user.id,
        raidId,
        difficulty,
        scheduledAt: new Date(scheduledAt),
        durationMinutes: durationMinutes || 120,
        totalSlots,
        minItemLevel: minItemLevel || null,
        allowedClasses: allowedClasses || [],
        memo: memo?.slice(0, 140) || null,
        closedAt: new Date(closedAt),
        status: 'recruiting',
      },
    }),
    prisma.guildScheduleParticipant.create({
      data: {
        id: participantId,
        postId,
        userId: session.user.id,
        characterId: creatorCharacterId || '',
        role: creatorRole || 'dealer',
        status: 'accepted',
      },
    }),
  ])

  const created = await prisma.guildSchedulePost.findUnique({
    where: { id: postId },
    include: { participants: true, partySlots: true },
  })

  return NextResponse.json(created, { status: 201 })
}

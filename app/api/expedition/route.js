// GET  /api/expedition → 내 원정대 목록
// POST /api/expedition → 원정대 생성

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

function generateInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase() // 8자리 대문자
}

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const memberships = await prisma.expeditionMember.findMany({
    where: { userId: session.user.id, status: 'active' },
    include: {
      expedition: {
        include: {
          members: {
            where: { status: 'active' },
            include: { user: { select: { id: true, name: true, image: true } } },
          },
          leader: { select: { id: true, name: true, image: true } },
        },
      },
    },
  })

  return NextResponse.json(memberships.map(m => m.expedition))
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { name, maxMembers } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '원정대 이름을 입력하세요' }, { status: 400 })

  const expedition = await prisma.expedition.create({
    data: {
      name: name.trim(),
      leaderId: session.user.id,
      inviteCode: generateInviteCode(),
      inviteExpiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7일
      maxMembers: maxMembers || 8,
      members: {
        create: {
          userId: session.user.id,
          status: 'active',
          visibility: 'all',
          joinedAt: new Date(),
        },
      },
    },
  })

  return NextResponse.json(expedition, { status: 201 })
}

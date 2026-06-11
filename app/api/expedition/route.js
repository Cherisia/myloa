// GET  /api/expedition → 내 원정대 목록
// POST /api/expedition → 원정대 생성

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateInviteCode } from '@/lib/inviteCode'

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

  const { name } = await request.json()
  const trimmedName = name?.trim().slice(0, 12) || ''
  if (!trimmedName) return NextResponse.json({ error: '원정대 이름을 입력하세요' }, { status: 400 })
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]+$/.test(trimmedName)) {
    return NextResponse.json({ error: '한글, 영어, 숫자만 사용 가능합니다.' }, { status: 400 })
  }

  let expedition = null
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      expedition = await prisma.expedition.create({
        data: {
          name: trimmedName,
          leaderId: session.user.id,
          inviteCode: generateInviteCode(),
          maxMembers: 100,
          members: {
            create: {
              userId: session.user.id,
              role: 'leader',
              status: 'active',
              visibility: 'all',
              joinedAt: new Date(),
            },
          },
        },
      })
      break
    } catch (e) {
      if (e.code === 'P2002' && e.meta?.target?.includes('inviteCode')) continue
      throw e
    }
  }
  if (!expedition) return NextResponse.json({ error: '원정대 생성 실패' }, { status: 500 })

  return NextResponse.json(expedition, { status: 201 })
}

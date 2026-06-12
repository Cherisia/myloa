// POST /api/expedition/join → 초대코드로 참가 신청

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MAX_MEMBERS = 100

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { inviteCode } = await request.json()
  if (!inviteCode) return NextResponse.json({ error: '초대 코드가 필요합니다' }, { status: 400 })

  const expedition = await prisma.expedition.findUnique({
    where: { inviteCode: inviteCode.toUpperCase() },
    include: { members: { where: { status: 'active' } } },
  })

  if (!expedition) return NextResponse.json({ error: '유효하지 않은 초대 코드입니다' }, { status: 404 })
  if (expedition.members.length >= MAX_MEMBERS) return NextResponse.json({ error: '길드 인원이 가득 찼습니다' }, { status: 400 })

  // 대표캐릭터 없으면 가입 불가
  const hasChar = await prisma.loaExpedition.findFirst({
    where: { userId: session.user.id, characters: { some: { isActive: true } } },
    select: { id: true },
  })
  if (!hasChar) return NextResponse.json({ error: '캐릭터를 먼저 등록해야 길드에 가입할 수 있습니다' }, { status: 400 })

  const existing = await prisma.expeditionMember.findUnique({
    where: { expeditionId_userId: { expeditionId: expedition.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ error: '이미 가입 신청했거나 멤버입니다' }, { status: 400 })

  const isAutoAccept = expedition.autoAccept
  await prisma.expeditionMember.create({
    data: {
      expeditionId: expedition.id,
      userId: session.user.id,
      status: isAutoAccept ? 'active' : 'pending',
      visibility: 'all',
      ...(isAutoAccept && { joinedAt: new Date() }),
    },
  })

  return NextResponse.json({
    success: true,
    expeditionName: expedition.name,
    autoAccepted: isAutoAccept,
  })
}

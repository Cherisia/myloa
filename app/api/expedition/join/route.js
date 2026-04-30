// POST /api/expedition/join → 초대코드로 참가 신청

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

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
  if (new Date() > expedition.inviteExpiresAt) return NextResponse.json({ error: '만료된 초대 코드입니다' }, { status: 400 })
  if (expedition.members.length >= expedition.maxMembers) return NextResponse.json({ error: '원정대 인원이 가득 찼습니다' }, { status: 400 })

  // 이미 멤버 여부 확인
  const existing = await prisma.expeditionMember.findUnique({
    where: { expeditionId_userId: { expeditionId: expedition.id, userId: session.user.id } },
  })
  if (existing) return NextResponse.json({ error: '이미 가입 신청했거나 멤버입니다' }, { status: 400 })

  await prisma.expeditionMember.create({
    data: {
      expeditionId: expedition.id,
      userId: session.user.id,
      status: 'pending',
      visibility: 'all',
    },
  })

  return NextResponse.json({ success: true, expeditionName: expedition.name })
}

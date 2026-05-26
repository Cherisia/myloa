// PATCH /api/expedition/[id]/members → 멤버 수락/거절/역할변경/강퇴/공개설정

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id: expeditionId } = await params
  const { userId, action, visibility } = await request.json()
  const myId = session.user.id

  const expedition = await prisma.expedition.findUnique({ where: { id: expeditionId } })
  if (!expedition) return NextResponse.json({ error: '길드를 찾을 수 없습니다' }, { status: 404 })

  const myMembership = await prisma.expeditionMember.findUnique({
    where: { expeditionId_userId: { expeditionId, userId: myId } },
  })

  const isLeader  = expedition.leaderId === myId
  const isOfficer = isLeader || myMembership?.role === 'officer'
  const isSelf    = userId === myId

  // 내 공개 설정 변경
  if (visibility && isSelf) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId: myId } },
      data: { visibility },
    })
    return NextResponse.json(updated)
  }

  // 가입 수락 / 거절 (부길드장+)
  if ((action === 'accept' || action === 'reject') && isOfficer) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: {
        status: action === 'accept' ? 'active' : 'rejected',
        joinedAt: action === 'accept' ? new Date() : undefined,
      },
    })
    return NextResponse.json(updated)
  }

  // 강퇴 (부길드장+, 자신 및 리더 제외)
  if (action === 'kick' && isOfficer && !isSelf && expedition.leaderId !== userId) {
    await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ success: true })
  }

  // 역할 변경 (리더만)
  if (action === 'promote' && isLeader) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: { role: 'officer' },
    })
    return NextResponse.json(updated)
  }
  if (action === 'demote' && isLeader) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: { role: 'member' },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
}

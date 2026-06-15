// PATCH /api/expedition/[id]/members → 멤버 수락/거절/강퇴/공개설정

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

  const isLeader = expedition.leaderId === myId
  const isSelf   = userId === myId

  // 내 공개 설정 변경
  if (visibility && isSelf) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId: myId } },
      data: { visibility },
    })
    return NextResponse.json(updated)
  }

  // 가입 수락 / 거절 (길드장만)
  if ((action === 'accept' || action === 'reject') && isLeader) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: {
        status: action === 'accept' ? 'active' : 'rejected',
        joinedAt: action === 'accept' ? new Date() : undefined,
      },
    })
    return NextResponse.json(updated)
  }

  // 강퇴 (길드장만, 자신 제외)
  if (action === 'kick' && isLeader && !isSelf) {
    await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: { status: 'rejected' },
    })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
}

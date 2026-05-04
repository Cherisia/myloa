// PATCH /api/groups/[id]/requests/[reqId]  → 수락 or 거절

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, reqId } = await params
  const { action } = await request.json() // "accept" | "reject"

  // 권한 확인 (그룹장 or 부그룹장)
  const myMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  })
  if (!myMembership || !['leader', 'officer'].includes(myMembership.role)) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  const joinReq = await prisma.joinRequest.findUnique({
    where: { id: reqId },
    include: { group: { include: { members: { select: { id: true } } } } },
  })
  if (!joinReq || joinReq.groupId !== id || joinReq.status !== 'pending') {
    return NextResponse.json({ error: '유효하지 않은 신청입니다' }, { status: 404 })
  }

  if (action === 'accept') {
    if (joinReq.group.members.length >= joinReq.group.maxMembers) {
      return NextResponse.json({ error: '인원이 가득 찼습니다' }, { status: 400 })
    }
    await prisma.$transaction([
      prisma.joinRequest.update({ where: { id: reqId }, data: { status: 'accepted' } }),
      prisma.groupMember.create({ data: { groupId: id, userId: joinReq.userId, role: 'member' } }),
    ])
    return NextResponse.json({ success: true, action: 'accepted' })
  }

  if (action === 'reject') {
    await prisma.joinRequest.update({ where: { id: reqId }, data: { status: 'rejected' } })
    return NextResponse.json({ success: true, action: 'rejected' })
  }

  return NextResponse.json({ error: '잘못된 action' }, { status: 400 })
}

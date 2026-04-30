// PATCH /api/expedition/[id]/members → 멤버 수락/거절, 공개 설정 변경

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id: expeditionId } = await params
  const { userId, action, visibility } = await request.json()

  const expedition = await prisma.expedition.findUnique({ where: { id: expeditionId } })
  if (!expedition) return NextResponse.json({ error: '원정대를 찾을 수 없습니다' }, { status: 404 })

  const isLeader = expedition.leaderId === session.user.id
  const isSelf   = userId === session.user.id

  // 공개 설정 변경 (본인만)
  if (visibility && isSelf) {
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId: session.user.id } },
      data: { visibility },
    })
    return NextResponse.json(updated)
  }

  // 수락/거절 (원정대장만)
  if (action && isLeader) {
    if (!['accept', 'reject'].includes(action)) {
      return NextResponse.json({ error: '잘못된 action' }, { status: 400 })
    }
    const updated = await prisma.expeditionMember.update({
      where: { expeditionId_userId: { expeditionId, userId } },
      data: {
        status: action === 'accept' ? 'active' : 'rejected',
        joinedAt: action === 'accept' ? new Date() : undefined,
      },
    })
    return NextResponse.json(updated)
  }

  return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })
}

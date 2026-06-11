// POST   /api/expedition/[id]/favorites → 즐겨찾기 추가
// DELETE /api/expedition/[id]/favorites → 즐겨찾기 제거

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id: expeditionId } = await params
  const { targetUserId } = await request.json()
  const viewerUserId = session.user.id

  const membership = await prisma.expeditionMember.findUnique({
    where: { expeditionId_userId: { expeditionId, userId: viewerUserId } },
  })
  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
  }

  await prisma.expeditionMemberFavorite.upsert({
    where: { expeditionId_viewerUserId_targetUserId: { expeditionId, viewerUserId, targetUserId } },
    create: { expeditionId, viewerUserId, targetUserId },
    update: {},
  })
  return NextResponse.json({ success: true })
}

export async function DELETE(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id: expeditionId } = await params
  const { targetUserId } = await request.json()
  const viewerUserId = session.user.id

  const membership = await prisma.expeditionMember.findUnique({
    where: { expeditionId_userId: { expeditionId, userId: viewerUserId } },
  })
  if (!membership || membership.status !== 'active') {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
  }

  await prisma.expeditionMemberFavorite.deleteMany({
    where: { expeditionId, viewerUserId, targetUserId },
  })
  return NextResponse.json({ success: true })
}

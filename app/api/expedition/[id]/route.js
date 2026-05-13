// GET    /api/expedition/[id] → 그룹 상세
// PATCH  /api/expedition/[id] → 그룹 설정 변경 (리더)
// DELETE /api/expedition/[id] → 그룹 삭제(리더) or 탈퇴(멤버)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const MEMBER_USER_SELECT = {
  select: {
    id: true, name: true, discordUsername: true, image: true,
    loaExpeditions: {
      orderBy: { createdAt: 'asc' },
      include: {
        characters: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
          include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
        },
      },
    },
  },
}

export async function GET(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id

  const expedition = await prisma.expedition.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, name: true, discordUsername: true, image: true } },
      members: {
        include: { user: MEMBER_USER_SELECT },
        orderBy: { joinedAt: 'asc' },
      },
      favorites: { where: { viewerUserId: userId } },
    },
  })

  if (!expedition) return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })

  const myMembership = expedition.members.find(m => m.userId === userId)
  if (!myMembership || myMembership.status === 'rejected' || myMembership.status === 'left') {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
  }

  return NextResponse.json({
    ...expedition,
    favoritedUserIds: expedition.favorites.map(f => f.targetUserId),
  })
}

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id
  const { name, description, notice, maxMembers } = await request.json()

  const expedition = await prisma.expedition.findUnique({ where: { id } })
  if (!expedition) return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })
  if (expedition.leaderId !== userId) return NextResponse.json({ error: '권한이 없습니다' }, { status: 403 })

  const updated = await prisma.expedition.update({
    where: { id },
    data: {
      ...(name?.trim() && { name: name.trim() }),
      ...(description !== undefined && { description: description?.trim() || null }),
      ...(notice !== undefined && { notice: notice?.trim() || null }),
      ...(maxMembers && { maxMembers: Number(maxMembers) }),
    },
  })
  return NextResponse.json(updated)
}

export async function DELETE(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const userId = session.user.id
  const body = await request.json().catch(() => ({}))

  const expedition = await prisma.expedition.findUnique({ where: { id } })
  if (!expedition) return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })

  if (expedition.leaderId === userId && body.action !== 'leave') {
    await prisma.expedition.delete({ where: { id } })
    return NextResponse.json({ success: true, action: 'deleted' })
  }

  await prisma.expeditionMember.update({
    where: { expeditionId_userId: { expeditionId: id, userId } },
    data: { status: 'left' },
  })
  return NextResponse.json({ success: true, action: 'left' })
}

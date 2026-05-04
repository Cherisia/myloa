// DELETE /api/groups/[id]/members/[userId]  → 추방 or 탈퇴
// PATCH  /api/groups/[id]/members/[userId]  → 역할 변경 / 공개 설정 변경

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function DELETE(_, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, userId } = await params
  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: '그룹 없음' }, { status: 404 })

  const myMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  })

  const isSelf    = userId === session.user.id
  const canManage = myMembership?.role === 'leader' || myMembership?.role === 'officer'

  if (!isSelf && !canManage) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  if (userId === group.leaderId) return NextResponse.json({ error: '그룹장은 추방할 수 없습니다' }, { status: 400 })

  await prisma.groupMember.deleteMany({ where: { groupId: id, userId } })
  return NextResponse.json({ success: true })
}

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, userId } = await params
  const body = await request.json()

  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: '그룹 없음' }, { status: 404 })

  const myMembership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  })

  const data = {}

  // 역할 변경: 그룹장만 가능
  if (body.role !== undefined) {
    if (group.leaderId !== session.user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    if (!['officer', 'member'].includes(body.role)) return NextResponse.json({ error: '잘못된 역할' }, { status: 400 })
    data.role = body.role
  }

  // 공개 설정: 본인만 변경 가능
  if (body.visibility !== undefined) {
    if (userId !== session.user.id) return NextResponse.json({ error: '본인 설정만 변경 가능합니다' }, { status: 403 })
    if (!['all', 'none'].includes(body.visibility)) return NextResponse.json({ error: '잘못된 설정' }, { status: 400 })
    data.visibility = body.visibility
  }

  if (Object.keys(data).length === 0) return NextResponse.json({ error: '변경 내용 없음' }, { status: 400 })

  const updated = await prisma.groupMember.update({
    where: { groupId_userId: { groupId: id, userId } },
    data,
  })
  return NextResponse.json(updated)
}

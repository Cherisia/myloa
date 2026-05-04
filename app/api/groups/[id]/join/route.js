// POST   /api/groups/[id]/join  → 공개 그룹 참가 신청 or 초대코드로 즉시 참가
// DELETE /api/groups/[id]/join  → 그룹 탈퇴

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const { inviteCode, message } = await request.json().catch(() => ({}))

  const group = await prisma.group.findUnique({
    where:   { id },
    include: { members: { select: { id: true, userId: true } } },
  })
  if (!group) return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })

  // 이미 멤버인지 확인
  if (group.members.some(m => m.userId === session.user.id)) {
    return NextResponse.json({ error: '이미 가입된 그룹입니다' }, { status: 409 })
  }

  // 인원 초과
  if (group.members.length >= group.maxMembers) {
    return NextResponse.json({ error: '그룹 인원이 가득 찼습니다' }, { status: 400 })
  }

  // 가입된 그룹 수 제한
  const myCount = await prisma.groupMember.count({ where: { userId: session.user.id } })
  if (myCount >= 5) return NextResponse.json({ error: '그룹은 최대 5개까지 가입 가능합니다' }, { status: 400 })

  // 초대코드로 즉시 참가
  if (inviteCode) {
    if (inviteCode.toUpperCase() !== group.inviteCode) {
      return NextResponse.json({ error: '초대 코드가 올바르지 않습니다' }, { status: 400 })
    }
    const member = await prisma.groupMember.create({
      data: { groupId: id, userId: session.user.id, role: 'member' },
    })
    // 기존 신청이 있으면 수락 처리
    await prisma.joinRequest.updateMany({
      where: { groupId: id, userId: session.user.id, status: 'pending' },
      data:  { status: 'accepted' },
    })
    return NextResponse.json({ joined: true, member })
  }

  // 공개 그룹 신청
  if (!group.isPublic) {
    return NextResponse.json({ error: '비공개 그룹은 초대 코드가 필요합니다' }, { status: 403 })
  }

  // 이미 신청 중인지
  const existing = await prisma.joinRequest.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  })
  if (existing?.status === 'pending') {
    return NextResponse.json({ error: '이미 신청 중입니다' }, { status: 409 })
  }

  const req = await prisma.joinRequest.upsert({
    where:  { groupId_userId: { groupId: id, userId: session.user.id } },
    create: { groupId: id, userId: session.user.id, message: message?.trim() || null, status: 'pending' },
    update: { message: message?.trim() || null, status: 'pending' },
  })
  return NextResponse.json({ requested: true, request: req }, { status: 201 })
}

export async function DELETE(_, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: '그룹 없음' }, { status: 404 })
  if (group.leaderId === session.user.id) {
    return NextResponse.json({ error: '그룹장은 탈퇴할 수 없습니다. 그룹을 삭제하거나 그룹장을 위임하세요.' }, { status: 400 })
  }

  await prisma.groupMember.deleteMany({ where: { groupId: id, userId: session.user.id } })
  return NextResponse.json({ success: true })
}

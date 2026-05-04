// POST /api/groups/join-by-code  → 초대코드로 그룹을 찾아 즉시 참가

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { inviteCode } = await request.json().catch(() => ({}))
  if (!inviteCode?.trim()) return NextResponse.json({ error: '코드를 입력하세요' }, { status: 400 })

  const group = await prisma.group.findFirst({
    where:   { inviteCode: inviteCode.trim().toUpperCase() },
    include: { members: { select: { id: true, userId: true } } },
  })
  if (!group) return NextResponse.json({ error: '유효하지 않은 초대 코드입니다' }, { status: 404 })

  // 이미 멤버인지 확인
  if (group.members.some(m => m.userId === session.user.id)) {
    return NextResponse.json({ error: '이미 가입된 그룹입니다', groupId: group.id }, { status: 409 })
  }

  // 인원 초과
  if (group.members.length >= group.maxMembers) {
    return NextResponse.json({ error: '그룹 인원이 가득 찼습니다' }, { status: 400 })
  }

  // 가입 그룹 수 제한
  const myCount = await prisma.groupMember.count({ where: { userId: session.user.id } })
  if (myCount >= 5) return NextResponse.json({ error: '그룹은 최대 5개까지 가입 가능합니다' }, { status: 400 })

  await prisma.groupMember.create({
    data: { groupId: group.id, userId: session.user.id, role: 'member' },
  })
  // 기존 신청이 있으면 수락 처리
  await prisma.joinRequest.updateMany({
    where: { groupId: group.id, userId: session.user.id, status: 'pending' },
    data:  { status: 'accepted' },
  })

  return NextResponse.json({ success: true, groupId: group.id })
}

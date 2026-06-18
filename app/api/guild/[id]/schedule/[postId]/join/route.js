// POST   /api/guild/[id]/schedule/[postId]/join  참가 신청
// DELETE /api/guild/[id]/schedule/[postId]/join  신청 취소

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'
import { SUPPORT_CLASSES } from '@/app/dashboard/_constants'

function cuid() {
  return randomBytes(12).toString('base64url')
}

async function getActiveMember(expeditionId, userId) {
  return prisma.expeditionMember.findFirst({
    where: { expeditionId, userId, status: 'active' },
  })
}

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const post = await prisma.guildSchedulePost.findUnique({ where: { id: postId } })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })
  if (post.status !== 'recruiting') return NextResponse.json({ error: '모집중인 공고에만 신청 가능' }, { status: 400 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { characterId, role } = body
  if (!characterId) return NextResponse.json({ error: 'characterId 필요' }, { status: 400 })

  // 유효 role 검증
  const validRole = role === 'support' || role === 'dealer' ? role : 'dealer'

  // 이미 신청했는지 확인
  const existing = await prisma.guildScheduleParticipant.findFirst({
    where: { postId, userId: session.user.id },
  })
  if (existing) return NextResponse.json({ error: '이미 신청한 공고입니다' }, { status: 409 })

  // 캐릭터 소유 및 아이템레벨 검증
  const character = await prisma.character.findFirst({
    where: { id: characterId },
    include: { expedition: true },
  })
  if (!character || character.expedition.userId !== session.user.id) {
    return NextResponse.json({ error: '유효하지 않은 캐릭터' }, { status: 400 })
  }
  if (post.minItemLevel && character.itemLevel < post.minItemLevel) {
    return NextResponse.json({ error: '아이템레벨 조건 미달' }, { status: 400 })
  }
  // 직업 조건 검증
  if (post.allowedClasses.length > 0 && !post.allowedClasses.includes(character.class)) {
    return NextResponse.json({ error: '직업 조건 미달' }, { status: 400 })
  }

  const participant = await prisma.guildScheduleParticipant.create({
    data: {
      id: cuid(),
      postId,
      userId: session.user.id,
      characterId,
      role: validRole,
      status: 'pending',
    },
  })

  return NextResponse.json(participant, { status: 201 })
}

export async function DELETE(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const post = await prisma.guildSchedulePost.findUnique({ where: { id: postId } })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })

  if (new Date() >= new Date(post.scheduledAt)) {
    return NextResponse.json({ error: '레이드 시작 후 취소 불가' }, { status: 400 })
  }

  const participant = await prisma.guildScheduleParticipant.findFirst({
    where: { postId, userId: session.user.id },
  })
  if (!participant) return NextResponse.json({ error: '신청 내역 없음' }, { status: 404 })

  await prisma.guildScheduleParticipant.delete({ where: { id: participant.id } })
  return NextResponse.json({ ok: true })
}

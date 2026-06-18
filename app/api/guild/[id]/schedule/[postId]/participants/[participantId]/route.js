// PATCH /api/guild/[id]/schedule/[postId]/participants/[participantId]
// 방장이 신청자 수락/거절

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId, participantId } = await params

  const post = await prisma.guildSchedulePost.findUnique({
    where: { id: postId },
    include: { participants: { where: { status: 'accepted' } } },
  })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })
  if (post.creatorId !== session.user.id) return NextResponse.json({ error: '방장만 가능' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { status } = body
  if (!['accepted', 'rejected'].includes(status)) {
    return NextResponse.json({ error: 'status는 accepted 또는 rejected' }, { status: 400 })
  }

  // 수락 시 슬롯 초과 확인
  if (status === 'accepted') {
    const acceptedCount = post.participants.length
    if (acceptedCount >= post.totalSlots + 1) { // +1 = 방장 포함
      return NextResponse.json({ error: '모집 인원 초과' }, { status: 400 })
    }
  }

  const participant = await prisma.guildScheduleParticipant.findUnique({ where: { id: participantId } })
  if (!participant || participant.postId !== postId) return NextResponse.json({ error: '신청자를 찾을 수 없음' }, { status: 404 })

  const updated = await prisma.guildScheduleParticipant.update({
    where: { id: participantId },
    data: { status },
  })

  // 수락 후 총 인원이 totalSlots+1(방장포함)에 달하면 자동 마감
  if (status === 'accepted') {
    const newAccepted = await prisma.guildScheduleParticipant.count({
      where: { postId, status: 'accepted' },
    })
    if (newAccepted >= post.totalSlots + 1) {
      await prisma.guildSchedulePost.update({
        where: { id: postId },
        data: { status: 'closed' },
      })
    }
  }

  return NextResponse.json(updated)
}

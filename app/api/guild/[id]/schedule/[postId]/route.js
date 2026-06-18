// PATCH  /api/guild/[id]/schedule/[postId]  상태 변경 또는 일정 시간 변경
// DELETE /api/guild/[id]/schedule/[postId]  공고 삭제

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

async function getActiveMember(expeditionId, userId) {
  return prisma.expeditionMember.findFirst({
    where: { expeditionId, userId, status: 'active' },
  })
}

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const post = await prisma.guildSchedulePost.findUnique({ where: { id: postId } })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })

  const isLeader = (await prisma.expedition.findUnique({ where: { id }, select: { leaderId: true } }))?.leaderId === session.user.id
  if (post.creatorId !== session.user.id && !isLeader) {
    return NextResponse.json({ error: '방장만 수정 가능' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { action, scheduledAt, closedAt } = body

  // 일정 시간 변경
  if (scheduledAt) {
    if (['done', 'disbanded'].includes(post.status)) {
      return NextResponse.json({ error: '완료/해산된 공고는 수정 불가' }, { status: 400 })
    }
    const updated = await prisma.guildSchedulePost.update({
      where: { id: postId },
      data: {
        scheduledAt: new Date(scheduledAt),
        ...(closedAt ? { closedAt: new Date(closedAt) } : {}),
      },
      include: { participants: true, partySlots: true },
    })
    return NextResponse.json(updated)
  }

  // 상태 전환
  const transitions = {
    close:    { from: ['recruiting'],            to: 'closed'    },
    reopen:   { from: ['closed'],                to: 'recruiting' },
    disband:  { from: ['recruiting', 'closed'],  to: 'disbanded'  },
  }

  const transition = transitions[action]
  if (!transition) return NextResponse.json({ error: '알 수 없는 액션' }, { status: 400 })
  if (!transition.from.includes(post.status)) {
    return NextResponse.json({ error: `현재 상태(${post.status})에서 불가능한 액션` }, { status: 400 })
  }

  const updated = await prisma.guildSchedulePost.update({
    where: { id: postId },
    data: { status: transition.to },
    include: { participants: true, partySlots: true },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params
  const member = await getActiveMember(id, session.user.id)
  if (!member) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const post = await prisma.guildSchedulePost.findUnique({ where: { id: postId } })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })
  if (post.creatorId !== session.user.id) return NextResponse.json({ error: '방장만 삭제 가능' }, { status: 403 })
  if (post.status !== 'recruiting') return NextResponse.json({ error: '모집중 상태만 삭제 가능' }, { status: 400 })

  await prisma.guildSchedulePost.delete({ where: { id: postId } })
  return NextResponse.json({ ok: true })
}

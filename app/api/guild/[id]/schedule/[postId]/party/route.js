// POST /api/guild/[id]/schedule/[postId]/party
// 파티 슬롯 배치 저장 (방장만)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

function cuid() {
  return randomBytes(12).toString('base64url')
}

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params

  const post = await prisma.guildSchedulePost.findUnique({ where: { id: postId } })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })
  if (post.creatorId !== session.user.id) return NextResponse.json({ error: '방장만 가능' }, { status: 403 })
  if (!['closed', 'recruiting'].includes(post.status)) {
    return NextResponse.json({ error: '모집중/모집완료 상태에서만 파티 구성 가능' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { slots } = body
  if (!Array.isArray(slots)) return NextResponse.json({ error: 'slots 배열 필요' }, { status: 400 })

  // 기존 슬롯 전체 교체
  await prisma.$transaction([
    prisma.guildSchedulePartySlot.deleteMany({ where: { postId } }),
    ...slots.map(slot => prisma.guildSchedulePartySlot.create({
      data: {
        id: cuid(),
        postId,
        partyNumber: slot.partyNumber,
        slotNumber: slot.slotNumber,
        userId: slot.userId || null,
        characterId: slot.characterId || null,
        customName: slot.customName || null,
        customClass: slot.customClass || null,
      },
    })),
  ])

  const saved = await prisma.guildSchedulePartySlot.findMany({ where: { postId } })
  return NextResponse.json(saved)
}

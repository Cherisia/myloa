// POST /api/guild/[id]/schedule/[postId]/complete
// 레이드 완료 처리 — 참가자 숙제 자동 체크

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id, postId } = await params

  const post = await prisma.guildSchedulePost.findUnique({
    where: { id: postId },
    include: { participants: { where: { status: 'accepted' } } },
  })
  if (!post || post.expeditionId !== id) return NextResponse.json({ error: '공고를 찾을 수 없음' }, { status: 404 })
  if (post.creatorId !== session.user.id) return NextResponse.json({ error: '방장만 가능' }, { status: 403 })
  if (post.status !== 'closed') return NextResponse.json({ error: '모집완료 상태에서만 완료 처리 가능' }, { status: 400 })
  if (new Date() < new Date(post.scheduledAt)) {
    return NextResponse.json({ error: '레이드 시작 시간 이후에만 완료 처리 가능' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const { excludedUserIds = [] } = body
  const excludedSet = new Set(excludedUserIds)

  // 포함 대상 참가자만 필터
  const included = post.participants.filter(p => !excludedSet.has(p.userId))

  // 각 캐릭터의 해당 레이드 CharacterRaid를 전체 관문 클리어로 업데이트
  const charIds = included.map(p => p.characterId).filter(Boolean)

  // 현재 주 resetAt 계산 (다음 수요일 06:00 KST)
  function getNextWedKST() {
    const now = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const kstNow = new Date(now.getTime() + kstOffset)
    const day = kstNow.getUTCDay() // 0=일 1=월 ... 3=수
    const daysUntilWed = ((3 - day + 7) % 7) || 7
    const wed = new Date(kstNow)
    wed.setUTCDate(kstNow.getUTCDate() + daysUntilWed)
    wed.setUTCHours(6, 0, 0, 0)
    return new Date(wed.getTime() - kstOffset)
  }
  const resetAt = getNextWedKST()

  // 각 캐릭터의 해당 레이드 gateClears를 전부 true로
  if (charIds.length > 0) {
    const raids = await prisma.characterRaid.findMany({
      where: {
        characterId: { in: charIds },
        raidId: post.raidId,
        difficulty: post.difficulty,
      },
    })
    const raidMap = new Map(raids.map(r => [r.characterId, r]))

    await prisma.$transaction(
      charIds.map(charId => {
        const existing = raidMap.get(charId)
        if (existing) {
          return prisma.characterRaid.update({
            where: { id: existing.id },
            data: { gateClears: existing.gateClears.map(() => true) },
          })
        }
        return prisma.$queryRaw`SELECT 1` // no-op for chars without the raid entry
      })
    )
  }

  // 제외된 멤버 excludedFromDone 표시
  if (excludedUserIds.length > 0) {
    await prisma.guildScheduleParticipant.updateMany({
      where: { postId, userId: { in: excludedUserIds } },
      data: { excludedFromDone: true },
    })
  }

  const updated = await prisma.guildSchedulePost.update({
    where: { id: postId },
    data: { status: 'done', completedAt: new Date() },
    include: { participants: true, partySlots: true },
  })

  return NextResponse.json(updated)
}

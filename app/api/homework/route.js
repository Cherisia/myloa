// GET  /api/homework?characterId=... → 캐릭터 숙제 목록
// POST /api/homework                → 숙제 등록/수정 (upsert)
// DELETE /api/homework              → 숙제 삭제

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextResetAt, isResetPassed } from '@/lib/raidData'

// 소유권 검증
async function verifyCharacterOwner(characterId, userId) {
  const char = await prisma.character.findFirst({
    where: { id: characterId, loaAccount: { userId } },
  })
  return !!char
}

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  if (!characterId) return NextResponse.json({ error: 'characterId 필요' }, { status: 400 })

  const ok = await verifyCharacterOwner(characterId, session.user.id)
  if (!ok) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const raids = await prisma.characterRaid.findMany({
    where: { characterId },
    orderBy: { createdAt: 'asc' },
  })

  // 초기화 시간 지난 항목 자동 리셋
  const resetIds = raids.filter(r => isResetPassed(r.resetAt)).map(r => r.id)
  if (resetIds.length > 0) {
    await prisma.$transaction(
      resetIds.map(id => prisma.characterRaid.update({
        where: { id },
        data: {
          gateClears: [],
          moreDone: false,
          moreFrom: 'bound',
          resetAt: getNextResetAt(),
        },
      }))
    )
  }

  const fresh = await prisma.characterRaid.findMany({
    where: { characterId },
    orderBy: { createdAt: 'asc' },
  })

  return NextResponse.json(fresh)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json()
  const { characterId, raidId, difficulty, gateClears, isGoldCheck, moreDone, moreFrom } = body

  if (!characterId || !raidId || !difficulty) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const ok = await verifyCharacterOwner(characterId, session.user.id)
  if (!ok) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const result = await prisma.characterRaid.upsert({
    where: { characterId_raidId_difficulty: { characterId, raidId, difficulty } },
    create: {
      characterId,
      raidId,
      difficulty,
      gateClears:  gateClears  ?? [],
      isGoldCheck: isGoldCheck ?? true,
      moreDone:    moreDone    ?? false,
      moreFrom:    moreFrom    ?? 'bound',
      resetAt:     getNextResetAt(),
    },
    update: {
      ...(gateClears  !== undefined && { gateClears }),
      ...(isGoldCheck !== undefined && { isGoldCheck }),
      ...(moreDone    !== undefined && { moreDone }),
      ...(moreFrom    !== undefined && { moreFrom }),
    },
  })

  return NextResponse.json(result)
}

export async function DELETE(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const characterId = searchParams.get('characterId')
  const raidId      = searchParams.get('raidId')
  const difficulty  = searchParams.get('difficulty')

  if (!characterId || !raidId || !difficulty) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const ok = await verifyCharacterOwner(characterId, session.user.id)
  if (!ok) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  await prisma.characterRaid.deleteMany({ where: { characterId, raidId, difficulty } })
  return NextResponse.json({ success: true })
}

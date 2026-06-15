// GET  /api/homework?characterId=... → 캐릭터 숙제 목록
// POST /api/homework                → 숙제 등록/수정 (upsert)
// DELETE /api/homework              → 숙제 삭제

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextResetAt, isResetPassed, validateRaidEntry } from '@/lib/raidData'
import { verifyCharacterOwner } from '@/lib/apiHelpers'

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

  // 초기화 시간 지난 항목 자동 리셋 (크론 실행 여유 60분 버퍼)
  const CRON_BUFFER_MS = 60 * 60 * 1000
  const now = Date.now()
  const resetIds = raids.filter(r => isResetPassed(r.resetAt) && (now - new Date(r.resetAt).getTime()) > CRON_BUFFER_MS).map(r => r.id)
  if (resetIds.length > 0) {
    const nextResetAt = getNextResetAt()
    await prisma.characterRaid.updateMany({
      where: { id: { in: resetIds } },
      data: { gateClears: [], moreDone: false, moreFrom: 'bound', resetAt: nextResetAt },
    })
    // 재조회 없이 in-memory 결과를 갱신해 동일 응답 구성 (DB 왕복 1회 절감)
    const resetSet = new Set(resetIds)
    for (const r of raids) {
      if (!resetSet.has(r.id)) continue
      r.gateClears = []
      r.moreDone = false
      r.moreFrom = 'bound'
      r.resetAt = nextResetAt
    }
  }

  return NextResponse.json(raids)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  const { characterId, raidId, difficulty, gateClears, isGoldCheck, moreDone, moreFrom } = body

  if (!characterId || !raidId || !difficulty) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }

  const entryError = validateRaidEntry({ raidId, difficulty, gateClears, isGoldCheck, moreDone, moreFrom })
  if (entryError) return NextResponse.json({ error: entryError }, { status: 400 })

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

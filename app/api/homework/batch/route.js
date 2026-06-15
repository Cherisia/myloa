// POST /api/homework/batch — 레이드 upsert/delete를 한 트랜잭션으로 일괄 처리
// sendBeacon(beforeunload)에서도 호출되므로 Content-Type: application/json 외 요청은 거부하지 않음

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextResetAt, validateRaidEntry } from '@/lib/raidData'

// 한 요청에서 처리 가능한 최대 op 수 (캐릭터×레이드 전량 저장도 충분히 수용하는 여유값)
const MAX_BATCH_OPS = 500

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  }

  const { ops } = body ?? {}
  if (!Array.isArray(ops) || ops.length === 0) return NextResponse.json({ ok: true })
  if (ops.length > MAX_BATCH_OPS) {
    return NextResponse.json({ error: '한 번에 처리할 수 있는 항목 수를 초과했습니다' }, { status: 413 })
  }

  // ── 입력 검증 ────────────────────────────────────────────────────────────────
  for (const op of ops) {
    if (!op.characterId || !op.type) {
      return NextResponse.json({ error: '잘못된 op 형식' }, { status: 400 })
    }
    if (op.type === 'upsert') {
      if (!op.entry?.raidId || !op.entry?.difficulty) {
        return NextResponse.json({ error: 'upsert 필수 항목 누락' }, { status: 400 })
      }
      const entryError = validateRaidEntry(op.entry)
      if (entryError) return NextResponse.json({ error: entryError }, { status: 400 })
    } else if (op.type === 'delete') {
      if (!op.raidId || !op.difficulty) {
        return NextResponse.json({ error: 'delete 필수 항목 누락' }, { status: 400 })
      }
    } else {
      return NextResponse.json({ error: `알 수 없는 op 타입: ${op.type}` }, { status: 400 })
    }
  }

  // ── 소유권 일괄 검증 (쿼리 1회) ──────────────────────────────────────────────
  const charIds = [...new Set(ops.map(op => op.characterId))]
  const ownedChars = await prisma.character.findMany({
    where: { id: { in: charIds }, expedition: { userId: session.user.id } },
    select: { id: true },
  })
  const ownedSet = new Set(ownedChars.map(c => c.id))
  if (charIds.some(id => !ownedSet.has(id))) {
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  }

  // ── 트랜잭션 일괄 실행 ────────────────────────────────────────────────────────
  await prisma.$transaction(
    ops.map(op => {
      if (op.type === 'upsert') {
        const { characterId, entry } = op
        return prisma.characterRaid.upsert({
          where: { characterId_raidId_difficulty: { characterId, raidId: entry.raidId, difficulty: entry.difficulty } },
          create: {
            characterId,
            raidId:      entry.raidId,
            difficulty:  entry.difficulty,
            gateClears:  entry.gateClears  ?? [],
            isGoldCheck: entry.isGoldCheck ?? true,
            moreDone:    entry.moreDone    ?? false,
            moreFrom:    entry.moreFrom    ?? 'bound',
            resetAt:     getNextResetAt(),
          },
          update: {
            ...(entry.gateClears  !== undefined && { gateClears:  entry.gateClears }),
            ...(entry.isGoldCheck !== undefined && { isGoldCheck: entry.isGoldCheck }),
            ...(entry.moreDone    !== undefined && { moreDone:    entry.moreDone }),
            ...(entry.moreFrom    !== undefined && { moreFrom:    entry.moreFrom }),
          },
        })
      }
      // type === 'delete'
      return prisma.characterRaid.deleteMany({
        where: { characterId: op.characterId, raidId: op.raidId, difficulty: op.difficulty },
      })
    }),
  )

  return NextResponse.json({ ok: true })
}

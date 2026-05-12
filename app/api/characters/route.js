// GET    /api/characters       → 내 캐릭터 목록 (flat array)
// POST   /api/characters       → 캐릭터 추가
// PATCH  /api/characters       → sortOrder 일괄 업데이트
// DELETE /api/characters?id=.. → 캐릭터 삭제 (hard delete)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encrypt'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const expeditions = await prisma.loaExpedition.findMany({
    where: { userId: session.user.id },
    include: {
      characters: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
      },
    },
  })

  const characters = expeditions.flatMap(exp =>
    exp.characters.map(c => ({
      id:           c.id,
      name:         c.name,
      class:        c.class,
      server:       c.server,
      itemLevel:    c.itemLevel,
      combatPower:  c.combatPower ?? null,
      sortOrder:    c.sortOrder,
      account:        exp.label,
      expeditionId:   exp.id,
      accountRepChar: exp.repCharName ?? null,
    }))
  )

  return NextResponse.json(characters)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { apiKey, label, repCharName, characters, siblingNames } = await request.json()
  if (!characters?.length) {
    return NextResponse.json({ error: '추가할 캐릭터가 없습니다' }, { status: 400 })
  }

  // ── API 키를 User에 저장/갱신 ─────────────────────────────────────────────
  if (apiKey) {
    await prisma.user.update({
      where: { id: session.user.id },
      data:  { apiKey: encrypt(apiKey), lastSyncedAt: new Date() },
    })
  }

  // ── 원정대 매칭 ──────────────────────────────────────────────────────────────
  // 1순위: siblingNames(같은 원정대 캐릭터명 목록)로 기존 Character → LoaExpedition 조회
  // 2순위: 없으면 새 LoaExpedition 생성
  let expedition = null

  if (siblingNames?.length) {
    const matchedChar = await prisma.character.findFirst({
      where: {
        name: { in: siblingNames },
        expedition: { userId: session.user.id },
        isActive: true,
      },
      include: { expedition: true },
    })
    if (matchedChar) expedition = matchedChar.expedition
  }

  if (!expedition) {
    const existingCount = await prisma.loaExpedition.count({ where: { userId: session.user.id } })
    const newLabel = label || (existingCount === 0 ? '원정대 1' : `원정대 ${existingCount + 1}`)
    expedition = await prisma.loaExpedition.create({
      data: {
        userId:      session.user.id,
        label:       newLabel,
        repCharName: repCharName || null,
      },
    })
  } else if (repCharName && !expedition.repCharName) {
    // 대표 캐릭터가 아직 없으면 최초 1회 설정
    expedition = await prisma.loaExpedition.update({
      where: { id: expedition.id },
      data:  { repCharName },
    })
  }

  // ── 캐릭터 생성 (중복 제외) ──────────────────────────────────────────────────
  const existing = await prisma.character.findMany({
    where:  { expeditionId: expedition.id },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(c => c.name))

  const newChars = characters.filter(c => !existingNames.has(c.name))
  if (newChars.length > 0) {
    await prisma.character.createMany({
      data: newChars.map((c, i) => ({
        expeditionId: expedition.id,
        name:         c.name,
        class:        c.class,
        server:       c.server,
        itemLevel:    c.itemLevel,
        combatPower:  c.combatPower ?? null,
        sortOrder:    existing.length + i,
        isActive:     true,
      })),
    })
  }

  return NextResponse.json({
    success:      true,
    added:        newChars.length,
    expeditionId: expedition.id,
  })
}

export async function PATCH(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { order } = await request.json()
  if (!Array.isArray(order) || order.length === 0)
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const ids = order.map(o => o.id)
  const owned = await prisma.character.findMany({
    where: { id: { in: ids }, expedition: { userId: session.user.id } },
    select: { id: true },
  })
  if (owned.length !== ids.length)
    return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  await prisma.$transaction(
    order.map(o => prisma.character.update({ where: { id: o.id }, data: { sortOrder: o.sortOrder } }))
  )

  return NextResponse.json({ success: true })
}

export async function DELETE(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id 필요' }, { status: 400 })

  const char = await prisma.character.findFirst({
    where: { id, expedition: { userId: session.user.id } },
  })
  if (!char) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 하드 삭제 — CharacterRaid는 onDelete: Cascade로 자동 삭제
  await prisma.character.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

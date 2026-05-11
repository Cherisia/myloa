// GET    /api/characters       → 내 캐릭터 목록 (flat array)
// POST   /api/characters       → 캐릭터 추가
// DELETE /api/characters?id=.. → 캐릭터 비활성화 (soft delete)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt, decrypt } from '@/lib/encrypt'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const accounts = await prisma.loaAccount.findMany({
    where: { userId: session.user.id },
    include: {
      characters: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
      },
    },
  })

  // 플랫 배열로 변환
  const characters = accounts.flatMap(acc =>
    acc.characters.map(c => ({
      id:           c.id,
      name:         c.name,
      class:        c.class,
      server:       c.server,
      itemLevel:    c.itemLevel,
      combatPower:  c.combatPower ?? null,
      sortOrder:    c.sortOrder,
      account:        acc.label,
      loaAccountId:   acc.id,
      expeditionId:   acc.loaExpeditionId ?? acc.id,
      accountRepChar: acc.repCharName ?? null,
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

  // ── 원정대 매칭 순서 ──────────────────────────────────────────────────────
  // 1순위: siblingNames(같은 원정대 캐릭터명 목록)로 기존 Character → LoaAccount 조회
  // 2순위: API 키로 기존 LoaAccount 매칭
  // 3순위: 없으면 새 LoaAccount + LoaExpedition 생성
  let loaAccount = null

  if (siblingNames?.length) {
    // 내 캐릭터 중 siblingNames에 포함된 캐릭터의 계정을 찾는다
    const matchedChar = await prisma.character.findFirst({
      where: {
        name: { in: siblingNames },
        loaAccount: { userId: session.user.id },
        isActive: true,
      },
      include: { loaAccount: true },
    })
    if (matchedChar) loaAccount = matchedChar.loaAccount
  }

  if (!loaAccount && apiKey) {
    const allAccounts = await prisma.loaAccount.findMany({ where: { userId: session.user.id } })
    for (const acc of allAccounts) {
      try {
        if (acc.apiKey && decrypt(acc.apiKey) === apiKey) { loaAccount = acc; break }
      } catch {}
    }
  }

  if (!loaAccount) {
    // 새 계정 + 원정대 생성
    const existingCount = await prisma.loaAccount.count({ where: { userId: session.user.id } })
    const newLabel = label || (existingCount === 0 ? '본계정' : `부계정${existingCount}`)

    // LoaExpedition 먼저 생성
    const newExpedition = await prisma.loaExpedition.create({
      data: {
        userId:      session.user.id,
        repCharName: repCharName || null,
      },
    })

    loaAccount = await prisma.loaAccount.create({
      data: {
        userId:           session.user.id,
        loaExpeditionId:  newExpedition.id,
        label:            newLabel,
        repCharName:      repCharName || null,
        apiKey:           apiKey ? encrypt(apiKey) : '',
        lastSyncedAt:     new Date(),
      },
    })
    loaAccount.loaExpeditionId = newExpedition.id
  } else {
    // 기존 계정 업데이트 (apiKey 갱신, repCharName 미설정 시 최초 설정)
    const updateData = {}
    if (apiKey) { updateData.apiKey = encrypt(apiKey); updateData.lastSyncedAt = new Date() }
    if (repCharName && !loaAccount.repCharName) updateData.repCharName = repCharName
    if (Object.keys(updateData).length > 0)
      loaAccount = await prisma.loaAccount.update({ where: { id: loaAccount.id }, data: updateData })

    // loaExpeditionId가 없으면 원정대 생성 (구형 데이터 호환)
    if (!loaAccount.loaExpeditionId) {
      const newExpedition = await prisma.loaExpedition.create({
        data: { userId: session.user.id, repCharName: loaAccount.repCharName || null },
      })
      loaAccount = await prisma.loaAccount.update({
        where: { id: loaAccount.id },
        data:  { loaExpeditionId: newExpedition.id },
      })
    }
  }

  // 기존 활성 캐릭터 조회
  const existing = await prisma.character.findMany({
    where:  { loaAccountId: loaAccount.id },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(c => c.name))

  // 없는 캐릭터만 생성
  const newChars = characters.filter(c => !existingNames.has(c.name))
  if (newChars.length > 0) {
    await prisma.character.createMany({
      data: newChars.map((c, i) => ({
        loaAccountId: loaAccount.id,
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
    expeditionId: loaAccount.loaExpeditionId ?? loaAccount.id,
    loaAccountId: loaAccount.id,
  })
}

// PATCH /api/characters → sortOrder 일괄 업데이트
export async function PATCH(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { order } = await request.json()
  if (!Array.isArray(order) || order.length === 0)
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })

  const ids = order.map(o => o.id)
  const owned = await prisma.character.findMany({
    where: { id: { in: ids }, loaAccount: { userId: session.user.id } },
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
    where: { id, loaAccount: { userId: session.user.id } },
  })
  if (!char) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  // 하드 삭제 — CharacterRaid는 onDelete: Cascade로 자동 삭제
  await prisma.character.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

// GET    /api/characters       → 내 캐릭터 목록 (flat array)
// POST   /api/characters       → 캐릭터 추가
// DELETE /api/characters?id=.. → 캐릭터 비활성화 (soft delete)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encrypt'

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
      account:      acc.label,
      loaAccountId: acc.id,
    }))
  )

  return NextResponse.json(characters)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { apiKey, label, characters } = await request.json()
  if (!characters?.length) {
    return NextResponse.json({ error: '추가할 캐릭터가 없습니다' }, { status: 400 })
  }

  // 동일 label의 기존 계정 재사용, 없으면 생성
  const accountLabel = label || '본계정'
  let loaAccount = await prisma.loaAccount.findFirst({
    where: { userId: session.user.id, label: accountLabel },
  })

  if (!loaAccount) {
    loaAccount = await prisma.loaAccount.create({
      data: {
        userId:       session.user.id,
        label:        accountLabel,
        apiKey:       apiKey ? encrypt(apiKey) : '',
        lastSyncedAt: new Date(),
      },
    })
  } else if (apiKey) {
    // API 키 갱신
    await prisma.loaAccount.update({
      where: { id: loaAccount.id },
      data:  { apiKey: encrypt(apiKey), lastSyncedAt: new Date() },
    })
  }

  // 기존 캐릭터 조회 (활성/비활성 모두)
  const existing = await prisma.character.findMany({
    where:  { loaAccountId: loaAccount.id },
    select: { name: true, isActive: true },
  })
  const activeNames   = new Set(existing.filter(c =>  c.isActive).map(c => c.name))
  const inactiveNames = new Set(existing.filter(c => !c.isActive).map(c => c.name))

  // 소프트삭제 캐릭터 재활성화
  const toReactivate = characters.filter(c => inactiveNames.has(c.name)).map(c => c.name)
  if (toReactivate.length > 0) {
    await prisma.character.updateMany({
      where: { loaAccountId: loaAccount.id, name: { in: toReactivate }, isActive: false },
      data:  { isActive: true },
    })
  }

  // 완전히 새로운 캐릭터만 생성
  const newChars = characters.filter(c => !activeNames.has(c.name) && !inactiveNames.has(c.name))
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

  return NextResponse.json({ success: true, added: newChars.length + toReactivate.length })
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

  await prisma.character.update({ where: { id }, data: { isActive: false } })
  return NextResponse.json({ success: true })
}

// GET /api/characters/raids — 내 캐릭터 + 현재 주간 characterRaids (일정 추가 모달용)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const expeditions = await prisma.loaExpedition.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'asc' },
    include: {
      characters: {
        where: { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
        include: { characterRaids: true },
      },
    },
  })

  const characters = expeditions.flatMap(exp =>
    exp.characters.map(c => ({
      id:             c.id,
      name:           c.name,
      class:          c.class,
      server:         c.server,
      itemLevel:      c.itemLevel,
      combatPower:    c.combatPower ?? null,
      sortOrder:      c.sortOrder,
      characterRaids: c.characterRaids,
    }))
  )

  return NextResponse.json(characters)
}

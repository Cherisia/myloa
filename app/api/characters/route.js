// GET  /api/characters → 내 캐릭터 목록 (flat array)
// POST /api/characters → 캐릭터 추가

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

  // 이미 존재하는 캐릭터명 조회 후 신규만 저장
  const existing = await prisma.character.findMany({
    where:  { loaAccountId: loaAccount.id },
    select: { name: true },
  })
  const existingNames = new Set(existing.map(c => c.name))

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

  return NextResponse.json({ success: true, added: newChars.length })
}

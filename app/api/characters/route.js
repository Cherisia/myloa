// GET  /api/characters → 내 캐릭터 목록
// POST /api/characters → 캐릭터 추가 (로아 계정 연동 후)

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

  return NextResponse.json(accounts)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { apiKey, label, characters } = await request.json()
  if (!apiKey || !characters?.length) {
    return NextResponse.json({ error: '필수 항목이 누락되었습니다' }, { status: 400 })
  }

  // API 키 암호화 저장
  const encryptedKey = encrypt(apiKey)

  const loaAccount = await prisma.loaAccount.create({
    data: {
      userId:      session.user.id,
      label:       label || '본계정',
      apiKey:      encryptedKey,
      lastSyncedAt: new Date(),
    },
  })

  // 선택된 캐릭터들 저장
  await prisma.character.createMany({
    data: characters.map((c, i) => ({
      loaAccountId: loaAccount.id,
      name:         c.name,
      class:        c.class,
      server:       c.server,
      itemLevel:    c.itemLevel,
      sortOrder:    i,
      isActive:     true,
    })),
  })

  return NextResponse.json({ success: true, accountId: loaAccount.id })
}

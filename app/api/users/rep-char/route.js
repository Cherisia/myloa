// PATCH /api/users/rep-char — 대표 캐릭터 설정

import { NextResponse } from 'next/server'
import { auth }          from '@/lib/auth'
import { prisma }        from '@/lib/db'

export async function PATCH(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { charId } = await request.json()

  // 본인 캐릭터인지 확인
  if (charId !== null) {
    const char = await prisma.character.findUnique({
      where:  { id: charId },
      select: { loaAccountId: true },
    })
    const account = char
      ? await prisma.loaAccount.findUnique({
          where:  { id: char.loaAccountId },
          select: { userId: true },
        })
      : null

    if (!char || account?.userId !== session.user.id) {
      return NextResponse.json({ error: '권한 없음' }, { status: 403 })
    }
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { repCharId: charId ?? null },
  })

  return NextResponse.json({ success: true, repCharId: charId ?? null })
}

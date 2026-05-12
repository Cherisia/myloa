// GET /api/characters/check-account?siblingNames=...
// siblingNames(쉼표 구분)로 기존 원정대 매칭 여부 확인

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const siblingParam = searchParams.get('siblingNames')

  if (!siblingParam) {
    return NextResponse.json({ isNewExpedition: true, matchedExpeditionId: null })
  }

  const siblingNames = siblingParam.split(',').map(s => s.trim()).filter(Boolean)

  const matchedChar = await prisma.character.findFirst({
    where: {
      name: { in: siblingNames },
      expedition: { userId: session.user.id },
      isActive: true,
    },
    include: { expedition: true },
  })

  if (!matchedChar) {
    return NextResponse.json({ isNewExpedition: true, matchedExpeditionId: null })
  }

  return NextResponse.json({
    isNewExpedition:     false,
    matchedExpeditionId: matchedChar.expedition.id,
    matchedRepChar:      matchedChar.expedition.repCharName ?? null,
  })
}

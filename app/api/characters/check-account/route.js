// GET /api/characters/check-account?apiKey=... → { isNewAccount: boolean, ... }
// 주어진 API 키 또는 캐릭터명(siblingNames)이 기존 LoaAccount와 매칭되는지 확인

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encrypt'

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const apiKey      = searchParams.get('apiKey')
  const siblingParam = searchParams.get('siblingNames') // comma-separated

  if (!apiKey && !siblingParam) return NextResponse.json({ error: 'apiKey 또는 siblingNames 필요' }, { status: 400 })

  let matched = null

  // 1순위: siblingNames로 기존 캐릭터 → LoaAccount 매칭
  if (siblingParam) {
    const siblingNames = siblingParam.split(',').map(s => s.trim()).filter(Boolean)
    if (siblingNames.length) {
      const matchedChar = await prisma.character.findFirst({
        where: {
          name: { in: siblingNames },
          loaAccount: { userId: session.user.id },
          isActive: true,
        },
        include: { loaAccount: true },
      })
      if (matchedChar) matched = matchedChar.loaAccount
    }
  }

  // 2순위: API 키로 매칭
  if (!matched && apiKey) {
    const allAccounts = await prisma.loaAccount.findMany({
      where: { userId: session.user.id },
      select: { id: true, apiKey: true, repCharName: true, label: true, loaExpeditionId: true },
    })
    for (const acc of allAccounts) {
      try {
        if (acc.apiKey && decrypt(acc.apiKey) === apiKey) { matched = acc; break }
      } catch {}
    }
  }

  return NextResponse.json({
    isNewAccount:        matched === null,
    matchedLabel:        matched?.label ?? null,
    matchedRepChar:      matched?.repCharName ?? null,
    matchedLoaAccountId: matched?.id ?? null,
    matchedExpeditionId: matched?.loaExpeditionId ?? matched?.id ?? null,
  })
}

// POST /api/characters/sync
// 저장된 API 키로 전체 캐릭터 정보(아이템레벨·전투력)를 갱신

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encrypt'

const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'

async function fetchProfile(name, apiKey) {
  const res = await fetch(
    `${LOA_BASE}/armories/characters/${encodeURIComponent(name)}?filters=profiles`,
    {
      headers: { Authorization: `bearer ${apiKey}`, Accept: 'application/json' },
      cache: 'no-store',
    }
  )
  if (!res.ok) return null
  return res.json()
}

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })
  }

  const accounts = await prisma.loaAccount.findMany({
    where: { userId: session.user.id },
    include: {
      characters: { where: { isActive: true } },
    },
  })

  if (!accounts.length) {
    return NextResponse.json({ error: '연동된 계정이 없습니다' }, { status: 404 })
  }

  let updatedCount = 0

  for (const account of accounts) {
    let apiKey
    try {
      apiKey = decrypt(account.apiKey)
    } catch {
      continue // 복호화 실패 시 해당 계정 스킵
    }

    // 각 캐릭터 프로필 병렬 조회
    await Promise.all(
      account.characters.map(async (char) => {
        try {
          const data = await fetchProfile(char.name, apiKey)
          if (!data?.ArmoryProfile) return

          const profile = data.ArmoryProfile

          const rawLevel = profile.ItemMaxLevel ?? profile.ItemAvgLevel ?? '0'
          const itemLevel = parseFloat(String(rawLevel).replace(/,/g, '')) || char.itemLevel

          const combatPower = profile.CombatPower
            ? parseFloat(String(profile.CombatPower).replace(/,/g, ''))
            : char.combatPower

          await prisma.character.update({
            where: { id: char.id },
            data:  { itemLevel, combatPower },
          })
          updatedCount++
        } catch (err) {
          console.error(`[SYNC] ${char.name} 오류:`, err.message)
        }
      })
    )

    // 계정 마지막 동기화 시각 갱신
    await prisma.loaAccount.update({
      where: { id: account.id },
      data:  { lastSyncedAt: new Date() },
    })
  }

  // 갱신된 캐릭터 목록 반환
  const updated = await prisma.loaAccount.findMany({
    where: { userId: session.user.id },
    include: {
      characters: {
        where:   { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
      },
    },
  })

  const characters = updated.flatMap(acc =>
    acc.characters.map(c => ({
      id:          c.id,
      name:        c.name,
      class:       c.class,
      server:      c.server,
      itemLevel:   c.itemLevel,
      combatPower: c.combatPower ?? null,
      account:     acc.label,
    }))
  )

  return NextResponse.json({ updatedCount, characters })
}

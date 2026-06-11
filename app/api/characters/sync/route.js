// POST /api/characters/sync
// User에 저장된 API 키로 전체 캐릭터 정보(아이템레벨·전투력)를 갱신

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encrypt'
import { getKurzanPreset, KURZAN_NAMES } from '@/app/dashboard/_constants'

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
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  // User에 저장된 API 키 조회
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { apiKey: true },
  })

  if (!user?.apiKey) {
    return NextResponse.json({ error: 'API 키가 등록되어 있지 않습니다' }, { status: 404 })
  }

  let apiKey
  try {
    apiKey = decrypt(user.apiKey)
  } catch {
    return NextResponse.json({ error: 'API 키 복호화 실패' }, { status: 500 })
  }

  // 모든 원정대 캐릭터 조회
  const expeditions = await prisma.loaExpedition.findMany({
    where: { userId: session.user.id },
    include: { characters: { where: { isActive: true } } },
  })

  if (!expeditions.length) {
    return NextResponse.json({ error: '등록된 캐릭터가 없습니다' }, { status: 404 })
  }

  let updatedCount = 0
  const CONCURRENCY = 5

  const allChars = expeditions.flatMap(exp => exp.characters)

  for (let i = 0; i < allChars.length; i += CONCURRENCY) {
    await Promise.all(
      allChars.slice(i, i + CONCURRENCY).map(async (char) => {
        try {
          const data = await fetchProfile(char.name, apiKey)
          if (!data?.ArmoryProfile) return

          const profile    = data.ArmoryProfile
          const rawLevel   = profile.ItemMaxLevel ?? profile.ItemAvgLevel ?? '0'
          const itemLevel  = parseFloat(String(rawLevel).replace(/,/g, '')) || char.itemLevel
          const combatPower = profile.CombatPower
            ? parseFloat(String(profile.CombatPower).replace(/,/g, ''))
            : char.combatPower

          await prisma.character.update({
            where: { id: char.id },
            data:  { itemLevel, combatPower },
          })

          // 쿠르잔 계열 아이템 이름이 새 레벨과 맞지 않으면 rename (DELETE + recreate)
          const correctPreset = getKurzanPreset(itemLevel)
          const kurzanItem = await prisma.characterCustomItem.findFirst({
            where: { characterId: char.id, name: { in: [...KURZAN_NAMES] } },
          })
          if (kurzanItem && kurzanItem.name !== correctPreset.name) {
            await prisma.$transaction([
              prisma.characterCustomItem.delete({ where: { id: kurzanItem.id } }),
              prisma.characterCustomItem.create({
                data: {
                  characterId: char.id,
                  name:        correctPreset.name,
                  type:        'daily',
                  image:       correctPreset.image,
                  sortOrder:   kurzanItem.sortOrder,
                  done:        kurzanItem.done,
                  restGauge:   kurzanItem.restGauge,
                  deducted:    kurzanItem.deducted,
                  resetAt:     kurzanItem.resetAt,
                },
              }),
            ])
          }

          updatedCount++
        } catch (err) {
          console.error(`[SYNC] ${char.name} 오류:`, err.message)
        }
      })
    )
  }

  // 마지막 동기화 시각 갱신
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { lastSyncedAt: new Date() },
  })

  // 갱신된 캐릭터 목록 반환
  const updated = await prisma.loaExpedition.findMany({
    where: { userId: session.user.id },
    include: {
      characters: {
        where:   { isActive: true },
        orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
      },
    },
  })

  const characters = updated
    .flatMap(exp =>
      exp.characters.map(c => ({
        id:             c.id,
        name:           c.name,
        class:          c.class,
        server:         c.server,
        itemLevel:      c.itemLevel,
        combatPower:    c.combatPower ?? null,
        sortOrder:      c.sortOrder,
        expeditionId:   exp.id,
        accountRepChar: exp.repCharName ?? null,
      }))
    )
    .sort((a, b) => a.sortOrder - b.sortOrder || b.itemLevel - a.itemLevel)

  return NextResponse.json({ updatedCount, characters })
}

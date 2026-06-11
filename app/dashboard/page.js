// 서버 컴포넌트 — DB에서 캐릭터 + 숙제를 미리 불러와 클라이언트에 전달
export const metadata = {
  title: '로스트아크 레이드 숙제 관리',
  description: '로스트아크 캐릭터별 주간 레이드 숙제를 체크하고 골드 수급을 계산하세요. 비로그인으로도 바로 체험할 수 있습니다.',
  alternates: { canonical: 'https://myloa.app/dashboard' },
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isResetPassed, getNextResetAt, getNextDailyResetAt } from '@/lib/raidData'
import DashboardClient from './DashboardClient'
import { DEMO_CHARS, DEMO_EXP_NAMES, DEMO_RAIDS, DEMO_CUSTOM_ITEMS } from './_demoDashboard'
import { REST_GAUGE_NAMES } from './_constants'

const EXPEDITION_INCLUDE = {
  characters: {
    where:   { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
    include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
  },
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <DashboardClient initialChars={DEMO_CHARS} initialRaids={DEMO_RAIDS} initialCustomItems={DEMO_CUSTOM_ITEMS} initialExpNames={DEMO_EXP_NAMES} initialRepCharId="demo-1" />
  }

  const userId = session.user.id
  const [expeditionsRaw, userRow, customItemsRaw] = await Promise.all([
    prisma.loaExpedition.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, include: EXPEDITION_INCLUDE }),
    prisma.user.findUnique({ where: { id: userId }, select: { apiKey: true } }),
    prisma.characterCustomItem.findMany({
      where: { character: { expedition: { userId } } },
      orderBy: [{ characterId: 'asc' }, { sortOrder: 'asc' }],
    }),
  ])
  const hasApiKey = !!userRow?.apiKey
  let expeditions = expeditionsRaw

  // 리셋 만료된 항목 일괄 처리
  const expiredIds = []
  expeditions.forEach(exp =>
    exp.characters.forEach(char =>
      char.characterRaids.forEach(r => { if (isResetPassed(r.resetAt)) expiredIds.push(r.id) })
    )
  )
  if (expiredIds.length > 0) {
    await prisma.$transaction(
      expiredIds.map(id => prisma.characterRaid.update({
        where: { id },
        data: { gateClears: [], moreDone: false, moreFrom: 'bound', resetAt: getNextResetAt() },
      }))
    )
    expeditions = await prisma.loaExpedition.findMany({ where: { userId }, include: EXPEDITION_INCLUDE })
  }

  // 일일 커스텀 숙제 리셋 만료 항목 처리
  const now = new Date()
  const expiredCustomIds = customItemsRaw.filter(it => it.type === 'daily' && it.resetAt && it.resetAt < now).map(it => it.id)
  if (expiredCustomIds.length > 0) {
    const nextDaily = getNextDailyResetAt()
    await prisma.$transaction(
      customItemsRaw
        .filter(it => expiredCustomIds.includes(it.id))
        .map(it => {
          const data = { deducted: false, resetAt: nextDaily }
          if (it.done) {
            data.done = false
          } else if (REST_GAUGE_NAMES.has(it.name)) {
            data.restGauge = Math.min(it.restGauge + 10, 100)
          }
          return prisma.characterCustomItem.update({ where: { id: it.id }, data })
        })
    )
    // 리셋 후 다시 조회
    const refreshed = await prisma.characterCustomItem.findMany({
      where: { character: { expedition: { userId } } },
      orderBy: [{ characterId: 'asc' }, { sortOrder: 'asc' }],
    })
    customItemsRaw.length = 0
    refreshed.forEach(it => customItemsRaw.push(it))
  }

  const initialChars = []
  const initialRaids = {}
  const initialExpNames = {}
  expeditions.forEach((exp, i) => {
    initialExpNames[exp.id] = exp.customName || `원정대 ${i + 1}`
  })

  // 원정대 탭 순서를 sortOrder 기준으로 결정하기 위해 전체 캐릭터를 전역 sortOrder 순으로 정렬
  const allCharsWithExp = expeditions.flatMap(exp => exp.characters.map(char => ({ char, exp })))
  allCharsWithExp.sort((a, b) => a.char.sortOrder - b.char.sortOrder || b.char.itemLevel - a.char.itemLevel)

  allCharsWithExp.forEach(({ char, exp }) => {
    initialChars.push({
      id:             char.id,
      name:           char.name,
      class:          char.class,
      server:         char.server,
      itemLevel:      char.itemLevel,
      combatPower:    char.combatPower ?? null,
      sortOrder:      char.sortOrder,
      expeditionId:   exp.id,
      accountRepChar: exp.repCharName ?? null,
    })
    initialRaids[char.id] = char.characterRaids.map(r => ({
      raidId:      r.raidId,
      difficulty:  r.difficulty,
      gateClears:  r.gateClears,
      isGoldCheck: r.isGoldCheck,
      moreDone:    r.moreDone,
      moreFrom:    r.moreFrom,
    }))
  })

  // 커스텀 숙제 4개의 맵으로 변환
  const initialCustomItems         = {}
  const initialCustomChecks        = {}
  const initialRestGauge           = {}
  const initialRestGaugeDeducted   = {}
  customItemsRaw.forEach(it => {
    if (!initialCustomItems[it.characterId])       initialCustomItems[it.characterId]       = []
    if (!initialCustomChecks[it.characterId])      initialCustomChecks[it.characterId]      = {}
    if (!initialRestGauge[it.characterId])         initialRestGauge[it.characterId]         = {}
    if (!initialRestGaugeDeducted[it.characterId]) initialRestGaugeDeducted[it.characterId] = {}

    initialCustomItems[it.characterId].push({ id: it.id, name: it.name, type: it.type, image: it.image })
    if (it.done)      initialCustomChecks[it.characterId][it.id]      = true
    if (it.restGauge) initialRestGauge[it.characterId][it.id]         = it.restGauge
    if (it.deducted)  initialRestGaugeDeducted[it.characterId][it.id] = true
  })

  return <DashboardClient
    initialChars={initialChars}
    initialRaids={initialRaids}
    isLoggedIn
    initialHasApiKey={hasApiKey}
    initialExpNames={initialExpNames}
    initialCustomItems={initialCustomItems}
    initialCustomChecks={initialCustomChecks}
    initialRestGauge={initialRestGauge}
    initialRestGaugeDeducted={initialRestGaugeDeducted}
  />
}

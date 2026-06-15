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
  // Vercel Cron이 최대 30~60분 늦게 실행될 수 있으므로, 리셋 시각 이후 60분 이내엔
  // 자동 리셋 건너뜀 — 크론이 스냅샷(WeeklyRaidHistory)을 저장한 뒤 resetAt을
  // 다음 주로 업데이트하면 isResetPassed가 false가 되어 자동으로 비활성화됨
  const CRON_BUFFER_MS = 60 * 60 * 1000 // 60분
  const nowMs = Date.now()
  const expiredIds = []
  expeditions.forEach(exp =>
    exp.characters.forEach(char =>
      char.characterRaids.forEach(r => {
        if (isResetPassed(r.resetAt) && (nowMs - new Date(r.resetAt).getTime()) > CRON_BUFFER_MS) {
          expiredIds.push(r.id)
        }
      })
    )
  )
  if (expiredIds.length > 0) {
    const nextResetAt = getNextResetAt()
    await prisma.$transaction(
      expiredIds.map(id => prisma.characterRaid.update({
        where: { id },
        data: { gateClears: [], moreDone: false, moreFrom: 'bound', resetAt: nextResetAt },
      }))
    )
    // 재조회 없이 이미 로드한 그래프를 in-memory로 갱신 (대형 원정대 그래프 재조회 1회 절감)
    const expiredSet = new Set(expiredIds)
    expeditions.forEach(exp => exp.characters.forEach(char => char.characterRaids.forEach(r => {
      if (!expiredSet.has(r.id)) return
      r.gateClears = []
      r.moreDone = false
      r.moreFrom = 'bound'
      r.resetAt = nextResetAt
    })))
  }

  // 일일 커스텀 숙제 리셋 만료 항목 처리
  const now = new Date()
  const expiredCustomIds = customItemsRaw.filter(it => it.type === 'daily' && it.resetAt && it.resetAt < now).map(it => it.id)
  if (expiredCustomIds.length > 0) {
    const nextDaily = getNextDailyResetAt()
    const expiredCustomSet = new Set(expiredCustomIds)
    await prisma.$transaction(
      customItemsRaw
        .filter(it => expiredCustomSet.has(it.id))
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
    // 재조회 없이 동일 로직을 in-memory에 반영 (커스텀 숙제 재조회 1회 절감)
    customItemsRaw.forEach(it => {
      if (!expiredCustomSet.has(it.id)) return
      it.deducted = false
      it.resetAt = nextDaily
      if (it.done) {
        it.done = false
      } else if (REST_GAUGE_NAMES.has(it.name)) {
        it.restGauge = Math.min(it.restGauge + 10, 100)
      }
    })
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

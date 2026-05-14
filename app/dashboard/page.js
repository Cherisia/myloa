// 서버 컴포넌트 — DB에서 캐릭터 + 숙제를 미리 불러와 클라이언트에 전달
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isResetPassed, getNextResetAt } from '@/lib/raidData'
import DashboardClient from './DashboardClient'

// ── 비로그인 미리보기용 더미 데이터 ───────────────────────────────────────────
const DEMO_CHARS = [
  { id: 'demo-1', name: '팍지니',           class: '배틀마스터', server: '루페온', itemLevel: 1773.33, combatPower: 6127.42, expeditionId: 'demo', accountRepChar: '팍지니' },
  { id: 'demo-2', name: '로헨델카지노박마담', class: '아르카나',   server: '루페온', itemLevel: 1755.00, combatPower: 4619.88, expeditionId: 'demo', accountRepChar: '팍지니' },
  { id: 'demo-3', name: '절구주는비치',      class: '바드',       server: '루페온', itemLevel: 1740.00, combatPower: 3648.97, expeditionId: 'demo', accountRepChar: '팍지니' },
  { id: 'demo-4', name: '질풍노도훈수사',    class: '환수사',     server: '루페온', itemLevel: 1732.50, combatPower: 2557.27, expeditionId: 'demo', accountRepChar: '팍지니' },
  { id: 'demo-5', name: '다베어버릴거에요',  class: '소울이터',   server: '루페온', itemLevel: 1730.00, combatPower: 3504.42, expeditionId: 'demo', accountRepChar: '팍지니' },
  { id: 'demo-6', name: '도화가장인김우림',  class: '도화가',     server: '루페온', itemLevel: 1720.83, combatPower: 1314.27, expeditionId: 'demo', accountRepChar: '팍지니' },
]
const DEMO_RAIDS = {
  'demo-1': [
    { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [false],         isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  'demo-2': [
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  'demo-3': [
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  'demo-4': [
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  'demo-5': [
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  'demo-6': [
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'cathedral',     difficulty: 'stage2',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'normal',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
}

const mkPresets = (id) => [
  { id: `d-kurzan-${id}`,  name: '쿠르잔 전선',   type: 'daily',  image: '/schedule/kurzan.png'   },
  { id: `d-guardian-${id}`,name: '가디언 토벌',   type: 'daily',  image: '/schedule/guardian.png' },
  { id: `d-hal-${id}`,     name: '할의 모래시계', type: 'weekly', image: '/schedule/hal.png'      },
  { id: `d-paradise-${id}`,name: '낙원',          type: 'weekly', image: '/schedule/paradise.png' },
  { id: `d-cube-${id}`,    name: '큐브',          type: 'weekly', image: '/schedule/cube.png'     },
]
const DEMO_CUSTOM_ITEMS = Object.fromEntries(
  ['demo-1','demo-2','demo-3','demo-4','demo-5','demo-6'].map(id => [id, mkPresets(id)])
)

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
    return <DashboardClient initialChars={DEMO_CHARS} initialRaids={DEMO_RAIDS} initialCustomItems={DEMO_CUSTOM_ITEMS} initialRepCharId="demo-1" />
  }

  const userId = session.user.id
  const [expeditionsRaw, userRow] = await Promise.all([
    prisma.loaExpedition.findMany({ where: { userId }, orderBy: { createdAt: 'asc' }, include: EXPEDITION_INCLUDE }),
    prisma.user.findUnique({ where: { id: userId }, select: { apiKey: true } }),
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

  const initialChars = []
  const initialRaids = {}
  const initialExpNames = {}
  expeditions.forEach(exp => {
    if (exp.customName) initialExpNames[exp.id] = exp.customName
    exp.characters.forEach(char => {
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
  })

  return <DashboardClient initialChars={initialChars} initialRaids={initialRaids} isLoggedIn initialHasApiKey={hasApiKey} initialExpNames={initialExpNames} />
}

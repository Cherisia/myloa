// 서버 컴포넌트 — DB에서 캐릭터 + 숙제를 미리 불러와 클라이언트에 전달
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isResetPassed, getNextResetAt } from '@/lib/raidData'
import DashboardClient from './DashboardClient'

// ── 비로그인 미리보기용 더미 데이터 (킴지니 원정대 상위 6캐릭터 · trade 전략 자동설정) ──
const DEMO_CHARS = [
  { id: 'demo-1', name: '팍지니',           class: '배틀마스터', server: '루페온', itemLevel: 1773.33, combatPower: 6127.42, account: '본계정', loaAccountId: 'demo' },
  { id: 'demo-2', name: '로헨델카지노박마담', class: '아르카나',   server: '루페온', itemLevel: 1755.00, combatPower: 4619.88, account: '본계정', loaAccountId: 'demo' },
  { id: 'demo-3', name: '절구주는비치',      class: '바드',       server: '루페온', itemLevel: 1740.00, combatPower: 3648.97, account: '본계정', loaAccountId: 'demo' },
  { id: 'demo-4', name: '질풍노도훈수사',    class: '환수사',     server: '루페온', itemLevel: 1732.50, combatPower: 2557.27, account: '본계정', loaAccountId: 'demo' },
  { id: 'demo-5', name: '다베어버릴거에요',  class: '소울이터',   server: '루페온', itemLevel: 1730.00, combatPower: 3504.42, account: '본계정', loaAccountId: 'demo' },
  { id: 'demo-6', name: '도화가장인김우림',  class: '도화가',     server: '루페온', itemLevel: 1720.83, combatPower: 1314.27, account: '본계정', loaAccountId: 'demo' },
]
const DEMO_RAIDS = {
  // 킴지니 1773.33 — serca 나메(1740✓) · kazeros-final 하드(1730✓) · armocha 하드(1720✓) + egir-ex 나메(1770✓)
  'demo-1': [
    { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [false],         isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  // 지니뇨속 1755.00 — serca 나메(1740✓) · kazeros-final 하드(1730✓) · armocha 하드(1720✓)
  'demo-2': [
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  // 킴젤르 1740.00 — serca 나메(1740✓) · kazeros-final 하드(1730✓) · armocha 하드(1720✓)
  'demo-3': [
    { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  // 쮜니킴 1732.50 — kazeros-final 하드(1730✓) · serca 하드(1730✓) · armocha 하드(1720✓)  [나메 1740 미달]
  'demo-4': [
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  // 지니킴 1730.00 — kazeros-final 하드(1730✓) · serca 하드(1730✓) · armocha 하드(1720✓)  [나메 1740 미달]
  'demo-5': [
    { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
  // 붓지니 1720.83 — armocha 하드(1720✓) · serca 노말(1710✓) · kazeros-final 노말(1710✓)  [하드 1730 미달]
  'demo-6': [
    { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'serca',         difficulty: 'normal',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
    { raidId: 'kazeros-final', difficulty: 'normal',    gateClears: [false, false],  isGoldCheck: true, moreDone: false, moreFrom: 'bound' },
  ],
}

const ACCOUNT_INCLUDE = {
  characters: {
    where:   { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
    include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
  },
}

export default async function DashboardPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <DashboardClient initialChars={DEMO_CHARS} initialRaids={DEMO_RAIDS} />
  }

  const userId = session.user.id
  let accounts = await prisma.loaAccount.findMany({ where: { userId }, include: ACCOUNT_INCLUDE })

  // 리셋 만료된 항목 일괄 처리
  const expiredIds = []
  accounts.forEach(acc =>
    acc.characters.forEach(char =>
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
    accounts = await prisma.loaAccount.findMany({ where: { userId }, include: ACCOUNT_INCLUDE })
  }

  const initialChars = []
  const initialRaids = {}
  accounts.forEach(acc =>
    acc.characters.forEach(char => {
      initialChars.push({
        id:           char.id,
        name:         char.name,
        class:        char.class,
        server:       char.server,
        itemLevel:    char.itemLevel,
        combatPower:  char.combatPower ?? null,
        account:      acc.label,
        loaAccountId: acc.id,
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
  )

  return <DashboardClient initialChars={initialChars} initialRaids={initialRaids} isLoggedIn />
}

// 서버 컴포넌트 — DB에서 캐릭터 + 숙제를 미리 불러와 클라이언트에 전달
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isResetPassed, getNextResetAt } from '@/lib/raidData'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()

  let initialChars = []
  let initialRaids = {} // { [charId]: [...entries] }

  if (session?.user?.id) {
    const accounts = await prisma.loaAccount.findMany({
      where: { userId: session.user.id },
      include: {
        characters: {
          where:   { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
          include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
        },
      },
    })

    // 리셋 만료된 항목 일괄 처리
    const expiredIds = []
    accounts.forEach(acc =>
      acc.characters.forEach(char =>
        char.characterRaids.forEach(r => {
          if (isResetPassed(r.resetAt)) expiredIds.push(r.id)
        })
      )
    )
    if (expiredIds.length > 0) {
      await prisma.$transaction(
        expiredIds.map(id => prisma.characterRaid.update({
          where: { id },
          data: { gateClears: [], moreDone: false, moreFrom: 'bound', resetAt: getNextResetAt() },
        }))
      )
      // 리셋 후 재조회
      const refreshed = await prisma.loaAccount.findMany({
        where: { userId: session.user.id },
        include: {
          characters: {
            where:   { isActive: true },
            orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
            include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
          },
        },
      })
      accounts.splice(0, accounts.length, ...refreshed)
    }

    accounts.forEach(acc =>
      acc.characters.forEach(char => {
        initialChars.push({
          id:          char.id,
          name:        char.name,
          class:       char.class,
          server:      char.server,
          itemLevel:   char.itemLevel,
          combatPower: char.combatPower ?? null,
          account:     acc.label,
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
  }

  return <DashboardClient initialChars={initialChars} initialRaids={initialRaids} />
}

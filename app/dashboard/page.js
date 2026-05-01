// 서버 컴포넌트 — DB에서 캐릭터를 미리 불러와 클라이언트에 전달
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const session = await auth()

  let initialChars = []
  if (session?.user?.id) {
    const accounts = await prisma.loaAccount.findMany({
      where: { userId: session.user.id },
      include: {
        characters: {
          where:   { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
        },
      },
    })
    initialChars = accounts.flatMap(acc =>
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
  }

  return <DashboardClient initialChars={initialChars} />
}

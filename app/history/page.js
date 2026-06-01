export const metadata = {
  title: '숙제 히스토리 - myloa',
  description: '주간 레이드 숙제 완료 히스토리',
  robots: { index: false, follow: false },
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import HistoryClient from './HistoryClient'

// 비로그인 데모용 — 수요일 06:00 KST 기준 12주 샘플
function makeDemoHistory() {
  // 2026-05-28 06:00 KST = 2026-05-27 21:00 UTC
  const BASE = new Date('2026-05-27T21:00:00.000Z')
  const WEEK = 7 * 24 * 60 * 60 * 1000
  const weeks = [
    { totalRaids: 12, goldRaids: 8,  totalGold: 82500  },
    { totalRaids: 15, goldRaids: 10, totalGold: 107000 },
    { totalRaids: 10, goldRaids: 7,  totalGold: 71000  },
    { totalRaids: 16, goldRaids: 11, totalGold: 118500 },
    { totalRaids: 14, goldRaids: 9,  totalGold: 96000  },
    { totalRaids: 11, goldRaids: 7,  totalGold: 74500  },
    { totalRaids: 17, goldRaids: 12, totalGold: 131000 },
    { totalRaids: 13, goldRaids: 9,  totalGold: 98000  },
    { totalRaids: 9,  goldRaids: 6,  totalGold: 62000  },
    { totalRaids: 15, goldRaids: 11, totalGold: 115000 },
    { totalRaids: 16, goldRaids: 11, totalGold: 121500 },
    { totalRaids: 18, goldRaids: 13, totalGold: 142000 },
  ]
  return weeks.map((w, i) => ({
    id:        `demo-hist-${i}`,
    weekStart: new Date(BASE.getTime() - (11 - i) * WEEK).toISOString(),
    ...w,
  }))
}

export default async function HistoryPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <HistoryClient history={makeDemoHistory()} isDemo />
  }

  const history = await prisma.weeklyRaidHistory.findMany({
    where:   { userId: session.user.id },
    orderBy: { weekStart: 'asc' },
    take:    12,
    select:  { id: true, weekStart: true, totalRaids: true, goldRaids: true, totalGold: true },
  })

  return <HistoryClient history={history} />
}

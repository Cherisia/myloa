import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GuildClient from './GuildClient'
import { DEMO_GUILDS } from './_demoGuild'

export const metadata = {
  title: '로스트아크 길드 레이드 현황',
  description: '길드원들의 레이드 진행 현황을 한눈에 확인하고 공략을 함께 계획하세요.',
  robots: { index: false, follow: false },
}

export default async function GuildPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <GuildClient initialGroups={DEMO_GUILDS} isDemo />
  }

  const memberships = await prisma.expeditionMember.findMany({
    where: { userId: session.user.id, status: 'active' },
    include: {
      expedition: {
        include: {
          members: {
            include: { user: { select: { id: true, image: true } } },
            orderBy: { joinedAt: 'asc' },
          },
          leader: {
            select: {
              id: true, name: true, image: true, nickname: true,
              loaExpeditions: {
                select: { repCharName: true },
                take: 1,
              },
            },
          },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  // 길드별 전체 활성 캐릭터 수 일괄 조회
  const expeditionIds = memberships.map(m => m.expedition.id)
  const charCountRows = await prisma.$queryRaw`
    SELECT em."expeditionId", COUNT(c.id)::int AS cnt
    FROM "ExpeditionMember" em
    JOIN "LoaExpedition" le ON le."userId" = em."userId"
    JOIN "Character" c ON c."expeditionId" = le.id AND c."isActive" = true
    WHERE em."expeditionId" = ANY(${expeditionIds}) AND em.status = 'active'
    GROUP BY em."expeditionId"
  `
  const charCountMap = Object.fromEntries(charCountRows.map(r => [r.expeditionId, r.cnt]))

  const groups = memberships.map(m => {
    const exp = m.expedition
    const isLeader   = exp.leaderId === session.user.id
    const activeMembers = exp.members.filter(mem => mem.status === 'active')
    const pendingCount  = exp.members.filter(mem => mem.status === 'pending').length
    const memberAvatars = activeMembers.map(mem => mem.user?.image || '/default-avatar.svg')
    const leaderNickname = exp.leader?.nickname
      || exp.leader?.loaExpeditions?.[0]?.repCharName
      || exp.leader?.name
      || null
    return {
      id:             exp.id,
      name:           exp.name,
      description:    exp.description,
      maxMembers:     exp.maxMembers,
      memberCount:    activeMembers.length,
      totalCharCount: charCountMap[exp.id] ?? 0,
      pendingCount:   isLeader ? pendingCount : 0,
      myRole:         isLeader ? 'leader' : 'member',
      leaderNickname,
      memberAvatars,
    }
  })

  return <GuildClient initialGroups={groups} />
}

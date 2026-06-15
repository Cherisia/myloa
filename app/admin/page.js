import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import AdminClient from './AdminClient'

export const metadata = {
  title: '관리자',
  robots: { index: false, follow: false },
}

const ADMIN_EMAILS = ['be_the_hero@naver.com']

export default async function AdminPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/dashboard')

  const adminUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      email: true,
      name: true,
      nickname: true,
      discordUsername: true,
      image: true,
      repCharId: true,
      loaExpeditions: {
        select: {
          id: true,
          characters: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              class: true,
              itemLevel: true,
              combatPower: true,
              characterRaids: {
                select: {
                  raidId: true,
                  difficulty: true,
                  gateClears: true,
                  isGoldCheck: true,
                  moreDone: true,
                  moreFrom: true,
                },
              },
            },
          },
        },
      },
    },
  })
  if (!ADMIN_EMAILS.includes(adminUser?.email)) redirect('/dashboard')

  // ── 사용자 목록 ──────────────────────────────────────────────────────────
  const users = await prisma.user.findMany({
    select: {
      id: true,
      name: true,
      nickname: true,
      discordUsername: true,
      email: true,
      image: true,
      createdAt: true,
      updatedAt: true,
      loaExpeditions: {
        select: {
          id: true,
          repCharName: true,
          characters: {
            where: { isActive: true },
            select: {
              id: true,
              name: true,
              class: true,
              itemLevel: true,
              characterRaids: {
                select: { id: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' },
                take: 1,
              },
              customItems: {
                select: { type: true, updatedAt: true },
              },
            },
          },
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const userStats = users.map(u => {
    const allChars = u.loaExpeditions.flatMap(e => e.characters)
    const charCount = allChars.length
    const raidCounts = allChars.flatMap(c => c.characterRaids)
    const lastRaidAt = raidCounts.length > 0
      ? raidCounts.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))[0].updatedAt
      : null

    let lastDailyAt = null
    let lastWeeklyAt = null
    for (const item of allChars.flatMap(c => c.customItems || [])) {
      const t = new Date(item.updatedAt)
      if (item.type === 'daily' && (!lastDailyAt || t > new Date(lastDailyAt))) lastDailyAt = item.updatedAt
      if (item.type === 'weekly' && (!lastWeeklyAt || t > new Date(lastWeeklyAt))) lastWeeklyAt = item.updatedAt
    }
    const homeworkTimes = [lastDailyAt, lastWeeklyAt].filter(Boolean)
    const lastHomeworkAt = homeworkTimes.length === 0 ? null :
      homeworkTimes.reduce((max, t) => new Date(t) > new Date(max) ? t : max)

    return {
      id: u.id,
      name: u.name,
      nickname: u.nickname,
      discordUsername: u.discordUsername,
      email: u.email,
      image: u.image,
      createdAt: u.createdAt,
      charCount,
      expeditionCount: u.loaExpeditions.length,
      lastRaidAt,
      lastDailyAt,
      lastWeeklyAt,
      lastHomeworkAt,
    }
  })

  // ── 길드(공격대) 목록 ─────────────────────────────────────────────────────
  const expeditions = await prisma.expedition.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      createdAt: true,
      updatedAt: true,
      inviteCode: true,
      maxMembers: true,
      autoAccept: true,
      leader: {
        select: {
          id: true,
          name: true,
          nickname: true,
          discordUsername: true,
          email: true,
        },
      },
      members: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  })

  const guildStats = expeditions.map(exp => ({
    id: exp.id,
    name: exp.name,
    description: exp.description,
    createdAt: exp.createdAt,
    updatedAt: exp.updatedAt,
    inviteCode: exp.inviteCode,
    maxMembers: exp.maxMembers,
    autoAccept: exp.autoAccept,
    leaderName: exp.leader?.nickname || exp.leader?.name || exp.leader?.discordUsername || '-',
    leaderEmail: exp.leader?.email,
    memberCount: exp.members.filter(m => m.status === 'active').length,
    pendingCount: exp.members.filter(m => m.status === 'pending').length,
    totalMembers: exp.members.length,
  }))

  return (
    <AdminClient
      userStats={userStats}
      guildStats={guildStats}
      totalUsers={users.length}
      totalGuilds={expeditions.length}
      adminUser={adminUser}
    />
  )
}

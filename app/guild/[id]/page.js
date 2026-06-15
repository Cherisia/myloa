import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import GuildDetailClient from './GuildDetailClient'
import { DEMO_GUILDS } from '@/app/guild/_demoGuild'
import { DEMO_FRIENDS, DEMO_ME } from '@/app/group/_demoGroup'

export const metadata = {
  title: '길드 상세',
  description: '길드원들의 레이드 진행 현황을 확인하세요.',
  robots: { index: false, follow: false },
}

export default async function GuildDetailPage({ params }) {
  const session = await auth()
  const { id } = await params

  if (!session?.user?.id) {
    const demoGuild = DEMO_GUILDS.find(g => g.id === id)
    if (!demoGuild) redirect('/guild')

    const demoUserId = DEMO_ME.id
    const demoExpedition = {
      id: demoGuild.id,
      name: demoGuild.name,
      description: demoGuild.description || null,
      leaderId: demoUserId,
      inviteCode: 'DEMO1234',
      autoAccept: false,
      notice: null,
      maxMembers: demoGuild.maxMembers,
      favoritedUserIds: [],
      members: [
        { userId: DEMO_ME.id, status: 'active', role: 'leader', visibility: 'all', joinedAt: new Date().toISOString(), user: DEMO_ME },
        ...DEMO_FRIENDS.map(f => ({
          userId: f.id,
          status: 'active',
          role: 'member',
          visibility: 'all',
          joinedAt: new Date().toISOString(),
          user: f,
        })),
      ],
    }
    return <GuildDetailClient expedition={demoExpedition} userId={demoUserId} isDemo />
  }

  const expedition = await prisma.expedition.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, name: true, discordUsername: true, image: true } },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              nickname: true,
              discordUsername: true,
              image: true,
              raidPublic: true,
              loaExpeditions: {
                orderBy: { createdAt: 'asc' },
                include: {
                  characters: {
                    where:   { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
                    include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
                  },
                },
              },
            },
          },
        },
        orderBy: { joinedAt: 'asc' },
      },
      favorites: { where: { viewerUserId: session.user.id } },
    },
  })

  if (!expedition) notFound()

  const myMembership = expedition.members.find(m => m.userId === session.user.id)
  if (!myMembership || myMembership.status === 'rejected' || myMembership.status === 'left') {
    redirect('/guild')
  }

  return (
    <GuildDetailClient
      expedition={{ ...expedition, favoritedUserIds: expedition.favorites.map(f => f.targetUserId) }}
      userId={session.user.id}
    />
  )
}

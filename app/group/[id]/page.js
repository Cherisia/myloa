import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { notFound, redirect } from 'next/navigation'
import GroupDetailClient from './GroupDetailClient'

const GROUP_ALLOWED_EMAILS = ['be_the_hero@naver.com', 'yhc920923@gmail.com']

export default async function GroupDetailPage({ params }) {
  const session = await auth()
  if (!session?.user?.id || !GROUP_ALLOWED_EMAILS.includes(session.user.email)) redirect('/dashboard')

  const { id } = await params

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
              discordUsername: true,
              image: true,
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
    redirect('/group')
  }

  return (
    <GroupDetailClient
      expedition={{ ...expedition, favoritedUserIds: expedition.favorites.map(f => f.targetUserId) }}
      userId={session.user.id}
      myMembership={myMembership}
    />
  )
}

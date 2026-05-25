import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import FriendsClient from './FriendsClient'

export const metadata = { title: '친구 — myloa' }

export default async function FriendsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/dashboard')

  const viewerUserId = session.user.id

  const favorites = await prisma.expeditionMemberFavorite.findMany({
    where: { viewerUserId },
    select: { targetUserId: true },
  })

  const targetIds = [...new Set(favorites.map(f => f.targetUserId))]

  let friends = []
  if (targetIds.length > 0) {
    friends = await prisma.user.findMany({
      where: { id: { in: targetIds } },
      select: {
        id: true,
        name: true,
        nickname: true,
        discordUsername: true,
        image: true,
        raidPublic: true,
        raidPublicFriends: true,
        loaExpeditions: {
          orderBy: { createdAt: 'asc' },
          include: {
            characters: {
              where: { isActive: true },
              orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
              include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
            },
          },
        },
      },
    })
  }

  return <FriendsClient initialFriends={friends} />
}

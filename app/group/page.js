import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GroupClient from './GroupClient'
import { DEMO_FRIENDS, DEMO_ME, DEMO_INCOMING_REQUESTS } from './_demoGroup'

export const metadata = {
  title: '로스트아크 그룹원 레이드 현황',
  description: '친구들의 레이드 현황을 확인하고 함께 공략할 레이드를 찾아보세요.',
  robots: { index: false, follow: false },
}

const FRIEND_USER_SELECT = {
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
}

export default async function GroupPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return <GroupClient initialFriends={DEMO_FRIENDS} initialRequests={DEMO_INCOMING_REQUESTS} me={DEMO_ME} isDemo />
  }

  const userId = session.user.id

  const [sentAccepted, receivedAccepted, favorites, incomingRequests] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'accepted' },
      select: { id: true, receiverId: true },
    }),
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'accepted' },
      select: { id: true, senderId: true },
    }),
    prisma.userFavorite.findMany({
      where: { userId },
      select: { targetUserId: true },
    }),
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        sender: { select: FRIEND_USER_SELECT },
      },
    }),
  ])

  const friendEntries = [
    ...sentAccepted.map(r => ({ requestId: r.id, friendId: r.receiverId })),
    ...receivedAccepted.map(r => ({ requestId: r.id, friendId: r.senderId })),
  ]

  const favoriteSet = new Set(favorites.map(f => f.targetUserId))

  let friends = []
  if (friendEntries.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: friendEntries.map(e => e.friendId) } },
      select: FRIEND_USER_SELECT,
    })
    friends = users
      .map(u => ({
        ...u,
        isFavorite: favoriteSet.has(u.id),
        requestId: friendEntries.find(e => e.friendId === u.id)?.requestId,
      }))
      .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
  }

  const me = await prisma.user.findUnique({
    where: { id: userId },
    select: FRIEND_USER_SELECT,
  })

  return <GroupClient initialFriends={friends} initialRequests={incomingRequests} me={me} />
}

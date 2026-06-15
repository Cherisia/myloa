import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getFriendsForUser, FRIEND_USER_SELECT } from '@/lib/friends'
import GroupClient from './GroupClient'
import { DEMO_FRIENDS, DEMO_ME, DEMO_INCOMING_REQUESTS } from './_demoGroup'

export const metadata = {
  title: '로스트아크 그룹원 레이드 현황',
  description: '친구들의 레이드 현황을 확인하고 함께 공략할 레이드를 찾아보세요.',
  robots: { index: false, follow: false },
}

export default async function GroupPage() {
  const session = await auth()
  if (!session?.user?.id) {
    return <GroupClient initialFriends={DEMO_FRIENDS} initialRequests={DEMO_INCOMING_REQUESTS} me={DEMO_ME} isDemo />
  }

  const userId = session.user.id

  const [friends, incomingRequests, me] = await Promise.all([
    getFriendsForUser(userId),
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'pending' },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        createdAt: true,
        sender: { select: FRIEND_USER_SELECT },
      },
    }),
    prisma.user.findUnique({ where: { id: userId }, select: FRIEND_USER_SELECT }),
  ])

  return <GroupClient initialFriends={friends} initialRequests={incomingRequests} me={me} />
}

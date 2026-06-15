import { prisma } from '@/lib/db'

// 그룹원(친구) 카드·모달 렌더에 필요한 User 필드 + 활성 캐릭터 + 레이드
export const FRIEND_USER_SELECT = {
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

// 수락된 양방향 친구 목록을 즐겨찾기 우선 정렬로 반환.
// 각 friend에는 isFavorite, requestId가 포함된다.
export async function getFriendsForUser(userId) {
  const [sentAccepted, receivedAccepted] = await Promise.all([
    prisma.friendRequest.findMany({
      where: { senderId: userId, status: 'accepted' },
      select: { id: true, receiverId: true },
    }),
    prisma.friendRequest.findMany({
      where: { receiverId: userId, status: 'accepted' },
      select: { id: true, senderId: true },
    }),
  ])

  // friendId → requestId 매핑 (선형 탐색 대신 O(1) 조회)
  const requestIdByFriend = new Map()
  for (const r of sentAccepted) requestIdByFriend.set(r.receiverId, r.id)
  for (const r of receivedAccepted) requestIdByFriend.set(r.senderId, r.id)

  const friendIds = [...requestIdByFriend.keys()]
  if (friendIds.length === 0) return []

  const [users, favorites] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: friendIds } }, select: FRIEND_USER_SELECT }),
    prisma.userFavorite.findMany({
      where: { userId, targetUserId: { in: friendIds } },
      select: { targetUserId: true },
    }),
  ])

  const favoriteSet = new Set(favorites.map(f => f.targetUserId))

  return users
    .map(u => ({
      ...u,
      isFavorite: favoriteSet.has(u.id),
      requestId: requestIdByFriend.get(u.id),
    }))
    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const FRIEND_INCLUDE = {
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
}

// GET — 나의 수락된 그룹원 목록 (즐겨찾기 먼저 정렬)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const userId = session.user.id

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

  const friendEntries = [
    ...sentAccepted.map(r => ({ requestId: r.id, friendId: r.receiverId })),
    ...receivedAccepted.map(r => ({ requestId: r.id, friendId: r.senderId })),
  ]

  if (friendEntries.length === 0) return NextResponse.json({ friends: [] })

  const friendIds = friendEntries.map(e => e.friendId)

  const [users, favorites] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: friendIds } }, ...FRIEND_INCLUDE }),
    prisma.userFavorite.findMany({
      where: { userId, targetUserId: { in: friendIds } },
      select: { targetUserId: true },
    }),
  ])

  const favoriteSet = new Set(favorites.map(f => f.targetUserId))

  const friends = users
    .map(u => ({
      ...u,
      isFavorite: favoriteSet.has(u.id),
      requestId: friendEntries.find(e => e.friendId === u.id)?.requestId,
    }))
    .sort((a, b) => (b.isFavorite ? 1 : 0) - (a.isFavorite ? 1 : 0))

  return NextResponse.json({ friends })
}

// DELETE — 그룹원 삭제 (양방향)
export async function DELETE(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { targetUserId } = await request.json()
  const userId = session.user.id

  await prisma.friendRequest.deleteMany({
    where: {
      OR: [
        { senderId: userId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: userId },
      ],
    },
  })

  return NextResponse.json({ success: true })
}

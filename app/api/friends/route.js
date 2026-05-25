import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — 내가 즐겨찾기한 모든 유저 목록 (전 공격대 통합, 중복 제거)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const viewerUserId = session.user.id

  const favorites = await prisma.expeditionMemberFavorite.findMany({
    where: { viewerUserId },
    select: { targetUserId: true },
  })

  const targetIds = [...new Set(favorites.map(f => f.targetUserId))]
  if (targetIds.length === 0) return NextResponse.json({ friends: [] })

  const friends = await prisma.user.findMany({
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

  return NextResponse.json({ friends })
}

// DELETE — 특정 유저를 모든 공격대에서 즐겨찾기 해제
export async function DELETE(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { targetUserId } = await request.json()
  const viewerUserId = session.user.id

  await prisma.expeditionMemberFavorite.deleteMany({
    where: { viewerUserId, targetUserId },
  })

  return NextResponse.json({ success: true })
}

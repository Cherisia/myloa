import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'
import { getFriendsForUser } from '@/lib/friends'

// GET — 나의 수락된 그룹원 목록 (즐겨찾기 먼저 정렬)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const friends = await getFriendsForUser(session.user.id)
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

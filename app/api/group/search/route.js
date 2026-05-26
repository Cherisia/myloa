import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET /api/group/search?q=검색어 — 사용자 검색
export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const q = searchParams.get('q')?.trim()
  if (!q || q.length < 2) return NextResponse.json({ users: [] })

  const userId = session.user.id

  const users = await prisma.user.findMany({
    where: {
      id: { not: userId },
      OR: [
        { nickname: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        {
          loaExpeditions: {
            some: {
              characters: {
                some: { name: { contains: q, mode: 'insensitive' }, isActive: true },
              },
            },
          },
        },
      ],
    },
    select: {
      id: true,
      name: true,
      nickname: true,
      discordUsername: true,
      image: true,
      loaExpeditions: {
        select: {
          characters: {
            where: { isActive: true },
            orderBy: { itemLevel: 'desc' },
            take: 1,
            select: { name: true, itemLevel: true },
          },
        },
        take: 1,
      },
    },
    take: 10,
  })

  if (users.length === 0) return NextResponse.json({ users: [] })

  const userIds = users.map(u => u.id)

  // 기존 요청 관계 조회
  const allRequests = await prisma.friendRequest.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: { in: userIds } },
        { senderId: { in: userIds }, receiverId: userId },
      ],
    },
    select: { id: true, senderId: true, receiverId: true, status: true },
  })

  const result = users.map(u => {
    const req = allRequests.find(
      r => (r.senderId === userId && r.receiverId === u.id) ||
           (r.senderId === u.id && r.receiverId === userId)
    )

    let relationStatus = 'none' // none | sent | received | friend
    let incomingRequestId = null

    if (req) {
      if (req.status === 'accepted') {
        relationStatus = 'friend'
      } else if (req.status === 'pending') {
        if (req.senderId === userId) relationStatus = 'sent'
        else { relationStatus = 'received'; incomingRequestId = req.id }
      }
      // rejected → none (재요청 가능)
    }

    return { ...u, relationStatus, incomingRequestId }
  })

  return NextResponse.json({ users: result })
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — 내가 받은 pending 그룹 요청 목록
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const requests = await prisma.friendRequest.findMany({
    where: { receiverId: session.user.id, status: 'pending' },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      createdAt: true,
      sender: {
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
      },
    },
  })

  return NextResponse.json({ requests })
}

// POST — 그룹 요청 보내기
export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { receiverId } = await request.json()
  const senderId = session.user.id

  if (senderId === receiverId) {
    return NextResponse.json({ error: '자기 자신에게 요청할 수 없습니다' }, { status: 400 })
  }

  // 대표캐릭터 없으면 친구추가 불가
  const hasChar = await prisma.loaExpedition.findFirst({
    where: { userId: senderId, characters: { some: { isActive: true } } },
    select: { id: true },
  })
  if (!hasChar) return NextResponse.json({ error: '캐릭터를 먼저 등록해야 친구를 추가할 수 있습니다' }, { status: 400 })

  // 수신자 존재 확인
  const receiver = await prisma.user.findUnique({ where: { id: receiverId }, select: { id: true } })
  if (!receiver) return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })

  // 기존 요청 확인
  const existing = await prisma.friendRequest.findFirst({
    where: {
      OR: [
        { senderId, receiverId },
        { senderId: receiverId, receiverId: senderId },
      ],
    },
  })

  if (existing) {
    if (existing.status === 'accepted') {
      return NextResponse.json({ error: '이미 그룹원입니다' }, { status: 400 })
    }
    if (existing.status === 'pending') {
      // 상대가 이미 나에게 요청을 보낸 경우 → 자동 수락
      if (existing.senderId === receiverId && existing.receiverId === senderId) {
        await prisma.friendRequest.update({ where: { id: existing.id }, data: { status: 'accepted' } })
        return NextResponse.json({ success: true, autoAccepted: true })
      }
      return NextResponse.json({ error: '이미 요청 중입니다' }, { status: 400 })
    }
    // rejected → 재요청 (기존 레코드 업데이트)
    if (existing.senderId === senderId) {
      await prisma.friendRequest.update({ where: { id: existing.id }, data: { status: 'pending' } })
      return NextResponse.json({ success: true })
    }
  }

  await prisma.friendRequest.create({ data: { senderId, receiverId } })
  return NextResponse.json({ success: true })
}

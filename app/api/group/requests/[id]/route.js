import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// PATCH — 그룹 요청 수락 또는 거절
export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const { action } = await request.json() // 'accept' | 'reject'

  const friendRequest = await prisma.friendRequest.findUnique({ where: { id } })
  if (!friendRequest) return NextResponse.json({ error: '요청을 찾을 수 없습니다' }, { status: 404 })
  if (friendRequest.receiverId !== session.user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })
  if (friendRequest.status !== 'pending') return NextResponse.json({ error: '이미 처리된 요청입니다' }, { status: 400 })

  const status = action === 'accept' ? 'accepted' : 'rejected'
  await prisma.friendRequest.update({ where: { id }, data: { status } })

  return NextResponse.json({ success: true })
}

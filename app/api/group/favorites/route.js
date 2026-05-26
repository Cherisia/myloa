import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// POST — 즐겨찾기 추가
export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { targetUserId } = await request.json()
  const userId = session.user.id

  await prisma.userFavorite.upsert({
    where: { userId_targetUserId: { userId, targetUserId } },
    create: { userId, targetUserId },
    update: {},
  })

  return NextResponse.json({ success: true })
}

// DELETE — 즐겨찾기 해제
export async function DELETE(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { targetUserId } = await request.json()
  const userId = session.user.id

  await prisma.userFavorite.deleteMany({ where: { userId, targetUserId } })

  return NextResponse.json({ success: true })
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

// GET — 받은 그룹 요청 대기 수 (Navbar 배지용)
export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ count: 0 })

  const count = await prisma.friendRequest.count({
    where: { receiverId: session.user.id, status: 'pending' },
  })

  return NextResponse.json({ count })
}

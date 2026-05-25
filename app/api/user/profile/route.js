// GET  /api/user/profile → 현재 프로필 조회
// PATCH /api/user/profile → 닉네임·설정 수정

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, name: true, nickname: true, discordUsername: true, image: true, raidPublic: true },
  })
  if (!user) return NextResponse.json({ error: '사용자를 찾을 수 없습니다' }, { status: 404 })

  return NextResponse.json(user)
}

export async function PATCH(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json()
  const data = {}

  if (typeof body.nickname === 'string') {
    data.nickname = body.nickname.trim().slice(0, 12) || null
  }
  if (typeof body.raidPublic === 'boolean') {
    data.raidPublic = body.raidPublic
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: '잘못된 요청' }, { status: 400 })
  }

  const updated = await prisma.user.update({
    where: { id: session.user.id },
    data,
    select: { nickname: true, raidPublic: true },
  })

  return NextResponse.json({ success: true, ...updated })
}

// PATCH /api/expeditions/[id] — 원정대 커스텀 이름 저장

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { id } = await params
  let customName = null
  try {
    const body = await request.json()
    customName = body?.customName
  } catch {
    return NextResponse.json({ error: 'JSON 본문이 필요합니다' }, { status: 400 })
  }

  const expedition = await prisma.loaExpedition.findFirst({
    where: { id, userId: session.user.id },
  })
  if (!expedition) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  await prisma.loaExpedition.update({
    where: { id },
    data:  { customName: customName?.trim() || null },
  })

  return NextResponse.json({ success: true })
}

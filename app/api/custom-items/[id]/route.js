// PATCH  /api/custom-items/[id] → 커스텀 숙제 항목 수정
// DELETE /api/custom-items/[id] → 커스텀 숙제 항목 삭제

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// 항목 소유권 검증 — item → character → expedition → user
async function verifyItemOwner(itemId, userId) {
  const item = await prisma.characterCustomItem.findFirst({
    where: { id: itemId, character: { expedition: { userId } } },
  })
  return item
}

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const item = await verifyItemOwner(id, session.user.id)
  if (!item) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  const { done, restGauge, deducted, sortOrder } = body

  const clampGauge = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))

  const updated = await prisma.characterCustomItem.update({
    where: { id },
    data: {
      ...(typeof done      === 'boolean' && { done }),
      ...(restGauge !== undefined && { restGauge: clampGauge(restGauge) }),
      ...(typeof deducted  === 'boolean' && { deducted }),
      ...(Number.isInteger(sortOrder) && { sortOrder }),
    },
  })

  return NextResponse.json(updated)
}

export async function DELETE(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const item = await verifyItemOwner(id, session.user.id)
  if (!item) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  await prisma.characterCustomItem.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

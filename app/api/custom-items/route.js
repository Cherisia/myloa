// GET  /api/custom-items → 로그인 사용자의 모든 커스텀 숙제 항목
// POST /api/custom-items → 커스텀 숙제 항목 생성 (upsert)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { getNextResetAt, getNextDailyResetAt } from '@/lib/raidData'
import { verifyCharacterOwner } from '@/lib/apiHelpers'

const CUSTOM_TYPES = ['daily', 'weekly']
const clampGauge = (v) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)))

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const userId = session.user.id
  const items = await prisma.characterCustomItem.findMany({
    where: { character: { expedition: { userId } } },
    orderBy: [{ characterId: 'asc' }, { sortOrder: 'asc' }],
  })

  return NextResponse.json(items.map(it => ({
    id:          it.id,
    characterId: it.characterId,
    name:        it.name,
    type:        it.type,
    image:       it.image,
    sortOrder:   it.sortOrder,
    done:        it.done,
    restGauge:   it.restGauge,
    deducted:    it.deducted,
  })))
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: '잘못된 요청 형식' }, { status: 400 })
  const { characterId, name, type, image, sortOrder, done, restGauge, deducted } = body

  const trimmedName = name?.trim().slice(0, 10) || ''
  if (!characterId || !trimmedName || !type) {
    return NextResponse.json({ error: '필수 항목 누락' }, { status: 400 })
  }
  if (!CUSTOM_TYPES.includes(type)) {
    return NextResponse.json({ error: '잘못된 숙제 타입입니다.' }, { status: 400 })
  }
  if (!/^[가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9 ]+$/.test(trimmedName)) {
    return NextResponse.json({ error: '한글, 영어, 숫자만 사용 가능합니다.' }, { status: 400 })
  }

  const ok = await verifyCharacterOwner(characterId, session.user.id)
  if (!ok) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const resetAt = type === 'daily' ? getNextDailyResetAt() : getNextResetAt()

  const result = await prisma.characterCustomItem.upsert({
    where: { characterId_name: { characterId, name: trimmedName } },
    create: {
      characterId,
      name: trimmedName,
      type,
      image:     image     ?? null,
      sortOrder: Number.isInteger(sortOrder) ? sortOrder : 0,
      done:      done      ?? false,
      restGauge: restGauge !== undefined ? clampGauge(restGauge) : 0,
      deducted:  deducted  ?? false,
      resetAt,
    },
    update: {
      type,
      ...(image     !== undefined && { image }),
      ...(Number.isInteger(sortOrder) && { sortOrder }),
      ...(done      !== undefined && { done }),
      ...(restGauge !== undefined && { restGauge: clampGauge(restGauge) }),
      ...(deducted  !== undefined && { deducted }),
    },
  })

  return NextResponse.json(result)
}

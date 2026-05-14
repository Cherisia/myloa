// POST /api/characters/apikey — 로스트아크 API 키 수동 등록
import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { encrypt } from '@/lib/encrypt'

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인이 필요합니다' }, { status: 401 })

  const { apiKey } = await request.json()
  if (!apiKey?.trim()) return NextResponse.json({ error: 'API 키를 입력하세요' }, { status: 400 })

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { apiKey: encrypt(apiKey.trim()) },
  })

  return NextResponse.json({ success: true })
}

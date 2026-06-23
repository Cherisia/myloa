import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

const ADMIN_EMAILS = ['be_the_hero@naver.com']
const CATEGORY_VALUES = new Set(['bug', 'suggestion', 'other'])

export async function POST(request) {
  const session = await auth()
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const { category, content, contact } = body

  if (!CATEGORY_VALUES.has(category)) {
    return NextResponse.json({ error: '유효하지 않은 카테고리입니다.' }, { status: 400 })
  }

  const trimmedContent = (content || '').trim()
  if (trimmedContent.length < 10) {
    return NextResponse.json({ error: '내용을 10자 이상 입력해 주세요.' }, { status: 400 })
  }
  if (trimmedContent.length > 1000) {
    return NextResponse.json({ error: '내용은 1000자 이하로 입력해 주세요.' }, { status: 400 })
  }

  const trimmedContact = contact ? String(contact).trim().slice(0, 100) : null

  await prisma.feedback.create({
    data: {
      userId: session?.user?.id ?? null,
      category,
      content: trimmedContent,
      contact: trimmedContact || null,
    },
  })

  return NextResponse.json({ ok: true })
}

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  if (!ADMIN_EMAILS.includes(user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const { searchParams } = new URL(request.url)
  const status = searchParams.get('status') || 'all'

  const where = status !== 'all' ? { status } : {}

  const feedbacks = await prisma.feedback.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: {
      user: { select: { name: true, nickname: true, discordUsername: true, email: true } },
    },
  })

  return NextResponse.json({ feedbacks })
}

export async function PATCH(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  if (!ADMIN_EMAILS.includes(user?.email)) {
    return NextResponse.json({ error: 'forbidden' }, { status: 403 })
  }

  const body = await request.json().catch(() => null)
  if (!body?.id || !body?.status) return NextResponse.json({ error: 'invalid body' }, { status: 400 })

  const VALID_STATUS = new Set(['new', 'read', 'resolved'])
  if (!VALID_STATUS.has(body.status)) return NextResponse.json({ error: 'invalid status' }, { status: 400 })

  await prisma.feedback.update({ where: { id: body.id }, data: { status: body.status } })
  return NextResponse.json({ ok: true })
}

import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { NextResponse } from 'next/server'

const ADMIN_EMAILS = ['be_the_hero@naver.com']

export async function GET(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true },
  })
  if (!ADMIN_EMAILS.includes(me?.email)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      nickname: true,
      discordUsername: true,
      image: true,
      repCharId: true,
      loaExpeditions: {
        select: {
          id: true,
          repCharName: true,
          characters: {
            where: { isActive: true },
            orderBy: { sortOrder: 'asc' },
            select: {
              id: true,
              name: true,
              class: true,
              itemLevel: true,
              combatPower: true,
              characterRaids: {
                select: {
                  raidId: true,
                  difficulty: true,
                  gateClears: true,
                  isGoldCheck: true,
                  moreDone: true,
                  moreFrom: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!user) return NextResponse.json({ error: 'Not Found' }, { status: 404 })

  return NextResponse.json(user)
}

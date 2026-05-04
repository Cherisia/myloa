// GET    /api/groups/[id]  → 그룹 상세 (멤버 + 레이드 숙제)
// PATCH  /api/groups/[id]  → 그룹 정보 수정 (그룹장)
// DELETE /api/groups/[id]  → 그룹 삭제 (그룹장)

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

function makeInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

export async function GET(_, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, name: true, image: true } },
      members: {
        orderBy: { joinedAt: 'asc' },
        include: {
          user: {
            select: {
              id: true, name: true, image: true,
              loaAccounts: {
                include: {
                  characters: {
                    where:   { isActive: true },
                    orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
                    include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
                  },
                },
              },
            },
          },
        },
      },
      requests: {
        where:   { status: 'pending' },
        orderBy: { createdAt: 'asc' },
        include: {
          user: {
            select: {
              id: true, name: true, image: true,
              loaAccounts: {
                include: {
                  characters: {
                    where: { isActive: true },
                    orderBy: [{ itemLevel: 'desc' }],
                    take: 1,
                    select: { name: true, class: true, itemLevel: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!group) return NextResponse.json({ error: '그룹을 찾을 수 없습니다' }, { status: 404 })

  // 비공개 그룹은 멤버만 조회 가능
  const myMembership = group.members.find(m => m.userId === session.user.id)
  if (!group.isPublic && !myMembership) {
    return NextResponse.json({ error: '접근 권한이 없습니다' }, { status: 403 })
  }

  // 멤버 데이터 가공
  const members = group.members.map(m => {
    const chars = m.user.loaAccounts.flatMap(acc =>
      acc.characters.map(c => ({
        id:          c.id,
        name:        c.name,
        class:       c.class,
        server:      c.server,
        itemLevel:   c.itemLevel,
        combatPower: c.combatPower,
        raids: c.characterRaids.map(r => ({
          raidId:     r.raidId,
          difficulty: r.difficulty,
          gateClears: r.gateClears,
          isGoldCheck: r.isGoldCheck,
          moreDone:   r.moreDone,
        })),
      }))
    )
    return {
      id:         m.id,
      userId:     m.userId,
      role:       m.role,
      visibility: m.visibility,
      joinedAt:   m.joinedAt,
      name:       m.user.name,
      image:      m.user.image,
      characters: m.visibility === 'all' || m.userId === session.user.id ? chars : [],
    }
  })

  // 신청 목록은 그룹장/부그룹장만 볼 수 있음
  const canManage = myMembership?.role === 'leader' || myMembership?.role === 'officer'
  const requests = canManage ? group.requests.map(r => ({
    id:        r.id,
    userId:    r.userId,
    name:      r.user.name,
    image:     r.user.image,
    message:   r.message,
    createdAt: r.createdAt,
    topChar:   r.user.loaAccounts.flatMap(a => a.characters)[0] || null,
  })) : []

  return NextResponse.json({
    id:          group.id,
    name:        group.name,
    description: group.description,
    notice:      group.notice,
    isPublic:    group.isPublic,
    inviteCode:  canManage ? group.inviteCode : null,
    maxMembers:  group.maxMembers,
    createdAt:   group.createdAt,
    leader:      group.leader,
    members,
    requests,
    myRole:      myMembership?.role || null,
    isMember:    !!myMembership,
  })
}

export async function PATCH(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const group = await prisma.group.findUnique({
    where:   { id },
    include: { members: { where: { userId: session.user.id }, select: { role: true } } },
  })
  if (!group) return NextResponse.json({ error: '그룹 없음' }, { status: 404 })
  if (group.leaderId !== session.user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  const body = await request.json()
  const data = {}
  if (body.name       !== undefined) data.name        = body.name.trim()
  if (body.description !== undefined) data.description = body.description?.trim() || null
  if (body.notice     !== undefined) data.notice      = body.notice?.trim() || null
  if (body.isPublic   !== undefined) data.isPublic    = body.isPublic
  if (body.maxMembers !== undefined) data.maxMembers  = body.maxMembers
  if (body.rotateCode)               data.inviteCode  = makeInviteCode()

  const updated = await prisma.group.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(_, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params
  const group = await prisma.group.findUnique({ where: { id } })
  if (!group) return NextResponse.json({ error: '그룹 없음' }, { status: 404 })
  if (group.leaderId !== session.user.id) return NextResponse.json({ error: '권한 없음' }, { status: 403 })

  await prisma.group.delete({ where: { id } })
  return NextResponse.json({ success: true })
}

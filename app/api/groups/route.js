// GET  /api/groups          → 공개 그룹 목록 or 내 그룹 목록 (?mine=1)
// POST /api/groups          → 그룹 생성

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { randomBytes } from 'crypto'

function makeInviteCode() {
  return randomBytes(4).toString('hex').toUpperCase()
}

const MEMBER_SELECT = {
  id: true, groupId: true, userId: true, role: true, visibility: true, joinedAt: true,
  user: { select: { id: true, name: true, image: true } },
}

export async function GET(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const mine   = searchParams.get('mine') === '1'
  const q      = searchParams.get('q') || ''
  const sort   = searchParams.get('sort') || 'members' // members | newest | name

  if (mine) {
    // 내가 속한 그룹
    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            leader: { select: { id: true, name: true, image: true } },
            members: { select: { id: true } },
            requests: { where: { status: 'pending' }, select: { id: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })
    return NextResponse.json(memberships.map(m => ({
      ...m.group,
      myRole:       m.role,
      memberCount:  m.group.members.length,
      pendingCount: m.group.requests.length,
    })))
  }

  // 공개 그룹 탐색
  const orderBy =
    sort === 'newest' ? { createdAt: 'desc' } :
    sort === 'name'   ? { name: 'asc' } :
    undefined // members 정렬은 수동 처리

  const groups = await prisma.group.findMany({
    where: {
      isPublic: true,
      ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
    },
    include: {
      leader:   { select: { id: true, name: true, image: true } },
      members:  { select: { id: true, userId: true } },
      requests: {
        where: { userId: session.user.id, status: 'pending' },
        select: { id: true },
      },
    },
    ...(sort !== 'members' ? { orderBy } : {}),
  })

  const result = groups.map(g => ({
    id:           g.id,
    name:         g.name,
    description:  g.description,
    isPublic:     g.isPublic,
    maxMembers:   g.maxMembers,
    createdAt:    g.createdAt,
    leader:       g.leader,
    memberCount:  g.members.length,
    isMember:     g.members.some(m => m.userId === session.user.id),
    hasPending:   g.requests.length > 0,
  }))

  if (sort === 'members') result.sort((a, b) => b.memberCount - a.memberCount)

  return NextResponse.json(result)
}

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { name, description, isPublic, maxMembers } = await request.json()
  if (!name?.trim()) return NextResponse.json({ error: '그룹 이름을 입력하세요' }, { status: 400 })

  // 이미 가입된 그룹 수 제한 (최대 5개)
  const myCount = await prisma.groupMember.count({ where: { userId: session.user.id } })
  if (myCount >= 5) return NextResponse.json({ error: '그룹은 최대 5개까지 가입할 수 있습니다' }, { status: 400 })

  const group = await prisma.group.create({
    data: {
      name:        name.trim(),
      description: description?.trim() || null,
      isPublic:    isPublic !== false,
      inviteCode:  makeInviteCode(),
      maxMembers:  maxMembers || 30,
      leaderId:    session.user.id,
      members: {
        create: { userId: session.user.id, role: 'leader' },
      },
    },
    include: {
      leader:  { select: { id: true, name: true } },
      members: { select: { id: true } },
    },
  })

  return NextResponse.json({ ...group, memberCount: group.members.length, myRole: 'leader' }, { status: 201 })
}

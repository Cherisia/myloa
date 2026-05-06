import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GroupClient from './GroupClient'

const DEMO_MY_GROUPS = [
  {
    id: 'demo',
    name: '카제로스 원정단',
    description: '함께 레이드 뛰는 친구들의 아늑한 모임이에요.',
    isPublic: false,
    maxMembers: 10,
    memberCount: 5,
    myRole: 'member',
    pendingCount: 0,
    leader: { name: '팍지니' },
  },
]

const DEMO_PUBLIC_GROUPS = [
  {
    id: 'demo-pub-1',
    name: '루페온 레이드 공대',
    description: '매주 정기 레이드 모집 중! 1730 이상 환영합니다.',
    isPublic: true,
    maxMembers: 30,
    memberCount: 18,
    leader: { name: '루페온영웅' },
    hasPending: false,
    createdAt: new Date('2025-03-01'),
  },
  {
    id: 'demo-pub-2',
    name: '카제로스 클리어단',
    description: '종막 카제로스 하드 정기 공대입니다.',
    isPublic: true,
    maxMembers: 20,
    memberCount: 12,
    leader: { name: '카제로스챔피언' },
    hasPending: false,
    createdAt: new Date('2025-02-15'),
  },
]

export default async function GroupPage() {
  const session = await auth()

  let myGroups    = []
  let publicGroups = []

  if (!session?.user?.id) {
    return (
      <GroupClient
        initialMyGroups={DEMO_MY_GROUPS}
        initialPublicGroups={DEMO_PUBLIC_GROUPS}
        userId={null}
        userName={null}
        isDemo
      />
    )
  }

  if (session?.user?.id) {
    // 내 그룹
    const memberships = await prisma.groupMember.findMany({
      where: { userId: session.user.id },
      include: {
        group: {
          include: {
            leader:   { select: { id: true, name: true, image: true } },
            members:  { select: { id: true } },
            requests: { where: { status: 'pending' }, select: { id: true } },
          },
        },
      },
      orderBy: { joinedAt: 'desc' },
    })
    myGroups = memberships.map(m => ({
      ...m.group,
      myRole:       m.role,
      memberCount:  m.group.members.length,
      pendingCount: m.group.requests.length,
    }))

    // 공개 그룹 (내가 속하지 않은 것만, 인원순)
    const myGroupIds = new Set(myGroups.map(g => g.id))
    const allPublic  = await prisma.group.findMany({
      where:   { isPublic: true },
      include: {
        leader:  { select: { id: true, name: true, image: true } },
        members: { select: { id: true, userId: true } },
        requests: {
          where: { userId: session.user.id, status: 'pending' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    })
    publicGroups = allPublic
      .filter(g => !myGroupIds.has(g.id))
      .map(g => ({
        id:          g.id,
        name:        g.name,
        description: g.description,
        isPublic:    g.isPublic,
        maxMembers:  g.maxMembers,
        createdAt:   g.createdAt,
        leader:      g.leader,
        memberCount: g.members.length,
        isMember:    false,
        hasPending:  g.requests.length > 0,
      }))
      .sort((a, b) => b.memberCount - a.memberCount)
  }

  return (
    <GroupClient
      initialMyGroups={myGroups}
      initialPublicGroups={publicGroups}
      userId={session?.user?.id || null}
      userName={session?.user?.name || null}
    />
  )
}

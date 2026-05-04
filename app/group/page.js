import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const session = await auth()

  let myGroups    = []
  let publicGroups = []

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

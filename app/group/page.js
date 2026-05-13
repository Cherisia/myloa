import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import GroupClient from './GroupClient'

export default async function GroupPage() {
  const session = await auth()

  if (!session?.user?.id) {
    return <GroupClient groups={[]} isLoggedIn={false} />
  }

  const userId = session.user.id

  const memberships = await prisma.expeditionMember.findMany({
    where: { userId, status: 'active' },
    include: {
      expedition: {
        include: {
          leader: { select: { id: true, name: true, discordUsername: true, image: true } },
          _count: { select: { members: { where: { status: 'active' } } } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const groups = memberships.map(m => ({
    id: m.expedition.id,
    name: m.expedition.name,
    description: m.expedition.description,
    inviteCode: m.expedition.inviteCode,
    maxMembers: m.expedition.maxMembers,
    memberCount: m.expedition._count.members,
    leader: m.expedition.leader,
    myRole: m.role,
  }))

  return <GroupClient groups={groups} isLoggedIn userId={userId} />
}

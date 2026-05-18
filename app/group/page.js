import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import GroupClient from './GroupClient'

export const metadata = {
  title: 'myloa - 로스트아크 레이드 숙제 관리 & 공유',
}

export default async function GroupPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/dashboard')
  }

  const memberships = await prisma.expeditionMember.findMany({
    where: { userId: session.user.id, status: 'active' },
    include: {
      expedition: {
        include: {
          members: true,
          leader: { select: { id: true, name: true, image: true } },
        },
      },
    },
    orderBy: { joinedAt: 'asc' },
  })

  const groups = memberships.map(m => {
    const exp = m.expedition
    const isLeader  = exp.leaderId === session.user.id
    const isOfficer = isLeader || m.role === 'officer'
    const activeCount  = exp.members.filter(mem => mem.status === 'active').length
    const pendingCount = exp.members.filter(mem => mem.status === 'pending').length
    return {
      id:           exp.id,
      name:         exp.name,
      description:  exp.description,
      maxMembers:   exp.maxMembers,
      memberCount:  activeCount,
      pendingCount: isOfficer ? pendingCount : 0,
      myRole:       isLeader ? 'leader' : m.role,
    }
  })

  return <GroupClient initialGroups={groups} />
}

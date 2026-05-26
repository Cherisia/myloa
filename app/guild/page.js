import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { redirect } from 'next/navigation'
import GuildClient from './GuildClient'

export const metadata = {
  title: '길드 레이드 현황',
  description: '길드원들의 레이드 진행 현황을 한눈에 확인하고 공략을 함께 계획하세요.',
  robots: { index: false, follow: false },
}

export default async function GuildPage() {
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

  return <GuildClient initialGroups={groups} />
}

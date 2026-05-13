import { redirect } from 'next/navigation'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { isResetPassed } from '@/lib/raidData'
import GroupDetailClient from './GroupDetailClient'
import { DEMO_GROUP } from '../_demoSampleData'

const MEMBER_USER_SELECT = {
  select: {
    id: true, name: true, discordUsername: true, image: true,
    loaExpeditions: {
      orderBy: { createdAt: 'asc' },
      include: {
        characters: {
          where: { isActive: true },
          orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
          include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
        },
      },
    },
  },
}

function transformMember(dbMember) {
  const u = dbMember.user
  const displayName = u.discordUsername || u.name || '?'

  const expeditions = u.loaExpeditions.map(exp => ({
    id: exp.id,
    name: exp.customName || exp.repCharName || exp.characters[0]?.name || '원정대',
    characters: exp.characters.map(c => ({
      id: c.id,
      name: c.name,
      class: c.class,
      server: c.server,
      itemLevel: c.itemLevel,
      combatPower: c.combatPower ?? null,
      raids: c.characterRaids.map(r => {
        const expired = isResetPassed(r.resetAt)
        return {
          raidId: r.raidId,
          difficulty: r.difficulty,
          gateClears: expired ? [] : r.gateClears,
          isGoldCheck: r.isGoldCheck,
          moreDone: expired ? false : r.moreDone,
        }
      }),
    })),
  }))

  const allChars = expeditions.flatMap(e => e.characters)
  const topChar = allChars.sort((a, b) => b.itemLevel - a.itemLevel)[0] || null
  const repChar = topChar ? {
    id: topChar.id,
    name: topChar.name,
    class: topChar.class,
    itemLevel: topChar.itemLevel,
    combatPower: topChar.combatPower,
  } : null

  return {
    id: dbMember.id,
    userId: dbMember.userId,
    role: dbMember.role,
    status: dbMember.status,
    visibility: dbMember.visibility,
    joinedAt: dbMember.joinedAt,
    name: displayName,
    discordUsername: u.discordUsername || null,
    image: u.image,
    repChar,
    expeditions,
  }
}

export default async function GroupDetailPage({ params }) {
  const { id } = await params

  if (id === 'demo') {
    return <GroupDetailClient group={DEMO_GROUP} isDemo />
  }

  const session = await auth()
  if (!session?.user?.id) redirect('/group')

  const userId = session.user.id

  const expedition = await prisma.expedition.findUnique({
    where: { id },
    include: {
      leader: { select: { id: true, name: true, discordUsername: true, image: true } },
      members: {
        include: { user: MEMBER_USER_SELECT },
        orderBy: { joinedAt: 'asc' },
      },
      favorites: { where: { viewerUserId: userId } },
    },
  })

  if (!expedition) redirect('/group')

  const myMembership = expedition.members.find(m => m.userId === userId)
  if (!myMembership || myMembership.status === 'rejected' || myMembership.status === 'left') {
    redirect('/group')
  }

  const isOfficer = myMembership.role === 'officer' || myMembership.role === 'leader'
  const activeMembers  = expedition.members.filter(m => m.status === 'active').map(transformMember)
  const pendingMembers = isOfficer
    ? expedition.members.filter(m => m.status === 'pending').map(m => ({
        id: m.id,
        userId: m.userId,
        createdAt: m.createdAt,
        name: m.user.discordUsername || m.user.name || '?',
        discordUsername: m.user.discordUsername || null,
        image: m.user.image,
      }))
    : []

  const group = {
    id: expedition.id,
    name: expedition.name,
    description: expedition.description,
    notice: expedition.notice,
    inviteCode: expedition.inviteCode,
    maxMembers: expedition.maxMembers,
    createdAt: expedition.createdAt,
    leaderId: expedition.leaderId,
    leader: expedition.leader,
    members: activeMembers,
    pendingMembers,
    myRole: myMembership.role,
    isMember: true,
    myVisibility: myMembership.visibility,
    favoritedUserIds: expedition.favorites.map(f => f.targetUserId),
  }

  return <GroupDetailClient group={group} isDemo={false} userId={userId} />
}

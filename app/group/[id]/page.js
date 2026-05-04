import { auth }   from '@/lib/auth'
import { prisma }  from '@/lib/db'
import { redirect } from 'next/navigation'
import GroupDetailClient from './GroupDetailClient'

export default async function GroupDetailPage({ params }) {
  const { id }    = await params
  const session   = await auth()

  if (!session?.user?.id) redirect('/group')

  const group = await prisma.group.findUnique({
    where: { id },
    include: {
      leader:  { select: { id: true, name: true, image: true } },
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
                    where:   { isActive: true },
                    orderBy: [{ itemLevel: 'desc' }],
                    take:    1,
                    select:  { name: true, class: true, itemLevel: true },
                  },
                },
              },
            },
          },
        },
      },
    },
  })

  if (!group) redirect('/group')

  const myMembership = group.members.find(m => m.userId === session.user.id)

  // 비공개 그룹은 멤버만 접근 가능
  if (!group.isPublic && !myMembership) redirect('/group')

  const canManage = myMembership?.role === 'leader' || myMembership?.role === 'officer'

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
          raidId:      r.raidId,
          difficulty:  r.difficulty,
          gateClears:  r.gateClears,
          isGoldCheck: r.isGoldCheck,
          moreDone:    r.moreDone,
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

  const requests = canManage
    ? group.requests.map(r => ({
        id:        r.id,
        userId:    r.userId,
        name:      r.user.name,
        image:     r.user.image,
        message:   r.message,
        createdAt: r.createdAt,
        topChar:   r.user.loaAccounts.flatMap(a => a.characters)[0] ?? null,
      }))
    : []

  const myVisibility = myMembership?.visibility ?? 'all'

  return (
    <GroupDetailClient
      group={{
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
        myRole:      myMembership?.role ?? null,
        isMember:    !!myMembership,
        myVisibility,
      }}
      userId={session.user.id}
    />
  )
}

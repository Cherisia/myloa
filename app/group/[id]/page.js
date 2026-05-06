import { auth }   from '@/lib/auth'
import { prisma }  from '@/lib/db'
import { redirect } from 'next/navigation'
import GroupDetailClient from './GroupDetailClient'

// ── 데모 그룹 데이터 ─────────────────────────────────────────────────────────
const DEMO_MEMBERS = [
  {
    id: 'dm-1', userId: 'du-1', role: 'leader', visibility: 'all', name: '팍지니', image: null,
    repChar: { id: 'dc-1', name: '팍지니', class: '배틀마스터', itemLevel: 1773.33 },
    characters: [
      { id: 'dc-1', name: '팍지니', class: '배틀마스터', itemLevel: 1773.33, raids: [
          { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [true],         isGoldCheck: true, moreDone: true  },
          { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
      ]},
      { id: 'dc-2', name: '팍루아', class: '아르카나', itemLevel: 1755.00, raids: [
          { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, false],  isGoldCheck: true, moreDone: false },
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
      ]},
    ],
  },
  {
    id: 'dm-2', userId: 'du-2', role: 'member', visibility: 'all', name: '질풍노도훈수사', image: null,
    repChar: { id: 'dc-3', name: '질풍노도훈수사', class: '스트라이커', itemLevel: 1750.00 },
    characters: [
      { id: 'dc-3', name: '질풍노도훈수사', class: '스트라이커', itemLevel: 1750.00, raids: [
          { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [false],        isGoldCheck: true, moreDone: false },
          { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, false],  isGoldCheck: true, moreDone: false },
      ]},
      { id: 'dc-4', name: '훈수루아', class: '버서커', itemLevel: 1730.00, raids: [
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
      ]},
    ],
  },
  {
    id: 'dm-3', userId: 'du-3', role: 'member', visibility: 'all', name: '로헨델카지노박마담', image: null,
    repChar: { id: 'dc-5', name: '로헨델카지노박마담', class: '소서리스', itemLevel: 1740.00 },
    characters: [
      { id: 'dc-5', name: '로헨델카지노박마담', class: '소서리스', itemLevel: 1740.00, raids: [
          { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
      ]},
      { id: 'dc-6', name: '박마담부캐', class: '바드', itemLevel: 1730.00, raids: [
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
      ]},
    ],
  },
  {
    id: 'dm-4', userId: 'du-4', role: 'member', visibility: 'all', name: '절구주는비치', image: null,
    repChar: { id: 'dc-7', name: '절구주는비치', class: '바드', itemLevel: 1740.00 },
    characters: [
      { id: 'dc-7', name: '절구주는비치', class: '바드', itemLevel: 1740.00, raids: [
          { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [true, false],  isGoldCheck: true, moreDone: false },
      ]},
    ],
  },
  {
    id: 'dm-5', userId: 'du-5', role: 'member', visibility: 'all', name: '다베어버릴거에요', image: null,
    repChar: { id: 'dc-8', name: '다베어버릴거에요', class: '소울이터', itemLevel: 1730.00 },
    characters: [
      { id: 'dc-8', name: '다베어버릴거에요', class: '소울이터', itemLevel: 1730.00, raids: [
          { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
          { raidId: 'armocha',       difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
      ]},
    ],
  },
]

const DEMO_GROUP = {
  id: 'demo', name: '카제로스 원정단',
  description: '함께 레이드 뛰는 친구들의 아늑한 모임이에요.',
  notice: '이번주 토요일 밤 10시 에기르 공대 모집! 참여 희망자 댓글 달아주세요 🔥',
  isPublic: false, inviteCode: null, maxMembers: 10, createdAt: new Date('2025-01-01'),
  leader: { id: 'du-1', name: '팍지니', image: null },
  members: DEMO_MEMBERS, requests: [],
  myRole: 'member', isMember: true, myVisibility: 'all',
}

export default async function GroupDetailPage({ params }) {
  const { id }    = await params
  const session   = await auth()

  // 데모 그룹 — 비로그인도 접근 가능
  if (id === 'demo') {
    return <GroupDetailClient group={DEMO_GROUP} userId={session?.user?.id ?? null} isDemo />
  }

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
              repCharId: true,
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
    const allChars = m.user.loaAccounts.flatMap(acc => acc.characters)
    const chars = allChars.map(c => ({
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

    // 대표 캐릭터 — 설정값 우선, 없으면 아이템레벨 최고 캐릭터
    const repCharRaw = m.user.repCharId
      ? allChars.find(c => c.id === m.user.repCharId)
      : null
    const repCharFallback = allChars.length > 0
      ? allChars.reduce((a, b) => a.itemLevel > b.itemLevel ? a : b)
      : null
    const repCharSrc = repCharRaw ?? repCharFallback
    const repChar = repCharSrc
      ? { id: repCharSrc.id, name: repCharSrc.name, class: repCharSrc.class, itemLevel: repCharSrc.itemLevel }
      : null

    return {
      id:         m.id,
      userId:     m.userId,
      role:       m.role,
      visibility: m.visibility,
      joinedAt:   m.joinedAt,
      name:       m.user.name,
      image:      m.user.image,
      repChar,
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
        id:                group.id,
        name:              group.name,
        description:       group.description,
        notice:            group.notice,
        isPublic:          group.isPublic,
        inviteCode:        canManage ? group.inviteCode : null,
        discordWebhook:    canManage ? group.discordWebhook : null,
        hasDiscordWebhook: !!group.discordWebhook,
        maxMembers:        group.maxMembers,
        createdAt:         group.createdAt,
        leader:            group.leader,
        members,
        requests,
        myRole:            myMembership?.role ?? null,
        isMember:          !!myMembership,
        myVisibility,
      }}
      userId={session.user.id}
    />
  )
}

// POST /api/groups/[id]/discord-notify
// 레이드 미완료 그룹원에게 Discord 웹훅으로 알림 전송

import { NextResponse } from 'next/server'
import { auth }          from '@/lib/auth'
import { prisma }        from '@/lib/db'
import { RAIDS }         from '@/lib/raidData'

export async function POST(request, { params }) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: '로그인 필요' }, { status: 401 })

  const { id } = await params

  // 그룹 멤버 확인
  const membership = await prisma.groupMember.findUnique({
    where: { groupId_userId: { groupId: id, userId: session.user.id } },
  })
  if (!membership) return NextResponse.json({ error: '그룹 멤버가 아닙니다' }, { status: 403 })

  // 웹훅 URL 조회
  const group = await prisma.group.findUnique({
    where:  { id },
    select: { discordWebhook: true, name: true },
  })
  if (!group)                 return NextResponse.json({ error: '그룹 없음' }, { status: 404 })
  if (!group.discordWebhook)  return NextResponse.json({ error: 'Discord 웹훅이 설정되지 않았습니다' }, { status: 400 })

  const body = await request.json()
  const { raidId, diffKey, userIds, message } = body
  if (!Array.isArray(userIds) || userIds.length === 0) {
    return NextResponse.json({ error: '알림을 보낼 멤버를 선택하세요' }, { status: 400 })
  }

  // 선택된 유저들의 Discord ID 조회
  const accounts = await prisma.account.findMany({
    where:  { userId: { in: userIds }, provider: 'discord' },
    select: { providerAccountId: true },
  })

  // 레이드 이름
  const raid      = RAIDS.find(r => r.id === raidId)
  const diff      = raid?.difficulties.find(d => d.key === diffKey)
  const raidName  = raid?.name  ?? raidId
  const diffLabel = diff?.label ?? diffKey

  // 메세지 구성
  const mentions = accounts.map(a => `<@${a.providerAccountId}>`).join(' ')
  const lines    = [
    `🔔 **[${group.name}] ${raidName} ${diffLabel}** 레이드 모집`,
    message?.trim() ? `> ${message.trim()}` : null,
    mentions || '*(Discord 계정 미연동 멤버)*',
  ].filter(Boolean).join('\n')

  // Discord 웹훅 전송
  const webhookRes = await fetch(group.discordWebhook, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ content: lines }),
  })

  if (!webhookRes.ok) {
    return NextResponse.json({ error: 'Discord 전송 실패. 웹훅 URL을 확인해주세요.' }, { status: 500 })
  }

  return NextResponse.json({ success: true, mentioned: accounts.length, total: userIds.length })
}

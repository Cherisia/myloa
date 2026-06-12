import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Discord from 'next-auth/providers/discord'
import { prisma } from './db'

// 동기화 진행 중인 userId 추적 — 동시에 여러 세션 확인이 와도 중복 호출 방지
const syncingUsers = new Set()

async function syncDiscordUsername(userId) {
  if (syncingUsers.has(userId)) return
  syncingUsers.add(userId)
  try {
    const account = await prisma.account.findFirst({
      where: { userId, provider: 'discord' },
      select: { access_token: true },
    })
    if (!account?.access_token) return

    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${account.access_token}` },
    })
    if (!res.ok) return

    const profile = await res.json()
    if (typeof profile.username === 'string') {
      await prisma.user.update({
        where: { id: userId },
        data: { discordUsername: profile.username },
      })
    }
  } catch {
    // ignore
  } finally {
    syncingUsers.delete(userId)
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET,
  adapter: PrismaAdapter(prisma),
  providers: [
    Discord({
      clientId: process.env.AUTH_DISCORD_ID,
      clientSecret: process.env.AUTH_DISCORD_SECRET,
    }),
  ],
  session: { strategy: 'database' },
  callbacks: {
    session({ session, user }) {
      session.user.id = user.id
      session.user.nickname = user.nickname ?? null
      // discordUsername이 없는 기존 유저는 비동기로 Discord API에서 보정
      if (!user.discordUsername) {
        syncDiscordUsername(user.id).catch(() => {})
      }
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile && user?.id) {
        try {
          const updateData = {}
          if (typeof profile.username === 'string') updateData.discordUsername = profile.username
          const freshImage = profile.image_url
            || (profile.avatar
              ? `https://cdn.discordapp.com/avatars/${profile.id}/${profile.avatar}.webp`
              : null)
          if (freshImage) updateData.image = freshImage
          // 처음 로그인(nickname 없음)이면 디스코드 표시이름을 기본 닉네임으로 설정
          if (!user.nickname && user.name) updateData.nickname = user.name
          if (Object.keys(updateData).length > 0) {
            await prisma.user.update({ where: { id: user.id }, data: updateData })
          }
        } catch {
          /* ignore race with adapter insert */
        }
      }
      return true
    },
  },
})

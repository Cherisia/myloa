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
      select: { access_token: true, refresh_token: true, providerAccountId: true },
    })
    if (!account) return

    let discordProfile = null

    if (account.access_token) {
      const res = await fetch('https://discord.com/api/users/@me', {
        headers: { Authorization: `Bearer ${account.access_token}` },
      })
      if (res.ok) discordProfile = await res.json()
    }

    // access_token 만료 시 refresh_token으로 재발급
    if (!discordProfile && account.refresh_token) {
      const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: process.env.AUTH_DISCORD_ID,
          client_secret: process.env.AUTH_DISCORD_SECRET,
          grant_type: 'refresh_token',
          refresh_token: account.refresh_token,
        }),
      })
      if (tokenRes.ok) {
        const tokens = await tokenRes.json()
        await prisma.account.update({
          where: {
            provider_providerAccountId: {
              provider: 'discord',
              providerAccountId: account.providerAccountId,
            },
          },
          data: {
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token ?? account.refresh_token,
            expires_at: tokens.expires_in
              ? Math.floor(Date.now() / 1000 + tokens.expires_in)
              : null,
          },
        })
        const res = await fetch('https://discord.com/api/users/@me', {
          headers: { Authorization: `Bearer ${tokens.access_token}` },
        })
        if (res.ok) discordProfile = await res.json()
      }
    }

    if (!discordProfile) return

    const updateData = {}
    if (typeof discordProfile.username === 'string') updateData.discordUsername = discordProfile.username
    const freshImage = discordProfile.avatar
      ? `https://cdn.discordapp.com/avatars/${discordProfile.id}/${discordProfile.avatar}.webp`
      : null
    if (freshImage) updateData.image = freshImage

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({ where: { id: userId }, data: updateData })
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

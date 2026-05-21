import NextAuth from 'next-auth'
import { PrismaAdapter } from '@auth/prisma-adapter'
import Discord from 'next-auth/providers/discord'
import { prisma } from './db'

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
      return session
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === 'discord' && profile && typeof profile.username === 'string' && user?.id) {
        try {
          await prisma.user.update({
            where: { id: user.id },
            data: {
              discordUsername: profile.username,
              ...(user.image ? { image: user.image } : {}),
            },
          })
        } catch {
          /* ignore race with adapter insert */
        }
      }
      return true
    },
  },
})

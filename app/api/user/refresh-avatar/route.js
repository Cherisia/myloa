import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST() {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const account = await prisma.account.findFirst({
    where: { userId: session.user.id, provider: 'discord' },
    select: { access_token: true, refresh_token: true, providerAccountId: true },
  })

  if (!account) return Response.json({ error: 'No Discord account' }, { status: 400 })

  let discordUser = null

  // 저장된 access_token으로 Discord API 호출
  if (account.access_token) {
    const res = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${account.access_token}` },
    })
    if (res.ok) discordUser = await res.json()
  }

  // access_token 만료 시 refresh_token으로 재발급 후 재시도
  if (!discordUser && account.refresh_token) {
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
      if (res.ok) discordUser = await res.json()
    }
  }

  if (!discordUser) return Response.json({ error: 'Discord API unavailable' }, { status: 502 })

  const freshImage = discordUser.avatar
    ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.webp`
    : null

  if (!freshImage) return Response.json({ error: 'No avatar' }, { status: 400 })

  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: freshImage },
  })

  return Response.json({ image: freshImage })
}

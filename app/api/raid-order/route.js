import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(request) {
  const session = await auth()
  if (!session?.user?.id) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => null)
  if (!body || !body.expeditionId || !Array.isArray(body.order)) {
    return Response.json({ error: 'Bad Request' }, { status: 400 })
  }

  const { expeditionId, order } = body

  const expedition = await prisma.loaExpedition.findFirst({
    where: { id: expeditionId, userId: session.user.id },
    select: { id: true },
  })
  if (!expedition) return Response.json({ error: 'Not Found' }, { status: 404 })

  await prisma.$transaction(
    order.map(({ raidId, sortOrder }) =>
      prisma.expeditionRaidOrder.upsert({
        where: { expeditionId_raidId: { expeditionId, raidId } },
        create: { id: `${expeditionId}_${raidId}`, expeditionId, raidId, sortOrder },
        update: { sortOrder },
      })
    )
  )

  return Response.json({ ok: true })
}

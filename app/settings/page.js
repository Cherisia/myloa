import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/db'
import SettingsClient from './SettingsClient'

export const metadata = {
  title: '계정 설정',
  description: 'myloa 계정 및 프로필 설정을 관리하세요.',
  robots: { index: false, follow: false },
}

export default async function SettingsPage() {
  const session = await auth()
  if (!session?.user?.id) redirect('/dashboard')

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { name: true, nickname: true, discordUsername: true, image: true, raidPublic: true, raidPublicFriends: true },
  })

  return <SettingsClient user={user} session={session} />
}

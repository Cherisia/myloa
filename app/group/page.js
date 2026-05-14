import { auth } from '@/lib/auth'
import { redirect } from 'next/navigation'
import GroupDemoClient from './GroupDemoClient'
import { DEMO_MY_GROUPS, DEMO_PUBLIC_GROUPS } from './_demoListData'

export default async function GroupPage() {
  const session = await auth()
  if (session?.user?.id) {
    redirect('/dashboard')
  }

  return <GroupDemoClient myGroups={DEMO_MY_GROUPS} publicGroups={DEMO_PUBLIC_GROUPS} />
}

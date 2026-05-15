import { redirect } from 'next/navigation'

export default async function GroupPage() {
  redirect('/dashboard?group=1')
}

'use client'

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react'

// session prop으로 서버에서 미리 가져온 세션을 전달하면
// useSession()이 loading 상태 없이 즉시 해당 세션을 반환합니다.
export default function SessionProvider({ children, session }) {
  return (
    <NextAuthSessionProvider session={session}>
      {children}
    </NextAuthSessionProvider>
  )
}

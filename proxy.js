import { NextResponse } from 'next/server'

export default function proxy(request) {
  const { pathname, searchParams } = request.nextUrl
  // OAuth 취소·에러 시 /api/auth/signin?error=... 로 리다이렉트되는 걸 가로채서 대시보드로 복귀
  if (pathname === '/api/auth/signin' && searchParams.has('error')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }
  return NextResponse.next()
}

export const config = {
  matcher: ['/api/auth/signin'],
}

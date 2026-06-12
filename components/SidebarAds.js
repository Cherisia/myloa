'use client'
import { usePathname } from 'next/navigation'
import KakaoAdFit from './KakaoAdFit'

// 카카오 애드핏 단위 ID — https://adfit.kakao.com 에서 발급
const ADFIT_UNIT_SIDEBAR_L = 'DAN-ukyXEWSmwFuJISxo'
const ADFIT_UNIT_SIDEBAR_R = 'DAN-KUKGfQgMjxpioCMi'

// 광고 표시 허용 경로 (콘텐츠가 풍부한 페이지만)
const AD_ALLOWED_PATHS = ['/', '/dashboard', '/dictionary', '/guild', '/group']

function shouldShowAds(pathname) {
  return AD_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function SidebarAdLeft() {
  const pathname = usePathname()
  if (!shouldShowAds(pathname)) return null
  return <KakaoAdFit unit={ADFIT_UNIT_SIDEBAR_L} width={160} height={600} />
}

export function SidebarAdRight() {
  const pathname = usePathname()
  if (!shouldShowAds(pathname)) return null
  return <KakaoAdFit unit={ADFIT_UNIT_SIDEBAR_R} width={160} height={600} />
}

'use client'
import { usePathname } from 'next/navigation'
import AdSense from './AdSense'

const AD_SLOT_SIDEBAR_L = '7996518124'
const AD_SLOT_SIDEBAR_R = '7746939400'

// 광고 표시 허용 경로 (콘텐츠가 풍부한 페이지만)
const AD_ALLOWED_PATHS = ['/dashboard', '/guild', '/group']

function shouldShowAds(pathname) {
  return AD_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

export function SidebarAdLeft() {
  const pathname = usePathname()
  if (!shouldShowAds(pathname)) return null
  return <AdSense slot={AD_SLOT_SIDEBAR_L} sidebar />
}

export function SidebarAdRight() {
  const pathname = usePathname()
  if (!shouldShowAds(pathname)) return null
  return <AdSense slot={AD_SLOT_SIDEBAR_R} sidebar />
}

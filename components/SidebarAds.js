'use client'
import { usePathname } from 'next/navigation'
import KakaoAdFit from './KakaoAdFit'

// 카카오 애드핏 단위 ID — https://adfit.kakao.com 에서 발급
const ADFIT_UNIT_SIDEBAR_L = 'DAN-ukyXEWSmwFuJISxo'
const ADFIT_UNIT_SIDEBAR_R = 'DAN-KUKGfQgMjxpioCMi'

// 광고 표시 허용 경로 (콘텐츠가 풍부한 페이지만)
const AD_ALLOWED_PATHS = ['/', '/dictionary', '/guild', '/group', '/tools']
// 광고 없이 사이드바 공간만 확보할 경로 (xl+ 데스크탑에서만)
const SPACER_PATHS = ['/dashboard']

function shouldShowAds(pathname) {
  return AD_ALLOWED_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

function shouldShowSpacer(pathname) {
  return SPACER_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))
}

const adAsideClass    = "hidden xl:flex  w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden items-center justify-center"
const spacerAsideClass = "hidden 2xl:flex w-[160px] flex-shrink-0 sticky top-[66px] max-h-[calc(100vh-82px)] overflow-hidden"

export function SidebarAdLeft() {
  const pathname = usePathname()
  if (shouldShowAds(pathname)) {
    return (
      <aside className={adAsideClass} style={{ minHeight: '600px' }}>
        <KakaoAdFit unit={ADFIT_UNIT_SIDEBAR_L} width={160} height={600} />
      </aside>
    )
  }
  if (shouldShowSpacer(pathname)) {
    return <aside className={spacerAsideClass} style={{ minHeight: '600px' }} />
  }
  return null
}

export function SidebarAdRight() {
  const pathname = usePathname()
  if (shouldShowAds(pathname)) {
    return (
      <aside className={adAsideClass} style={{ minHeight: '600px' }}>
        <KakaoAdFit unit={ADFIT_UNIT_SIDEBAR_R} width={160} height={600} />
      </aside>
    )
  }
  if (shouldShowSpacer(pathname)) {
    return <aside className={spacerAsideClass} style={{ minHeight: '600px' }} />
  }
  return null
}

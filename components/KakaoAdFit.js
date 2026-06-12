'use client'
import { useEffect, useRef } from 'react'

// 광고 단위 ID는 애드핏 대시보드(https://adfit.kakao.com)에서 발급
// unit 교체만으로 활성화
export default function KakaoAdFit({ unit, width, height, className = '' }) {
  const ref = useRef(null)
  const mounted = useRef(false)

  useEffect(() => {
    if (mounted.current || !ref.current) return
    mounted.current = true

    const ins = document.createElement('ins')
    ins.className = 'kakao_ad_area'
    ins.style.display = 'none'
    ins.setAttribute('data-ad-unit', unit)
    ins.setAttribute('data-ad-width', String(width))
    ins.setAttribute('data-ad-height', String(height))
    ref.current.appendChild(ins)

    const script = document.createElement('script')
    script.src = '//t1.daumcdn.net/kas/static/ba.min.js'
    ref.current.appendChild(script)
  }, [unit, width, height])

  return (
    <div
      ref={ref}
      className={className}
      style={{ width: `${width}px`, height: `${height}px`, overflow: 'hidden', flexShrink: 0 }}
    />
  )
}

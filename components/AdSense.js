'use client'
import { useEffect, useRef } from 'react'

const PUB_ID = 'ca-pub-7505734558280029'

// sidebar=true → data-full-width-responsive 미적용 (사이드바 고정 너비)
export default function AdSense({ slot, className = '', sidebar = false }) {
  const insRef = useRef(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (pushedRef.current) return
    const ins = insRef.current
    if (!ins || ins.getBoundingClientRect().width === 0) return
    pushedRef.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (_) {}
  }, [])

  return (
    <ins
      ref={insRef}
      className={`adsbygoogle${className ? ` ${className}` : ''}`}
      style={{ display: 'block' }}
      data-ad-client={PUB_ID}
      data-ad-slot={slot}
      data-ad-format="auto"
      {...(!sidebar && { 'data-full-width-responsive': 'true' })}
    />
  )
}

'use client'
import { useEffect, useRef } from 'react'

export default function AdSense({ slot = 'XXXXXXXXXX', client = 'ca-pub-XXXXXXXXXXXXXXXX' }) {
  const insRef = useRef(null)
  const pushedRef = useRef(false)

  useEffect(() => {
    if (pushedRef.current) return
    const ins = insRef.current
    if (!ins) return
    pushedRef.current = true
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (_) {}
  }, [])

  return (
    <ins
      ref={insRef}
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

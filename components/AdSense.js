'use client'
import { useEffect } from 'react'

/**
 * AdSense unit — renders a single <ins> and calls adsbygoogle.push once mounted.
 * Wrap this in a `hidden lg:block` container so it only appears on desktop.
 *
 * Replace data-ad-client / data-ad-slot with your real values before going live.
 */
export default function AdSense({ slot = 'XXXXXXXXXX', client = 'ca-pub-XXXXXXXXXXXXXXXX' }) {
  useEffect(() => {
    try {
      ;(window.adsbygoogle = window.adsbygoogle || []).push({})
    } catch (_) {}
  }, [])

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slot}
      data-ad-format="auto"
      data-full-width-responsive="true"
    />
  )
}

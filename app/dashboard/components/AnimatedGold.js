'use client'

import { useState, useEffect, useRef } from 'react'

// ── 숫자 애니메이션 (촤르륵) ──────────────────────────────────────────────────
export default function AnimatedGold({ value, className }) {
  const [display, setDisplay] = useState(value)
  const animRef  = useRef(null)
  const prevRef  = useRef(value)

  useEffect(() => {
    const from = prevRef.current
    const to   = value
    prevRef.current = value
    if (from === to) return
    if (animRef.current) cancelAnimationFrame(animRef.current)
    const DURATION = 350
    const t0 = performance.now()
    const step = (now) => {
      const progress = Math.min((now - t0) / DURATION, 1)
      const eased    = 1 - Math.pow(1 - progress, 3) // easeOutCubic
      setDisplay(Math.round(from + (to - from) * eased))
      if (progress < 1) animRef.current = requestAnimationFrame(step)
    }
    animRef.current = requestAnimationFrame(step)
  }, [value])

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current) }, [])

  return <span className={className}>{display.toLocaleString()}G</span>
}

'use client'

import { useEffect, useRef } from 'react'

// ── 폭죽 애니메이션 ───────────────────────────────────────────────────────────
const CONFETTI_COLORS = ['#facc15','#f97316','#ec4899','#8b5cf6','#3b82f6','#10b981','#ef4444','#06b6d4']
const GOLD_COIN_COLORS = ['#facc15','#f59e0b','#fbbf24','#fde68a','#d97706','#fef08a']

export function GoldConfetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const pieces = Array.from({ length: 55 }, () => {
      const angle = Math.random() * Math.PI * 2
      const speed = Math.random() * 2.5 + 0.8
      return {
        x: canvas.width * (0.2 + Math.random() * 0.6),
        y: canvas.height * (0.0 + Math.random() * 0.3),
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - Math.random() * 1.5,
        gravity: 0.03,
        r: Math.random() * 5 + 3,
        tilt: Math.random() * Math.PI * 2,
        spin: (Math.random() - 0.5) * 0.08,
        color: GOLD_COIN_COLORS[Math.floor(Math.random() * GOLD_COIN_COLORS.length)],
        opacity: 1,
      }
    })

    let frame
    const DURATION = 3000
    const start = performance.now()

    const draw = (now) => {
      const progress = Math.min((now - start) / DURATION, 1)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      pieces.forEach(p => {
        p.x += p.vx
        p.y += p.vy
        p.vy += p.gravity
        p.tilt += p.spin
        p.opacity = progress > 0.4 ? 1 - (progress - 0.4) / 0.6 : 1

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.tilt)
        // 동전 모양: 타원 + 광택
        const scaleY = Math.abs(Math.cos(p.tilt * 2)) * 0.55 + 0.45
        ctx.scale(1, scaleY)
        ctx.beginPath()
        ctx.arc(0, 0, p.r, 0, Math.PI * 2)
        ctx.fillStyle = p.color
        ctx.fill()
        // 광택 하이라이트
        ctx.beginPath()
        ctx.arc(-p.r * 0.25, -p.r * 0.25, p.r * 0.28, 0, Math.PI * 2)
        ctx.fillStyle = 'rgba(255,255,255,0.45)'
        ctx.fill()
        ctx.restore()
      })

      if (progress < 1) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 z-[299] pointer-events-none" />
}

export default function Confetti({ active }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!active) return
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight }
    resize()
    window.addEventListener('resize', resize)

    const pieces = Array.from({ length: 180 }, () => ({
      x:    Math.random() * canvas.width,
      y:    Math.random() * canvas.height * -1.5,
      w:    Math.random() * 8 + 4,
      h:    Math.random() * 4 + 2,
      color: CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
      angle: Math.random() * Math.PI * 2,
      spin:  (Math.random() - 0.5) * 0.2,
      vx:   (Math.random() - 0.5) * 2,
      vy:   Math.random() * 3 + 2,
      opacity: 1,
    }))

    let frame
    let elapsed = 0
    const DURATION = 4000
    const start = performance.now()

    const draw = (now) => {
      elapsed = now - start
      const progress = Math.min(elapsed / DURATION, 1)
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      pieces.forEach(p => {
        p.x     += p.vx
        p.y     += p.vy
        p.angle += p.spin
        // 후반부에 서서히 사라짐
        p.opacity = progress > 0.6 ? 1 - (progress - 0.6) / 0.4 : 1

        if (p.y > canvas.height) {
          p.y = -20
          p.x = Math.random() * canvas.width
        }

        ctx.save()
        ctx.globalAlpha = p.opacity
        ctx.translate(p.x, p.y)
        ctx.rotate(p.angle)
        ctx.fillStyle = p.color
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h)
        ctx.restore()
      })

      if (progress < 1) frame = requestAnimationFrame(draw)
    }

    frame = requestAnimationFrame(draw)
    return () => { cancelAnimationFrame(frame); window.removeEventListener('resize', resize) }
  }, [active])

  if (!active) return null
  return <canvas ref={canvasRef} className="fixed inset-0 z-[300] pointer-events-none" />
}

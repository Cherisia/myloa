export const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'

export function getApiKey() {
  return (
    process.env.LOA_PUBLIC_SEARCH_API_KEY ||
    process.env.LOA_PUBLIC_SEARCH_API_KEY_FALLBACK ||
    process.env.LOA_API_KEY ||
    ''
  ).trim()
}

// 다음 targetHour:00 KST까지 남은 초 (최소 60초)
export function secUntilKST(targetHour) {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const h = kstNow.getUTCHours()
  const m = kstNow.getUTCMinutes()
  const s = kstNow.getUTCSeconds()
  let secs = (targetHour - h) * 3600 - m * 60 - s
  if (secs <= 0) secs += 24 * 3600
  return Math.max(60, secs)
}

// 평일 → 06:00 KST, 주말 → 06/09/13/19 KST
export function calendarRevalidate() {
  const kstNow = new Date(Date.now() + 9 * 60 * 60 * 1000)
  const day = kstNow.getUTCDay()
  const hour = kstNow.getUTCHours()
  const isWeekend = day === 0 || day === 6
  if (!isWeekend) return secUntilKST(6)
  if (hour < 6)  return secUntilKST(6)
  if (hour < 9)  return secUntilKST(9)
  if (hour < 13) return secUntilKST(13)
  if (hour < 19) return secUntilKST(19)
  return secUntilKST(6)
}

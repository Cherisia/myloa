export function formatGold(g) {
  if (g >= 100000) return `${Math.round(g / 1000)}k`
  if (g >= 10000)  return `${(g / 1000).toFixed(1)}k`
  return g.toLocaleString('ko-KR')
}

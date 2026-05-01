// 로스트아크 Open API 프록시
// GET /api/loa?characterName=칼라디엘&apiKey=... → 원정대 캐릭터 목록

import { NextResponse } from 'next/server'

const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const characterName = searchParams.get('characterName')
  const apiKey = searchParams.get('apiKey')

  if (!characterName || !apiKey) {
    return NextResponse.json({ error: '캐릭터명과 API 키가 필요합니다' }, { status: 400 })
  }

  try {
    const encoded = encodeURIComponent(characterName)
    const res = await fetch(`${LOA_BASE}/characters/${encoded}/siblings`, {
      headers: {
        Authorization: `bearer ${apiKey}`,
        Accept: 'application/json',
      },
      cache: 'no-store', // 사용자마다 API 키가 달라 캐시 불가
    })

    if (!res.ok) {
      const body = await res.text().catch(() => '')
      console.error(`[LOA API] ${res.status}`, body)
      if (res.status === 401) return NextResponse.json({ error: '유효하지 않은 API 키입니다. 키를 다시 확인해 주세요.' }, { status: 401 })
      if (res.status === 403) return NextResponse.json({ error: 'API 키 권한이 없습니다.' }, { status: 403 })
      if (res.status === 404) return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다. 이름을 다시 확인해 주세요.' }, { status: 404 })
      if (res.status === 429) return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
      return NextResponse.json({ error: `로스트아크 API 오류 (${res.status})` }, { status: res.status })
    }

    const data = await res.json()

    if (!Array.isArray(data)) {
      console.error('[LOA API] 예상치 못한 응답 형식:', data)
      return NextResponse.json({ error: '로스트아크 API 응답 형식 오류' }, { status: 500 })
    }

    // ItemMaxLevel 없으면 ItemAvgLevel로 fallback
    const characters = data
      .map(c => {
        const raw = c.ItemMaxLevel ?? c.ItemAvgLevel ?? '0'
        return {
          name:      c.CharacterName,
          class:     c.CharacterClassName,
          server:    c.ServerName,
          itemLevel: parseFloat(String(raw).replace(/,/g, '')) || 0,
        }
      })
      .sort((a, b) => b.itemLevel - a.itemLevel)

    // 전투력: 각 캐릭터 프로필을 병렬 조회
    const withPower = await Promise.all(
      characters.map(async (c) => {
        try {
          const res = await fetch(
            `${LOA_BASE}/armories/characters/${encodeURIComponent(c.name)}?filters=profiles`,
            {
              headers: { Authorization: `bearer ${apiKey}`, Accept: 'application/json' },
              cache: 'no-store',
            }
          )
          if (!res.ok) return { ...c, combatPower: null }
          const profile = await res.json()
          const raw = profile?.ArmoryProfile?.CombatPower
          return {
            ...c,
            combatPower: raw ? parseFloat(String(raw).replace(/,/g, '')) : null,
          }
        } catch {
          return { ...c, combatPower: null }
        }
      })
    )

    return NextResponse.json(withPower)
  } catch (err) {
    console.error('[LOA API]', err)
    return NextResponse.json({ error: `서버 오류: ${err.message}` }, { status: 500 })
  }
}

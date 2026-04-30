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
      next: { revalidate: 300 }, // 5분 캐시
    })

    if (!res.ok) {
      if (res.status === 401) return NextResponse.json({ error: '유효하지 않은 API 키입니다' }, { status: 401 })
      if (res.status === 404) return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다' }, { status: 404 })
      return NextResponse.json({ error: '로스트아크 API 오류' }, { status: res.status })
    }

    const data = await res.json()

    // 필요한 필드만 추려서 반환
    const characters = data.map(c => ({
      name:       c.CharacterName,
      class:      c.CharacterClassName,
      server:     c.ServerName,
      itemLevel:  parseFloat(c.ItemMaxLevel?.replace(/,/g, '') || '0'),
    })).sort((a, b) => b.itemLevel - a.itemLevel)

    return NextResponse.json(characters)
  } catch (err) {
    console.error('[LOA API]', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다' }, { status: 500 })
  }
}

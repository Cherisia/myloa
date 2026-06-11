// 로스트아크 Open API 프록시
// GET /api/loa?characterName=칼라디엘&apiKey=... → 원정대 캐릭터 목록
// apiKey 생략 시: 로그인 사용자 DB 키 → 공용 키 풀(LOA_PUBLIC_SEARCH_API_KEY → FALLBACK → LOA_API_KEY, 중복 제거)
// 공용 키: Stove 429(분당 한도) 시 풀에서 다음 키로 재시도. 공용 경로는 계정·IP별 60초 1회 슬롯 유지

import { NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { decrypt } from '@/lib/encrypt'

const LOA_BASE = process.env.LOA_API_BASE || 'https://developer-lostark.game.onstove.com'
const SERVER_POOL_COOLDOWN_MS = 60_000

/** 공용 API 키 검색용 — best-effort 메모리 제한(서버리스에서는 프로세스별) */
const serverPoolLastAt = new Map()

function poolRateKey(request, userId) {
  if (userId) return `u:${userId}`
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return `ip:${xff.split(',')[0].trim()}`
  const rip = request.headers.get('x-real-ip')
  if (rip) return `ip:${rip.trim()}`
  return 'ip:unknown'
}

/** @returns {number|null} 남은 초(재시도까지), null이면 통과 후 타임스탬프 기록됨 */
function tryConsumeServerPoolSlot(rateKey) {
  const now = Date.now()
  const prev = serverPoolLastAt.get(rateKey) ?? 0
  if (now - prev < SERVER_POOL_COOLDOWN_MS) {
    return Math.ceil((SERVER_POOL_COOLDOWN_MS - (now - prev)) / 1000)
  }
  serverPoolLastAt.set(rateKey, now)
  if (serverPoolLastAt.size > 100) {
    for (const [k, t] of serverPoolLastAt) {
      if (now - t > SERVER_POOL_COOLDOWN_MS) serverPoolLastAt.delete(k)
    }
  }
  return null
}

/** 공용 JWT 목록(순서 유지, 동일 문자열는 1회만) */
function sharedEnvApiKeys() {
  const seen = new Set()
  const out = []
  for (const raw of [
    process.env.LOA_PUBLIC_SEARCH_API_KEY,
    process.env.LOA_PUBLIC_SEARCH_API_KEY_FALLBACK,
    process.env.LOA_API_KEY,
  ]) {
    const k = (raw || '').trim()
    if (!k || seen.has(k)) continue
    seen.add(k)
    out.push(k)
  }
  return out
}

/** @param {string[]} keys @param {string} startKey */
function keysFromPreferred(keys, startKey) {
  const i = keys.indexOf(startKey)
  if (i <= 0) return [...keys]
  return [...keys.slice(i), ...keys.slice(0, i)]
}

/**
 * @param {string} path - e.g. /characters/x/siblings or /armories/...
 * @param {string[]} keys
 * @returns {Promise<{ res: Response, key: string | null }>}
 */
async function loaFetchWith429Fallback(path, keys) {
  let lastRes = /** @type {Response | null} */ (null)
  for (const k of keys) {
    const res = await fetch(`${LOA_BASE}${path}`, {
      headers: { Authorization: `bearer ${k}`, Accept: 'application/json' },
      cache: 'no-store',
    })
    lastRes = res
    if (res.ok) return { res, key: k }
    if (res.status === 429) {
      await res.text().catch(() => {})
      console.warn('[LOA API] 429, 다음 공용 키로 재시도')
      continue
    }
    return { res, key: k }
  }
  return { res: lastRes, key: null }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url)
  const characterName = searchParams.get('characterName')
  // apiKey는 헤더로 수신 (URL 노출 방지). 하위 호환을 위해 쿼리스트링도 fallback으로 허용
  let apiKey = (request.headers.get('x-loa-api-key') || searchParams.get('apiKey') || '').trim()

  if (!characterName) {
    return NextResponse.json({ error: '캐릭터명이 필요합니다' }, { status: 400 })
  }

  const session = await auth()
  const userId = session?.user?.id ?? null

  // 쿼리에 없으면 DB 저장 키
  if (!apiKey && userId) {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { apiKey: true } })
    if (user?.apiKey) {
      try {
        apiKey = decrypt(user.apiKey)
      } catch {
        apiKey = ''
      }
    }
  }

  /** @type {string[]} */
  let keysForRequest
  if (apiKey) {
    keysForRequest = [apiKey]
  } else {
    const shared = sharedEnvApiKeys()
    if (shared.length > 0) {
      const waitSec = tryConsumeServerPoolSlot(poolRateKey(request, userId))
      if (waitSec != null) {
        return NextResponse.json(
          { error: `API 키 없이 검색은 1분에 1회입니다. (${waitSec}초 후 재시도)` },
          { status: 429 },
        )
      }
      keysForRequest = shared
    } else {
      keysForRequest = []
    }
  }

  if (keysForRequest.length === 0) {
    return NextResponse.json(
      {
        error:
          '로스트아크 API 키를 입력하거나 계정에 등록해 주세요. (배포 환경에서는 서버에 LOA_PUBLIC_SEARCH_API_KEY를 설정하면 키 없이 검색할 수 있습니다.)',
      },
      { status: 400 },
    )
  }

  try {
    const encoded = encodeURIComponent(characterName)
    const { res, key: siblingKey } = await loaFetchWith429Fallback(`/characters/${encoded}/siblings`, keysForRequest)

    if (!res || !res.ok) {
      const body = await (res?.text?.() ?? Promise.resolve('')).catch(() => '')
      console.error(`[LOA API] ${res?.status}`, body)
      const st = res?.status ?? 502
      if (st === 401) return NextResponse.json({ error: '유효하지 않은 API 키입니다. 키를 다시 확인해 주세요.' }, { status: 401 })
      if (st === 403) return NextResponse.json({ error: 'API 키 권한이 없습니다.' }, { status: 403 })
      if (st === 404) return NextResponse.json({ error: '캐릭터를 찾을 수 없습니다. 이름을 다시 확인해 주세요.' }, { status: 404 })
      if (st === 429) return NextResponse.json({ error: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.' }, { status: 429 })
      return NextResponse.json({ error: `로스트아크 API 오류 (${st})` }, { status: st })
    }

    const data = await res.json()

    if (!Array.isArray(data)) {
      console.error('[LOA API] 예상치 못한 응답 형식:', data)
      return NextResponse.json({ error: '로스트아크 API 응답 형식 오류' }, { status: 500 })
    }

    const characters = data
      .map(c => {
        const raw = c.ItemMaxLevel ?? c.ItemAvgLevel ?? '0'
        return {
          name:            c.CharacterName,
          class:           c.CharacterClassName,
          server:          c.ServerName,
          itemLevel:       parseFloat(String(raw).replace(/,/g, '')) || 0,
          isMainCharacter: c.IsMainCharacter ?? false,
        }
      })
      .sort((a, b) => b.itemLevel - a.itemLevel)

    const armoryKeys = siblingKey ? keysFromPreferred(keysForRequest, siblingKey) : keysForRequest

    const withPower = await Promise.all(
      characters.map(async (c) => {
        try {
          const path = `/armories/characters/${encodeURIComponent(c.name)}?filters=profiles`
          let profile = null
          for (const k of armoryKeys) {
            const resP = await fetch(`${LOA_BASE}${path}`, {
              headers: { Authorization: `bearer ${k}`, Accept: 'application/json' },
              cache: 'no-store',
            })
            if (resP.ok) {
              profile = await resP.json()
              break
            }
            if (resP.status === 429) {
              await resP.text().catch(() => {})
              continue
            }
            break
          }
          const raw = profile?.ArmoryProfile?.CombatPower
          return {
            ...c,
            combatPower: raw ? parseFloat(String(raw).replace(/,/g, '')) : null,
          }
        } catch {
          return { ...c, combatPower: null }
        }
      }),
    )

    return NextResponse.json(withPower)
  } catch (err) {
    console.error('[LOA API]', err)
    return NextResponse.json({ error: `서버 오류: ${err.message}` }, { status: 500 })
  }
}

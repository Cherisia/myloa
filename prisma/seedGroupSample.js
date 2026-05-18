/**
 * 그룹 샘플 데이터 시드 스크립트
 * 실행: node prisma/seedGroupSample.js
 *
 * yhc920923@gmail.com (아레) 계정이 리더인 50인 그룹을 생성하고
 * 49명의 가상 멤버에게 임의의 레이드 숙제를 부여합니다.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env.local') })
const { PrismaClient } = require('@prisma/client')
const crypto = require('crypto')

const prisma = new PrismaClient()

// ── 레이드 정의 (lib/raidData.js 와 동일) ────────────────────────────────────
const RAIDS = [
  { id: 'egir-ex',       gates: 1, difficulties: ['nightmare', 'hard', 'normal'], minIlv: { nightmare: 1770, hard: 1750, normal: 1720 } },
  { id: 'abrel-ex',      gates: 1, difficulties: ['nightmare', 'hard', 'normal'], minIlv: { nightmare: 1770, hard: 1750, normal: 1720 } },
  { id: 'serca',         gates: 2, difficulties: ['nightmare', 'hard', 'normal'], minIlv: { nightmare: 1740, hard: 1730, normal: 1710 } },
  { id: 'cathedral',     gates: 2, difficulties: ['stage3', 'stage2', 'stage1'], minIlv: { stage3: 1750, stage2: 1720, stage1: 1700 } },
  { id: 'kazeros-final', gates: 2, difficulties: ['hard', 'normal'], minIlv: { hard: 1730, normal: 1710 } },
  { id: 'armocha',       gates: 2, difficulties: ['hard', 'normal'], minIlv: { hard: 1720, normal: 1700 } },
  { id: 'mordum',        gates: 3, difficulties: ['hard', 'normal'], minIlv: { hard: 1700, normal: 1680 } },
  { id: 'abrelshud-2',   gates: 2, difficulties: ['hard', 'normal'], minIlv: { hard: 1690, normal: 1670 } },
  { id: 'egir-1',        gates: 2, difficulties: ['hard', 'normal'], minIlv: { hard: 1680, normal: 1660 } },
  { id: 'behemoth',      gates: 2, difficulties: ['normal'], minIlv: { normal: 1640 } },
  { id: 'echidna',       gates: 2, difficulties: ['hard', 'normal'], minIlv: { hard: 1640, normal: 1620 } },
  { id: 'kamen',         gates: 4, difficulties: ['hard', 'normal'], minIlv: { hard: 1630, normal: 1610 } },
  { id: 'ivory-tower',   gates: 3, difficulties: ['hard', 'normal'], minIlv: { hard: 1620, normal: 1600 } },
  { id: 'illiakan',      gates: 3, difficulties: ['hard', 'normal'], minIlv: { hard: 1600, normal: 1580 } },
  { id: 'kayangel',      gates: 3, difficulties: ['hard', 'normal'], minIlv: { hard: 1580, normal: 1540 } },
]

// ── 클래스 목록 ───────────────────────────────────────────────────────────────
const CLASSES = [
  '버서커', '워로드', '홀리나이트', '슬레이어',
  '배틀마스터', '인파이터', '기공사', '스트라이커', '브레이커',
  '데빌헌터', '블래스터', '호크아이', '스카우터', '건슬링어',
  '바드', '서머너', '아르카나', '소서리스',
  '블레이드', '데모닉', '리퍼', '소울이터',
  '도화가', '기상술사',
]

// ── 서버 목록 ─────────────────────────────────────────────────────────────────
const SERVERS = ['루페온', '아만', '카마인', '실리안', '아브렐슈드', '카제로스']

// ── 캐릭터 이름 풀 ────────────────────────────────────────────────────────────
const CHAR_PREFIXES = [
  '달빛', '폭풍', '천둥', '불꽃', '얼음', '어둠', '빛의', '바람', '구름', '별빛',
  '용사', '검사', '마법', '신성', '그림자', '황금', '백은', '청동', '흑철', '홍염',
  '무한', '절대', '영원', '신비', '광란', '고요', '질풍', '번개', '화염', '서리',
]
const CHAR_SUFFIXES = [
  '전사', '기사', '마법사', '궁수', '도적', '성직자', '용사', '검객',
  '사냥꾼', '마도사', '성기사', '암살자', '소환사', '빙결사', '불꽃사',
  '천둥사', '바람술사', '그림자', '파괴자', '수호자',
]

// 유저 이름 풀
const USER_NAMES = [
  '아이온', '루나', '테온', '제이', '카이', '미르', '제이드', '루시',
  '엘리', '아이', '세린', '다인', '나린', '주이', '소이', '아린',
  '서연', '예린', '하린', '민준', '준호', '지훈', '동현', '성민',
  '현우', '재원', '상준', '우진', '민혁', '지성', '승현', '태양',
  '해온', '별이', '하늘', '바다', '숲속', '강산', '들판', '꽃봄',
  '여름', '가을', '겨울', '새벽', '황혼', '노을', '달빛', '별빛',
  '꿈결', '미래',
]

// ── 유틸 함수 ─────────────────────────────────────────────────────────────────
function rand(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}
function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}
function randBool(prob = 0.5) {
  return Math.random() < prob
}
function makeInviteCode() {
  return crypto.randomBytes(4).toString('hex').toUpperCase()
}

// 다음 수요일 06:00 KST
function getNextResetAt() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay()
  const hour = kst.getUTCHours()
  let daysUntilWed = (3 - day + 7) % 7
  if (daysUntilWed === 0 && hour >= 6) daysUntilWed = 7
  const reset = new Date(kst)
  reset.setUTCDate(kst.getUTCDate() + daysUntilWed)
  reset.setUTCHours(6 - 9, 0, 0, 0)
  return reset
}

// 캐릭터 아이템 레벨에 맞는 레이드+난이도 선택
function pickRaidsForChar(itemLevel) {
  const result = []
  // EX 레이드는 최고 캐릭에만 1개 (무작위로 스킵하기 위해 별도 처리)
  for (const raid of RAIDS) {
    if (raid.id === 'egir-ex' || raid.id === 'abrel-ex') continue // EX는 따로

    const eligibleDiffs = raid.difficulties.filter(d => itemLevel >= raid.minIlv[d])
    if (eligibleDiffs.length === 0) continue

    // 60% 확률로 이 레이드 숙제 존재
    if (!randBool(0.6)) continue

    const diff = eligibleDiffs[0] // 가장 높은 난이도 선택
    const gateCount = raid.id === 'kamen' && diff === 'hard' ? 4
                    : raid.id === 'kamen' && diff === 'normal' ? 3
                    : raid.gates

    // 게이트별 클리어 여부 (완료율 30~100%)
    const clearProb = Math.random() * 0.7 + 0.3
    const gateClears = []
    for (let g = 0; g < gateCount; g++) {
      // 앞 게이트가 안 깨지면 뒷 게이트도 못 깸
      if (g > 0 && !gateClears[g - 1]) { gateClears.push(false); continue }
      gateClears.push(randBool(clearProb))
    }

    result.push({ raidId: raid.id, difficulty: diff, gateClears })
  }
  return result
}

// ── 메인 시드 로직 ────────────────────────────────────────────────────────────
async function main() {
  // 1. 아레 계정 찾기
  const arae = await prisma.user.findUnique({
    where: { email: 'yhc920923@gmail.com' },
  })
  if (!arae) {
    console.error('❌ yhc920923@gmail.com 유저를 찾을 수 없습니다. 먼저 로그인하세요.')
    process.exit(1)
  }
  console.log(`✅ 아레 계정 확인: ${arae.id} (${arae.name})`)

  // 2. 기존 샘플 공격대 정리
  const existing = await prisma.expedition.findFirst({
    where: { name: '아레의 공격대 [샘플]', leaderId: arae.id },
  })
  if (existing) {
    await prisma.expedition.delete({ where: { id: existing.id } })
    console.log('🗑️  기존 샘플 공격대 삭제')
  }

  // 3. 공격대(Expedition) 생성 — 아레가 리더
  const expedition = await prisma.expedition.create({
    data: {
      name: '아레의 공격대 [샘플]',
      description: '50인 레이드 현황 테스트 공격대입니다.',
      notice: '매주 수요일 초기화! 레이드 현황을 꼭 업데이트해 주세요.',
      leaderId: arae.id,
      inviteCode: makeInviteCode(),
      maxMembers: 50,
    },
  })
  console.log(`✅ 공격대 생성: "${expedition.name}" (id: ${expedition.id})`)

  // 4. 아레 자신을 leader 멤버로 추가
  await prisma.expeditionMember.create({
    data: {
      expeditionId: expedition.id,
      userId: arae.id,
      role: 'leader',
      status: 'active',
      visibility: 'all',
      joinedAt: new Date(),
    },
  })
  console.log('✅ 아레 멤버 등록 완료')

  // 5. 49명 가상 멤버 생성
  const resetAt = getNextResetAt()
  const now = new Date()

  for (let i = 0; i < 49; i++) {
    const userName = USER_NAMES[i % USER_NAMES.length] + (i >= USER_NAMES.length ? `${Math.floor(i / USER_NAMES.length) + 1}` : '')
    const server = pick(SERVERS)
    const email = `sample_member_${i + 1}@myloa-sample.local`

    // 중복 유저 방지: 이미 있으면 재사용
    let user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      user = await prisma.user.create({
        data: {
          name: userName,
          discordUsername: `${userName.toLowerCase()}_${rand(1000, 9999)}`,
          email,
          image: `https://api.dicebear.com/7.x/pixel-art/svg?seed=${encodeURIComponent(userName)}`,
        },
      })
    }

    // LoaExpedition (원정대 계정) 생성
    let loaExp = await prisma.loaExpedition.findFirst({ where: { userId: user.id } })
    if (!loaExp) {
      const repName = `${pick(CHAR_PREFIXES)}${pick(CHAR_SUFFIXES)}`
      loaExp = await prisma.loaExpedition.create({
        data: { userId: user.id, repCharName: repName },
      })
    }

    // 기존 캐릭터 정리
    await prisma.character.deleteMany({ where: { expeditionId: loaExp.id } })

    // 캐릭터 수 (3~6개)
    const charCount = rand(3, 6)
    // 대표 캐릭터 아이템레벨 (1620~1790)
    const repIlv = (rand(1620, 1790) + Math.random()).toFixed(2)

    for (let c = 0; c < charCount; c++) {
      // 대표 캐릭터가 가장 높고, 나머지는 점점 낮게
      const ilvDrop = c === 0 ? 0 : rand(20, 80) * c
      const ilv = Math.max(1540, Number(repIlv) - ilvDrop)
      const charClass = pick(CLASSES)
      const charName = `${pick(CHAR_PREFIXES)}${pick(CHAR_SUFFIXES)}`

      const char = await prisma.character.create({
        data: {
          expeditionId: loaExp.id,
          name: charName,
          class: charClass,
          server,
          itemLevel: ilv,
          combatPower: rand(10000, 80000),
          sortOrder: c,
          isActive: true,
        },
      })

      // CharacterRaid 생성
      const raids = pickRaidsForChar(ilv)
      for (const raidEntry of raids) {
        const raidDef = RAIDS.find(r => r.id === raidEntry.raidId)
        if (!raidDef) continue
        const gateCount = raidEntry.gateClears.length

        await prisma.characterRaid.upsert({
          where: { characterId_raidId_difficulty: { characterId: char.id, raidId: raidEntry.raidId, difficulty: raidEntry.difficulty } },
          create: {
            characterId: char.id,
            raidId: raidEntry.raidId,
            difficulty: raidEntry.difficulty,
            gateClears: raidEntry.gateClears,
            isGoldCheck: randBool(0.7),
            moreDone: false,
            moreFrom: 'bound',
            resetAt,
          },
          update: {
            gateClears: raidEntry.gateClears,
            resetAt,
          },
        })
      }
    }

    // ExpeditionMember 등록
    const joinedAt = new Date(now.getTime() - rand(1, 30) * 24 * 60 * 60 * 1000)
    await prisma.expeditionMember.upsert({
      where: { expeditionId_userId: { expeditionId: expedition.id, userId: user.id } },
      create: {
        expeditionId: expedition.id,
        userId: user.id,
        role: i < 2 ? 'officer' : 'member', // 처음 2명은 부공격대장
        status: 'active',
        visibility: randBool(0.9) ? 'all' : 'none', // 90% 공개
        joinedAt,
      },
      update: { status: 'active', joinedAt },
    })

    if ((i + 1) % 10 === 0) console.log(`  ... ${i + 1}/49 멤버 생성 완료`)
  }

  console.log('\n✅ 샘플 데이터 생성 완료!')
  console.log(`   그룹 ID: ${expedition.id}`)
  console.log(`   총 멤버: 50명 (아레 포함)`)
  console.log(`   접속 경로: /group → "${expedition.name}" 클릭`)
}

main()
  .catch(e => { console.error('❌ 오류:', e); process.exit(1) })
  .finally(() => prisma.$disconnect())

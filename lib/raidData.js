// 일일 초기화: 매일 06:00 KST
export function getNextDailyResetAt() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const hour = kst.getUTCHours()
  const reset = new Date(kst)
  if (hour >= 6) reset.setUTCDate(kst.getUTCDate() + 1)
  reset.setUTCHours(6 - 9, 0, 0, 0)
  return reset
}

// 주간 초기화: 매주 수요일 06:00 KST
export function getNextResetAt() {
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

export function isResetPassed(resetAt) {
  return new Date() > new Date(resetAt)
}

// 클래스 색상
export const CLASS_COLOR = {
  '버서커': 'bg-red-100 text-red-700', '워로드': 'bg-red-100 text-red-700',
  '홀리나이트': 'bg-yellow-100 text-yellow-700', '슬레이어': 'bg-red-100 text-red-700',
  '배틀마스터': 'bg-orange-100 text-orange-700', '인파이터': 'bg-orange-100 text-orange-700',
  '기공사': 'bg-orange-100 text-orange-700', '스트라이커': 'bg-orange-100 text-orange-700',
  '브레이커': 'bg-orange-100 text-orange-700',
  '데빌헌터': 'bg-green-100 text-green-700', '블래스터': 'bg-green-100 text-green-700',
  '호크아이': 'bg-green-100 text-green-700', '스카우터': 'bg-green-100 text-green-700',
  '건슬링어': 'bg-green-100 text-green-700',
  '바드': 'bg-blue-100 text-blue-700', '서머너': 'bg-purple-100 text-purple-700',
  '아르카나': 'bg-purple-100 text-purple-700', '소서리스': 'bg-indigo-100 text-indigo-700',
  '블레이드': 'bg-pink-100 text-pink-700', '데모닉': 'bg-pink-100 text-pink-700',
  '리퍼': 'bg-pink-100 text-pink-700', '소울이터': 'bg-pink-100 text-pink-700',
  '도화가': 'bg-teal-100 text-teal-700', '기상술사': 'bg-teal-100 text-teal-700',
}

// ─────────────────────────────────────────────────────────────────────────────
// 레이드 데이터
//   goldBound    : 게이트별 귀속골드
//   goldTrade    : 게이트별 거래가능골드
//   goldMore     : 게이트별 더보기 비용 (클리어골드에서 차감)
//   minItemLevel : 해당 난이도 입장 아이템 레벨
// ─────────────────────────────────────────────────────────────────────────────
// 레이드 카테고리 아이콘
const KAZEROS    = '/schedule/raid.png'
const LEGION     = '/schedule/legion_raid.png'
const ABYSS      = '/schedule/abyss_dungeon.png'
const SHADOW     = '/schedule/shadow_raid.png'
const ABYSS_RAID = '/schedule/abyss_raid.png'

export const RAIDS = [

  // ── 익스트림 모드 (에픽 레이드) ───────────────────────────────────────────
  {
    id: 'abrel-ex',
    name: '아브렐슈드 EX',
    image: KAZEROS,
    minItemLevel: 1720,
    tag: 'extreme',
    difficulties: [
      { key: 'nightmare', label: '나메', minItemLevel: 1770, gates: 1, goldBound: [0], goldTrade: [45000], goldMore: [0] },
      { key: 'hard',      label: '하드', minItemLevel: 1750, gates: 1, goldBound: [0], goldTrade: [45000], goldMore: [0] },
      { key: 'normal',    label: '노말', minItemLevel: 1720, gates: 1, goldBound: [0], goldTrade: [20000], goldMore: [0] },
    ],
  },

  // ── 세르카 (그림자 레이드) ────────────────────────────────────────────────
  {
    id: 'serca',
    name: '세르카',
    image: SHADOW,
    maxPlayers: 4,
    minItemLevel: 1710,
    difficulties: [
      { key: 'nightmare', label: '나메', minItemLevel: 1740, gates: 2, goldBound: [0,    0],     goldTrade: [21000, 33000], goldMore: [6720, 10560] },
      { key: 'hard',      label: '하드', minItemLevel: 1730, gates: 2, goldBound: [0,    0],     goldTrade: [17500, 26500], goldMore: [5600,  8480] },
      { key: 'normal',    label: '노말', minItemLevel: 1710, gates: 2, goldBound: [7000, 10500], goldTrade: [7000,  10500], goldMore: [4480,  6720] },
    ],
  },

  // ── 지평의 성당 (어비스 던전) ─────────────────────────────────────────────
  {
    id: 'cathedral',
    name: '지평의 성당',
    image: ABYSS,
    minItemLevel: 1700,
    difficulties: [
      { key: 'stage3', label: '3단계', minItemLevel: 1750, gates: 2, goldBound: [20000, 30000], goldTrade: [0, 0], goldMore: [6400, 9600] },
      { key: 'stage2', label: '2단계', minItemLevel: 1720, gates: 2, goldBound: [16000, 24000], goldTrade: [0, 0], goldMore: [5120, 7680] },
      { key: 'stage1', label: '1단계', minItemLevel: 1700, gates: 2, goldBound: [13500, 16500], goldTrade: [0, 0], goldMore: [4320, 5280] },
    ],
  },

  // ── 종막 : 카제로스 (에픽 레이드) ────────────────────────────────────────
  {
    id: 'kazeros-final',
    name: '종막 : 카제로스',
    image: KAZEROS,
    minItemLevel: 1710,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1730, gates: 2, goldBound: [0,    0],     goldTrade: [17000, 35000], goldMore: [5440,  11200] },
      { key: 'normal', label: '노말', minItemLevel: 1710, gates: 2, goldBound: [7000, 13000], goldTrade: [7000,  13000], goldMore: [4480,  8320]  },
    ],
  },

  // ── 4막 : 아르모체 (에픽 레이드) ─────────────────────────────────────────
  {
    id: 'armocha',
    name: '4막 : 아르모체',
    image: KAZEROS,
    minItemLevel: 1700,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1720, gates: 2, goldBound: [0,    0],     goldTrade: [15000, 27000], goldMore: [4800, 8640] },
      { key: 'normal', label: '노말', minItemLevel: 1700, gates: 2, goldBound: [6250, 10250], goldTrade: [6250,  10250], goldMore: [4000, 6500] },
    ],
  },

  // ── 3막 : 모르둠 (에픽 레이드) ───────────────────────────────────────────
  {
    id: 'mordum',
    name: '3막 : 모르둠',
    image: KAZEROS,
    minItemLevel: 1680,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1700, gates: 3, goldBound: [2500, 4000, 7000], goldTrade: [2500, 4000, 7000], goldMore: [1650, 2640, 4060] },
      { key: 'normal', label: '노말', minItemLevel: 1680, gates: 3, goldBound: [2000, 3500, 5000], goldTrade: [2000, 3500, 5000], goldMore: [1300, 2350, 3360] },
    ],
  },

  // ── 2막 : 아브렐슈드 (에픽 레이드) ──────────────────────────────────────
  {
    id: 'abrelshud-2',
    name: '2막 : 아브렐슈드',
    image: KAZEROS,
    minItemLevel: 1670,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1690, gates: 2, goldBound: [3750, 7750], goldTrade: [3750, 7750], goldMore: [2400, 5100] },
      { key: 'normal', label: '노말', minItemLevel: 1670, gates: 2, goldBound: [2750, 5500], goldTrade: [2750, 5500], goldMore: [1820, 3720] },
    ],
  },

  // ── 1막 : 에기르 (에픽 레이드) ───────────────────────────────────────────
  {
    id: 'egir-1',
    name: '1막 : 에기르',
    image: KAZEROS,
    minItemLevel: 1660,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1680, gates: 2, goldBound: [2750, 6250], goldTrade: [2750, 6250], goldMore: [1820, 4150] },
      { key: 'normal', label: '노말', minItemLevel: 1660, gates: 2, goldBound: [1750, 4000], goldTrade: [1750, 4000], goldMore: [750,  1780] },
    ],
  },

  // ── 베히모스 (어비스 레이드) ──────────────────────────────────────────────
  {
    id: 'behemoth',
    name: '베히모스',
    image: ABYSS_RAID,
    minItemLevel: 1640,
    difficulties: [
      { key: 'normal', label: '노말', minItemLevel: 1640, gates: 2, goldBound: [0, 0], goldTrade: [2200, 5000], goldMore: [920, 1960] },
    ],
  },

  // ── 서막 : 에키드나 (에픽 레이드) ────────────────────────────────────────
  {
    id: 'echidna',
    name: '서막 : 에키드나',
    image: KAZEROS,
    minItemLevel: 1620,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1640, gates: 2, goldBound: [1100, 2500], goldTrade: [1100, 2500], goldMore: [720, 1630] },
      { key: 'normal', label: '노말', minItemLevel: 1620, gates: 2, goldBound: [1900, 4200], goldTrade: [0,    0],    goldMore: [310, 700]  },
    ],
  },

  // ── 카멘 (군단장 레이드) ──────────────────────────────────────────────────
  {
    id: 'kamen',
    name: '카멘',
    image: LEGION,
    minItemLevel: 1610,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1630, gates: 4, goldBound: [2000, 2400, 3600, 5000], goldTrade: [0, 0, 0, 0], goldMore: [500, 600, 900, 1250] },
      { key: 'normal', label: '노말', minItemLevel: 1610, gates: 3, goldBound: [1600, 2000, 2800],       goldTrade: [0, 0, 0],    goldMore: [360, 440, 640]       },
    ],
  },

  // ── 혼돈의 상아탑 (어비스 던전) ──────────────────────────────────────────
  {
    id: 'ivory-tower',
    name: '혼돈의 상아탑',
    image: ABYSS,
    minItemLevel: 1600,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1620, gates: 3, goldBound: [1400, 2000, 3800], goldTrade: [0, 0, 0], goldMore: [350, 500, 950] },
      { key: 'normal', label: '노말', minItemLevel: 1600, gates: 3, goldBound: [1200, 1600, 2400], goldTrade: [0, 0, 0], goldMore: [180, 220, 300] },
    ],
  },

  // ── 일리아칸 (군단장 레이드) ──────────────────────────────────────────────
  {
    id: 'illiakan',
    name: '일리아칸',
    image: LEGION,
    minItemLevel: 1580,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1600, gates: 3, goldBound: [1200, 2000, 2800], goldTrade: [0, 0, 0], goldMore: [300, 500, 700] },
      { key: 'normal', label: '노말', minItemLevel: 1580, gates: 3, goldBound: [850,  1550, 2300], goldTrade: [0, 0, 0], goldMore: [190, 230, 330] },
    ],
  },

  // ── 카양겔 (어비스 던전) ──────────────────────────────────────────────────
  {
    id: 'kayangel',
    name: '카양겔',
    image: ABYSS,
    maxPlayers: 4,
    minItemLevel: 1540,
    difficulties: [
      { key: 'hard',   label: '하드', minItemLevel: 1580, gates: 3, goldBound: [900, 1400, 2000], goldTrade: [0, 0, 0], goldMore: [225, 350, 500] },
      { key: 'normal', label: '노말', minItemLevel: 1540, gates: 3, goldBound: [750, 1100, 1450], goldTrade: [0, 0, 0], goldMore: [180, 200, 270] },
    ],
  },
]

/** id → raid 객체 O(1) 조회 맵 */
export const RAID_MAP = Object.fromEntries(RAIDS.map(r => [r.id, r]))
/** id → RAIDS 배열 인덱스 (정렬용) */
export const RAID_ORDER_MAP = Object.fromEntries(RAIDS.map((r, i) => [r.id, i]))

export function getRaidById(id) {
  return RAID_MAP[id]
}

export function getDifficulty(raid, diffKey) {
  return raid?.difficulties.find(d => d.key === diffKey)
}

/** moreFrom 허용값 (귀속 / 거래) */
export const MORE_FROM_VALUES = ['bound', 'trade']

/**
 * 레이드 숙제 엔트리 입력 검증 (API 신뢰 경계용).
 * raidId·difficulty는 RAID_MAP 기준으로만 허용하고, 나머지 필드는 타입/범위를 확인한다.
 * @returns {string|null} 오류 메시지(검증 실패) 또는 null(통과)
 */
export function validateRaidEntry(entry = {}) {
  const { raidId, difficulty, gateClears, isGoldCheck, moreDone, moreFrom } = entry
  const raid = RAID_MAP[raidId]
  if (!raid) return '알 수 없는 레이드입니다'
  const diff = raid.difficulties.find(d => d.key === difficulty)
  if (!diff) return '알 수 없는 난이도입니다'
  if (gateClears !== undefined) {
    if (!Array.isArray(gateClears) || gateClears.length > diff.gates || gateClears.some(g => typeof g !== 'boolean')) {
      return '잘못된 관문 정보입니다'
    }
  }
  if (isGoldCheck !== undefined && typeof isGoldCheck !== 'boolean') return '잘못된 골드 체크 값입니다'
  if (moreDone !== undefined && typeof moreDone !== 'boolean') return '잘못된 더보기 값입니다'
  if (moreFrom !== undefined && !MORE_FROM_VALUES.includes(moreFrom)) return '잘못된 더보기 출처입니다'
  return null
}

// 귀속골드 합계
export function calcGoldBound(diff, gateClears) {
  return (diff?.goldBound || []).reduce((sum, g, i) => sum + (gateClears[i] ? g : 0), 0)
}

// 거래가능골드 합계
export function calcGoldTrade(diff, gateClears) {
  return (diff?.goldTrade || []).reduce((sum, g, i) => sum + (gateClears[i] ? g : 0), 0)
}

// 전체 골드 합계 (귀속 + 거래가능)
export function calcGold(diff, gateClears) {
  return calcGoldBound(diff, gateClears) + calcGoldTrade(diff, gateClears)
}

// 더보기 비용 합계
export function calcGoldMore(diff, gateClears) {
  return (diff?.goldMore || []).reduce((sum, g, i) => sum + (gateClears[i] ? g : 0), 0)
}

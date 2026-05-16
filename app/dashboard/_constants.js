// ── 계정당 1캐릭터만 선택 가능한 EX 레이드
export const EX_RAID_IDS = new Set(['egir-ex', 'abrel-ex'])
// 아직 출시되지 않아 UI에서 숨기는 레이드 (데이터는 유지)
export const HIDDEN_RAID_IDS = new Set(['abrel-ex'])

export const GOLD_RAID_LIMIT = 3  // 캐릭터당 골드 획득 레이드 최대 수
export const GOLD_CHAR_LIMIT = 6  // 계정당 골드 수령 캐릭터 최대 수

export const LOA_KEY_STORAGE = 'myloa_api_key'

export const DIFF_LABEL = { nightmare: '나메', hard: '하드', normal: '노말', stage3: '3단계', stage2: '2단계', stage1: '1단계' }
export const DIFF_COLOR  = {
  nightmare: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  hard:      'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  normal:    'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400',
  stage3:    'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
  stage2:    'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
  stage1:    'bg-gray-100 text-gray-600 dark:bg-[#2a2a2a] dark:text-gray-400',
}

// 할의 모래시계 아이템 레벨 제한
export const HAL_MIN_LEVEL = 1730

// 쿠르잔 전선 계열 아이템 레벨 기준
export const CHAOS_RIFT_MIN  = 1730  // 혼돈의 균열
export const KURZAN_FRONT_MIN = 1640 // 쿠르잔 전선

/** 아이템 레벨에 따라 알맞은 쿠르잔 전선 계열 프리셋 반환 */
export function getKurzanPreset(itemLevel) {
  const lv = itemLevel || 0
  if (lv >= CHAOS_RIFT_MIN)   return { name: '혼돈의 균열', type: 'daily', image: '/schedule/chaosrift.png' }
  if (lv >= KURZAN_FRONT_MIN) return { name: '쿠르잔 전선', type: 'daily', image: '/schedule/kurzan.png'    }
  return                              { name: '카오스 던전', type: 'daily', image: '/icons/misc16.png'       }
}

// 캐릭터 추가 시 자동으로 붙는 프리셋 (쿠르잔 계열은 getKurzanPreset으로 별도 처리)
export const AUTO_PRESETS = [
  { name: '가디언 토벌',  type: 'daily',  image: '/schedule/guardian.png' },
  { name: '할의 모래시계', type: 'weekly', image: '/schedule/hal.png'      },
  { name: '낙원',         type: 'weekly', image: '/schedule/paradise.png'  },
]

// ── 직업 아이콘 (로컬 /public/class/) ────────────────────────────────────────
export const CLASS_ICON = {
  // 전사(남)
  '디스트로이어': 'destroyer',
  '워로드':      'gunlancer',
  '버서커':      'berserker',
  '홀리나이트':  'paladin',
  // 전사(여)
  '슬레이어':    'slayer',
  '발키리':      'valkyrie',
  // 무도가(남)
  '스트라이커':  'striker',
  '브레이커':    'breaker',
  // 무도가(여)
  '배틀마스터':  'wardancer',
  '인파이터':    'scrapper',
  '기공사':      'soulfist',
  '창술사':      'glaivier',
  // 헌터(남)
  '데빌헌터':    'deadeye',
  '블래스터':    'artillerist',
  '호크아이':    'sharpshooter',
  '스카우터':    'machinist',
  // 헌터(여)
  '건슬링어':    'gunslinger',
  // 마법사
  '바드':        'bard',
  '서머너':      'summoner',
  '아르카나':    'arcanist',
  '소서리스':    'sorceress',
  // 암살자
  '블레이드':    'deathblade',
  '데모닉':      'shadowhunter',
  '리퍼':        'reaper',
  '소울이터':    'souleater',
  // 스페셜리스트
  '도화가':      'artist',
  '기상술사':    'aeromancer',
  '환수사':      'wildsoul',
  // 가디언나이트
  '가디언나이트': 'guardianknight',
}
export const getClassIcon = (cls) => CLASS_ICON[cls] ? `/class/${CLASS_ICON[cls]}.svg` : null

/** 쿠르잔 전선 계열 항목 이름 집합 */
export const KURZAN_NAMES = new Set(['혼돈의 균열', '쿠르잔 전선', '카오스 던전'])

// 휴식 게이지가 적용되는 커스텀 숙제 항목 이름 (쿠르잔 전선 계열 포함)
export const REST_GAUGE_NAMES = new Set(['혼돈의 균열', '쿠르잔 전선', '카오스 던전', '가디언 토벌'])

/** 일일 숙제 카드·표에서 쿠르잔 계열 → 가디언 고정 순서 */
export const DAILY_PRESET_ORDER = ['혼돈의 균열', '쿠르잔 전선', '카오스 던전', '가디언 토벌']

/** 캐릭터 커스텀 목록을 일일 섹션 표시 순으로 정렬 */
export function orderedDailyCustomItems(list) {
  if (!list?.length) return []
  const byName = new Map(list.map((it) => [it.name, it]))
  const out = []
  for (const name of DAILY_PRESET_ORDER) {
    const it = byName.get(name)
    if (it) out.push(it)
  }
  for (const it of list) {
    if (DAILY_PRESET_ORDER.includes(it.name)) continue
    if (it.type === 'daily') out.push(it)
  }
  return out
}

/** 주간 숙제 섹션(및 표 하단)에 넣을 커스텀 여부 — 휴식·일일 타입 제외 */
export function isWeeklyCustomItem(it) {
  if (!it) return false
  if (REST_GAUGE_NAMES.has(it.name)) return false
  if (it.type === 'daily') return false
  return true
}

export const CUSTOM_MAX = 10

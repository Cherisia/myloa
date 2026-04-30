// 주간 초기화: 매주 수요일 06:00 KST
export function getNextResetAt() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const day = kst.getUTCDay() // 0=일, 3=수
  const hour = kst.getUTCHours()

  let daysUntilWed = (3 - day + 7) % 7
  if (daysUntilWed === 0 && hour >= 6) daysUntilWed = 7

  const reset = new Date(kst)
  reset.setUTCDate(kst.getUTCDate() + daysUntilWed)
  reset.setUTCHours(6 - 9, 0, 0, 0) // 06:00 KST = 전날 21:00 UTC
  return reset
}

export function isResetPassed(resetAt) {
  return new Date() > new Date(resetAt)
}

// 클래스 색상
export const CLASS_COLOR = {
  // 전사
  '버서커': 'bg-red-100 text-red-700',
  '워로드': 'bg-red-100 text-red-700',
  '홀리나이트': 'bg-yellow-100 text-yellow-700',
  '슬레이어': 'bg-red-100 text-red-700',
  // 무도가
  '배틀마스터': 'bg-orange-100 text-orange-700',
  '인파이터': 'bg-orange-100 text-orange-700',
  '기공사': 'bg-orange-100 text-orange-700',
  '스트라이커': 'bg-orange-100 text-orange-700',
  '브레이커': 'bg-orange-100 text-orange-700',
  // 헌터
  '데빌헌터': 'bg-green-100 text-green-700',
  '블래스터': 'bg-green-100 text-green-700',
  '호크아이': 'bg-green-100 text-green-700',
  '스카우터': 'bg-green-100 text-green-700',
  '건슬링어': 'bg-green-100 text-green-700',
  // 마법사
  '바드': 'bg-blue-100 text-blue-700',
  '서머너': 'bg-purple-100 text-purple-700',
  '아르카나': 'bg-purple-100 text-purple-700',
  '소서리스': 'bg-indigo-100 text-indigo-700',
  // 암살자
  '블레이드': 'bg-pink-100 text-pink-700',
  '데모닉': 'bg-pink-100 text-pink-700',
  '리퍼': 'bg-pink-100 text-pink-700',
  '소울이터': 'bg-pink-100 text-pink-700',
  // 스페셜리스트
  '도화가': 'bg-teal-100 text-teal-700',
  '기상술사': 'bg-teal-100 text-teal-700',
}

// 레이드 데이터 (골드는 상수 관리)
export const RAIDS = [
  {
    id: 'kazeros',
    name: '카제로스',
    minItemLevel: 1680,
    difficulties: [
      { key: 'normal', label: '노말', gates: 2, gold: [3000, 5000] },
      { key: 'hard',   label: '하드', gates: 2, gold: [5000, 8000] },
    ],
  },
  {
    id: 'egir',
    name: '에기르',
    minItemLevel: 1660,
    difficulties: [
      { key: 'normal', label: '노말', gates: 4, gold: [1500, 2000, 2500, 3000] },
      { key: 'hard',   label: '하드', gates: 4, gold: [2500, 3500, 4000, 5000] },
    ],
  },
  {
    id: 'echidna',
    name: '에키드나',
    minItemLevel: 1620,
    difficulties: [
      { key: 'normal', label: '노말', gates: 2, gold: [1500, 2500] },
      { key: 'hard',   label: '하드', gates: 2, gold: [2500, 4500] },
    ],
  },
  {
    id: 'behemoth',
    name: '베히모스',
    minItemLevel: 1640,
    difficulties: [
      { key: 'normal', label: '노말', gates: 2, gold: [2000, 3000] },
      { key: 'hard',   label: '하드', gates: 2, gold: [3000, 5000] },
    ],
  },
  {
    id: 'illiakan',
    name: '일리아칸',
    minItemLevel: 1580,
    difficulties: [
      { key: 'normal', label: '노말', gates: 3, gold: [1000, 1500, 2000] },
      { key: 'hard',   label: '하드', gates: 3, gold: [1800, 2500, 3500] },
    ],
  },
  {
    id: 'abrelshud',
    name: '아브렐슈드',
    minItemLevel: 1490,
    difficulties: [
      { key: 'normal', label: '노말', gates: 4, gold: [700, 900, 1200, 1500] },
      { key: 'hard',   label: '하드', gates: 4, gold: [1200, 1600, 2200, 3000] },
    ],
  },
  {
    id: 'kayangel',
    name: '카양겔',
    minItemLevel: 1540,
    difficulties: [
      { key: 'normal', label: '노말', gates: 3, gold: [600, 900, 1200] },
      { key: 'hard',   label: '하드', gates: 3, gold: [1000, 1500, 2000] },
    ],
  },
]

export function getRaidById(id) {
  return RAIDS.find(r => r.id === id)
}

export function getDifficulty(raid, diffKey) {
  return raid?.difficulties.find(d => d.key === diffKey)
}

export function calcGold(goldArr, gateClears) {
  return goldArr.reduce((sum, g, i) => sum + (gateClears[i] ? g : 0), 0)
}

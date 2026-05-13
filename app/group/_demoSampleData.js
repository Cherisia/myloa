/**
 * 그룹 기능 데모 샘플 데이터
 * 실제 로스트아크 API 조회 기반 (2025-05-13)
 * 전략: 전체골드우선 (총 골드 Top 3 + EX 레이드)
 *
 * 멤버:
 *   피치    (discord: 피치)    — 그룹장   — 대표: 절구주는피치  1770.83
 *   내고머   (discord: 내고머)  — 부그룹장 — 대표: 엄우린       1779.17
 *   후니    (discord: 후니)    — 멤버     — 대표: 머스킷티어   1787.50
 *   문규    (discord: 문규)    — 멤버     — 대표: 골통분쇄기브쪽이 1783.33
 */

// ── 레이드 배정 근거 (전체골드우선, 아이템레벨 기준) ────────────────────────────
// 1770+ : egir-ex 나메(45k) + cathedral-s3(50k) + serca-nm(54k) + kazeros-hard(52k)
// 1750~1769 : cathedral-s3(50k) + serca-nm(54k) + kazeros-hard(52k)
// 1740~1749 : serca-nm(54k) + kazeros-hard(52k) + armocha-hard(42k)
// 1730~1739 : kazeros-hard(52k) + serca-hard(44k) + armocha-hard(42k)
// 1723~1729 : armocha-hard(42k) + cathedral-s2(40k) + kazeros-normal(40k)
// 1710~1722 : kazeros-normal(40k) + serca-normal(35k) + armocha-normal(33k)

export const DEMO_GROUP_MEMBERS = [

  // ── 피치 (그룹장) ──────────────────────────────────────────────────────────
  {
    id: 'gm-1',
    userId: 'gu-1',
    role: 'leader',
    visibility: 'all',
    name: '피치',
    discordUsername: '피치',
    image: null,
    repChar: { id: 'gc-1-1', name: '절구주는피치', class: '바드', itemLevel: 1770.83, combatPower: 1966.13 },
    expeditions: [
      {
        id: 'gexp-1',
        name: '루페온',
        characters: [
          {
            id: 'gc-1-1', name: '절구주는피치', class: '바드', server: '루페온',
            itemLevel: 1770.83, combatPower: 1966.13,
            raids: [
              { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [true],         isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-1-2', name: '여름햇살피치', class: '기상술사', server: '루페온',
            itemLevel: 1760.00, combatPower: 4144.21,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, false],  isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-1-3', name: '마음만은아가피치', class: '도화가', server: '루페온',
            itemLevel: 1759.17, combatPower: 1800.84,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',   gateClears: [true, true], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-1-4', name: '용맹주는피치', class: '바드', server: '루페온',
            itemLevel: 1758.33, combatPower: 1744.47,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-1-5', name: '빛의기사피치', class: '발키리', server: '루페온',
            itemLevel: 1755.83, combatPower: 4016.95,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-1-6', name: '해바라기반아가피치', class: '도화가', server: '루페온',
            itemLevel: 1736.67, combatPower: 1429.70,
            // 1736.67 < 1740 → serca hard(1730), 1736.67 < 1750 → 카제로스 hard 가능
            // top3: kazeros-hard(52k) > serca-hard(44k) > armocha-hard(42k)
            raids: [
              { raidId: 'kazeros-final', difficulty: 'hard', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'hard', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'armocha',       difficulty: 'hard', gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
        ],
      },
    ],
  },

  // ── 내고머 (부그룹장) ──────────────────────────────────────────────────────
  {
    id: 'gm-2',
    userId: 'gu-2',
    role: 'officer',
    visibility: 'all',
    name: '내고머',
    discordUsername: '내고머',
    image: null,
    repChar: { id: 'gc-2-1', name: '엄우린', class: '홀리나이트', itemLevel: 1779.17, combatPower: 2151.03 },
    expeditions: [
      {
        id: 'gexp-2',
        name: '루페온',
        characters: [
          {
            id: 'gc-2-1', name: '엄우린', class: '홀리나이트', server: '루페온',
            itemLevel: 1779.17, combatPower: 2151.03,
            raids: [
              { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [true],         isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, false],  isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-2-2', name: '내고점머스킷티어', class: '홀리나이트', server: '루페온',
            itemLevel: 1750.00, combatPower: 2545.30,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',   gateClears: [true, true], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-2-3', name: '홀리나이트장인엄우린', class: '홀리나이트', server: '루페온',
            itemLevel: 1750.00, combatPower: 1603.64,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-2-4', name: '바드장인엄우린', class: '바드', server: '루페온',
            itemLevel: 1723.50, combatPower: 3084.97,
            // 1723.5 < 1730 → serca/kazeros normal만 가능
            // top3: armocha-hard(42k) > cathedral-s2(40k) > kazeros-normal(40k)
            raids: [
              { raidId: 'armocha',       difficulty: 'hard',   gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage2', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-2-5', name: '발키리장인엄우린', class: '발키리', server: '루페온',
            itemLevel: 1710.00, combatPower: 2003.53,
            // top3: kazeros-normal(40k) > serca-normal(35k) > armocha-normal(33k)
            raids: [
              { raidId: 'kazeros-final', difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'armocha',       difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-2-6', name: '도화가장인엄우린', class: '도화가', server: '루페온',
            itemLevel: 1710.00, combatPower: 2297.52,
            raids: [
              { raidId: 'kazeros-final', difficulty: 'normal', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'armocha',       difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
        ],
      },
    ],
  },

  // ── 후니 (멤버) ────────────────────────────────────────────────────────────
  {
    id: 'gm-3',
    userId: 'gu-3',
    role: 'member',
    visibility: 'all',
    name: '후니',
    discordUsername: '후니',
    image: null,
    repChar: { id: 'gc-3-1', name: '머스킷티어', class: '블래스터', itemLevel: 1787.50, combatPower: 7455.32 },
    expeditions: [
      {
        id: 'gexp-3',
        name: '루페온',
        characters: [
          {
            id: 'gc-3-1', name: '머스킷티어', class: '블래스터', server: '루페온',
            itemLevel: 1787.50, combatPower: 7455.32,
            raids: [
              { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [true],       isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-3-2', name: '질풍노도환수사', class: '환수사', server: '루페온',
            itemLevel: 1769.17, combatPower: 5180.71,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-3-3', name: '사냥의시간데헌', class: '건슬링어', server: '루페온',
            itemLevel: 1765.00, combatPower: 4896.51,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, false],  isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-3-4', name: '역천지체천하섬멸옥', class: '기공사', server: '루페온',
            itemLevel: 1764.17, combatPower: 4936.92,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-3-5', name: '요양원휠체어도둑블래스터', class: '홀리나이트', server: '루페온',
            itemLevel: 1762.50, combatPower: 4822.80,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-3-6', name: '축복의오라발키리', class: '발키리', server: '루페온',
            itemLevel: 1761.67, combatPower: 4366.08,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, false],  isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
        ],
      },
    ],
  },

  // ── 문규 (멤버) ────────────────────────────────────────────────────────────
  {
    id: 'gm-4',
    userId: 'gu-4',
    role: 'member',
    visibility: 'all',
    name: '문규',
    discordUsername: '문규',
    image: null,
    repChar: { id: 'gc-4-1', name: '골통분쇄기브쪽이', class: '브레이커', itemLevel: 1783.33, combatPower: 6274.24 },
    expeditions: [
      {
        id: 'gexp-4',
        name: '루페온',
        characters: [
          {
            id: 'gc-4-1', name: '골통분쇄기브쪽이', class: '브레이커', server: '루페온',
            itemLevel: 1783.33, combatPower: 6274.24,
            raids: [
              { raidId: 'egir-ex',       difficulty: 'nightmare', gateClears: [true],         isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-4-2', name: '던파난민', class: '블레이드', server: '루페온',
            itemLevel: 1760.83, combatPower: 4867.10,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true],   isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-4-3', name: '골통분쇄브쪽이', class: '브레이커', server: '루페온',
            itemLevel: 1758.33, combatPower: 4148.04,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [true, true], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-4-4', name: '로헨델카지노문마담', class: '아르카나', server: '루페온',
            itemLevel: 1754.17, combatPower: 4379.83,
            raids: [
              { raidId: 'cathedral',     difficulty: 'stage3',    gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-4-5', name: '전투토끠리븐', class: '발키리', server: '루페온',
            itemLevel: 1740.83, combatPower: 3517.81,
            // 1740.83 >= 1740 → serca nightmare 가능
            // top3: serca-nm(54k) > kazeros-hard(52k) > armocha-hard(42k)
            raids: [
              { raidId: 'serca',         difficulty: 'nightmare', gateClears: [true, true],   isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'armocha',       difficulty: 'hard',      gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
          {
            id: 'gc-4-6', name: '등짝분쇄기랏데헌', class: '데빌헌터', server: '루페온',
            itemLevel: 1726.67, combatPower: 2515.27,
            // 1726.67 < 1730 → serca/kazeros normal만 가능
            // top3: armocha-hard(42k) > cathedral-s2(40k) > kazeros-normal(40k)
            raids: [
              { raidId: 'armocha',       difficulty: 'hard',   gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'cathedral',     difficulty: 'stage2', gateClears: [false, false], isGoldCheck: true, moreDone: false },
              { raidId: 'kazeros-final', difficulty: 'normal', gateClears: [false, false], isGoldCheck: true, moreDone: false },
            ],
          },
        ],
      },
    ],
  },
]

export const DEMO_FAVORITED_USER_IDS = ['gu-3', 'gu-4'] // 후니, 문규 즐겨찾기 예시

export const DEMO_GROUP = {
  id: 'demo',
  name: '카제로스 원정단 (샘플)',
  description: '비로그인 미리보기용 가상 그룹입니다. 레이드 현황·멤버·즐겨찾기 UI를 살펴볼 수 있어요.',
  notice: '🔔 샘플 데이터입니다. 로그인 후 실제 그룹을 만들거나 참가해 보세요!',
  inviteCode: 'DEMO1234',
  maxMembers: 24,
  createdAt: new Date('2025-01-01'),
  leader: { id: 'gu-1', name: '피치', image: null },
  members: DEMO_GROUP_MEMBERS,
  myRole: 'member',
  isMember: true,
  myVisibility: 'all',
  favoritedUserIds: [...DEMO_FAVORITED_USER_IDS],
}

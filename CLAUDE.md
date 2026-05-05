@AGENTS.md

# myloa — 로스트아크 레이드 숙제 관리

## 기술 스택
- **Next.js** (App Router, 서버 컴포넌트 + 클라이언트 컴포넌트)
- **Prisma** + **PostgreSQL** (Neon)
- **NextAuth.js** — Discord OAuth
- **Tailwind CSS v4** — `@custom-variant dark` + `[data-theme="pink"]` 테마
- **나눔스퀘어** 폰트 (`ns-bold`, `ns-extrabold`, `ns-light`)

## 프로젝트 구조

```
app/
  dashboard/
    page.js            # 서버 컴포넌트 — DB 조회 후 DashboardClient에 전달
    DashboardClient.js # 메인 대시보드 (캐릭터·레이드 숙제, 테이블/카드 뷰)
  group/
    page.js            # 그룹 목록
    [id]/
      page.js          # 서버 컴포넌트 — 그룹 상세 DB 조회
      GroupDetailClient.js
  api/
    homework/route.js  # GET/POST/DELETE — 레이드 체크 저장
    characters/route.js# GET/POST/DELETE/PATCH(순서) — 캐릭터 CRUD
    characters/sync/   # POST — 로스트아크 API로 전투력 갱신
    groups/            # 그룹 CRUD + 멤버/요청 관리
    loa/route.js       # 로스트아크 OpenAPI 프록시
lib/
  raidData.js          # RAIDS 정의, CLASS_COLOR, calcGold* 함수
  auth.js              # NextAuth 설정
  db.js                # Prisma 클라이언트
components/
  Navbar.js
  ThemeProvider.js
  DiscordIcon.js       # 공유 Discord SVG 아이콘
```

## 핵심 규칙

### 비로그인 (데모 모드)
- `page.js`에서 `!session?.user?.id` 시 `DEMO_CHARS` / `DEMO_RAIDS` 전달, `isLoggedIn` 미전달 (기본 false)
- `isDemo = !isLoggedIn` — DashboardClient 내에서 파생, prop으로 전달하지 않음
- 체크박스 토글은 클라이언트 상태만 변경 (`persistRaid` / `persistDelete` 래퍼가 `isLoggedIn` 여부로 fetch 스킵)
- 레이드 설정·캐릭터 설정·캐릭터 갱신 버튼 클릭 시 → "테스트 데이터입니다" 모달 (`showLoginGuide`)

### 테마
- `globals.css`에서 `[data-theme="pink"]`와 `.dark` 클래스로 컬러 오버라이드
- `ThemeProvider`가 `<html>` 에 `data-theme` + `dark` 클래스 부착

### 레이드 데이터 구조
```js
// 캐릭터별 레이드 엔트리
{ raidId, difficulty, gateClears: boolean[], isGoldCheck, moreDone, moreFrom: 'bound'|'trade' }

// 주간 초기화: 매주 수요일 06:00 KST
// EX 레이드(egir-ex, abrel-ex): 계정당 1캐릭터만 선택 가능
// HIDDEN_RAID_IDS: UI에 노출하지 않는 레이드 (데이터는 유지)
```

### 골드 규칙
- 캐릭터당 일반 레이드 골드 보상 최대 3개
- EX 레이드는 별도 카운트, 골드 해제 불가

### DB 저장 패턴 (Optimistic)
```js
// 컴포넌트 내부에서 persistRaid / persistDelete 사용
const persistRaid   = (charId, entry)           => { if (isLoggedIn) saveRaid(charId, entry) }
const persistDelete = (charId, raidId, diffKey) => { if (isLoggedIn) deleteRaid(charId, raidId, diffKey) }
```

### 아이콘
- `CLASS_ICON` 맵 → `/public/class/*.svg` (filter CSS로 테마별 색상)
- `getClassIcon(cls)` — 한 번만 호출 후 변수에 저장해서 사용
- `DiscordIcon` 컴포넌트 공유 (`components/DiscordIcon.js`)

### Prisma 쿼리 패턴
```js
// page.js에 ACCOUNT_INCLUDE 상수로 공유
const ACCOUNT_INCLUDE = {
  characters: {
    where:   { isActive: true },
    orderBy: [{ sortOrder: 'asc' }, { itemLevel: 'desc' }],
    include: { characterRaids: { orderBy: { createdAt: 'asc' } } },
  },
}
```

## 주요 컴포넌트 (DashboardClient.js)

| 컴포넌트 | 역할 |
|---|---|
| `RaidSettingsModal` | 캐릭터별 레이드·골드 설정 |
| `CharacterEditModal` | 캐릭터 목록 (DnD 순서변경, 일괄삭제) |
| `CharacterAddModal` | 로스트아크 API 캐릭터 검색·추가 (3단계 flow) |
| `AutoSetupModal` | 원정대 자동 세팅 |
| `RaidCell` | 레이드 완료 토글 셀 |
| `AnimatedGold` | 골드 숫자 애니메이션 |
| `Confetti` | 100% 완료 폭죽 |

## 알려진 제약
- `AutoSetupModal`: `raidsByName`은 `previewBase`(chars+apiKey) + `strategy`에서 `useMemo`로 파생 — effect로 관리하지 않음
- 드래그앤드랍(캐릭터 순서): HTML5 DnD API + 커스텀 ghost (`setDragImage`)
- `CharacterAddModal`의 localStorage API키 로드는 `useEffect`로 처리

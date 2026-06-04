@AGENTS.md

# myloa — 로스트아크 레이드 숙제 관리

## 기술 스택
- **Next.js 16** (App Router, 서버 컴포넌트 + 클라이언트 컴포넌트)
- **Prisma** + **PostgreSQL** (Neon serverless)
- **NextAuth.js v5** — Discord OAuth
- **Tailwind CSS v4** — `@custom-variant dark` + `[data-theme="pink"]` 테마
- **Pretendard** 폰트 (`ns-bold`=700, `ns-extrabold`=800, `ns-light`=300 헬퍼 클래스)

## 프로젝트 구조

```
app/
  layout.js            # 루트 레이아웃 — metadata, JSON-LD, 2xl 사이드바 레이아웃
  page.js              # 홈페이지 — HomeClient 렌더링 (공지사항·이벤트·게임 일정·히어로)
  HomeClient.js        # 홈 클라이언트 — 히어로 배너, 공지사항, 이벤트, 오늘의 일정 패널
  sitemap.js           # 공개 페이지 sitemap (/ dashboard dictionary privacy)
  robots.js            # robots.txt — /api/ /settings /guild/ /group/ /history disallow
  globals.css          # 테마 CSS 변수, Tailwind 설정
  opengraph-image.js   # 기본 OG 이미지
  raids/
    page.js            # /dictionary?tab=raids 로 permanentRedirect (308)
  synergy/
    page.js            # /dictionary?tab=synergy 로 permanentRedirect (308)
  dashboard/
    page.js              # 서버 컴포넌트 — DB 조회 후 DashboardClient에 전달
    DashboardClient.js   # 메인 대시보드 (~2830줄)
    loading.js           # 로딩 스켈레톤
    _constants.js        # EX_RAID_IDS, GOLD_RAID_LIMIT, CLASS_ICON, AUTO_PRESETS 등
    _icons.js            # IconCrown, IconPlus, IconCheck 등 SVG 아이콘 컴포넌트
    _raidHelpers.js      # saveRaid, deleteRaid, computeAutoRaids, autoSelect* 함수
    _bynnArkIcons.js     # 커스텀 숙제 아이콘 매핑
    modals/
      RaidSettingsModal.js   # 캐릭터별 레이드·골드 설정
      CharacterEditModal.js  # 캐릭터 목록 (DnD 순서변경, 일괄삭제)
      CharacterAddModal.js   # API 키 가이드 + 로스트아크 API 캐릭터 검색·추가 (3단계)
      AutoSetupModal.js      # 원정대 자동 세팅
      CustomItemsEditor.js   # 커스텀 숙제 항목 관리
      BynnArkIconPicker.js   # 커스텀 숙제 아이콘 선택기
    components/
      RaidCell.js            # 레이드 완료 토글 셀
      AnimatedGold.js        # 골드 숫자 애니메이션
      CharGoldBadges.js      # 캐릭터별 골드 배지
      Confetti.js            # 100% 완료 폭죽
      WeeklyHistoryChart.js  # 주간 숙제 히스토리 막대 차트
  history/
    page.js              # 서버 컴포넌트 — 주간 기록 조회 (비로그인 데모 지원)
    HistoryClient.js     # 히스토리 차트 + 통계 UI
  guild/
    page.js              # 서버 컴포넌트 — 내 길드 목록
    GuildClient.js       # 길드 목록 UI (만들기·참가 모달 포함)
    GuildDemoClient.js   # 길드 데모 UI
    _demoListData.js     # 비로그인 데모용 샘플 길드 목록 데이터
    [id]/
      page.js            # 서버 컴포넌트 — 길드 상세
      GuildDetailClient.js  # 레이드현황·멤버·대기중·설정 탭
  group/
    page.js              # 서버 컴포넌트 — 내 그룹 목록
    GroupClient.js       # 그룹원 목록·요청·그룹 편성 UI
  settings/
    page.js                  # 서버 컴포넌트 — 설정 페이지
    SettingsClient.js        # 닉네임·레이드 공개 설정 UI
  api/
    auth/[...nextauth]/route.js  # NextAuth Discord OAuth 핸들러
    homework/route.js         # GET/POST/DELETE — 레이드 체크 저장
    homework/batch/route.js   # POST — 레이드 일괄 업데이트
    characters/route.js       # GET/POST/DELETE/PATCH(순서) — 캐릭터 CRUD
    characters/sync/route.js  # POST — 로스트아크 API로 전투력 갱신
    characters/apikey/route.js        # POST — API 키 검증·저장
    characters/check-account/route.js # POST — 계정 중복 확인
    custom-items/route.js     # GET/POST — 커스텀 숙제 항목
    custom-items/[id]/route.js # PATCH/DELETE — 커스텀 항목 수정·삭제
    expeditions/[id]/route.js  # PATCH — LoaExpedition 커스텀 탭 이름 저장
    expedition/route.js        # GET(내 길드 목록) / POST(길드 생성)
    expedition/join/route.js   # POST — 초대 코드로 가입 신청
    expedition/[id]/route.js   # GET/PATCH/DELETE — 길드 상세·수정·삭제/탈퇴
    expedition/[id]/members/route.js   # PATCH — 수락/거절/역할변경/강퇴/공개설정
    expedition/[id]/favorites/route.js # POST/DELETE — 즐겨찾기
    group/route.js             # GET(그룹원 목록) / DELETE(그룹원 삭제)
    group/requests/route.js    # GET(받은 요청) / POST(그룹 요청 보내기)
    group/requests/[id]/route.js # PATCH — 그룹 요청 수락/거절
    group/favorites/route.js   # POST/DELETE — 그룹원 즐겨찾기
    group/pending-count/route.js # GET — 받은 그룹 요청 대기 수 (Navbar 배지)
    group/search/route.js      # GET — 사용자 검색
    history/route.js           # GET — 주간 숙제 기록 조회 (최근 10주)
    user/profile/route.js      # GET/PATCH — 프로필 조회·수정 (닉네임·설정)
    loa/route.js               # 로스트아크 OpenAPI 프록시 (서버사이드 rate limit)
    loa-content/route.js       # GET — 공지사항·이벤트·게임 일정 통합 프록시 (홈페이지용)
    cron/daily-reset/route.js  # POST — 일일 숙제 초기화 (06:00 KST)
    cron/weekly-reset/route.js # POST — 주간 숙제 초기화 (수 06:00 KST)
lib/
  raidData.js          # RAIDS 정의, RAID_MAP(O(1) id 조회), RAID_ORDER_MAP(정렬용 인덱스), CLASS_COLOR, calcGold* 함수
  groupRaidShare.js    # 길드 레이드 공유 유틸 (raidStatusOf, getMemberRaidStatus, getGroupRaidList)
  auth.js              # NextAuth 설정
  db.js                # Prisma 클라이언트 (Neon serverless adapter)
  encrypt.js           # API 키 AES-256 암호화
components/
  Navbar.js            # 상단 네비게이션 — 로고(/) 클릭 시 홈페이지 이동, 테마 선택, Discord 로그인
  ThemeProvider.js
  SessionProvider.js   # NextAuth 세션 래퍼
  DiscordIcon.js       # 공유 Discord SVG 아이콘
  AdSense.js           # Google AdSense 인라인 광고 슬롯
  SidebarAds.js        # SidebarAdLeft / SidebarAdRight — 2xl(1536px+) sticky 사이드바 광고
```

## 핵심 규칙

### 비로그인 (데모 모드)
- `page.js`에서 `!session?.user?.id` 시 `DEMO_CHARS` / `DEMO_RAIDS` / `DEMO_CUSTOM_ITEMS` 전달, `isLoggedIn` 미전달 (기본 false)
- `isDemo = !isLoggedIn` — DashboardClient 내에서 파생, prop으로 전달하지 않음
- 체크박스 토글은 클라이언트 상태만 변경 (`persistRaid` / `persistDelete` 래퍼가 `isLoggedIn` 여부로 fetch 스킵)
- 레이드 설정·캐릭터 설정·캐릭터 갱신 버튼 클릭 시 → "테스트 데이터입니다" 모달 (`showLoginGuide`)
- `/history` 페이지도 비로그인 시 `makeDemoHistory()` 샘플 데이터로 렌더링

### 테마
- `globals.css`에서 `[data-theme="pink"]`와 `.dark` 클래스로 컬러 오버라이드
- `ThemeProvider`가 `<html>` 에 `data-theme` + `dark` 클래스 부착
- 테마: `yellow` (기본) / `pink` / `sky` / `dark` — Navbar.js `THEMES` 배열 참고
- **다크 모드 감지**: `@custom-variant dark (&:where(.dark, .dark *))` — `prefers-color-scheme` 기반이 아닌 **클래스 기반**이므로 미디어 쿼리로 감지하면 안 됨
- `globals.css`에 `!important` 오버라이드 방식은 불완전함 — 새 컬러 클래스가 추가될 때마다 누락 가능. CSS 변수 방식을 항상 우선한다.

### 색상 하드코딩 금지
테마별로 색이 달라야 하므로 **accent 색상을 Tailwind 컬러 클래스로 하드코딩하지 않는다.**

**accent 색상** (버튼·뱃지·포커스 테두리·아이콘 강조색 등)은 반드시 `globals.css`에 정의된 CSS 변수를 사용한다.

```css
/* globals.css — 테마별 accent 팔레트 */
:root, [data-theme="yellow"] { --accent-400: #facc15; --accent-glow: rgba(250,204,21,0.5); /* ... */ }
[data-theme="pink"]          { --accent-400: #f472b6; --accent-glow: rgba(244,114,182,0.5); /* ... */ }
[data-theme="sky"]           { --accent-400: #38bdf8; --accent-glow: rgba(56,189,248,0.5);  /* ... */ }
.dark                        { --accent-400: #d4d4d8; --accent-glow: rgba(136,136,136,0.3); /* ... */ }
```

```jsx
/* ✅ 올바른 사용 — CSS 변수로 테마 대응 */
<button className="bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:bg-[var(--accent-500)] text-[var(--accent-900)]">
<span className="bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)]">

/* ❌ 금지 — 특정 테마 색 하드코딩 */
<button className="bg-yellow-400 hover:bg-yellow-300 text-yellow-900">
<span className="bg-pink-100 text-pink-700">
```

사용 가능한 변수: `--accent-50` ~ `--accent-900`, `--accent-bar`, `--accent-glow` (globals.css 정의 참고)

**예외:** 게임 요소 고유 색상(EX 레이드 금빛 뱃지 `from-amber-400 to-yellow-300`, 아이템레벨 등급 색상 `text-orange-500/text-yellow-500/text-green-500` 등)과 Discord 브랜드 컬러(`#5865F2`)는 하드코딩 허용.

#### 다크 모드 accent 색상 주의사항

다크 테마의 `--accent-*` 변수는 zinc 계열 회색으로 매핑된다. 이로 인해 라이트 모드 로직을 그대로 쓰면 색이 틀리는 케이스가 있다.

| 상황 | 잘못된 패턴 | 올바른 패턴 |
|------|------------|------------|
| 미묘한 배경 오버레이 | `bg-[var(--accent-50)]` (다크에서 zinc-800 = 너무 진함) | `dark:bg-[var(--accent-900)]/10` |
| 선택 상태 배경 | `bg-[var(--accent-100)]` | `bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20` |
| 강조 그림자 | `shadow-yellow-400/50` | `shadow-[var(--accent-glow)]` 또는 `shadow-[0_0_8px_2px_var(--accent-glow)]` |

#### 버튼 다크 모드 패턴

라이트 배경 버튼(`bg-[var(--accent-200)]`)은 다크에서 zinc-600이 되어 텍스트(`--accent-900` = zinc-700)와 대비가 떨어진다. 다크 모드에서는 명시적으로 오버라이드한다.

```jsx
/* ✅ 올바른 — 라이트는 accent, 다크는 explicit neutral */
<button className="bg-[var(--accent-200)] hover:bg-[var(--accent-300)] text-[var(--accent-900)]
                   dark:bg-[#2e2e2e] dark:hover:bg-[#383838] dark:text-gray-300">

/* ✅ 강한 accent 버튼 (배경 자체가 accent-400) — 다크 오버라이드 불필요 */
<button className="bg-[var(--accent-400)] hover:bg-[var(--accent-500)] text-[var(--accent-900)]">
```

### 레이드 데이터 구조
```js
// 캐릭터별 레이드 엔트리
{ raidId, difficulty, gateClears: boolean[], isGoldCheck, moreDone, moreFrom: 'bound'|'trade' }

// 주간 초기화: 매주 수요일 06:00 KST
// EX 레이드(abrel-ex): 계정당 1캐릭터만 선택 가능
// HIDDEN_RAID_IDS: UI에 노출하지 않는 레이드 (데이터는 유지)
```

### RAIDS 조회 패턴
`RAIDS.find` / `RAIDS.findIndex` 대신 반드시 모듈 레벨 맵을 사용한다.

```js
import { RAID_MAP, RAID_ORDER_MAP } from '@/lib/raidData'

// ✅ O(1) — id로 raid 객체 조회
const raid = RAID_MAP[entry.raidId]

// ✅ O(1) — RAIDS 배열 순서 기준 정렬
.sort((a, b) => (RAID_ORDER_MAP[a.raidId] ?? -1) - (RAID_ORDER_MAP[b.raidId] ?? -1))

// ❌ O(n) — 사용 금지
const raid = RAIDS.find(r => r.id === entry.raidId)
RAIDS.findIndex(r => r.id === a.raidId) - RAIDS.findIndex(r => r.id === b.raidId)
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
- 커스텀 숙제 아이콘: `_bynnArkIcons.js` 매핑 + `BynnArkIconPicker.js` 선택기

### 대표 캐릭터 왕관 아이콘 규칙
대표 캐릭터(최고 아이템레벨 캐릭터, 길드 리더 표시 등) 앞에는 반드시 `_icons.js`의 `IconCrown`을 사용한다.

```jsx
// _icons.js 정의 (정답)
export const IconCrown = () => (
  <svg width="12" height="11" viewBox="0 0 24 22" fill="currentColor">
    <path d="M2 19h20v2H2zM22 3.27l-5.5 6.5L12 2 7.5 9.77 2 3.27V18h20V3.27z"/>
  </svg>
)
```

- `_icons.js`에서 import하거나, 새 파일에 로컬로 복사할 때는 위 path를 그대로 사용한다.
- 색상은 부모 요소의 `text-[var(--accent-400)]` / `text-[var(--accent-500)]`으로 제어한다 (`fill="currentColor"`).

### 아이템레벨·전투력 표시 규칙
아이템레벨과 전투력을 UI에 표시할 때는 반드시 아래 아이콘을 앞에 붙여서 렌더링한다.

- **아이템레벨** → `IconTrophy` (트로피 SVG) + 숫자 (`toFixed(2)`)
- **전투력** → `<Image src="/combat-power.svg" …>` (IconPower) + 숫자 (`toLocaleString('ko-KR')`)

```jsx
// 아이템레벨
<div className="flex items-center gap-0.5">
  <IconTrophy />
  <span>{Number(char.itemLevel).toFixed(2)}</span>
</div>

// 전투력
{char.combatPower != null && (
  <div className="flex items-center gap-0.5">
    <IconPower />  {/* <Image src="/combat-power.svg" alt="전투력" width={12} height={12} unoptimized /> */}
    <span>{Math.round(Number(char.combatPower)).toLocaleString('ko-KR')}</span>
  </div>
)}
```

`IconTrophy`와 `IconPower`가 없는 파일에서 새로 사용할 경우 해당 파일 안에 로컬 컴포넌트로 정의하거나 `_icons.js`에서 import한다.

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

### DB 마이그레이션 규칙

`prisma migrate deploy`는 **빌드 스크립트에 포함하지 않는다.** (Vercel 빌드 서버 → Neon DB 연결 시 advisory lock 타임아웃 발생)

마이그레이션 파일을 추가했을 때는 **배포 전에 반드시 수동으로 직접 적용**한다.

**로컬 dev DB 적용:**
```bash
npx prisma migrate deploy
```

**운영 DB 적용 (Neon MCP):**
- Neon 프로젝트 ID: `empty-thunder-73282882` (myloa 운영 DB)
- `mcp__Neon__run_sql_transaction` 툴로 migration.sql의 SQL 구문을 직접 실행
- 적용 전 `mcp__Neon__run_sql` 로 컬럼/테이블 존재 여부를 먼저 확인하고, 이미 존재하면 스킵

**순서:** 로컬 migrate deploy → Neon MCP로 운영 SQL 실행 → 두 곳 모두 완료 확인 → git push(배포)

## SEO 규칙

### 페이지별 인덱싱 정책
| 페이지 | 인덱싱 | 이유 |
|--------|--------|------|
| `/` | ✅ index | 홈페이지 — 공지사항·이벤트·게임 일정, 비로그인 접근 가능 |
| `/dashboard` | ✅ index | 비로그인 데모 접근 가능 |
| `/dictionary` | ✅ index | 공개 페이지 |
| `/privacy` | ✅ index | 공개 페이지 |
| `/raids`, `/synergy` | ❌ noindex | `/dictionary`로 리다이렉트 — sitemap 불필요 |
| `/guild`, `/guild/[id]` | ❌ noindex | 로그인 필수 |
| `/group` | ❌ noindex | 로그인 필수 |
| `/settings` | ❌ noindex | 로그인 필수 |
| `/history` | ❌ noindex | 비로그인 데모 접근 가능하나 noindex 정책 |

- 새 페이지 추가 시: 로그인 없이 접근 가능한 경우에만 sitemap(`app/sitemap.js`)에 추가
- 로그인 필수 또는 noindex 페이지는 metadata에 반드시 `robots: { index: false, follow: false }` 명시
- `app/robots.js` disallow 목록도 함께 업데이트

### metadata 작성 규칙

#### title 규칙 (중요)
루트 레이아웃(`app/layout.js`)에 `title.template: '%s - myloa'`가 설정되어 있다.
**개별 page.js의 `title`에 "myloa"를 절대 포함하지 않는다** — template이 자동으로 "- myloa"를 붙인다.

```js
// ✅ 올바른 — template이 '로스트아크 숙제 히스토리 - myloa'로 완성
export const metadata = { title: '로스트아크 숙제 히스토리' }

// ❌ 금지 — '로스트아크 숙제 히스토리 - myloa - myloa' 중복 발생
export const metadata = { title: '로스트아크 숙제 히스토리 - myloa' }
```

**예외**: `openGraph.title` / `twitter.title`은 template을 거치지 않으므로 "myloa"를 직접 포함한다.
```js
openGraph: { title: '로스트아크 레이드 보상 정보 - myloa' }  // ✅ OG는 template 미적용
```

- **title 구분자**: `ㅡ` 금지, 반드시 `-` 사용
- **description**: 공개(index) 페이지는 80자 이상, 핵심 키워드(로스트아크, 레이드 숙제, 골드 계산 등) 포함
- **canonical**: 공개 페이지에는 `alternates: { canonical: 'https://myloa.app/경로' }` 추가
- `metadataBase`는 `layout.js`의 `metadata` 객체 안에만 선언 (standalone export 금지)
- 서브페이지 리다이렉트(`/raids`, `/synergy` 등)는 `permanentRedirect` 사용 (308 — SEO 신호 전달)

### 검색엔진 인증 코드
`app/layout.js` `verification` 필드에 설정되어 있음:
```js
verification: {
  google: 'XkrTtOH9OlbQnHmkUGOcJZJ7b06HFsRbdzX5prlVksM',  // Google Search Console 인증됨
  other: {
    // 'naver-site-verification': 'YOUR_NAVER_VERIFICATION_CODE',  // 네이버 등록 후 교체
    'google-adsense-account': 'ca-pub-7505734558280029',
  },
}
```

### JSON-LD 구조화 데이터
`app/layout.js` RootLayout 내부에 `WebApplication` 스키마 삽입되어 있음.
스키마 수정 시 [Schema.org WebApplication](https://schema.org/WebApplication) 스펙 준수.

## UI/CSS 작업 공통 규칙

CSS, JSX 클래스명, 스타일 관련 코드를 수정·추가할 때는 **항상** 아래 규칙을 준수한다.

### 반응형 필수 검수

모든 UI 변경은 다음 5개 뷰포트에서 정상 동작해야 한다:
- **375px** (iPhone SE) / **390px** (iPhone 14)
- **768px** (태블릿)
- **1280px** (데스크톱)
- **1536px** (2xl 사이드바 광고 레이아웃)

구현 후 반드시 데스크톱·모바일(375px)·다크 모드 스크린샷을 확인하고, 세 화면이 모두 정상일 때만 완료로 간주한다.

### 인터랙션 상태 필수 명시

모든 인터랙티브 요소(버튼, 링크, 토글, 입력 등)에 반드시 포함:
- `hover:` — 마우스 오버
- `active:` — 클릭/탭 순간
- `focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]` — 키보드 포커스
- `disabled:opacity-50 disabled:cursor-not-allowed` — 비활성 상태

### 모바일 UX 규칙
- 터치 타깃 최소 **44×44px** 보장
- 고정 픽셀 너비(`w-[500px]` 등) 금지 → `w-full max-w-*` 사용
- 긴 텍스트에 반드시 `truncate` 또는 `line-clamp-N` 적용
- 스크롤 컨테이너에 `overflow-hidden` 또는 명시적 스크롤 처리

### 간격 일관성
Tailwind 기본 스케일(`p-2`, `gap-3`, `mt-4`)만 사용. 임의 픽셀값(`p-[7px]`, `gap-[13px]`)과 스케일 값 혼용 금지.

---

## 알려진 제약
- `AutoSetupModal`: `raidsByName`은 `previewBase`(chars+apiKey) + `strategy`에서 `useMemo`로 파생 — effect로 관리하지 않음
- 드래그앤드랍(캐릭터 순서): HTML5 DnD API + 커스텀 ghost (`setDragImage`)
- `CharacterAddModal`의 localStorage API키 로드는 `useEffect`로 처리
- `ApiKeyGuideModal`은 `CharacterAddModal.js` 안에 로컬 함수로 포함됨
- LoA API 키는 AES-256으로 암호화하여 DB 저장 (`lib/encrypt.js`)
- 커스텀 숙제 아이콘 등 optimistic UI 패턴(toggleCustomCheck, adjustRestGauge 등)은 fire-and-forget fetch 사용 — 실패 시 console.error 기록, UI는 롤백하지 않음
- `api/loa/route.js` rate limit은 in-memory (서버 재시작 시 초기화됨)

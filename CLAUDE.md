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
  page.js / HomeClient.js  # 홈페이지 — 공지사항·이벤트·게임 일정·히어로
  sitemap.js / robots.js
  globals.css          # 테마 CSS 변수, Tailwind 설정
  opengraph-image.js   # OG 이미지 생성
  dashboard/
    page.js              # 서버 컴포넌트 — DB 조회 후 DashboardClient에 전달
    DashboardClient.js   # 메인 대시보드 (~3200줄)
    loading.js           # Suspense fallback
    _constants.js        # EX_RAID_IDS, GOLD_RAID_LIMIT, DIFF_COLOR/LABEL, CLASS_ICON 등
    _icons.js            # 프로젝트 전역 SVG 아이콘 — 모든 파일이 여기서 import
    _raidHelpers.js      # saveRaid, deleteRaid, computeAutoRaids 등
    _bynnArkIcons.js     # 커스텀 숙제 아이콘 매핑
    _demoDashboard.js    # 비로그인 데모용 캐릭터·레이드·커스텀 데이터 조합
    _demoData.js         # 데모 원시 데이터
    modals/              # RaidSettingsModal, CharacterEditModal, CharacterAddModal, AutoSetupModal, CustomItemsEditor, BynnArkIconPicker
    components/          # RaidCell, AnimatedGold, CharGoldBadges, Confetti, WeeklyHistoryChart
  components/
    RaidDetailModal.js   # 레이드 상세 모달 (길드/그룹 공용)
    Navbar.js / ThemeProvider.js / SessionProvider.js / DiscordIcon.js
    AdSense.js / SidebarAds.js
  dictionary/
    page.js              # 레이드 보상·직업 시너지 사전 (서버, generateMetadata)
    DictionaryClient.js  # 탭 기반 UI (raids / synergy)
  guide/
    page.js              # noindex — 사용 가이드
    GuideClient.js
  history/
    page.js              # 서버 컴포넌트 (noindex)
    HistoryClient.js     # 주간 숙제 히스토리 차트
  guild/
    page.js              # 길드 목록 (서버, noindex)
    GuildClient.js
    GuildDemoClient.js   # 비로그인 데모
    [id]/
      page.js            # 길드 상세 (서버, noindex)
      GuildDetailClient.js
    _demoGuild.js / _demoListData.js
  group/
    page.js              # 그룹 목록 (서버, noindex)
    GroupClient.js       # (~1700줄)
    _demoGroup.js
  raids/                 # permanentRedirect → /dictionary?tab=raids
  synergy/               # permanentRedirect → /dictionary?tab=synergy
  settings/
    page.js              # 서버 컴포넌트 (noindex)
    SettingsClient.js
  privacy/
    page.js              # 개인정보처리방침
  api/
    auth/[...nextauth]/  # NextAuth.js Discord OAuth
    homework/            # GET·POST·DELETE 레이드 숙제, batch/ POST 일괄 저장
    characters/          # CRUD + sync(LoA API), check-account, apikey
    custom-items/        # CRUD + [id] PATCH·DELETE
    expedition/          # CRUD, join, [id], [id]/members, [id]/favorites
    expeditions/[id]/    # GET (그룹 조회용 별도 엔드포인트)
    group/               # CRUD, search, requests, requests/[id], favorites, pending-count
    user/                # profile GET·PATCH, refresh-avatar POST
    loa/                 # LoA Open API 프록시 (rate limit in-memory)
    loa-content/         # 캘린더 콘텐츠 조회
    history/             # 주간 숙제 히스토리
    cron/                # daily-reset, weekly-reset (Vercel Cron)
lib/
  raidData.js          # RAIDS, RAID_MAP, RAID_ORDER_MAP, calcGold* 함수
  groupRaidShare.js    # raidStatusOf, getMemberRaidStatus, getGroupRaidList, adaptMember
  loaApi.js            # LOA_BASE, getApiKey, secUntilKST, calendarRevalidate — LoA API 공통 유틸
  apiHelpers.js        # verifyCharacterOwner 등 API route 공용 헬퍼
  formatting.js        # formatGold — 골드 표기 포맷터 (숫자 → "1.2k" 등)
  inviteCode.js        # generateInviteCode — 원정대 초대코드 생성
  auth.js / db.js / encrypt.js
```

## 핵심 규칙

### 아이콘
모든 SVG 아이콘은 `app/dashboard/_icons.js`에서 import한다. 새 파일에서 로컬 정의 금지.

```js
import {
  // 기본
  IconCrown, IconPlus, IconCheck, IconX, IconTrophy, IconEye, IconEyeOff,
  IconSearch, IconGrip, IconRefresh, IconInfo, IconClass, IconItemLevel,
  // 전투력/파워
  IconPower,
  // 액션
  IconTrash, IconCopy, IconLogout, IconSpinner, IconRegen,
  // 레이아웃/네비
  IconBack, IconChevron,
  // 유저
  IconStar, IconUserCheck, IconUsers, IconKey,
  // 빈 상태
  IconEmptyGroup, IconEmptyFriends,
  // 공개/잠금
  IconGlobe, IconLock,
} from '@/app/dashboard/_icons'
```

- `IconCrown` — className prop 지원 (`fill="currentColor"`, 부모 `text-*`로 색 제어)
- `IconTrophy` — className prop 지원 (아이템레벨 표시용)
- `IconPower` — `/combat-power.svg` 이미지, `size` prop(기본 10) 지원
- `IconCheck` — `size`(기본 9), `strokeWidth`(기본 3.5), `className` prop 지원
- `DiscordIcon` — `components/DiscordIcon.js` 에서 import

**아이템레벨·전투력 표시:**
```jsx
<div className="flex items-center gap-0.5">
  <IconTrophy className="text-gray-400 flex-shrink-0" />
  <span>{Number(char.itemLevel).toFixed(2)}</span>
</div>
{char.combatPower != null && (
  <div className="flex items-center gap-0.5">
    <IconPower />
    <span>{Math.round(Number(char.combatPower)).toLocaleString('ko-KR')}</span>
  </div>
)}
```

### 비로그인 (데모 모드)
- `page.js`에서 `!session?.user?.id` 시 `DEMO_CHARS` / `DEMO_RAIDS` / `DEMO_CUSTOM_ITEMS` 전달, `isLoggedIn` 미전달
- `isDemo = !isLoggedIn` — DashboardClient 내에서 파생, prop으로 전달하지 않음
- 체크박스 토글은 클라이언트 상태만 변경 (`persistRaid` / `persistDelete` 래퍼가 `isLoggedIn` 여부로 fetch 스킵)
- 레이드·캐릭터 설정 클릭 시 → "테스트 데이터입니다" 모달 (`showLoginGuide`)

### 테마
- `globals.css`에서 `[data-theme="pink"]`와 `.dark` 클래스로 컬러 오버라이드
- 테마: `yellow` (기본) / `pink` / `sky` / `dark` — Navbar.js `THEMES` 배열 참고
- **다크 모드**: `@custom-variant dark (&:where(.dark, .dark *))` — 클래스 기반, `prefers-color-scheme` 미디어 쿼리로 감지하면 안 됨

### 색상 하드코딩 금지
accent 색상은 반드시 CSS 변수로 사용한다.

```jsx
/* ✅ 올바른 */
<button className="bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)]">
<span className="bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)]">

/* ❌ 금지 */
<button className="bg-yellow-400 text-yellow-900">
```

사용 가능한 변수: `--accent-50` ~ `--accent-900`, `--accent-bar`, `--accent-glow`

**예외:** 게임 요소 고유 색상(EX 레이드 금빛 뱃지 `from-amber-400`, 아이템레벨 등급 `text-orange-500` 등), Discord 브랜드 컬러(`#5865F2`)

**다크 모드 주의:** `--accent-*`는 dark에서 zinc 계열로 매핑.
```jsx
/* 배경 오버레이 */  bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/20
/* 그림자 강조 */    shadow-[var(--accent-glow)]
/* accent-200 버튼 */ dark:bg-[#2e2e2e] dark:hover:bg-[#383838] dark:text-gray-300
```

### 레이드 데이터 구조
```js
// 캐릭터별 레이드 엔트리
{ raidId, difficulty, gateClears: boolean[], isGoldCheck, moreDone, moreFrom: 'bound'|'trade' }
// 주간 초기화: 매주 수요일 06:00 KST
// EX 레이드(abrel-ex): 계정당 1캐릭터만 선택 가능
```

### RAIDS 조회 패턴
```js
import { RAID_MAP, RAID_ORDER_MAP } from '@/lib/raidData'

const raid = RAID_MAP[entry.raidId]                         // ✅ O(1)
.sort((a, b) => (RAID_ORDER_MAP[a.raidId] ?? -1) - (RAID_ORDER_MAP[b.raidId] ?? -1))  // ✅

const raid = RAIDS.find(r => r.id === entry.raidId)         // ❌ O(n) 금지
```

### 골드 규칙
- 캐릭터당 일반 레이드 골드 보상 최대 3개
- EX 레이드는 별도 카운트, 골드 해제 불가

### DB 저장 패턴 (Optimistic)
```js
const persistRaid   = (charId, entry)           => { if (isLoggedIn) saveRaid(charId, entry) }
const persistDelete = (charId, raidId, diffKey) => { if (isLoggedIn) deleteRaid(charId, raidId, diffKey) }
```

### DB 마이그레이션 규칙
`prisma migrate deploy`는 빌드 스크립트에 포함하지 않는다. (Vercel 빌드 서버 → Neon advisory lock 타임아웃)

로컬 `.env.local`도 Neon을 직접 가리키므로 `prisma migrate dev`는 shadow DB 오류가 발생한다.

**마이그레이션 절차:**
1. `prisma/migrations/<timestamp>_<name>/migration.sql` 파일 수동 생성
2. Neon MCP로 SQL 직접 실행 (적용 전 컬럼/인덱스 존재 여부 확인)
3. `npx prisma migrate resolve --applied <migration-name>` 으로 적용 완료 표시
4. git push

**Neon MCP:**
- 프로젝트 ID: `empty-thunder-73282882`
- `mcp__Neon__run_sql` 로 확인, `mcp__Neon__run_sql_transaction` 으로 트랜잭션 실행

## SEO 규칙

### 인덱싱 정책
| 페이지 | 인덱싱 |
|--------|--------|
| `/`, `/dashboard`, `/dictionary`, `/privacy` | ✅ index |
| `/guild`, `/group`, `/settings`, `/history`, `/guide` | ❌ noindex |
| `/raids`, `/synergy` | `permanentRedirect` → `/dictionary?tab=…` |

- 로그인 필수/noindex 페이지: `robots: { index: false, follow: false }` 명시
- `app/robots.js` disallow 목록 함께 업데이트

### metadata 작성 규칙
루트 레이아웃에 `title.template: '%s - myloa'` 설정 — **page.js title에 "myloa" 포함 금지**

```js
export const metadata = { title: '로스트아크 숙제 히스토리' }  // ✅
openGraph: { title: '로스트아크 레이드 보상 정보 - myloa' }    // ✅ OG는 template 미적용
```

- title 구분자: `-` (ㅡ 금지)
- description: index 페이지 80자 이상, 핵심 키워드 포함
- canonical: `alternates: { canonical: 'https://myloa.app/경로' }`
- `metadataBase`는 `layout.js` 내에만 선언

## UI/CSS 규칙

### 반응형 필수 검수
375px / 768px / 1280px / 1536px 5개 뷰포트 정상 동작 필수

### 인터랙션 상태 필수 명시
```
hover: / active: / focus-visible:ring-2 focus-visible:ring-[var(--accent-400)] / disabled:opacity-50 disabled:cursor-not-allowed
```

### 모바일 UX
- 터치 타깃 최소 44×44px
- 고정 픽셀 너비 금지 → `w-full max-w-*`
- 긴 텍스트: `truncate` 또는 `line-clamp-N`

### 간격 일관성
Tailwind 기본 스케일만 사용 (`p-2`, `gap-3`). 임의 픽셀값(`p-[7px]`) 금지.

---

## 알려진 제약
- `AutoSetupModal`: `raidsByName`은 `useMemo`로 파생 (effect 사용 금지)
- 드래그앤드랍(캐릭터 순서): HTML5 DnD API + 커스텀 ghost (`setDragImage`)
- `ApiKeyGuideModal`은 `CharacterAddModal.js` 안에 로컬 함수로 포함
- LoA API 키는 AES-256으로 암호화하여 DB 저장 (`lib/encrypt.js`) — `ENCRYPTION_KEY` 미설정 시 모듈 로드 단계에서 throw
- Optimistic UI (toggleCustomCheck, adjustRestGauge 등): fire-and-forget fetch, 실패 시 console.error, UI 롤백 없음
- `saveRaid` / `deleteRaid` batch 저장 실패 시 `window.dispatchEvent('raidSaveFailed')` → DashboardClient 우하단 토스트 5초 표시
- `api/loa/route.js` rate limit은 in-memory (서버 재시작 시 초기화)

### 초대코드 생성 패턴
`generateInviteCode()`는 `randomBytes(8).toString('hex').toUpperCase()` (16자, 64-bit 엔트로피).
Prisma `@unique` 충돌(P2002) 가능성이 있으므로 create/update 시 retry 루프 적용:
```js
for (let attempt = 0; attempt < 5; attempt++) {
  try { /* prisma.expedition.create/update */ break }
  catch (e) {
    if (e.code === 'P2002' && e.meta?.target?.includes('inviteCode')) continue
    throw e
  }
}
```

### API route 공통 패턴
- **JSON parse**: `await request.json().catch(() => null)` — null 시 400 반환
- **배열 선형 탐색 금지**: 관계 조회 결과는 `Map`으로 변환 후 O(1) 접근
  ```js
  const map = new Map(items.map(r => [r.targetId, r]))
  const item = map.get(id)  // ✅
  items.find(r => r.targetId === id)  // ❌
  ```
- **멤버십 검증**: expedition 관련 쓰기 API는 `ExpeditionMember` 조회로 `status === 'active'` 확인 후 처리
- **`_constants.js` import**: `REST_GAUGE_NAMES` 등 순수 데이터 상수는 서버 사이드 파일에서도 `@/app/dashboard/_constants`에서 import (중복 정의 금지)

---

## 작업 완료 후 행동 규칙
- **스크린샷·화면 캡처 금지** — 작업 완료 후 결과 확인용 캡처를 시도하지 않는다
- **개발 서버 재구동 금지** — `npm run dev` 실행·재시작은 사용자가 직접 한다. Claude는 건드리지 않는다

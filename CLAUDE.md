@AGENTS.md

# myloa — 로스트아크 레이드 숙제 관리

## 기술 스택
- **Next.js** (App Router, 서버 컴포넌트 + 클라이언트 컴포넌트)
- **Prisma** + **PostgreSQL** (Neon)
- **NextAuth.js v5** — Discord OAuth
- **Tailwind CSS v4** — `@custom-variant dark` + `[data-theme="pink"]` 테마
- **Pretendard** 폰트 (`ns-bold`=700, `ns-extrabold`=800, `ns-light`=300 헬퍼 클래스)

## 프로젝트 구조

```
app/
  dashboard/
    page.js              # 서버 컴포넌트 — DB 조회 후 DashboardClient에 전달
    DashboardClient.js   # 메인 대시보드 (~4800줄)
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
      RaidCell.js        # 레이드 완료 토글 셀
      AnimatedGold.js    # 골드 숫자 애니메이션
      CharGoldBadges.js  # 캐릭터별 골드 배지
      Confetti.js        # 100% 완료 폭죽
  group/
    page.js              # 서버 컴포넌트 — 내 그룹 목록
    GroupDemoClient.js   # 그룹 데모 UI
    _demoListData.js     # 비로그인 데모용 샘플 그룹 목록 데이터
    [id]/
      page.js            # 서버 컴포넌트 — 그룹 상세 (demo id 지원)
      GroupDetailClient.js  # 레이드현황·멤버·대기중·설정 탭
  api/
    homework/route.js         # GET/POST/DELETE — 레이드 체크 저장
    homework/batch/route.js   # POST — 레이드 일괄 업데이트
    characters/route.js       # GET/POST/DELETE/PATCH(순서) — 캐릭터 CRUD
    characters/sync/route.js  # POST — 로스트아크 API로 전투력 갱신
    characters/apikey/route.js        # POST — API 키 검증·저장
    characters/check-account/route.js # POST — 계정 중복 확인
    custom-items/route.js     # GET/POST — 커스텀 숙제 항목
    custom-items/[id]/route.js # PATCH/DELETE — 커스텀 항목 수정·삭제
    expeditions/[id]/route.js  # PATCH — LoaExpedition 커스텀 탭 이름 저장
    expedition/route.js        # GET(내 그룹 목록) / POST(그룹 생성)
    expedition/join/route.js   # POST — 초대 코드로 가입 신청
    expedition/[id]/route.js   # GET/PATCH/DELETE — 그룹 상세·수정·삭제/탈퇴
    expedition/[id]/members/route.js   # PATCH — 수락/거절/역할변경/강퇴/공개설정
    expedition/[id]/favorites/route.js # POST/DELETE — 즐겨찾기
    loa/route.js              # 로스트아크 OpenAPI 프록시
    cron/daily-reset/route.js  # POST — 일일 숙제 초기화 (06:00 KST)
    cron/weekly-reset/route.js # POST — 주간 숙제 초기화 (수 06:00 KST)
lib/
  raidData.js          # RAIDS 정의, CLASS_COLOR, calcGold* 함수
  groupRaidShare.js    # 그룹 레이드 공유 유틸 (raidStatusOf, getMemberRaidStatus, getGroupRaidList)
  auth.js              # NextAuth 설정
  db.js                # Prisma 클라이언트 (Neon serverless adapter)
  encrypt.js           # API 키 AES-256 암호화
components/
  Navbar.js
  ThemeProvider.js
  SessionProvider.js   # NextAuth 세션 래퍼
  DiscordIcon.js       # 공유 Discord SVG 아이콘
  AdSense.js           # Google AdSense 연동
```

## 핵심 규칙

### 비로그인 (데모 모드)
- `page.js`에서 `!session?.user?.id` 시 `DEMO_CHARS` / `DEMO_RAIDS` / `DEMO_CUSTOM_ITEMS` 전달, `isLoggedIn` 미전달 (기본 false)
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
- 커스텀 숙제 아이콘: `_bynnArkIcons.js` 매핑 + `BynnArkIconPicker.js` 선택기

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

## 알려진 제약
- `AutoSetupModal`: `raidsByName`은 `previewBase`(chars+apiKey) + `strategy`에서 `useMemo`로 파생 — effect로 관리하지 않음
- 드래그앤드랍(캐릭터 순서): HTML5 DnD API + 커스텀 ghost (`setDragImage`)
- `CharacterAddModal`의 localStorage API키 로드는 `useEffect`로 처리
- `ApiKeyGuideModal`은 `CharacterAddModal.js` 안에 로컬 함수로 포함됨
- LoA API 키는 AES-256으로 암호화하여 DB 저장 (`lib/encrypt.js`)

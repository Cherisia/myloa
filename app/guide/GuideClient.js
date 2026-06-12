'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'

/* ── 스크린샷 헬퍼 ── */
function Shot({ src, alt, width = '100%' }) {
  if (!src) {
    return (
      <div className="border border-gray-200 dark:border-white/[0.08] rounded-lg bg-gray-50 dark:bg-white/[0.03] flex flex-col items-center justify-center gap-2 py-10 px-6 min-h-[140px] text-center">
        <span className="text-2xl opacity-30">🖼</span>
        <span className="text-xs font-medium text-gray-400 dark:text-zinc-500">{alt}</span>
      </div>
    )
  }
  return (
    <div
      className="border border-gray-200 dark:border-white/[0.08] rounded-lg overflow-hidden"
      style={{ width }}
    >
      <img src={src} alt={alt} className="w-full block" />
    </div>
  )
}

/* ── Callout ── */
function Callout({ children, blue }) {
  return (
    <div className={`rounded-lg px-4 py-3 text-[13.5px] leading-relaxed ${
      blue
        ? 'bg-blue-100/70 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300'
        : 'bg-gray-100 dark:bg-white/[0.07] text-gray-600 dark:text-zinc-400'
    }`}>
      {children}
    </div>
  )
}

/* ── Bullet ── */
function Bullet({ children }) {
  return (
    <div className="text-[13.5px] text-gray-500 dark:text-zinc-400 leading-[1.65] before:content-['·_'] before:text-gray-400 dark:before:text-zinc-600">
      {children}
    </div>
  )
}

/* ── 기능 배지 ── */
function FeatBadge({ n }) {
  return (
    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-white/[0.06] px-1.5 py-0.5 rounded tracking-wider">
      {String(n).padStart(2, '0')}
    </span>
  )
}

/* ══════════════════════════════════════════════
   탭 정의
══════════════════════════════════════════════ */
const NAV = [
  { group: '주요 기능', items: [
    { label: '대시보드',   icon: '◫' },
    { label: '길드',       icon: '⚑' },
    { label: '그룹',       icon: '◎' },
  ]},
]

const FLAT = NAV.flatMap(g => g.items)
const TOTAL = FLAT.length

/* ══════════════════════════════════════════════
   패널 컴포넌트들
══════════════════════════════════════════════ */

function PanelDashboard({ goTab }) {
  return (
    <div className="max-w-5xl px-10 pt-14 pb-20 max-sm:px-6 max-sm:pt-8 max-sm:pb-16">
      <div className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 mb-2">주요 기능</div>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.2] text-gray-900 dark:text-zinc-100 mb-3">대시보드</h1>
      <p className="text-[15px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.08]">
        원정대 전체 레이드 현황과 주간 골드 수익을 한눈에 관리합니다.
      </p>

      <div className="flex flex-col gap-10">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <FeatBadge n={1} />
            <span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">주간 레이드 현황 및 획득 골드 확인</span>
          </div>
          <Shot src="/guide/screenshots/features/01-expedition.webp" alt="원정대 통계" width="67%" />
          <Callout>
            📌 원정대는 로스트아크의 계정과 동일한 단위입니다. 한 계정의 모든 캐릭터가 하나의 원정대에 속합니다.
          </Callout>
          <div className="flex flex-col gap-1.5">
            <Bullet>원정대별 이번 주 획득 골드(귀속/거래)를 분리하여 집계해요.</Bullet>
            <Bullet>전체 레이드 완료 현황을 한눈에 확인할 수 있어요.</Bullet>
            <Bullet>여러 원정대 탭을 전환하며 각 원정대 현황을 비교할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <FeatBadge n={2} />
            <span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">내 스타일대로 보는 캐릭터 숙제 관리</span>
          </div>
          <div className="grid gap-4 max-sm:grid-cols-1" style={{ gridTemplateColumns: '1.6fr 1fr' }}>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tracking-wider uppercase">카드 뷰</span>
              <div className="border border-gray-200 dark:border-white/[0.08] rounded-lg overflow-hidden">
                <img src="/guide/screenshots/features/02-card-view.webp" alt="카드 뷰" className="w-full block" />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tracking-wider uppercase">테이블 뷰</span>
              <Shot src="/guide/screenshots/features/02-table-view.webp" alt="테이블 뷰" />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-semibold text-gray-400 dark:text-zinc-500 tracking-wider uppercase">다양한 정렬 옵션</span>
            <Shot src="/guide/screenshots/features/02-view-options.webp" alt="다양한 정렬 옵션" width="42%" />
          </div>
          <Callout>
            💡 두 가지 뷰를 자유롭게 전환할 수 있어요. 사용자 편의에 따라 여러 정렬 옵션도 사용해보세요.
          </Callout>
          <div className="flex flex-col gap-1.5">
            <Bullet>레이드 체크 후 한 번 더 누르면 더보기 상태로 전환돼요.</Bullet>
            <Bullet>더보기 토글로 귀속 골드, 거래 가능 골드 더보기를 캐릭터별로 개별 설정할 수 있어, 실제 획득하는 골드 종류를 정확하게 집계할 수 있어요.</Bullet>
            <Bullet>드래그 앤 드랍으로 캐릭터 순서를 원하는 대로 바꿀 수 있어요. 자주 보는 캐릭터를 앞으로 두면 편리해요.</Bullet>
            <Bullet>아이템레벨 기준으로 레이드를 자동 설정해 드리지만, 언제든지 캐릭터별로 개별 설정할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <FeatBadge n={3} />
            <span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">레이드 필터를 통한 빠른 숙제 조회</span>
          </div>
          <Shot src="/guide/screenshots/features/03-filter.webp" alt="필터" />
          <Callout>
            💡 캐릭터가 많을수록 필터가 유용해요. 특정 레이드만 확인하고 싶을때 활용해보세요.
          </Callout>
          <div className="flex flex-col gap-1.5">
            <Bullet>미완료 골드 / 미완료 전체 빠른 필터로 아직 못 한 숙제를 한 번에 확인할 수 있어요.</Bullet>
            <Bullet>레이드별 세부 필터로 특정 레이드만 골라서 볼 수 있어요.</Bullet>
            <Bullet>두 필터를 동시에 사용하면 교집합으로 표시되어 정확히 원하는 항목만 볼 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <FeatBadge n={4} />
            <span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">원정대별 숙제 설정</span>
          </div>
          <Shot src="/guide/screenshots/features/04-settings.webp" alt="숙제 설정" width="43%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>원정대별 탭과 캐릭터별 탭에서 각 레이드의 난이도(노말/하드/나메)를 선택할 수 있어요.</Bullet>
            <Bullet>캐릭터마다 골드 수령 레이드를 ON/OFF로 개별 설정할 수 있어요. 주간 골드 획득 제한이 설정에 반영돼요.</Bullet>
            <Bullet>아이템레벨에 맞는 입장 가능 레이드를 자동으로 추천해 드려요.</Bullet>
            <Bullet>레이드 외에 커스텀 숙제를 직접 만들어 일일, 주간 항목으로 관리할 수 있어요. 각 캐릭터 카드에서 바로 확인할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5">
            <FeatBadge n={5} />
            <span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">취향에 맞는 테마 선택</span>
          </div>
          <Shot src="/guide/screenshots/features/05-theme.webp" alt="테마 선택" width="13%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>4종류의 다양한 테마를 지원해요.</Bullet>
            <Bullet>선택 즉시 전체 UI에 반영되며, 설정이 기기에 저장돼요.</Bullet>
          </div>
        </div>

      </div>

      <NavBtns prev={null} next={{ label: '길드', idx: 1 }} goTab={goTab} />
    </div>
  )
}

function PanelGuild({ goTab }) {
  return (
    <div className="max-w-5xl px-10 pt-14 pb-20 max-sm:px-6 max-sm:pt-8 max-sm:pb-16">
      <div className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 mb-2">주요 기능</div>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.2] text-gray-900 dark:text-zinc-100 mb-3">길드</h1>
      <p className="text-[15px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.08]">
        길드를 만들어 멤버들의 레이드 현황을 확인하고 함께할 레이드를 조율합니다.
      </p>

      <div className="flex flex-col gap-10">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={6} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">길드 레이드 현황</span></div>
          <Shot src="/guide/screenshots/features/06-guild-overview.webp" alt="길드 레이드 현황" width="40%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>레이드별 완료율을 난이도별로 한눈에 확인할 수 있어요.</Bullet>
            <Bullet>레이드 버튼을 클릭하면 길드원의 레이드 완료 현황을 확인할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={7} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">레이드 미완료 길드원 확인</span></div>
          <Shot src="/guide/screenshots/features/07-guild-raid-click.webp" alt="레이드 클릭 시 미완료 길드원" width="40%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>캐릭터에 마우스를 대면 아이템레벨과 전투력이 표시돼요.</Bullet>
            <Bullet>본인 캐릭터 클릭 시 레이드 완료 체크와 동일하게 동작해요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={8} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">길드 멤버 관리</span></div>
          <Shot src="/guide/screenshots/features/08-guild-members.webp" alt="길드 멤버 목록" width="40%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>길드 전체 멤버 목록을 확인할 수 있어요.</Bullet>
            <Bullet>레이드 현황 공개 토글로 해당 길드의 멤버들에게 내 현황 공개 여부를 설정할 수 있어요.</Bullet>
            <Bullet>닉네임, 디스코드, 대표 캐릭터명으로 멤버를 검색할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={9} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">길드원과 함께할 수 있는 레이드 확인</span></div>
          <Shot src="/guide/screenshots/features/09-member-click.webp" alt="길드원과 함께할 수 있는 레이드" width="40%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>길드원을 클릭하면 함께할 수 있는 레이드, 미완료 레이드, 완료 레이드를 상세 조회할 수 있어요.</Bullet>
            <Bullet>본인 캐릭터 클릭 시 레이드 완료 체크와 동일하게 동작해요.</Bullet>
          </div>
        </div>

      </div>

      <NavBtns prev={{ label: '대시보드', idx: 0 }} next={{ label: '그룹', idx: 2 }} goTab={goTab} />
    </div>
  )
}

function PanelGroup({ goTab }) {
  return (
    <div className="max-w-5xl px-10 pt-14 pb-20 max-sm:px-6 max-sm:pt-8 max-sm:pb-16">
      <div className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 mb-2">주요 기능</div>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.2] text-gray-900 dark:text-zinc-100 mb-3">그룹</h1>
      <p className="text-[15px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.08]">
        친구를 추가하고 그룹을 만들어 함께 갈 수 있는 레이드를 확인합니다.
      </p>

      <div className="flex flex-col gap-10">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={10} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">레이드별 친구 현황 확인</span></div>
          <Shot src="/guide/screenshots/features/10-friends.webp" alt="친구 레이드 현황" />
          <div className="flex flex-col gap-1.5">
            <Bullet>원정대 닉네임 또는 대표 캐릭터명으로 친구를 검색하고 추가할 수 있어요.</Bullet>
            <Bullet>레이드별로 친구의 숙제 완료 여부를 캐릭터 단위로 확인할 수 있어요.</Bullet>
            <Bullet>해당 페이지에서 본인 캐릭터를 클릭하면 숙제 체크도 가능해요.</Bullet>
            <Bullet>본인이 전부 완료한 레이드는 레이드 이름 옆에 체크가 표시돼요.</Bullet>
            <Bullet>즐겨찾기 설정으로 자주 보는 친구를 상단에 고정할 수 있어요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={11} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">그룹을 통해 친구들과 함께할 레이드 확인</span></div>
          <Shot src="/guide/screenshots/features/11-group.webp" alt="그룹 공통 레이드" />
          <div className="flex flex-col gap-1.5">
            <Bullet>친구를 드래그 앤 드랍으로 그룹에 추가할 수 있어요.</Bullet>
            <Bullet>그룹원끼리 공통으로 갈 수 있는 레이드를 산출해요.</Bullet>
            <Bullet>레이드 클릭 시 그룹원별로 참여 가능한 캐릭터 목록을 표시해 드려요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={12} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">개인 설정</span></div>
          <Shot src="/guide/screenshots/features/12-profile-settings.webp" alt="설정 페이지" width="40%" />
          <div className="flex flex-col gap-1.5">
            <Bullet>우측 상단 프로필 클릭 → 설정 페이지에서 접근할 수 있어요.</Bullet>
            <Bullet>길드원에게 레이드 현황 공개 토글 OFF 시 모든 길드 멤버에게 내 레이드 현황이 숨겨져요.</Bullet>
            <Bullet>친구에게 레이드 현황 공개 토글로 친구에게 공개 여부를 설정할 수 있어요.</Bullet>
            <Bullet>원정대 이름도 변경할 수 있어요. (한글, 영어, 숫자 최대 12자)</Bullet>
          </div>
        </div>

      </div>

      <NavBtns prev={{ label: '길드', idx: 1 }} next={null} goTab={goTab} />
    </div>
  )
}

/* ── 이전/다음 버튼 ── */
function NavBtns({ prev, next, goTab }) {
  return (
    <div className="flex justify-between mt-12 pt-6 border-t border-gray-200 dark:border-white/[0.08]">
      {prev ? (
        <button
          onClick={() => goTab(prev.idx)}
          className="text-[13.5px] font-medium text-gray-500 dark:text-zinc-400 bg-transparent border border-gray-200 dark:border-white/[0.10] rounded-md px-4 py-2 cursor-pointer transition-colors hover:bg-gray-50 dark:hover:bg-white/[0.05] hover:text-gray-700 dark:hover:text-zinc-200"
        >
          ← {prev.label}
        </button>
      ) : <span />}
      {next ? (
        <button
          onClick={() => goTab(next.idx)}
          className="text-[13.5px] font-medium text-white dark:text-zinc-100 bg-gray-800 dark:bg-zinc-700 border border-gray-800 dark:border-zinc-600 rounded-md px-4 py-2 cursor-pointer transition-colors hover:opacity-85"
        >
          {next.label} →
        </button>
      ) : (
        <span className="text-[13.5px] text-gray-400 dark:text-zinc-500 border border-gray-200 dark:border-white/[0.08] rounded-md px-4 py-2">
          마지막 단계
        </span>
      )}
    </div>
  )
}

/* ══════════════════════════════════════════════
   메인 클라이언트
══════════════════════════════════════════════ */
const SECTION_PATHS = ['/guide', '/guide/guild', '/guide/group']

export default function GuideClient({ initialTab = 0 }) {
  const [current, setCurrent] = useState(initialTab)
  const mainRef = useRef(null)
  const router = useRouter()

  function goTab(idx) {
    if (idx < 0 || idx >= TOTAL) return
    router.push(SECTION_PATHS[idx])
  }

  const panels = [
    <PanelDashboard goTab={goTab} />,
    <PanelGuild    goTab={goTab} />,
    <PanelGroup    goTab={goTab} />,
  ]

  /* ── 사이드바 탭 인덱스 계산 ── */
  let flatIdx = 0
  const navGroups = NAV.map(g => ({
    ...g,
    items: g.items.map(item => ({ ...item, idx: flatIdx++ })),
  }))

  return (
    /* 루트 레이아웃 px-4 py-6 를 -mx-4 -my-6 으로 탈출, 뷰포트 꽉 채움 */
    <div className="-mx-4 -my-6 flex h-[calc(100dvh-62px)] overflow-hidden [&+footer]:hidden">

      {/* ── 사이드바 ── */}
      <nav className="w-60 flex-shrink-0 border-r border-gray-200 dark:border-white/[0.06] flex flex-col py-6 px-3 gap-0.5 overflow-y-auto max-sm:hidden">
        {navGroups.map((g, gi) => (
          <div key={gi} className={gi > 0 ? 'mt-3' : ''}>
            <div className="text-[11px] font-semibold text-gray-400 dark:text-zinc-600 uppercase tracking-wider px-2 mb-1.5">
              {g.group}
            </div>
            {g.items.map(item => (
              <button
                key={item.idx}
                onClick={() => goTab(item.idx)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-[14px] cursor-pointer transition-colors border-none font-[inherit] text-left ${
                  current === item.idx
                    ? 'bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 text-[var(--accent-700)] dark:text-[var(--accent-300)] font-semibold'
                    : 'text-gray-500 dark:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.05] hover:text-gray-800 dark:hover:text-zinc-200'
                }`}
              >
                <span className={`w-5 h-5 flex-shrink-0 flex items-center justify-center text-[13px] ${current === item.idx ? '' : 'opacity-60'}`}>
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
              </button>
            ))}
            {gi < navGroups.length - 1 && (
              <hr className="border-none border-t border-gray-200 dark:border-white/[0.06] mx-2 mt-3" />
            )}
          </div>
        ))}
      </nav>

      {/* ── 메인 콘텐츠 ── */}
      <div
        ref={mainRef}
        className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 dark:scrollbar-thumb-white/10"
      >
        {panels[current]}
      </div>

    </div>
  )
}

'use client'

import { useState, useRef } from 'react'
import Image from 'next/image'
import Link from 'next/link'

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

/* ── 번호 리스트 항목 ── */
function OlItem({ n, children }) {
  return (
    <div className="flex gap-3 text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.7]">
      <span className="flex-shrink-0 text-[12px] font-semibold text-gray-400 dark:text-zinc-500 mt-[3px] w-4">{n}</span>
      <span>{children}</span>
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

/* ── 스텝 번호 ── */
function StepNum({ n }) {
  return (
    <span className="flex-shrink-0 w-[22px] h-[22px] rounded bg-gray-100 dark:bg-white/[0.07] flex items-center justify-center text-[12px] font-semibold text-gray-400 dark:text-zinc-500">
      {n}
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
  { group: '가이드', items: [
    { label: '시작하기',   icon: '→', step: 1 },
    { label: '캐릭터 추가', icon: '+', step: 2 },
    { label: '레이드 설정', icon: '◎', step: 3 },
    { label: '숙제 체크',  icon: '✓', step: 4 },
    { label: '골드 확인',  icon: '◈', step: 5 },
    { label: '커스텀 숙제', icon: '≡', step: 6 },
    { label: '원정대',     icon: '◻', step: 7 },
    { label: '현황 공유',  icon: '↗', step: 8 },
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

      <NavBtns prev={{ label: '길드', idx: 1 }} next={{ label: '히스토리', idx: 3 }} goTab={goTab} />
    </div>
  )
}

function PanelHistory({ goTab }) {
  return (
    <div className="max-w-5xl px-10 pt-14 pb-20 max-sm:px-6 max-sm:pt-8 max-sm:pb-16">
      <div className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 mb-2">주요 기능</div>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.2] text-gray-900 dark:text-zinc-100 mb-3">히스토리</h1>
      <p className="text-[15px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.08]">
        주차별 레이드 클리어 기록과 골드 수익 추이를 돌아봅니다.
      </p>

      <div className="flex flex-col gap-10">

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={13} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">주간 골드 차트</span></div>
          <Shot src={null} alt="주간 골드 차트" />
          <div className="flex flex-col gap-1.5">
            <Bullet>매주 획득한 골드를 <strong className="text-gray-700 dark:text-zinc-200">귀속 / 거래 가능</strong>으로 분리하여 누적 바 차트로 시각화해요.</Bullet>
            <Bullet>최근 8주 추이를 한눈에 파악할 수 있어요.</Bullet>
            <Bullet>바를 클릭하면 해당 주차 상세 내역으로 이동해요.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={14} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">주차별 레이드 클리어 내역</span></div>
          <Shot src={null} alt="주차별 레이드 클리어 내역" />
          <div className="flex flex-col gap-1.5">
            <Bullet>초기화 주차를 선택하면 해당 주 캐릭터별 레이드 완료 현황을 조회해요.</Bullet>
            <Bullet>레이드별 체크한 관문, 골드 수령 여부, 더보기 골드 여부를 한 번에 확인할 수 있어요.</Bullet>
            <Bullet>매주 수요일 초기화 시 자동으로 이전 주 기록이 저장됩니다.</Bullet>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2.5"><FeatBadge n={15} /><span className="text-[17px] font-bold text-gray-900 dark:text-zinc-100 tracking-[-0.02em]">캐릭터별 달성률</span></div>
          <Shot src={null} alt="캐릭터별 달성률" />
          <div className="flex flex-col gap-1.5">
            <Bullet>캐릭터마다 설정한 레이드 중 실제로 클리어한 비율을 표시해요.</Bullet>
            <Bullet>꾸준히 숙제를 완료한 캐릭터를 파악하는 데 유용해요.</Bullet>
          </div>
        </div>

      </div>

      <NavBtns prev={{ label: '그룹', idx: 2 }} next={{ label: '시작하기', idx: 4 }} goTab={goTab} />
    </div>
  )
}

/* ── 가이드 스텝 패널 공통 래퍼 ── */
function GuidePanel({ step, tag, title, lead, children, prev, next, goTab }) {
  return (
    <div className="max-w-5xl px-10 pt-14 pb-20 max-sm:px-6 max-sm:pt-8 max-sm:pb-16">
      <div className="text-[12px] font-medium text-gray-400 dark:text-zinc-500 mb-2">{tag ?? `Step ${step}`}</div>
      <h1 className="text-[30px] font-bold tracking-[-0.03em] leading-[1.2] text-gray-900 dark:text-zinc-100 mb-3">{title}</h1>
      <p className="text-[15px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-10 pb-8 border-b border-gray-200 dark:border-white/[0.08]">{lead}</p>
      <div className="flex flex-col gap-8">{children}</div>
      <NavBtns prev={prev} next={next} goTab={goTab} />
    </div>
  )
}

/* ── 스텝 블록 ── */
function Step({ n, title, children }) {
  return (
    <div>
      <div className="flex items-center gap-2 text-[16px] font-semibold text-gray-800 dark:text-zinc-200 mb-3">
        <StepNum n={n} />{title}
      </div>
      <div className="flex flex-col gap-3 pl-[30px]">{children}</div>
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
export default function GuideClient() {
  const [current, setCurrent] = useState(0)
  const mainRef = useRef(null)

  function goTab(idx) {
    if (idx < 0 || idx >= TOTAL) return
    setCurrent(idx)
    if (mainRef.current) mainRef.current.scrollTop = 0
  }

  const panels = [
    <PanelDashboard goTab={goTab} />,
    <PanelGuild    goTab={goTab} />,
    <PanelGroup    goTab={goTab} />,
    <PanelHistory  goTab={goTab} />,

    /* Step 1: 시작하기 */
    <GuidePanel step={1} title="시작하기" lead="myloa는 Discord 계정으로 로그인합니다. 별도 회원가입이 없어요." prev={{ label: '히스토리', idx: 3 }} next={{ label: '캐릭터 추가', idx: 5 }} goTab={goTab}>
      <Step n={1} title="myloa.app 접속">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">접속하면 데모 대시보드가 바로 보입니다. 로그인 없이도 화면을 미리 볼 수 있어요.</p>
        <Shot src={null} alt="비로그인 데모 대시보드" />
      </Step>
      <Step n={2} title="Discord로 로그인">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">우측 상단 <strong className="text-gray-700 dark:text-zinc-200">로그인</strong> 버튼 클릭 → Discord 인증 창에서 <strong className="text-gray-700 dark:text-zinc-200">승인</strong>을 누르면 완료됩니다.</p>
        <Callout blue>
          Discord 계정이 없다면 <strong>discord.com</strong>에서 무료로 만들 수 있어요.
        </Callout>
      </Step>
    </GuidePanel>,

    /* Step 2: 캐릭터 추가 */
    <GuidePanel step={2} title="캐릭터 추가" lead="로스트아크 API 키를 연결하면 내 캐릭터를 자동으로 불러옵니다." prev={{ label: '시작하기', idx: 4 }} next={{ label: '레이드 설정', idx: 6 }} goTab={goTab}>
      <Step n={1} title="API 키 발급">
        <div className="flex flex-col gap-1.5">
          <OlItem n="1."><strong className="text-gray-700 dark:text-zinc-200">developer.lostark.game.onstove.com</strong> 접속 후 게임 계정으로 로그인</OlItem>
          <OlItem n="2.">[나의 애플리케이션] → [새 애플리케이션 등록]</OlItem>
          <OlItem n="3.">이름을 입력하고 등록하면 <strong className="text-gray-700 dark:text-zinc-200">API 키</strong>가 발급됩니다</OlItem>
        </div>
        <Callout blue>
          myloa 안의 <strong>[API 키 발급 가이드]</strong> 버튼을 누르면 단계별 안내를 바로 볼 수 있어요.
        </Callout>
      </Step>
      <Step n={2} title="캐릭터 검색 및 추가">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">대시보드에서 <strong className="text-gray-700 dark:text-zinc-200">[+ 캐릭터 추가]</strong>를 클릭하면 모달이 열립니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">API 키 붙여넣기</OlItem>
          <OlItem n="2.">캐릭터 이름 검색 → 원정대 목록 확인</OlItem>
          <OlItem n="3.">추가할 캐릭터 선택 후 [추가] 클릭</OlItem>
        </div>
      </Step>
      <Step n={3} title="순서 변경 및 삭제">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]"><strong className="text-gray-700 dark:text-zinc-200">[캐릭터 편집]</strong>에서 드래그앤드랍으로 순서를 바꾸거나 삭제할 수 있습니다.</p>
      </Step>
    </GuidePanel>,

    /* Step 3: 레이드 설정 */
    <GuidePanel step={3} title="레이드 설정" lead="어떤 레이드를 할지, 골드 수령 여부를 캐릭터별로 설정합니다." prev={{ label: '캐릭터 추가', idx: 5 }} next={{ label: '숙제 체크', idx: 7 }} goTab={goTab}>
      <Step n={1} title="자동 세팅 (권장)">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">대시보드 우측 상단 <strong className="text-gray-700 dark:text-zinc-200">[자동 세팅]</strong>을 클릭하면 아이템레벨 기준으로 적합한 레이드를 자동 추천합니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">전략 선택 (골드 최대화 / 빠른 클리어 등)</OlItem>
          <OlItem n="2.">미리보기 확인 후 [적용]</OlItem>
        </div>
      </Step>
      <Step n={2} title="수동 설정">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">각 캐릭터 카드의 <strong className="text-gray-700 dark:text-zinc-200">[레이드 설정]</strong>에서 세부 조정이 가능합니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="·">레이드 및 난이도 (노말 / 하드) 선택</OlItem>
          <OlItem n="·">골드 체크 여부 설정 — 캐릭터당 최대 3개</OlItem>
          <OlItem n="·">EX 레이드는 원정대 전체에서 1캐릭터만 선택할 수 있어요</OlItem>
        </div>
      </Step>
    </GuidePanel>,

    /* Step 4: 숙제 체크 */
    <GuidePanel step={4} title="숙제 체크" lead="클리어한 레이드 관문을 클릭해서 체크합니다." prev={{ label: '레이드 설정', idx: 6 }} next={{ label: '골드 확인', idx: 8 }} goTab={goTab}>
      <Step n={1} title="관문 클리어 체크">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">대시보드에서 각 레이드 칸을 클릭하면 체크가 됩니다. 레이드 전체 클리어 시 카드가 완료 상태로 바뀝니다.</p>
        <Callout>
          <strong className="text-gray-800 dark:text-zinc-200">우클릭(모바일: 길게 누르기)</strong>으로 더보기 골드 옵션을 설정할 수 있어요.
        </Callout>
      </Step>
      <Step n={2} title="체크 해제">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">체크한 관문을 다시 클릭하면 해제됩니다. 실수로 눌렀을 때 바로 되돌릴 수 있어요.</p>
      </Step>
      <Step n={3} title="주간 자동 초기화">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">레이드 체크는 매주 <strong className="text-gray-700 dark:text-zinc-200">수요일 오전 6시</strong>에 자동으로 초기화됩니다. 별도 조작이 필요 없어요.</p>
        <Callout>
          초기화 전 데이터는 <strong className="text-gray-800 dark:text-zinc-200">히스토리</strong> 페이지에 자동으로 저장됩니다.
        </Callout>
      </Step>
    </GuidePanel>,

    /* Step 5: 골드 확인 */
    <GuidePanel step={5} title="골드 확인" lead="이번 주 골드 수익을 대시보드에서 바로 확인할 수 있습니다." prev={{ label: '숙제 체크', idx: 7 }} next={{ label: '커스텀 숙제', idx: 9 }} goTab={goTab}>
      <Step n={1} title="상단 골드 요약">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">대시보드 상단에 이번 주 <strong className="text-gray-700 dark:text-zinc-200">총 예상 골드 수익</strong>이 표시됩니다. 레이드를 클리어할수록 실시간으로 올라갑니다.</p>
      </Step>
      <Step n={2} title="캐릭터별 골드 배지">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">각 캐릭터 카드 하단에 <strong className="text-gray-700 dark:text-zinc-200">해당 캐릭터의 주간 골드 수령량</strong>이 표시됩니다.</p>
      </Step>
      <Step n={3} title="더보기 골드 설정">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">일부 레이드에서 귀속 아이템 선택 시 추가 골드를 받을 수 있습니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">레이드 칸을 <strong className="text-gray-700 dark:text-zinc-200">우클릭(모바일: 길게 누르기)</strong></OlItem>
          <OlItem n="2.">더보기 골드 받기 활성화</OlItem>
          <OlItem n="3.">귀속 / 거래 여부 선택</OlItem>
        </div>
        <Callout>
          <strong className="text-gray-800 dark:text-zinc-200">귀속 골드</strong>와 <strong className="text-gray-800 dark:text-zinc-200">거래 가능 골드</strong>는 원정대 요약에서 분리 집계되어 표시돼요.
        </Callout>
      </Step>
    </GuidePanel>,

    /* Step 6: 커스텀 숙제 */
    <GuidePanel step={6} title="커스텀 숙제" lead="레이드 외에 나만의 일일·주간 숙제를 직접 추가할 수 있습니다." prev={{ label: '골드 확인', idx: 8 }} next={{ label: '원정대', idx: 10 }} goTab={goTab}>
      <Step n={1} title="항목 추가">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">대시보드 우측 <strong className="text-gray-700 dark:text-zinc-200">[커스텀 숙제 편집]</strong>에서 새 항목을 만듭니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">숙제 이름 입력</OlItem>
          <OlItem n="2.">아이콘 선택</OlItem>
          <OlItem n="3.">초기화 주기 선택 — 일일 / 주간</OlItem>
          <OlItem n="4.">[추가] 클릭 → 대시보드에 바로 반영</OlItem>
        </div>
      </Step>
      <Step n={2} title="체크 및 초기화">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">추가한 항목은 각 캐릭터 카드에서 체크할 수 있고, 설정한 주기에 따라 자동 초기화됩니다.</p>
        <div className="flex flex-col gap-1.5">
          <Bullet><strong className="text-gray-700 dark:text-zinc-200">일일 숙제</strong>: 매일 자정(00:00 KST) 초기화</Bullet>
          <Bullet><strong className="text-gray-700 dark:text-zinc-200">주간 숙제</strong>: 매주 수요일 오전 6시 초기화</Bullet>
        </div>
      </Step>
      <Step n={3} title="순서 변경 및 삭제">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">커스텀 숙제 편집 모달 내에서 드래그앤드랍으로 순서를 바꾸거나 항목을 삭제할 수 있습니다.</p>
      </Step>
    </GuidePanel>,

    /* Step 7: 원정대 */
    <GuidePanel step={7} title="원정대" lead="길드원과 레이드 현황을 공유하기 위한 공간입니다." prev={{ label: '커스텀 숙제', idx: 9 }} next={{ label: '현황 공유', idx: 11 }} goTab={goTab}>
      <Step n={1} title="원정대 만들기">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">상단 메뉴 <strong className="text-gray-700 dark:text-zinc-200">[길드]</strong> → <strong className="text-gray-700 dark:text-zinc-200">[원정대 만들기]</strong> 클릭</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">원정대 이름 입력 후 생성</OlItem>
          <OlItem n="2.">자동 발급된 <strong className="text-gray-700 dark:text-zinc-200">초대 코드</strong>를 길드원에게 공유</OlItem>
        </div>
      </Step>
      <Step n={2} title="초대 코드로 참가">
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">[길드] 페이지 → [초대 코드로 참가]</OlItem>
          <OlItem n="2.">코드 입력 후 신청</OlItem>
          <OlItem n="3.">리더 수락 → 멤버 합류 완료</OlItem>
        </div>
      </Step>
      <Step n={3} title="멤버 관리 (리더)">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]"><strong className="text-gray-700 dark:text-zinc-200">[설정]</strong> 탭에서 가입 신청 수락·거절, 역할 변경, 강퇴를 관리할 수 있습니다.</p>
      </Step>
    </GuidePanel>,

    /* Step 8: 현황 공유 */
    <GuidePanel step={8} title="현황 공유" lead="원정대 멤버들의 레이드 클리어 현황을 실시간으로 확인합니다." prev={{ label: '원정대', idx: 10 }} next={null} goTab={goTab}>
      <Step n={1} title="레이드 공개 설정">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">내 현황이 다른 멤버에게 보이려면 공개 설정이 필요합니다.</p>
        <div className="flex flex-col gap-1.5">
          <OlItem n="1.">우측 상단 프로필 → [설정]</OlItem>
          <OlItem n="2."><strong className="text-gray-700 dark:text-zinc-200">[레이드 현황 공개]</strong> 토글 ON</OlItem>
        </div>
        <Callout>끄면 원정대 멤버에게도 현황이 숨겨집니다.</Callout>
      </Step>
      <Step n={2} title="원정대 레이드 현황">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">원정대 상세 페이지 <strong className="text-gray-700 dark:text-zinc-200">[레이드 현황]</strong> 탭에서 멤버별 클리어 진행 상황을 확인합니다.</p>
        <div className="flex flex-col gap-1.5">
          <Bullet>레이드별 클리어 멤버 수를 표시해요.</Bullet>
          <Bullet>레이드 행 클릭 → 멤버별 상세 펼치기</Bullet>
        </div>
        <Shot src="/guide/screenshots/features/06-guild-overview.webp" alt="원정대 레이드 현황 탭" />
      </Step>
      <Step n={3} title="그룹 (지인 공유)">
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.75]">소수의 지인과 공유하려면 <strong className="text-gray-700 dark:text-zinc-200">[그룹]</strong> 탭에서 닉네임으로 검색 후 그룹 요청을 보내면 됩니다. 수락하면 서로의 현황을 볼 수 있어요.</p>
        <Shot src="/guide/screenshots/features/11-group.webp" alt="그룹 페이지" />
      </Step>

      {/* 완료 카드 */}
      <div className="border border-gray-200 dark:border-white/[0.08] rounded-xl p-10 text-center mt-2">
        <div className="text-[20px] font-bold text-gray-900 dark:text-zinc-100 mb-2">가이드를 모두 완료했습니다 🎉</div>
        <p className="text-[14px] text-gray-500 dark:text-zinc-400 leading-[1.7] mb-5">궁금한 점이 있으면 myloa.app에서 피드백을 남겨주세요.</p>
        <Link href="/dashboard" className="inline-block text-[13.5px] font-medium text-white bg-[var(--accent-500)] hover:bg-[var(--accent-400)] rounded-lg px-5 py-2.5 transition-colors">
          대시보드로 이동 →
        </Link>
      </div>
    </GuidePanel>,
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
                {item.step != null && (
                  <span className={`text-[11px] ml-auto ${current === item.idx ? 'text-[var(--accent-500)] font-semibold' : 'text-gray-400 dark:text-zinc-600'}`}>
                    {item.step}
                  </span>
                )}
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

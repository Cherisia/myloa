'use client'

import { useState, useCallback, useEffect } from 'react'
import MonthlyCalendar from './MonthlyCalendar'
import DayView from './DayView'
import PostListModal from './modals/PostListModal'
import PostCreateModal from './modals/PostCreateModal'
import PostDetailModal from './modals/PostDetailModal'
import PartyComposerModal from './modals/PartyComposerModal'
import CompleteModal from './modals/CompleteModal'
import DisbandModal from './modals/DisbandModal'
import TimeChangeModal from './modals/TimeChangeModal'
import { IconChevron, IconBack } from '@/app/dashboard/_icons'

// KST 기준 현재 연/월 반환
function getNowKST() {
  const now = new Date()
  const kst = new Date(now.getTime() + 9 * 3600 * 1000)
  return { year: kst.getUTCFullYear(), month: kst.getUTCMonth() + 1 }
}

function monthStr(year, month) {
  return `${year}-${String(month).padStart(2, '0')}`
}

const MONTH_NAMES = ['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']

export default function GuildScheduleTab({ expeditionId, userId, isLeader, members, isDemo }) {
  const { year: nowYear, month: nowMonth } = getNowKST()

  const [viewYear,  setViewYear]  = useState(nowYear)
  const [viewMonth, setViewMonth] = useState(nowMonth)
  // null = 월별 뷰, { year, month, day } = 일별 뷰
  const [selectedDay, setSelectedDay] = useState(null)

  const [posts,   setPosts]   = useState([])
  const [loading, setLoading] = useState(true)
  const [toast,   setToast]   = useState(null)

  // 모달 상태
  const [createModal,     setCreateModal]     = useState(null) // { scheduledAt? } | null
  const [detailModal,     setDetailModal]     = useState(null) // post | null
  const [partyModal,      setPartyModal]      = useState(null)
  const [completeModal,   setCompleteModal]   = useState(null)
  const [disbandModal,    setDisbandModal]    = useState(null)
  const [timeChangeModal, setTimeChangeModal] = useState(null) // { post, newScheduledAt }

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type })
    setTimeout(() => setToast(null), 4000)
  }, [])

  const fetchPosts = useCallback(async () => {
    if (isDemo) { setLoading(false); return }
    setLoading(true)
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule?month=${monthStr(viewYear, viewMonth)}`)
      if (res.ok) setPosts(await res.json())
    } catch {
      showToast('일정을 불러오지 못했습니다', 'error')
    } finally {
      setLoading(false)
    }
  }, [expeditionId, viewYear, viewMonth, isDemo, showToast])

  useEffect(() => { fetchPosts() }, [fetchPosts])

  // 월 이동
  function prevMonth() {
    if (viewMonth === 1) { setViewYear(y => y - 1); setViewMonth(12) }
    else setViewMonth(m => m - 1)
    setSelectedDay(null)
  }
  function nextMonth() {
    if (viewMonth === 12) { setViewYear(y => y + 1); setViewMonth(1) }
    else setViewMonth(m => m + 1)
    setSelectedDay(null)
  }

  // 날짜 셀 클릭 → 일별 뷰
  function handleDayClick(year, month, day) {
    setSelectedDay({ year, month, day })
  }

  // 일별 뷰에서 PostCard 클릭
  function handlePostClick(post) {
    setDetailModal(post)
  }

  // 공고 작성 버튼 — 일별 뷰에서 클릭 시 해당 날 기본 날짜 설정
  function handleCreateClick() {
    if (selectedDay) {
      const { year, month, day } = selectedDay
      // KST 21:00 을 기본값으로
      const kstStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}T21:00`
      setCreateModal({ scheduledAt: kstStr })
    } else {
      setCreateModal({})
    }
  }

  async function handleCreate(data) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '공고 작성 실패', 'error')
        return
      }
      showToast('공고가 등록되었습니다')
      setCreateModal(null)
      fetchPosts()
    } catch {
      showToast('공고 작성 실패', 'error')
    }
  }

  async function handleStatusChange(post, action) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '상태 변경 실패', 'error')
        return null
      }
      fetchPosts()
      return await res.json()
    } catch {
      showToast('상태 변경 실패', 'error')
      return null
    }
  }

  async function handleJoin(post, characterId, role) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ characterId, role }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '신청 실패', 'error')
        return false
      }
      showToast('신청이 완료되었습니다')
      fetchPosts()
      return true
    } catch {
      showToast('신청 실패', 'error')
      return false
    }
  }

  async function handleLeave(post) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}/join`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '취소 실패', 'error')
        return false
      }
      showToast('신청이 취소되었습니다')
      fetchPosts()
      return true
    } catch {
      showToast('취소 실패', 'error')
      return false
    }
  }

  async function handleParticipantAction(post, participantId, status) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}/participants/${participantId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '처리 실패', 'error')
        return false
      }
      fetchPosts()
      return true
    } catch {
      showToast('처리 실패', 'error')
      return false
    }
  }

  async function handleSaveParty(post, slots) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}/party`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slots }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '파티 구성 저장 실패', 'error')
        return false
      }
      showToast('파티 구성이 저장되었습니다')
      fetchPosts()
      return true
    } catch {
      showToast('파티 구성 저장 실패', 'error')
      return false
    }
  }

  async function handleComplete(post, excludedUserIds) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ excludedUserIds }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        showToast(err.error || '완료 처리 실패', 'error')
        return false
      }
      showToast('레이드 완료 처리되었습니다')
      setCompleteModal(null)
      setDetailModal(null)
      fetchPosts()
      return true
    } catch {
      showToast('완료 처리 실패', 'error')
      return false
    }
  }

  async function handleDisband(post) {
    const updated = await handleStatusChange(post, 'disband')
    if (updated) {
      showToast('공고가 해산되었습니다')
      setDisbandModal(null)
      setDetailModal(null)
    }
  }

  async function handleTimeChange(post, newScheduledAt) {
    try {
      const res = await fetch(`/api/guild/${expeditionId}/schedule/${post.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scheduledAt: newScheduledAt }),
      })
      if (!res.ok) { showToast('일정 변경 실패', 'error'); return }
      showToast('일정이 변경되었습니다')
      setTimeChangeModal(null)
      fetchPosts()
    } catch {
      showToast('일정 변경 실패', 'error')
    }
  }

  return (
    <div className="relative">
      {/* 헤더: 월 네비게이션 + 공고 작성 */}
      <div className="flex items-center justify-between mb-4">
        {/* 연도 + 월 */}
        <div className="leading-tight">
          <div className="text-[11px] text-gray-400 dark:text-gray-500">{viewYear}년</div>
          <div className="text-xl ns-extrabold text-gray-800 dark:text-gray-100">{MONTH_NAMES[viewMonth - 1]}</div>
        </div>

        {/* 우측 컨트롤 */}
        <div className="flex items-center gap-1.5">
          {/* 이번 달 아닐 때만 오늘 버튼 */}
          {(viewYear !== nowYear || viewMonth !== nowMonth) && (
            <button
              type="button"
              onClick={() => { setViewYear(nowYear); setViewMonth(nowMonth); setSelectedDay(null) }}
              className="px-2.5 py-1 text-xs ns-bold rounded-lg border border-gray-200 dark:border-[#333] text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors"
            >
              오늘
            </button>
          )}
          <button
            type="button"
            onClick={prevMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
            aria-label="이전 달"
          >
            <span className="text-gray-500 block rotate-180"><IconChevron /></span>
          </button>
          <button
            type="button"
            onClick={nextMonth}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 dark:border-[#333] hover:bg-gray-50 dark:hover:bg-[#252525] transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
            aria-label="다음 달"
          >
            <span className="text-gray-500 block"><IconChevron /></span>
          </button>
          {!selectedDay && (
            <button
              type="button"
              onClick={handleCreateClick}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors focus-visible:ring-2 focus-visible:ring-[var(--accent-400)]"
            >
              + 레이드 일정 추가
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-20 text-center text-sm text-gray-400 dark:text-gray-500">불러오는 중...</div>
      ) : selectedDay ? (
        // 날짜 드릴다운 뷰
        <DayView
          year={selectedDay.year}
          month={selectedDay.month}
          day={selectedDay.day}
          posts={posts}
          myUserId={userId}
          onBack={() => setSelectedDay(null)}
          onPostClick={handlePostClick}
          onCreateClick={handleCreateClick}
        />
      ) : (
        // 월별 달력 뷰
        <MonthlyCalendar
          posts={posts}
          year={viewYear}
          month={viewMonth}
          onDayClick={handleDayClick}
          onPostClick={handlePostClick}
        />
      )}

      {/* 모달들 */}
      {createModal && (
        <PostCreateModal
          scheduledAt={createModal.scheduledAt}
          expeditionId={expeditionId}
          userId={userId}
          members={members}
          onClose={() => setCreateModal(null)}
          onCreate={handleCreate}
        />
      )}

      {detailModal && (
        <PostDetailModal
          post={posts.find(p => p.id === detailModal.id) || detailModal}
          userId={userId}
          isLeader={isLeader}
          members={members}
          onClose={() => setDetailModal(null)}
          onJoin={(charId, role) => handleJoin(detailModal, charId, role)}
          onLeave={() => handleLeave(detailModal)}
          onParticipantAction={(pid, status) => handleParticipantAction(detailModal, pid, status)}
          onClose2Action={(action) => handleStatusChange(detailModal, action).then(fetchPosts)}
          onSaveParty={(slots) => handleSaveParty(detailModal, slots)}
          onOpenComplete={() => setCompleteModal(detailModal)}
          onOpenDisband={() => setDisbandModal(detailModal)}
        />
      )}

      {partyModal && (
        <PartyComposerModal
          post={posts.find(p => p.id === partyModal.id) || partyModal}
          userId={userId}
          members={members}
          onClose={() => setPartyModal(null)}
          onSave={(slots) => handleSaveParty(partyModal, slots)}
          showToast={showToast}
        />
      )}

      {completeModal && (
        <CompleteModal
          post={posts.find(p => p.id === completeModal.id) || completeModal}
          members={members}
          onClose={() => setCompleteModal(null)}
          onComplete={(excludedIds) => handleComplete(completeModal, excludedIds)}
        />
      )}

      {disbandModal && (
        <DisbandModal
          post={disbandModal}
          onClose={() => setDisbandModal(null)}
          onDisband={() => handleDisband(disbandModal)}
        />
      )}

      {timeChangeModal && (
        <TimeChangeModal
          post={timeChangeModal.post}
          newScheduledAt={timeChangeModal.newScheduledAt}
          onClose={() => setTimeChangeModal(null)}
          onConfirm={() => handleTimeChange(timeChangeModal.post, timeChangeModal.newScheduledAt)}
        />
      )}

      {/* 토스트 */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-[200] px-4 py-3 rounded-xl shadow-lg text-sm ns-bold transition-all
          ${toast.type === 'error'
            ? 'bg-red-500 text-white'
            : 'bg-[var(--accent-400)] text-[var(--accent-900)]'}`}>
          {toast.msg}
        </div>
      )}
    </div>
  )
}

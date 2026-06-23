'use client'

import { useState } from 'react'
import { IconX, IconSpinner } from '@/app/dashboard/_icons'

const CATEGORIES = [
  {
    value: 'bug',
    emoji: '🐛',
    label: '버그 신고',
    placeholder: '어떤 오류가 발생했나요?\n언제, 어떤 상황에서 발생했는지 알려주시면 빠르게 확인할게요.',
  },
  {
    value: 'suggestion',
    emoji: '💡',
    label: '기능 건의',
    placeholder: '어떤 기능이 있으면 좋을 것 같나요?\n왜 필요한지도 함께 적어주시면 좋아요.',
  },
  {
    value: 'other',
    emoji: '💬',
    label: '기타',
    placeholder: '자유롭게 적어주세요.',
  },
]

export default function FeedbackModal({ onClose }) {
  const [category, setCategory] = useState('')
  const [content, setContent] = useState('')
  const [status, setStatus] = useState('idle') // idle | loading | success
  const [errorMsg, setErrorMsg] = useState('')

  const selectedCat = CATEGORIES.find(c => c.value === category)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!category) { setErrorMsg('카테고리를 선택해 주세요.'); return }
    if (content.trim().length < 10) { setErrorMsg('내용을 10자 이상 입력해 주세요.'); return }

    setStatus('loading')
    setErrorMsg('')
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, content: content.trim() }),
      })
      const data = await res.json()
      if (!res.ok) { setErrorMsg(data.error || '오류가 발생했습니다.'); setStatus('idle'); return }
      setStatus('success')
    } catch {
      setErrorMsg('네트워크 오류가 발생했습니다.')
      setStatus('idle')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full sm:max-w-md bg-white dark:bg-zinc-900 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden border border-gray-100 dark:border-white/[0.06]">

        {/* 닫기 */}
        <button
          onClick={onClose}
          aria-label="닫기"
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full text-gray-300 dark:text-zinc-600 hover:text-gray-500 dark:hover:text-zinc-400 hover:bg-gray-100 dark:hover:bg-white/[0.06] transition-colors"
        >
          <IconX size={15} />
        </button>

        {status === 'success' ? (
          <div className="flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[var(--accent-100)] dark:bg-[var(--accent-900)]/30 flex items-center justify-center text-3xl">
              ✓
            </div>
            <div>
              <p className="text-base ns-bold text-gray-900 dark:text-gray-100">문의가 접수됐어요</p>
              <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1.5">소중한 의견 감사해요. 검토 후 반영할게요.</p>
            </div>
            <button
              onClick={onClose}
              className="mt-2 px-8 py-2.5 rounded-xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] text-[var(--accent-900)] text-sm ns-bold transition-colors"
            >
              확인
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {/* 헤더 */}
            <div className="px-6 pt-6 pb-5">
              <h2 className="text-lg ns-bold text-gray-900 dark:text-gray-100">문의하기</h2>
              <p className="text-sm text-gray-400 dark:text-zinc-500 mt-1">불편한 점이나 건의사항을 알려주세요</p>
            </div>

            <div className="px-6 pb-6 space-y-5">
              {/* 카테고리 */}
              <div className="flex gap-2">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.value}
                    type="button"
                    onClick={() => { setCategory(cat.value); setErrorMsg('') }}
                    className={`flex-1 flex flex-col items-center gap-2 py-3.5 rounded-2xl border-2 transition-all duration-150 ${
                      category === cat.value
                        ? 'border-[var(--accent-400)] bg-[var(--accent-50)] dark:bg-[var(--accent-900)]/20'
                        : 'border-transparent bg-gray-50 dark:bg-zinc-800 hover:bg-gray-100 dark:hover:bg-zinc-700/60'
                    }`}
                  >
                    <span className="text-xl leading-none">{cat.emoji}</span>
                    <span className={`text-[11px] ns-bold leading-none ${
                      category === cat.value
                        ? 'text-[var(--accent-700)] dark:text-[var(--accent-300)]'
                        : 'text-gray-500 dark:text-zinc-400'
                    }`}>{cat.label}</span>
                  </button>
                ))}
              </div>

              {/* 내용 */}
              <div className="relative">
                <textarea
                  value={content}
                  onChange={e => { setContent(e.target.value); setErrorMsg('') }}
                  placeholder={selectedCat?.placeholder ?? '카테고리를 먼저 선택해 주세요.'}
                  rows={5}
                  maxLength={1000}
                  className="w-full px-4 py-3.5 text-sm rounded-2xl bg-gray-50 dark:bg-zinc-800 border-2 border-transparent focus:border-[var(--accent-400)] dark:focus:border-[var(--accent-400)] text-gray-900 dark:text-gray-100 placeholder-gray-300 dark:placeholder-zinc-600 resize-none focus:outline-none transition-colors"
                />
                <span className="absolute bottom-3 right-3.5 text-[10px] text-gray-300 dark:text-zinc-600 pointer-events-none">
                  {content.length}/1000
                </span>
              </div>

              {errorMsg && (
                <p className="text-xs text-red-500 dark:text-red-400 -mt-2">{errorMsg}</p>
              )}

              {/* 버튼 */}
              <div className="flex gap-2.5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 dark:bg-zinc-800 text-sm text-gray-500 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700 active:scale-[0.98] transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={status === 'loading'}
                  className="flex-1 py-3 rounded-2xl bg-[var(--accent-400)] hover:bg-[var(--accent-300)] active:scale-[0.98] text-[var(--accent-900)] text-sm ns-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1.5"
                >
                  {status === 'loading' ? <><IconSpinner /> 전송 중</> : '보내기'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

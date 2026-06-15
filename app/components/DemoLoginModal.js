'use client'

import { signIn } from 'next-auth/react'

// 데모(비로그인) 모드에서 로그인 필요 기능 접근 시 표시하는 공용 모달.
// description: 기능별 안내 문구 (줄바꿈은 \n 또는 ReactNode), callbackUrl: 로그인 후 이동 경로.
export default function DemoLoginModal({ onClose, callbackUrl = '/', description }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full sm:max-w-sm rounded-t-3xl sm:rounded-2xl bg-white dark:bg-[#1e1e1e] shadow-2xl dark:shadow-[0_20px_60px_rgba(0,0,0,0.7)] sm:border sm:border-gray-200/50 dark:sm:border-[#2d2d2d]" onClick={e => e.stopPropagation()}>
        <div className="sm:hidden flex justify-center pt-3 pb-0">
          <div className="w-10 h-1 rounded-full bg-gray-200 dark:bg-[#333]" />
        </div>
        <div className="px-6 pt-5 pb-6 text-center space-y-5">
          <div className="space-y-1.5">
            <p className="text-lg ns-extrabold text-gray-900 dark:text-white">로그인이 필요해요</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">{description}</p>
          </div>
          <div className="flex flex-col gap-2.5">
            <button type="button" onClick={() => signIn('discord', { callbackUrl })}
              className="w-full rounded-2xl py-3.5 text-sm ns-bold text-white transition-all hover:opacity-90 active:opacity-80"
              style={{ backgroundColor: '#5865F2' }}>
              디스코드로 로그인
            </button>
            <button type="button" onClick={onClose}
              className="w-full rounded-2xl py-3 text-sm text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

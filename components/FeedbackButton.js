'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'

const FeedbackModal = dynamic(() => import('./FeedbackModal'), { ssr: false })

export default function FeedbackButton() {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-gray-400 dark:text-zinc-600 hover:text-gray-600 dark:hover:text-zinc-400 transition-colors"
      >
        문의하기
      </button>
      {open && <FeedbackModal onClose={() => setOpen(false)} />}
    </>
  )
}

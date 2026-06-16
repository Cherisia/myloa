'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const TOOLS = [
  { href: '/tools/auction', label: '경매 입찰 계산기' },
]

export default function ToolsNav() {
  const pathname = usePathname()

  return (
    <div className="border-b border-gray-200 dark:border-white/[0.08] bg-white dark:bg-[#111116]">
      <div className="max-w-4xl mx-auto px-4">
        <div className="flex gap-1">
          {TOOLS.map(({ href, label }) => {
            const active = pathname === href || pathname.startsWith(href + '/')
            return (
              <Link
                key={href}
                href={href}
                className={`relative px-4 py-3 text-sm ns-bold transition-colors ${
                  active
                    ? 'text-gray-900 dark:text-white'
                    : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                }`}
              >
                {label}
                {active && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] rounded-full bg-[var(--accent-400)]" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </div>
  )
}

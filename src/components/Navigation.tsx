'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/', label: 'Add Expense', emoji: '➕' },
  { href: '/expenses', label: 'All Expenses', emoji: '📋' },
  { href: '/income', label: 'Income', emoji: '💰' },
  { href: '/budget', label: 'Budget', emoji: '📊' },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-0.5 sm:gap-1">
          <span className="text-white font-bold text-sm sm:text-base tracking-tight mr-2 sm:mr-4 shrink-0 py-4 select-none">
            💵 <span className="hidden sm:inline">Budget</span>
          </span>

          {tabs.map((tab) => (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2 ${
                pathname === tab.href
                  ? 'text-white border-indigo-400'
                  : 'text-slate-400 border-transparent hover:text-slate-200 hover:border-slate-600'
              }`}
            >
              <span className="text-sm sm:text-base leading-none">{tab.emoji}</span>
              <span className="hidden sm:inline">{tab.label}</span>
            </Link>
          ))}

          {/* Settings — gear icon, right-aligned */}
          <Link
            href="/settings"
            title="Settings"
            className={`ml-auto flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'text-white bg-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </Link>
        </div>
      </div>
    </nav>
  )
}

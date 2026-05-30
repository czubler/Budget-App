'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const tabs = [
  { href: '/',         label: 'Add Expense', icon: 'ti-plus'       },
  { href: '/expenses', label: 'Expenses',    icon: 'ti-list'       },
  { href: '/income',   label: 'Income',      icon: 'ti-coins'      },
  { href: '/savings',  label: 'Savings',     icon: 'ti-piggy-bank' },
  { href: '/budget',   label: 'Budget',      icon: 'ti-chart-pie'  },
]

export default function Navigation() {
  const pathname = usePathname()

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-0.5 sm:gap-1">

          {/* Brand */}
          <span className="flex items-center gap-1.5 text-white font-bold text-sm sm:text-base tracking-tight mr-2 sm:mr-4 shrink-0 py-4 select-none">
            <i className="ti ti-wallet text-[#AFA9EC]" style={{ fontSize: 18 }} />
            <span className="hidden sm:inline">budget</span>
          </span>

          {tabs.map((tab) => {
            const active = pathname === tab.href
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2"
                style={{
                  color: active ? '#fff' : undefined,
                  borderColor: active ? '#7F77DD' : 'transparent',
                }}
              >
                <i
                  className={`ti ${tab.icon} text-base leading-none`}
                  style={{ color: active ? '#AFA9EC' : undefined }}
                />
                <span
                  className={`hidden sm:inline ${active ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}
                >
                  {tab.label}
                </span>
              </Link>
            )
          })}

          {/* Settings */}
          <Link
            href="/settings"
            title="Settings"
            className={`ml-auto flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 rounded-lg transition-colors ${
              pathname === '/settings'
                ? 'text-white bg-slate-700'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <i className="ti ti-settings" style={{ fontSize: 17 }} />
          </Link>
        </div>
      </div>
    </nav>
  )
}

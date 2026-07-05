'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

function NavTab({ href, label, icon, active }: { href: string; label: string; icon: string; active: boolean }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 py-4 text-xs sm:text-sm font-medium whitespace-nowrap transition-colors border-b-2"
      style={{ borderColor: active ? '#7F77DD' : 'transparent' }}
    >
      <i className={`ti ${icon} text-base leading-none`} style={{ color: active ? '#AFA9EC' : undefined }} />
      <span className={`hidden sm:inline ${active ? 'text-white' : 'text-slate-400 hover:text-slate-200'}`}>
        {label}
      </span>
    </Link>
  )
}

export default function Navigation() {
  const pathname = usePathname()
  const budgetActive = pathname === '/budget'

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">
        <div className="flex items-center gap-0.5 sm:gap-1">

          {/* Brand */}
          <span className="flex items-center gap-1.5 text-white font-bold text-sm sm:text-base tracking-tight mr-2 sm:mr-4 shrink-0 py-4 select-none">
            <i className="ti ti-wallet text-[#AFA9EC]" style={{ fontSize: 18 }} />
            <span className="hidden sm:inline">budget</span>
          </span>

          {/* Entry tabs — grouped with shared background */}
          <div className="flex items-stretch overflow-hidden rounded-md bg-slate-800/60 ring-1 ring-slate-700/60 mr-1 sm:mr-2">
            <NavTab href="/"       label="Add Expense" icon="ti-plus"  active={pathname === '/'} />
            <div className="w-px bg-slate-700/60 my-2.5" />
            <NavTab href="/income" label="Income"      icon="ti-coins" active={pathname === '/income'} />
          </div>

          {/* View tabs */}
          <NavTab href="/expenses" label="Expenses" icon="ti-list"       active={pathname === '/expenses'} />
          <NavTab href="/savings"  label="Savings"  icon="ti-piggy-bank" active={pathname === '/savings'} />

          {/* Budget — always-visible elevated pill */}
          <Link
            href="/budget"
            className="flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3.5 py-2 my-auto ml-1 sm:ml-2 rounded-lg text-xs sm:text-sm font-semibold whitespace-nowrap transition-all"
            style={{
              background: budgetActive ? 'rgba(127, 119, 221, 0.28)' : 'rgba(127, 119, 221, 0.1)',
              color: budgetActive ? '#fff' : '#B8B3EC',
              boxShadow: `0 0 0 1px rgba(127, 119, 221, ${budgetActive ? '0.55' : '0.22'})`,
            }}
          >
            <i
              className="ti ti-layout-dashboard leading-none"
              style={{ fontSize: 16, color: budgetActive ? '#AFA9EC' : '#9D97E0' }}
            />
            <span className="hidden sm:inline">Budget</span>
          </Link>

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

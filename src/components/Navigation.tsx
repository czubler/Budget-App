'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { Suspense } from 'react'

type Section = 'add' | 'ledger' | 'insights'

function getSection(pathname: string): Section {
  if (pathname === '/') return 'add'
  if (pathname === '/expenses' || pathname === '/income' || pathname === '/savings') return 'ledger'
  if (pathname === '/budget') return 'insights'
  return 'add'
}

function SectionTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 sm:px-4 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
        active
          ? 'text-white border-[#7F77DD]'
          : 'text-slate-400 hover:text-slate-200 border-transparent'
      }`}
    >
      {label}
    </Link>
  )
}

function SubTab({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
        active ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-slate-300'
      }`}
    >
      {label}
    </Link>
  )
}

function SubNav() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const section = getSection(pathname)
  const tab = searchParams.get('tab') ?? 'expense'

  if (section === 'add') {
    return (
      <div className="flex gap-1 pt-1.5 pb-2 border-t border-slate-800/60">
        <SubTab href="/?tab=expense" label="Expense" active={tab === 'expense'} />
        <SubTab href="/?tab=income" label="Income" active={tab === 'income'} />
        <SubTab href="/?tab=savings" label="Savings" active={tab === 'savings'} />
      </div>
    )
  }

  if (section === 'ledger') {
    return (
      <div className="flex gap-1 pt-1.5 pb-2 border-t border-slate-800/60">
        <SubTab href="/expenses" label="Expenses" active={pathname === '/expenses'} />
        <SubTab href="/income" label="Paychecks" active={pathname === '/income'} />
        <SubTab href="/savings" label="Savings" active={pathname === '/savings'} />
      </div>
    )
  }

  return null
}

export default function Navigation() {
  const pathname = usePathname()
  const section = getSection(pathname)

  return (
    <nav className="bg-slate-900 border-b border-slate-800 sticky top-0 z-50">
      <div className="max-w-2xl mx-auto px-3 sm:px-4">

        {/* Main row */}
        <div className="flex items-center">
          <span className="flex items-center gap-1.5 text-white font-bold text-sm sm:text-base tracking-tight mr-2 sm:mr-4 shrink-0 py-4 select-none">
            <i className="ti ti-wallet text-[#AFA9EC]" style={{ fontSize: 18 }} />
            <span className="hidden sm:inline">budget</span>
          </span>

          <div className="flex items-stretch">
            <SectionTab href="/" label="Log" active={section === 'add'} />
            <SectionTab href="/expenses" label="Ledger" active={section === 'ledger'} />
            <SectionTab href="/budget" label="Insights" active={section === 'insights'} />
          </div>

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

        {/* Sub-tabs row */}
        <Suspense>
          <SubNav />
        </Suspense>

      </div>
    </nav>
  )
}

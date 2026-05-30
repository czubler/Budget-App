'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
  PieChart, Pie,
} from 'recharts'

export type CategoryAmount = { category: string; amount: number }
export type MonthTrend = { month: string; income: number; expenses: number }

const PALETTE = [
  '#6366f1', '#10b981', '#f59e0b', '#ef4444', '#3b82f6',
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16', '#f97316',
  '#14b8a6', '#fb7185', '#fbbf24', '#34d399', '#94a3b8',
]

function usd(v: number) {
  return `$${v.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
}

const tooltipStyle = { fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)' }

function Empty({ text }: { text: string }) {
  return <div className="h-48 flex items-center justify-center text-sm text-slate-400">{text}</div>
}

function ChartCard({ title, sub, children }: { title: string; sub?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  )
}

// ─── Bar chart: spending by category ──────────────────────────────────────────

function CategoryBarChart({ data }: { data: CategoryAmount[] }) {
  if (!data.length) return <Empty text="No expenses this month" />
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} margin={{ top: 4, right: 4, bottom: 52, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="category"
          tick={{ fontSize: 10, fill: '#94a3b8' }}
          angle={-40}
          textAnchor="end"
          interval={0}
        />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickFormatter={usd} width={58} />
        <Tooltip formatter={(v) => [usd(Number(v)), 'Spent']} contentStyle={tooltipStyle} cursor={{ fill: '#f8fafc' }} />
        <Bar dataKey="amount" radius={[3, 3, 0, 0]} maxBarSize={44}>
          {data.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

// ─── Line chart: 6-month income vs expenses ───────────────────────────────────

function TrendLineChart({ data }: { data: MonthTrend[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: '#94a3b8' }} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickFormatter={usd} width={60} />
        <Tooltip
          formatter={(v, name) => [usd(Number(v)), name === 'income' ? 'Net Income' : 'Expenses']}
          contentStyle={tooltipStyle}
        />
        <Legend
          formatter={(v) => (v === 'income' ? 'Net Income' : 'Expenses')}
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
        />
        <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2.5} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 5 }} />
        <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2.5} dot={{ r: 3, fill: '#ef4444', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  )
}

// ─── Donut chart: expense breakdown ───────────────────────────────────────────

const RADIAN = Math.PI / 180
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) {
  if (percent < 0.05) return null
  const r = innerRadius + (outerRadius - innerRadius) * 0.55
  const x = cx + r * Math.cos(-midAngle * RADIAN)
  const y = cy + r * Math.sin(-midAngle * RADIAN)
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize={10} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  )
}

function DonutChart({ data }: { data: CategoryAmount[] }) {
  const nonZero = data.filter((d) => d.amount > 0)
  if (!nonZero.length) return <Empty text="No expenses this month" />
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie
          data={nonZero}
          cx="50%"
          cy="44%"
          innerRadius={52}
          outerRadius={90}
          dataKey="amount"
          nameKey="category"
          labelLine={false}
          label={PieLabel}
        >
          {nonZero.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip formatter={(v, name) => [usd(Number(v)), name]} contentStyle={tooltipStyle} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

// ─── Default export (imported dynamically with ssr:false) ─────────────────────

export default function BudgetCharts({
  categoryData,
  trendData,
}: {
  categoryData: CategoryAmount[]
  trendData: MonthTrend[]
}) {
  const currentMonth = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="space-y-4">
      <ChartCard
        title="Spending by Category"
        sub={currentMonth}
      >
        <CategoryBarChart data={categoryData} />
      </ChartCard>

      <ChartCard
        title="Income vs. Expenses — Last 6 Months"
      >
        <TrendLineChart data={trendData} />
      </ChartCard>

      <ChartCard
        title="Expense Breakdown"
        sub={currentMonth}
      >
        <DonutChart data={categoryData} />
      </ChartCard>
    </div>
  )
}

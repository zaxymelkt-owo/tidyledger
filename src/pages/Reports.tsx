import { useEffect, useMemo, useState } from 'react'
import {
  format,
  startOfMonth,
  endOfMonth,
  subMonths,
  eachMonthOfInterval,
  parseISO,
} from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
} from 'recharts'
import Topbar from '../components/layout/Topbar'
import StatCard from '../components/ui/StatCard'
import { supabase } from '../lib/supabase'
import type { JobWithCustomer, Transaction, Employee, Quote } from '../types'

const COLORS = ['#4F7360', '#C79A46', '#B0503F', '#6E8F7C', '#5C6B64', '#1F2A24']

export default function Reports() {
  const [jobs, setJobs] = useState<JobWithCustomer[]>([])
  const [txns, setTxns] = useState<Transaction[]>([])
  const [employees, setEmployees] = useState<Employee[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadData()
  }, [])

  async function loadData() {
    setLoading(true)
    setError(null)
    const sixMonthsAgo = format(subMonths(new Date(), 5), 'yyyy-MM-01')

    const [jobsRes, txnsRes, empRes, quotesRes] = await Promise.all([
      supabase
        .from('jobs')
        .select('*, customers(first_name, last_name, address, city)')
        .gte('job_date', sixMonthsAgo)
        .order('job_date', { ascending: true }),
      supabase
        .from('transactions')
        .select('*')
        .gte('txn_date', sixMonthsAgo)
        .order('txn_date', { ascending: true }),
      supabase.from('employees').select('*'),
      supabase.from('quotes').select('*'),
    ])

    const firstError = [jobsRes, txnsRes, empRes, quotesRes].find((r) => r.error)
    if (firstError?.error) {
      setError(firstError.error.message)
    } else {
      setJobs((jobsRes.data as JobWithCustomer[]) ?? [])
      setTxns(txnsRes.data ?? [])
      setEmployees(empRes.data ?? [])
      setQuotes(quotesRes.data ?? [])
    }
    setLoading(false)
  }

  // ── Derived metrics ──────────────────────────
  const thisMonthStart = startOfMonth(new Date())
  const thisMonthEnd = endOfMonth(new Date())

  const jobsThisMonth = jobs.filter((j) => {
    const d = parseISO(j.job_date)
    return d >= thisMonthStart && d <= thisMonthEnd
  })

  const revenueJobs = jobs
    .filter((j) => j.payment_status === 'paid' && j.price)
    .reduce((s, j) => s + (j.price ?? 0), 0)

  const incomeTxns = txns.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseTxns = txns.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)

  const completionRate =
    jobs.length > 0
      ? Math.round((jobs.filter((j) => j.status === 'completed').length / jobs.length) * 100)
      : 0

  const quoteWinRate =
    quotes.filter((q) => q.status === 'accepted' || q.status === 'declined').length > 0
      ? Math.round(
          (quotes.filter((q) => q.status === 'accepted').length /
            quotes.filter((q) => q.status === 'accepted' || q.status === 'declined').length) *
            100
        )
      : 0

  // Monthly revenue from jobs
  const months = eachMonthOfInterval({
    start: subMonths(new Date(), 5),
    end: new Date(),
  })

  const monthlyRevenue = months.map((m) => {
    const key = format(m, 'yyyy-MM')
    const label = format(m, 'MMM')
    const jobRev = jobs
      .filter((j) => j.job_date.startsWith(key) && j.payment_status === 'paid')
      .reduce((s, j) => s + (j.price ?? 0), 0)
    const txnIncome = txns
      .filter((t) => t.txn_date.startsWith(key) && t.type === 'income')
      .reduce((s, t) => s + t.amount, 0)
    const txnExpense = txns
      .filter((t) => t.txn_date.startsWith(key) && t.type === 'expense')
      .reduce((s, t) => s + t.amount, 0)
    return {
      month: label,
      jobRevenue: jobRev,
      otherIncome: txnIncome,
      expenses: txnExpense,
      net: jobRev + txnIncome - txnExpense,
    }
  })

  // Jobs by status pie
  const statusCounts = useMemo(() => {
    const map: Record<string, number> = {}
    jobs.forEach((j) => {
      map[j.status] = (map[j.status] || 0) + 1
    })
    return Object.entries(map).map(([name, value]) => ({
      name: name.replace('_', ' '),
      value,
    }))
  }, [jobs])

  // Jobs by employee
  const byEmployee = useMemo(() => {
    const map: Record<string, number> = {}
    jobs.forEach((j) => {
      const name = j.assigned_employee || 'Unassigned'
      map[name] = (map[name] || 0) + 1
    })
    return Object.entries(map)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
  }, [jobs])

  // Expense breakdown
  const expenseByCategory = useMemo(() => {
    const map: Record<string, number> = {}
    txns
      .filter((t) => t.type === 'expense')
      .forEach((t) => {
        map[t.category] = (map[t.category] || 0) + t.amount
      })
    return Object.entries(map)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
  }, [txns])

  const activeEmployees = employees.filter((e) => e.status === 'active').length

  return (
    <>
      <Topbar title="Reports & Analytics" subtitle="Last 6 months overview" />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs text-clay/80">
                Have you run <code className="font-mono-num">database/003_new_modules.sql</code> in your Supabase project?
              </p>
            )}
          </div>
        )}

        {loading ? (
          <p className="text-slate text-center py-20">Loading analytics…</p>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                label="Jobs this month"
                value={String(jobsThisMonth.length)}
                ticketNo="JBS"
                accent="sage"
              />
              <StatCard
                label="Job revenue (6 mo)"
                value={`$${revenueJobs.toLocaleString()}`}
                ticketNo="REV"
                accent="brass"
              />
              <StatCard
                label="Completion rate"
                value={`${completionRate}%`}
                ticketNo="CMP"
                accent="sage"
              />
              <StatCard
                label="Quote win rate"
                value={`${quoteWinRate}%`}
                ticketNo="WIN"
                accent="brass"
              />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
              <StatCard
                label="Other income (6 mo)"
                value={`$${incomeTxns.toLocaleString()}`}
                ticketNo="INC"
                accent="sage"
              />
              <StatCard
                label="Expenses (6 mo)"
                value={`$${expenseTxns.toLocaleString()}`}
                ticketNo="EXP"
                accent="clay"
              />
              <StatCard
                label="Active employees"
                value={String(activeEmployees)}
                ticketNo="EMP"
                accent="sage"
              />
              <StatCard
                label="Total quotes"
                value={String(quotes.length)}
                ticketNo="QTE"
                accent="brass"
              />
            </div>

            {/* Revenue trend */}
            <div className="ticket-card p-6 mb-6">
              <h3 className="font-display font-semibold text-ink mb-4">Monthly revenue vs expenses</h3>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDE3DE" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5C6B64' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#5C6B64' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #DDE3DE',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Legend />
                    <Bar dataKey="jobRevenue" name="Job revenue" fill="#4F7360" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="otherIncome" name="Other income" fill="#6E8F7C" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Expenses" fill="#B0503F" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              {/* Jobs by status */}
              <div className="ticket-card p-6">
                <h3 className="font-display font-semibold text-ink mb-4">Jobs by status</h3>
                {statusCounts.length === 0 ? (
                  <p className="text-slate text-sm py-10 text-center">No job data yet</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusCounts}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {statusCounts.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Expense breakdown */}
              <div className="ticket-card p-6">
                <h3 className="font-display font-semibold text-ink mb-4">Expenses by category</h3>
                {expenseByCategory.length === 0 ? (
                  <p className="text-slate text-sm py-10 text-center">No expense data yet</p>
                ) : (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={expenseByCategory}
                          dataKey="value"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={90}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                        >
                          {expenseByCategory.map((_, i) => (
                            <Cell key={i} fill={COLORS[i % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            `$${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>
            </div>

            {/* Jobs by employee */}
            <div className="ticket-card p-6 mb-6">
              <h3 className="font-display font-semibold text-ink mb-4">Jobs by assigned employee</h3>
              {byEmployee.length === 0 ? (
                <p className="text-slate text-sm py-10 text-center">No assignment data yet</p>
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={byEmployee} layout="vertical">
                      <CartesianGrid strokeDasharray="3 3" stroke="#DDE3DE" />
                      <XAxis type="number" tick={{ fontSize: 12, fill: '#5C6B64' }} />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={100}
                        tick={{ fontSize: 12, fill: '#5C6B64' }}
                      />
                      <Tooltip />
                      <Bar dataKey="count" name="Jobs" fill="#C79A46" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Net trend line */}
            <div className="ticket-card p-6">
              <h3 className="font-display font-semibold text-ink mb-4">Net cash flow trend</h3>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#DDE3DE" />
                    <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#5C6B64' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#5C6B64' }} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #DDE3DE',
                        borderRadius: 8,
                        fontSize: 13,
                      }}
                    />
                    <Line
                      type="monotone"
                      dataKey="net"
                      name="Net"
                      stroke="#4F7360"
                      strokeWidth={2}
                      dot={{ fill: '#4F7360', r: 4 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </main>
    </>
  )
}

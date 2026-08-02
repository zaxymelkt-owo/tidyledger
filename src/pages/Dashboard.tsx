import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  format,
  startOfWeek,
  startOfMonth,
  parseISO,
  isToday,
  isTomorrow,
  addDays,
} from 'date-fns'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import Topbar from '../components/layout/Topbar'
import StatCard from '../components/ui/StatCard'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import type { JobWithCustomer, QuoteRequest, Payment } from '../types'

type DashStats = {
  jobsToday: number
  jobsWeek: number
  revenueThisWeek: number
  revenueThisMonth: number
  unpaidJobs: number
  activeCustomers: number
  newQuoteRequests: number
  pendingPayments: number
  pendingReviews: number
  inProgress: number
}

const empty: DashStats = {
  jobsToday: 0,
  jobsWeek: 0,
  revenueThisWeek: 0,
  revenueThisMonth: 0,
  unpaidJobs: 0,
  activeCustomers: 0,
  newQuoteRequests: 0,
  pendingPayments: 0,
  pendingReviews: 0,
  inProgress: 0,
}

const statusStyles: Record<string, string> = {
  scheduled: 'bg-brass/10 text-brass',
  in_progress: 'bg-sage/10 text-sage-deep',
  completed: 'bg-line text-slate',
  cancelled: 'bg-clay/10 text-clay',
}

function dayLabel(dateStr: string) {
  const d = parseISO(dateStr)
  if (isToday(d)) return 'Today'
  if (isTomorrow(d)) return 'Tomorrow'
  return format(d, 'EEE MMM d')
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashStats>(empty)
  const [todayJobs, setTodayJobs] = useState<JobWithCustomer[]>([])
  const [upcoming, setUpcoming] = useState<JobWithCustomer[]>([])
  const [unpaid, setUnpaid] = useState<JobWithCustomer[]>([])
  const [requests, setRequests] = useState<QuoteRequest[]>([])
  const [weekBars, setWeekBars] = useState<{ day: string; revenue: number; jobs: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      const today = format(new Date(), 'yyyy-MM-dd')
      const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd')
      const monthStart = format(startOfMonth(new Date()), 'yyyy-MM-dd')
      const horizon = format(addDays(new Date(), 14), 'yyyy-MM-dd')

      const [
        customersRes,
        jobsTodayRes,
        jobsWeekCountRes,
        jobsWeekRes,
        jobsMonthRes,
        unpaidCountRes,
        inProgressRes,
        todayJobsRes,
        upcomingRes,
        unpaidJobsRes,
        quoteReqRes,
        paymentsRes,
        reviewsRes,
      ] = await Promise.all([
        supabase.from('customers').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('job_date', today),
        supabase
          .from('jobs')
          .select('id', { count: 'exact', head: true })
          .gte('job_date', weekStart)
          .neq('status', 'cancelled'),
        supabase.from('jobs').select('price, job_date').gte('job_date', weekStart).eq('payment_status', 'paid'),
        supabase.from('jobs').select('price').gte('job_date', monthStart).eq('payment_status', 'paid'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('payment_status', 'unpaid').neq('status', 'cancelled'),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'in_progress'),
        supabase
          .from('jobs')
          .select('*, customers(first_name, last_name, address, city)')
          .eq('job_date', today)
          .order('created_at', { ascending: true }),
        supabase
          .from('jobs')
          .select('*, customers(first_name, last_name, address, city)')
          .gt('job_date', today)
          .lte('job_date', horizon)
          .neq('status', 'cancelled')
          .order('job_date', { ascending: true })
          .limit(8),
        supabase
          .from('jobs')
          .select('*, customers(first_name, last_name, address, city)')
          .eq('payment_status', 'unpaid')
          .neq('status', 'cancelled')
          .order('job_date', { ascending: false })
          .limit(6),
        supabase
          .from('quote_requests')
          .select('*')
          .eq('status', 'new')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('payments')
          .select('id, amount, status')
          .eq('status', 'pending'),
        supabase
          .from('reviews')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'pending'),
      ])

      // Soft-fail optional tables (quote_requests / payments / reviews may be missing)
      const coreError = [
        customersRes,
        jobsTodayRes,
        jobsWeekRes,
        jobsMonthRes,
        unpaidCountRes,
        todayJobsRes,
      ].find((r) => r.error)
      if (coreError?.error) throw coreError.error

      const revenueThisWeek = (jobsWeekRes.data ?? []).reduce((s, j) => s + (j.price ?? 0), 0)
      const revenueThisMonth = (jobsMonthRes.data ?? []).reduce((s, j) => s + (j.price ?? 0), 0)
      const pendingPayTotal = (paymentsRes.data as Payment[] | null)?.reduce((s, p) => s + Number(p.amount), 0) ?? 0

      setStats({
        jobsToday: jobsTodayRes.count ?? 0,
        jobsWeek: jobsWeekCountRes.count ?? 0,
        revenueThisWeek,
        revenueThisMonth,
        unpaidJobs: unpaidCountRes.count ?? 0,
        activeCustomers: customersRes.count ?? 0,
        newQuoteRequests: quoteReqRes.error ? 0 : (quoteReqRes.data?.length ?? 0),
        pendingPayments: paymentsRes.error ? 0 : (paymentsRes.data?.length ?? 0),
        pendingReviews: reviewsRes.error ? 0 : (reviewsRes.count ?? 0),
        inProgress: inProgressRes.count ?? 0,
      })

      setTodayJobs((todayJobsRes.data as JobWithCustomer[]) ?? [])
      setUpcoming((upcomingRes.data as JobWithCustomer[]) ?? [])
      setUnpaid((unpaidJobsRes.data as JobWithCustomer[]) ?? [])
      setRequests(quoteReqRes.error ? [] : ((quoteReqRes.data as QuoteRequest[]) ?? []))

      // Build last 7 days revenue bars from paid jobs this week
      const days = Array.from({ length: 7 }, (_, i) => {
        const d = addDays(startOfWeek(new Date()), i)
        const key = format(d, 'yyyy-MM-dd')
        const dayJobs = (jobsWeekRes.data ?? []).filter((j) => j.job_date === key)
        return {
          day: format(d, 'EEE'),
          revenue: dayJobs.reduce((s, j) => s + (j.price ?? 0), 0),
          jobs: dayJobs.length,
        }
      })
      setWeekBars(days)

      // silence unused
      void pendingPayTotal
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load dashboard.')
    } finally {
      setLoading(false)
    }
  }

  const greeting = useMemo(() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 17) return 'Good afternoon'
    return 'Good evening'
  }, [])

  return (
    <>
      <Topbar
        title="Dashboard"
        subtitle={`${greeting} · ${format(new Date(), 'EEEE, MMM d')}`}
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        {/* Attention strip */}
        {!loading && (stats.newQuoteRequests > 0 || stats.pendingPayments > 0 || stats.pendingReviews > 0 || stats.inProgress > 0) && (
          <div className="flex flex-wrap gap-2 mb-6">
            {stats.inProgress > 0 && (
              <Link
                to="/jobs"
                className="inline-flex items-center gap-2 rounded-full bg-sage/10 text-sage-deep text-xs font-medium px-3 py-1.5 hover:bg-sage/15"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-sage-deep animate-pulse" />
                {stats.inProgress} job{stats.inProgress === 1 ? '' : 's'} in progress
              </Link>
            )}
            {stats.newQuoteRequests > 0 && (
              <Link
                to="/quote-requests"
                className="inline-flex items-center gap-2 rounded-full bg-brass/10 text-brass text-xs font-medium px-3 py-1.5 hover:bg-brass/15"
              >
                {stats.newQuoteRequests} new quote request{stats.newQuoteRequests === 1 ? '' : 's'}
              </Link>
            )}
            {stats.pendingPayments > 0 && (
              <Link
                to="/payments"
                className="inline-flex items-center gap-2 rounded-full bg-clay/10 text-clay text-xs font-medium px-3 py-1.5 hover:bg-clay/15"
              >
                {stats.pendingPayments} open payment link{stats.pendingPayments === 1 ? '' : 's'}
              </Link>
            )}
            {stats.pendingReviews > 0 && (
              <Link
                to="/reviews"
                className="inline-flex items-center gap-2 rounded-full bg-line text-slate text-xs font-medium px-3 py-1.5 hover:bg-line/80"
              >
                {stats.pendingReviews} review{stats.pendingReviews === 1 ? '' : 's'} to moderate
              </Link>
            )}
          </div>
        )}

        {/* KPI tickets */}
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-4 gap-4 mb-6">
          <StatCard label="Jobs today" value={loading ? '—' : String(stats.jobsToday)} ticketNo="TDY" accent="sage" />
          <StatCard
            label="Revenue this week"
            value={loading ? '—' : `$${stats.revenueThisWeek.toLocaleString()}`}
            ticketNo="WK"
            accent="brass"
          />
          <StatCard
            label="Revenue this month"
            value={loading ? '—' : `$${stats.revenueThisMonth.toLocaleString()}`}
            ticketNo="MO"
            accent="sage"
          />
          <StatCard
            label="Unpaid jobs"
            value={loading ? '—' : String(stats.unpaidJobs)}
            ticketNo="DUE"
            accent="clay"
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            label="Jobs this week"
            value={loading ? '—' : String(stats.jobsWeek)}
            ticketNo="SCH"
            accent="sage"
          />
          <StatCard
            label="Customers"
            value={loading ? '—' : String(stats.activeCustomers)}
            ticketNo="CUS"
            accent="sage"
          />
          <StatCard
            label="New quote requests"
            value={loading ? '—' : String(stats.newQuoteRequests)}
            ticketNo="REQ"
            accent="brass"
          />
          <StatCard
            label="In progress now"
            value={loading ? '—' : String(stats.inProgress)}
            ticketNo="LIVE"
            accent="brass"
          />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <Link to="/jobs"><Button>+ Job</Button></Link>
          <Link to="/customers"><Button variant="secondary">+ Customer</Button></Link>
          <Link to="/quotes"><Button variant="secondary">Quote calculator</Button></Link>
          <Link to="/payments"><Button variant="secondary">Payment link</Button></Link>
          <Link to="/quote-requests"><Button variant="ghost">Inbox</Button></Link>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-6">
          {/* Today's schedule */}
          <div className="xl:col-span-3 ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink">Today’s schedule</h3>
              <Link to="/jobs" className="text-xs font-medium text-sage-deep hover:underline">
                All jobs
              </Link>
            </div>
            {loading ? (
              <p className="px-5 py-10 text-center text-sm text-slate">Loading…</p>
            ) : todayJobs.length === 0 ? (
              <p className="px-5 py-10 text-center text-sm text-slate">No jobs scheduled for today.</p>
            ) : (
              <ul className="divide-y divide-line">
                {todayJobs.map((j) => (
                  <li key={j.id} className="px-5 py-3 flex items-center gap-3 hover:bg-paper/60">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink text-sm truncate">
                        {j.customers
                          ? `${j.customers.first_name} ${j.customers.last_name}`
                          : 'Customer'}
                      </p>
                      <p className="text-xs text-slate truncate">
                        {j.service || 'Service'}
                        {j.customers?.address ? ` · ${j.customers.address}` : ''}
                        {j.assigned_employee ? ` · ${j.assigned_employee}` : ''}
                      </p>
                    </div>
                    <span
                      className={`shrink-0 rounded-full text-[11px] font-medium px-2 py-0.5 capitalize ${statusStyles[j.status] || 'bg-line text-slate'}`}
                    >
                      {j.status.replace('_', ' ')}
                    </span>
                    <span className="shrink-0 font-mono-num text-sm text-ink w-16 text-right">
                      {j.price != null ? `$${j.price}` : '—'}
                    </span>
                    <Link
                      to={`/jobs/${j.id}/field`}
                      className="shrink-0 text-xs font-medium text-sage-deep hover:underline"
                    >
                      Field
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Week revenue chart */}
          <div className="xl:col-span-2 ticket-card p-5">
            <h3 className="font-display font-semibold text-ink mb-4">Paid revenue this week</h3>
            <div className="h-52">
              {loading ? (
                <p className="text-sm text-slate text-center py-16">Loading…</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={weekBars}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#D0DDD6" />
                    <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#5A6E67' }} />
                    <YAxis tick={{ fontSize: 11, fill: '#5A6E67' }} width={40} />
                    <Tooltip
                      contentStyle={{
                        background: '#fff',
                        border: '1px solid #DDE3DE',
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                      formatter={(v) => [`$${Number(v).toLocaleString()}`, 'Revenue']}
                    />
                    <Bar dataKey="revenue" fill="#2F5C4C" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming */}
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold text-ink">Upcoming (14 days)</h3>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-slate">Loading…</p>
            ) : upcoming.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate">Nothing on the books yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {upcoming.map((j) => (
                  <li key={j.id} className="px-5 py-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium text-ink truncate">
                        {j.customers
                          ? `${j.customers.first_name} ${j.customers.last_name}`
                          : '—'}
                      </span>
                      <span className="text-xs text-slate shrink-0">{dayLabel(j.job_date)}</span>
                    </div>
                    <p className="text-xs text-slate mt-0.5 truncate">{j.service || 'Service'}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Unpaid */}
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex justify-between items-center">
              <h3 className="font-display font-semibold text-ink">Needs payment</h3>
              <Link to="/payments" className="text-xs font-medium text-sage-deep hover:underline">
                Payments
              </Link>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-slate">Loading…</p>
            ) : unpaid.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate">All caught up.</p>
            ) : (
              <ul className="divide-y divide-line">
                {unpaid.map((j) => (
                  <li key={j.id} className="px-5 py-3 text-sm flex justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-medium text-ink truncate">
                        {j.customers
                          ? `${j.customers.first_name} ${j.customers.last_name}`
                          : '—'}
                      </p>
                      <p className="text-xs text-slate">{format(parseISO(j.job_date), 'MMM d')}</p>
                    </div>
                    <span className="font-mono-num text-clay shrink-0">
                      {j.price != null ? `$${j.price}` : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Quote request inbox preview */}
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex justify-between items-center">
              <h3 className="font-display font-semibold text-ink">New quote requests</h3>
              <Link to="/quote-requests" className="text-xs font-medium text-sage-deep hover:underline">
                Inbox
              </Link>
            </div>
            {loading ? (
              <p className="px-5 py-8 text-center text-sm text-slate">Loading…</p>
            ) : requests.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate">
                No new requests. Share your{' '}
                <Link to="/request-quote" className="text-sage-deep underline">
                  public quote form
                </Link>
                .
              </p>
            ) : (
              <ul className="divide-y divide-line">
                {requests.map((r) => (
                  <li key={r.id} className="px-5 py-3 text-sm">
                    <p className="font-medium text-ink">
                      {r.first_name} {r.last_name}
                    </p>
                    <p className="text-xs text-slate capitalize">
                      {r.service_type.replace(/_/g, ' ')} · {r.frequency.replace('_', ' ')}
                    </p>
                    <p className="text-[11px] text-slate mt-0.5">
                      {format(new Date(r.created_at), 'MMM d, h:mm a')}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

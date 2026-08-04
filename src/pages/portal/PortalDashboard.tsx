import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import Button from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import { useAuth } from '../../contexts/AuthContext'
import { supabase } from '../../lib/supabase'
import { loadPortalCustomer, clearPortalCustomer } from './PortalLogin'
import type { Job, Quote, Payment, Review } from '../../types'

export default function PortalDashboard() {
  const navigate = useNavigate()
  const { signOut: authSignOut } = useAuth()
  const customer = loadPortalCustomer()
  const [jobs, setJobs] = useState<Job[]>([])
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!customer) {
      navigate('/portal')
      return
    }
    loadData()
  }, [])

  async function loadData() {
    if (!customer) return
    setLoading(true)
    setError(null)

    const args = {
      p_email: customer.email,
      p_portal_code: customer.portal_code,
    }

    // Prefer security-definer RPCs (bypass brittle anon RLS).
    // Fall back to direct selects if RPCs are not deployed yet.
    const [jobsRpc, quotesRpc, paymentsRpc, reviewsRpc] = await Promise.all([
      supabase.rpc('portal_list_jobs', args),
      supabase.rpc('portal_list_quotes', args),
      supabase.rpc('portal_list_payments', args),
      supabase.rpc('portal_list_reviews', args),
    ])

    const rpcMissing =
      [jobsRpc, quotesRpc, paymentsRpc, reviewsRpc].some(
        (r) => r.error && /could not find|does not exist|schema cache/i.test(r.error.message)
      )

    if (!rpcMissing && !jobsRpc.error && !quotesRpc.error) {
      setJobs((jobsRpc.data as Job[]) ?? [])
      setQuotes((quotesRpc.data as Quote[]) ?? [])
      setPayments((paymentsRpc.data as Payment[]) ?? [])
      setReviews((reviewsRpc.data as Review[]) ?? [])

      const softErrors = [paymentsRpc, reviewsRpc]
        .map((r) => r.error?.message)
        .filter(Boolean)
      if (softErrors.length) {
        setError(softErrors.join(' · '))
      }
      setLoading(false)
      return
    }

    // Fallback: direct table reads (requires 004/006 RLS policies)
    const [jobsRes, quotesRes, paymentsRes, reviewsRes] = await Promise.all([
      supabase.from('jobs').select('*').eq('customer_id', customer.id).order('job_date', { ascending: false }),
      supabase
        .from('quotes')
        .select('*')
        .eq('customer_id', customer.id)
        .in('status', ['sent', 'accepted', 'declined', 'expired'])
        .order('created_at', { ascending: false }),
      supabase.from('payments').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
      supabase.from('reviews').select('*').eq('customer_id', customer.id).order('created_at', { ascending: false }),
    ])

    const errors = [jobsRes, quotesRes, paymentsRes, reviewsRes]
      .map((r) => r.error?.message)
      .filter(Boolean)

    if (errors.length) {
      setError(
        errors.join(' · ') +
          ' — If this persists, run database/006_portal_data_access.sql in Supabase.'
      )
    }

    setJobs(jobsRes.data ?? [])
    setQuotes(quotesRes.data ?? [])
    setPayments(paymentsRes.data ?? [])
    setReviews(reviewsRes.data ?? [])
    setLoading(false)
  }

  async function signOut() {
    clearPortalCustomer()
    await authSignOut()
    navigate('/portal')
  }

  if (!customer) return null

  const unpaidJobs = jobs.filter((j) => j.payment_status !== 'paid' && j.status === 'completed')
  const pendingPayments = payments.filter((p) => p.status === 'pending')
  const latestQuotes = quotes.slice(0, 3)
  const recentJobs = jobs.slice(0, 5)
  const recentPayments = payments.slice(0, 4)

  const summaryCards = [
    {
      label: 'Quotes',
      value: String(quotes.length),
      ticketNo: 'QTS',
      accent: 'sage' as const,
    },
    {
      label: 'Open payments',
      value: String(pendingPayments.length),
      ticketNo: 'PAY',
      accent: 'brass' as const,
    },
    {
      label: 'Completed jobs',
      value: String(jobs.filter((j) => j.status === 'completed').length),
      ticketNo: 'JOB',
      accent: 'sage' as const,
    },
    {
      label: 'Reviews',
      value: String(reviews.length),
      ticketNo: 'REV',
      accent: 'clay' as const,
    },
  ]

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised/90 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-lg text-ink">
            Tidy<span className="text-sage-deep">Ledger</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate hidden sm:inline">
              {customer.first_name} {customer.last_name}
            </span>
            <button onClick={() => void signOut()} className="text-xs font-medium text-clay hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-10 space-y-6">
        <section className="ticket-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="ticket-number mb-2">Customer portal</p>
              <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink leading-tight">
                Hello, {customer.first_name}
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate max-w-2xl">
                Your quote activity, payments, and job history are all in one streamlined dashboard.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate">Open items</p>
                <p className="font-display text-2xl font-semibold text-ink mt-1">
                  {pendingPayments.length + unpaidJobs.length}
                </p>
              </div>
              <div className="rounded-2xl border border-line bg-paper px-4 py-3">
                <p className="text-xs uppercase tracking-wide text-slate">Latest quote</p>
                <p className="font-display text-lg font-semibold text-ink mt-1">
                  {quotes[0] ? `$${Number(quotes[0].total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : '—'}
                </p>
              </div>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        {loading ? (
          <div className="ticket-card p-12 text-center text-slate">Loading your account…</div>
        ) : (
          <>
            {(pendingPayments.length > 0 || unpaidJobs.length > 0) && (
              <div className="rounded-2xl border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-brass">
                {pendingPayments.length > 0 && (
                  <p className="mb-1">
                    You have {pendingPayments.length} open payment{pendingPayments.length > 1 ? 's' : ''}.
                    {pendingPayments[0].access_token && (
                      <>
                        {' '}
                        <Link
                          to={`/pay/${pendingPayments[0].access_token}`}
                          className="font-medium underline"
                        >
                          Pay now →
                        </Link>
                      </>
                    )}
                  </p>
                )}
                {unpaidJobs.length > 0 && pendingPayments.length === 0 && (
                  <p>
                    You have {unpaidJobs.length} completed job
                    {unpaidJobs.length > 1 ? 's' : ''} awaiting payment.
                  </p>
                )}
              </div>
            )}

            <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              {summaryCards.map((item) => (
                <StatCard
                  key={item.label}
                  label={item.label}
                  value={item.value}
                  ticketNo={item.ticketNo}
                  accent={item.accent}
                />
              ))}
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-6">
              <div className="ticket-card overflow-hidden">
                <div className="flex items-center justify-between px-5 py-4 border-b border-line">
                  <div>
                    <h2 className="font-display font-semibold text-ink">Latest quotes</h2>
                    <p className="text-xs text-slate">{quotes.length} total</p>
                  </div>
                </div>

                {latestQuotes.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">
                    No quotes yet. When we send you a quote it will show up here.
                  </p>
                ) : (
                  <div className="divide-y divide-line">
                    {latestQuotes.map((q) => (
                      <div key={q.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <div>
                          <p className="font-medium text-ink capitalize">
                            {q.service_type.replace(/_/g, ' ')} · {q.frequency.replace('_', ' ')}
                          </p>
                          <p className="text-xs text-slate mt-1">
                            {format(new Date(q.created_at), 'MMM d, yyyy')} · {q.status}
                          </p>
                        </div>
                        <p className="font-mono-num font-semibold text-sage-deep">
                          ${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ticket-card p-5">
                <h2 className="font-display font-semibold text-ink">Quick actions</h2>
                <p className="text-sm text-slate mt-1">Take care of the next step in one tap.</p>
                <div className="mt-4 grid gap-3">
                  {pendingPayments[0]?.access_token && (
                    <Link to={`/pay/${pendingPayments[0].access_token}`}>
                      <Button className="w-full justify-center">Pay your balance</Button>
                    </Link>
                  )}
                  <Link to="/review/new">
                    <Button variant="secondary" className="w-full justify-center">Leave a review</Button>
                  </Link>
                </div>
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="ticket-card overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <h2 className="font-display font-semibold text-ink">Recent jobs</h2>
                </div>
                {recentJobs.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">No jobs on file yet.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {recentJobs.map((j) => (
                      <div key={j.id} className="px-5 py-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{j.service || 'Service visit'}</p>
                          <p className="text-xs text-slate mt-1">
                            {format(new Date(j.job_date + 'T00:00:00'), 'MMM d, yyyy')} · {j.status.replace('_', ' ')}
                          </p>
                        </div>
                        <span className="text-xs font-medium text-slate uppercase tracking-wide">
                          {j.payment_status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="ticket-card overflow-hidden">
                <div className="px-5 py-4 border-b border-line">
                  <h2 className="font-display font-semibold text-ink">Recent payments</h2>
                </div>
                {recentPayments.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">No payments yet.</p>
                ) : (
                  <div className="divide-y divide-line">
                    {recentPayments.map((p) => (
                      <div key={p.id} className="px-5 py-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="font-medium text-ink">{p.description || 'Payment'}</p>
                          <p className="text-xs text-slate mt-1">
                            {format(new Date(p.created_at), 'MMM d, yyyy')} · {p.status}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono-num font-semibold text-ink">
                            ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </p>
                          {p.status === 'pending' && p.access_token && (
                            <Link
                              to={`/pay/${p.access_token}`}
                              className="text-xs font-medium text-sage-deep hover:underline"
                            >
                              Pay
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>

            {reviews.length > 0 && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate mb-3">Your reviews</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reviews.map((r) => (
                    <div key={r.id} className="ticket-card p-4">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-brass text-sm">
                          {'★'.repeat(r.rating)}
                          {'☆'.repeat(5 - r.rating)}
                        </span>
                        <span className="text-xs text-slate capitalize">· {r.status}</span>
                      </div>
                      {r.title && <p className="font-medium text-ink text-sm">{r.title}</p>}
                      {r.body && <p className="text-sm text-slate mt-1">{r.body}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  )
}

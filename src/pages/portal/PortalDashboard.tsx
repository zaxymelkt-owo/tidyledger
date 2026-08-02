import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { format } from 'date-fns'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { loadPortalCustomer, clearPortalCustomer } from './PortalLogin'
import type { Job, Quote, Payment, Review } from '../../types'

export default function PortalDashboard() {
  const navigate = useNavigate()
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

  function signOut() {
    clearPortalCustomer()
    navigate('/portal')
  }

  if (!customer) return null

  const unpaidJobs = jobs.filter((j) => j.payment_status !== 'paid' && j.status === 'completed')
  const pendingPayments = payments.filter((p) => p.status === 'pending')

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-lg text-ink">
            Tidy<span className="text-sage-deep">Ledger</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-slate hidden sm:inline">
              {customer.first_name} {customer.last_name}
            </span>
            <button onClick={signOut} className="text-xs font-medium text-clay hover:underline">
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink">
            Hello, {customer.first_name}
          </h1>
          <p className="text-slate text-sm mt-1">Your cleaning history, quotes, and payments in one place.</p>
        </div>

        {error && (
          <div className="rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-slate py-12 text-center">Loading your account…</p>
        ) : (
          <>
            {(pendingPayments.length > 0 || unpaidJobs.length > 0) && (
              <div className="rounded-lg border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-brass">
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

            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate mb-3">
                Quotes ({quotes.length})
              </h2>
              <div className="ticket-card overflow-hidden">
                {quotes.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">
                    No quotes yet. When we send you a quote it will show up here.
                    <span className="block mt-1 text-xs text-slate/80">
                      (Only sent quotes appear — drafts stay internal.)
                    </span>
                  </p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Service</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {quotes.map((q) => (
                        <tr key={q.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3 font-mono-num">
                            {format(new Date(q.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3 capitalize">
                            {q.service_type.replace(/_/g, ' ')} · {q.frequency.replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3 capitalize">{q.status}</td>
                          <td className="px-5 py-3 text-right font-mono-num font-medium">
                            ${Number(q.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate mb-3">
                Jobs ({jobs.length})
              </h2>
              <div className="ticket-card overflow-hidden">
                {jobs.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">No jobs on file yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Service</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium">Payment</th>
                        <th className="px-5 py-3 font-medium text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {jobs.slice(0, 10).map((j) => (
                        <tr key={j.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3 font-mono-num">
                            {format(new Date(j.job_date + 'T00:00:00'), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3">{j.service || '—'}</td>
                          <td className="px-5 py-3 capitalize">{j.status.replace('_', ' ')}</td>
                          <td className="px-5 py-3 capitalize">{j.payment_status}</td>
                          <td className="px-5 py-3 text-right font-mono-num">
                            {j.price != null ? `$${j.price.toLocaleString()}` : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section>
              <h2 className="text-xs font-medium uppercase tracking-wide text-slate mb-3">
                Payments ({payments.length})
              </h2>
              <div className="ticket-card overflow-hidden">
                {payments.length === 0 ? (
                  <p className="px-5 py-8 text-center text-slate text-sm">No payments yet.</p>
                ) : (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                        <th className="px-5 py-3 font-medium">Date</th>
                        <th className="px-5 py-3 font-medium">Description</th>
                        <th className="px-5 py-3 font-medium">Status</th>
                        <th className="px-5 py-3 font-medium text-right">Amount</th>
                        <th className="px-5 py-3 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.map((p) => (
                        <tr key={p.id} className="border-b border-line last:border-0">
                          <td className="px-5 py-3 font-mono-num">
                            {format(new Date(p.created_at), 'MMM d, yyyy')}
                          </td>
                          <td className="px-5 py-3">{p.description || '—'}</td>
                          <td className="px-5 py-3 capitalize">{p.status}</td>
                          <td className="px-5 py-3 text-right font-mono-num">
                            ${Number(p.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                          </td>
                          <td className="px-5 py-3 text-right">
                            {p.status === 'pending' && p.access_token && (
                              <Link
                                to={`/pay/${p.access_token}`}
                                className="text-xs font-medium text-sage-deep hover:underline"
                              >
                                Pay
                              </Link>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </section>

            <section className="ticket-card p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-display font-semibold text-ink">Enjoyed our service?</h2>
                <p className="text-sm text-slate mt-1">Share a quick review — it means a lot to the team.</p>
              </div>
              <Link to="/review/new">
                <Button variant="secondary">Leave a review</Button>
              </Link>
            </section>

            {reviews.length > 0 && (
              <section>
                <h2 className="text-xs font-medium uppercase tracking-wide text-slate mb-3">Your reviews</h2>
                <div className="space-y-3">
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

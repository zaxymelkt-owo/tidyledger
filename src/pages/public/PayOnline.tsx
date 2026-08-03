import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { format } from 'date-fns'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { startStripeCheckout } from '../../lib/payments'
import type { Payment } from '../../types'
import Seo from '../../components/Seo'

export default function PayOnline() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const statusParam = searchParams.get('status')

  const [payment, setPayment] = useState<Payment | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    loadPayment()
  }, [token])

  useEffect(() => {
    if (statusParam === 'success' && payment) {
      // Webhook may still be in flight — poll a few times
      let attempts = 0
      const tick = async () => {
        attempts += 1
        const { data } = await supabase
          .rpc('get_payment_by_token', { p_token: token! })
          .returns<Payment[]>()
          .maybeSingle()
        if (data?.status === 'succeeded') {
          setPayment(data)
          setSuccess(true)
          return
        }
        if (attempts < 8) setTimeout(tick, 1500)
        else if (data) {
          // Show optimistic success after Stripe redirect even if webhook lags
          // (status can't be 'succeeded' here — that already returned above)
          setPayment(data)
          setSuccess(statusParam === 'success')
        }
      }
      tick()
    }
  }, [statusParam, payment?.id, token])

  async function loadPayment() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .rpc('get_payment_by_token', { p_token: token ?? '' })
      .returns<Payment[]>()
      .maybeSingle()

    if (error) setError(error.message)
    else if (!data) setError('Payment link not found or has expired.')
    else {
      setPayment(data)
      if (data.status === 'succeeded') setSuccess(true)
    }
    setLoading(false)
  }

  async function handlePayWithStripe() {
    if (!token || !payment) return
    setRedirecting(true)
    setError(null)

    const { url, error } = await startStripeCheckout(token)
    if (error || !url) {
      setError(
        error ||
          'Stripe checkout is not available. Ask the business to finish Stripe setup, or try again later.'
      )
      setRedirecting(false)
      return
    }

    window.location.href = url
  }

  return (
    <>
    <Seo title="Pay securely" description="Pay for your cleaning service securely online via Stripe." noIndex />
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center">
          <span className="font-display font-semibold text-lg text-ink">
            Tidy<span className="text-sage-deep">Ledger</span>
          </span>
        </div>
      </header>

      <main className="max-w-lg mx-auto px-6 py-10">
        {loading && <p className="text-center text-slate py-16">Loading payment…</p>}

        {error && !payment && (
          <div className="ticket-card p-8 text-center">
            <p className="text-clay mb-4">{error}</p>
            <Link to="/request-quote" className="text-sm text-sage-deep hover:underline">
              Request a quote instead
            </Link>
          </div>
        )}

        {payment && (success || payment.status === 'succeeded') && (
          <div className="ticket-card p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-sage/15 text-sage-deep flex items-center justify-center mx-auto mb-4 text-2xl">
              ✓
            </div>
            <h1 className="font-display text-2xl font-semibold text-ink mb-2">Payment successful</h1>
            <p className="text-slate mb-1">
              ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })} paid
              securely via Stripe
            </p>
            <p className="text-xs text-slate">
              {payment.description || 'Cleaning service'} ·{' '}
              {format(new Date(payment.paid_at || payment.created_at), 'MMM d, yyyy h:mm a')}
            </p>
            {payment.reference && (
              <p className="mt-3 text-[11px] text-slate font-mono-num">Ref: {payment.reference}</p>
            )}
          </div>
        )}

        {payment && payment.status === 'failed' && !success && (
          <div className="ticket-card p-8 text-center space-y-4">
            <h1 className="font-display text-xl font-semibold text-ink">Payment failed</h1>
            <p className="text-slate text-sm">Your card was not charged. You can try again.</p>
            <Button onClick={handlePayWithStripe} disabled={redirecting}>
              {redirecting ? 'Redirecting to Stripe…' : 'Try again with Stripe'}
            </Button>
          </div>
        )}

        {payment &&
          !success &&
          payment.status !== 'succeeded' &&
          payment.status !== 'failed' &&
          payment.status !== 'refunded' && (
            <>
              <div className="mb-6">
                <p className="ticket-number mb-1">SECURE PAYMENT · STRIPE</p>
                <h1 className="font-display text-2xl font-semibold text-ink mb-1">
                  ${Number(payment.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h1>
                <p className="text-slate text-sm">
                  {payment.description || 'Cleaning service payment'}
                </p>
                {statusParam === 'cancelled' && (
                  <p className="mt-3 text-sm text-brass">Checkout was cancelled. You can try again below.</p>
                )}
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
                  {error}
                </div>
              )}

              <div className="ticket-card p-6 space-y-4">
                {payment.payer_name && (
                  <p className="text-sm text-slate">
                    Paying as <span className="text-ink font-medium">{payment.payer_name}</span>
                    {payment.payer_email ? ` · ${payment.payer_email}` : ''}
                  </p>
                )}

                <Button className="w-full" onClick={handlePayWithStripe} disabled={redirecting}>
                  {redirecting ? 'Redirecting to Stripe…' : 'Pay securely with Stripe'}
                </Button>

                <ul className="text-[11px] text-slate space-y-1 leading-relaxed">
                  <li>· Card details are entered on Stripe’s secure checkout page</li>
                  <li>· We never store full card numbers on our servers</li>
                  <li>· You will receive a receipt from Stripe by email when available</li>
                </ul>
              </div>
            </>
          )}

        {payment?.status === 'refunded' && (
          <div className="ticket-card p-8 text-center">
            <h1 className="font-display text-xl font-semibold text-ink mb-2">Payment refunded</h1>
            <p className="text-slate text-sm">This payment was refunded and is no longer due.</p>
          </div>
        )}
      </main>
    </div>
    </>
  )
}
import { useEffect, useState } from 'react'
import { useParams, useSearchParams, Link } from 'react-router-dom'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { allowAction, rateLimitMessage } from '../../lib/rateLimit'
import type { Review } from '../../types'
import Seo from '../../components/Seo'

export default function LeaveReview() {
  const { token } = useParams<{ token: string }>()
  const [searchParams] = useSearchParams()
  const businessFromQuery = searchParams.get('business')

  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([])
  const [businessId, setBusinessId] = useState(businessFromQuery ?? '')
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  const isInvite = Boolean(token && token !== 'new')

  useEffect(() => {
    if (isInvite) loadInvite()
    else {
      loadBusinesses()
      setLoading(false)
    }
  }, [token])

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('status', 'active')
      .order('name')
    if (!error && data) {
      setBusinesses(data)
      if (businessFromQuery && data.some((b) => b.id === businessFromQuery)) {
        setBusinessId(businessFromQuery)
      } else if (data.length === 1) {
        setBusinessId(data[0].id)
      }
    }
  }

  async function loadInvite() {
    setLoading(true)
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('access_token', token)
      .maybeSingle()

    if (error) setError(error.message)
    else if (data) {
      const row = data as Review
      setReview(row)
      setName(row.customer_name)
      if (row.business_id) {
        setBusinessId(row.business_id)
        const { data: biz } = await supabase
          .from('businesses')
          .select('id, name')
          .eq('id', row.business_id)
          .maybeSingle()
        if (biz) setBusinesses([biz])
      }
      if (row.rating) setRating(row.rating)
      if (row.body || row.title) setDone(true)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const resolvedBusinessId = review?.business_id || businessId
    if (!resolvedBusinessId) {
      setError('Please select the business you are reviewing.')
      return
    }

    const key = `review:${resolvedBusinessId}:${(name || token || 'anon').toLowerCase()}`
    if (!allowAction(key, 8, 60 * 60 * 1000)) {
      setError(rateLimitMessage(3600))
      return
    }

    setSubmitting(true)
    setError(null)
    try {
      if (review && isInvite) {
        const { error } = await supabase
          .from('reviews')
          .update({
            customer_name: name,
            rating,
            title: title || null,
            body: body || null,
            status: 'pending',
            business_id: resolvedBusinessId,
          })
          .eq('access_token', token)
        if (error) throw error
      } else {
        const { error } = await supabase.from('reviews').insert({
          business_id: resolvedBusinessId,
          customer_name: name,
          rating,
          title: title || null,
          body: body || null,
          status: 'pending',
        })
        if (error) throw error
      }
      setDone(true)

      try {
        const { data: biz } = await supabase
          .from('businesses')
          .select('email, name')
          .eq('id', resolvedBusinessId)
          .maybeSingle()
        if (biz?.email) {
          const { notifyEmail } = await import('../../lib/notify')
          void notifyEmail('review_left', biz.email, {
            name,
            rating,
            title: title || null,
            body: body?.slice(0, 200) || null,
            business: biz.name,
          })
        }
      } catch {
        /* non-blocking */
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  const businessName =
    review?.business_id && businesses.find((b) => b.id === review.business_id)?.name
      ? businesses.find((b) => b.id === review.business_id)?.name
      : businesses.find((b) => b.id === businessId)?.name

  return (
    <>
      <Seo title="Leave a review" description="Share your experience with our housekeeping team." noIndex />
      <div className="min-h-screen bg-paper">
        <header className="border-b border-line bg-paper-raised">
          <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
            <Link to="/" className="font-display font-semibold text-lg text-ink">
              Tidy<span className="text-sage-deep">Ledger</span>
            </Link>
            <Link to="/request-quote" className="text-sm text-slate hover:text-ink">
              Get a quote
            </Link>
          </div>
        </header>

        <main className="max-w-lg mx-auto px-6 py-10">
          {loading && <p className="text-center text-slate py-16">Loading…</p>}

          {!loading && done && (
            <div className="ticket-card p-10 text-center">
              <div className="text-3xl mb-3 text-brass">{'★'.repeat(rating)}</div>
              <h1 className="font-display text-2xl font-semibold text-ink mb-2">Thank you!</h1>
              <p className="text-slate">
                Your review
                {businessName ? ` for ${businessName}` : ''} has been submitted and will appear once approved.
              </p>
            </div>
          )}

          {!loading && !done && (
            <>
              <div className="mb-6">
                <p className="ticket-number mb-1">CUSTOMER REVIEW</p>
                <h1 className="font-display text-2xl font-semibold text-ink mb-1">How did we do?</h1>
                <p className="text-slate text-sm">
                  Reviews are tied to a specific cleaning business so the right team can respond.
                </p>
              </div>

              {error && (
                <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit} className="ticket-card p-6 space-y-5">
                {!isInvite && (
                  <Field label="Business">
                    <Select
                      required
                      value={businessId}
                      onChange={(e) => setBusinessId(e.target.value)}
                    >
                      <option value="">Select a business…</option>
                      {businesses.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                {isInvite && review?.business_id && (
                  <p className="text-sm text-slate">
                    Reviewing:{' '}
                    <span className="font-medium text-ink">
                      {businessName || 'your service provider'}
                    </span>
                  </p>
                )}

                <Field label="Your name">
                  <Input required value={name} onChange={(e) => setName(e.target.value)} />
                </Field>

                <div>
                  <span className="block text-xs font-medium uppercase tracking-wide text-slate mb-2">
                    Rating
                  </span>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setRating(n)}
                        className={`text-2xl transition-colors ${
                          n <= rating ? 'text-brass' : 'text-line hover:text-brass/50'
                        }`}
                        aria-label={`${n} stars`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                </div>

                <Field label="Title (optional)">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Great service!"
                  />
                </Field>

                <Field label="Your review">
                  <Textarea
                    required
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Tell others about your experience…"
                  />
                </Field>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={submitting || (!isInvite && !businessId)}
                >
                  {submitting ? 'Submitting…' : 'Submit review'}
                </Button>
              </form>
            </>
          )}
        </main>
      </div>
    </>
  )
}

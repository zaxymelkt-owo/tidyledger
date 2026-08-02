import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { Field, Input, Textarea } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import type { Review } from '../../types'
import Seo from '../../components/Seo'

export default function LeaveReview() {
  const { token } = useParams<{ token: string }>()
  const [review, setReview] = useState<Review | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)

  // Open form (no pre-created review) vs token-linked review invite
  const [name, setName] = useState('')
  const [rating, setRating] = useState(5)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')

  useEffect(() => {
    if (token && token !== 'new') loadInvite()
    else setLoading(false)
  }, [token])

  async function loadInvite() {
    setLoading(true)
    // Token can be an existing review invite row
    const { data, error } = await supabase
      .from('reviews')
      .select('*')
      .eq('access_token', token)
      .maybeSingle()

    if (error) setError(error.message)
    else if (data) {
      setReview(data)
      setName(data.customer_name)
      if (data.rating) setRating(data.rating)
      if (data.body || data.title) setDone(true)
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      if (review && token) {
        const { error } = await supabase
          .from('reviews')
          .update({
            customer_name: name,
            rating,
            title: title || null,
            body: body || null,
            status: 'pending',
          })
          .eq('access_token', token)
        if (error) throw error
      } else {
        const { error } = await supabase.from('reviews').insert({
          customer_name: name,
          rating,
          title: title || null,
          body: body || null,
          status: 'pending',
        })
        if (error) throw error
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit review.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Seo title="Leave a review" description="Share your experience with our housekeeping team." noIndex />
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="max-w-lg mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-lg text-ink">
            Tidy<span className="text-sage-deep">Ledger</span>
          </span>
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
              Your review has been submitted and will appear once approved.
            </p>
          </div>
        )}

        {!loading && !done && (
          <>
            <div className="mb-6">
              <p className="ticket-number mb-1">CUSTOMER REVIEW</p>
              <h1 className="font-display text-2xl font-semibold text-ink mb-1">How did we do?</h1>
              <p className="text-slate text-sm">Your feedback helps us improve and helps other homeowners choose us.</p>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="ticket-card p-6 space-y-5">
              <Field label="Your name">
                <Input required value={name} onChange={(e) => setName(e.target.value)} />
              </Field>

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-slate mb-2">Rating</span>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      className={`text-2xl transition-colors ${n <= rating ? 'text-brass' : 'text-line hover:text-brass/50'}`}
                      aria-label={`${n} stars`}
                    >
                      ★
                    </button>
                  ))}
                </div>
              </div>

              <Field label="Title (optional)">
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Great service!" />
              </Field>

              <Field label="Your review">
                <Textarea
                  required
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Tell others about your experience…"
                />
              </Field>

              <Button type="submit" className="w-full" disabled={submitting}>
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
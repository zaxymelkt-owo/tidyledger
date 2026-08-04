import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { Field, Textarea } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Review, ReviewStatus } from '../types'

const statusStyles: Record<ReviewStatus, string> = {
  pending: 'bg-brass/10 text-brass',
  published: 'bg-sage/10 text-sage-deep',
  hidden: 'bg-line text-slate',
}

export default function Reviews() {
  const { business } = useAuth()
  const [reviews, setReviews] = useState<Review[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | ReviewStatus>('all')
  const [selected, setSelected] = useState<Review | null>(null)
  const [reply, setReply] = useState('')
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    load()
  }, [business?.id])

  async function load() {
    setLoading(true)
    setError(null)
    let q = supabase.from('reviews').select('*').order('created_at', { ascending: false })
    if (business?.id) q = q.eq('business_id', business.id)
    const { data, error } = await q
    if (error) setError(error.message)
    else setReviews((data as Review[]) ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return reviews
    return reviews.filter((r) => r.status === filter)
  }, [reviews, filter])

  const avgRating =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
      : 0
  const published = reviews.filter((r) => r.status === 'published').length
  const pending = reviews.filter((r) => r.status === 'pending').length

  async function setStatus(id: string, status: ReviewStatus) {
    const { error } = await supabase.from('reviews').update({ status }).eq('id', id)
    if (error) setError(error.message)
    else {
      setReviews((list) => list.map((r) => (r.id === id ? { ...r, status } : r)))
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s))
    }
  }

  async function toggleFeatured(r: Review) {
    const { error } = await supabase
      .from('reviews')
      .update({ is_featured: !r.is_featured })
      .eq('id', r.id)
    if (error) setError(error.message)
    else setReviews((list) => list.map((x) => (x.id === r.id ? { ...x, is_featured: !x.is_featured } : x)))
  }

  async function saveReply() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase
      .from('reviews')
      .update({ admin_reply: reply })
      .eq('id', selected.id)
    if (error) setError(error.message)
    else {
      setReviews((list) =>
        list.map((r) => (r.id === selected.id ? { ...r, admin_reply: reply } : r))
      )
      setSelected((s) => (s ? { ...s, admin_reply: reply } : s))
    }
    setSaving(false)
  }

  async function handleDelete(r: Review) {
    if (!confirm('Delete this review?')) return
    const { error } = await supabase.from('reviews').delete().eq('id', r.id)
    if (error) setError(error.message)
    else setReviews((list) => list.filter((x) => x.id !== r.id))
  }

  function copyPublicReviewLink() {
    const base = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const qs = business?.id ? `?business=${business.id}` : ''
    navigator.clipboard.writeText(`${base}/review/new${qs}`)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <>
      <Topbar title="Reviews" subtitle={`${published} published · ${pending} pending`} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs text-clay/80">
                Run <code className="font-mono-num">database/004_portal_payments_reviews.sql</code> in Supabase.
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard
            label="Average rating"
            value={reviews.length ? avgRating.toFixed(1) : '—'}
            ticketNo="AVG"
            accent="brass"
          />
          <StatCard label="Published" value={String(published)} ticketNo="PUB" accent="sage" />
          <StatCard label="Pending review" value={String(pending)} ticketNo="NEW" accent="brass" />
        </div>

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1">
            {(['all', 'pending', 'published', 'hidden'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${
                  filter === f ? 'bg-sage-deep text-white' : 'text-slate hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button variant="secondary" onClick={copyPublicReviewLink}>
            {copied ? 'Link copied!' : 'Copy public review link'}
          </Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Rating</th>
                <th className="px-5 py-3 font-medium">Review</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate">Loading…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate">
                    No reviews yet. Share the public review link after a job.
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 font-mono-num">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {r.customer_name}
                    {r.is_featured && (
                      <span className="ml-2 text-[10px] uppercase tracking-wide text-brass font-semibold">
                        Featured
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-brass text-sm">{'★'.repeat(r.rating)}</td>
                  <td className="px-5 py-3 text-slate max-w-[220px]">
                    {r.title && <div className="font-medium text-ink text-xs mb-0.5">{r.title}</div>}
                    <div className="truncate">{r.body || '—'}</div>
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {r.status === 'pending' && (
                      <button
                        onClick={() => setStatus(r.id, 'published')}
                        className="text-xs font-medium text-sage-deep hover:underline mr-3"
                      >
                        Publish
                      </button>
                    )}
                    {r.status === 'published' && (
                      <button
                        onClick={() => setStatus(r.id, 'hidden')}
                        className="text-xs font-medium text-slate hover:underline mr-3"
                      >
                        Hide
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setSelected(r)
                        setReply(r.admin_reply ?? '')
                      }}
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                    >
                      Open
                    </button>
                    <button onClick={() => handleDelete(r)} className="text-xs font-medium text-clay hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>

      {selected && (
        <Modal title={`Review from ${selected.customer_name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <div className="text-brass text-lg">{'★'.repeat(selected.rating)}{'☆'.repeat(5 - selected.rating)}</div>
            {selected.title && <p className="font-medium text-ink">{selected.title}</p>}
            <p className="text-slate">{selected.body || 'No written review.'}</p>
            <p className="text-xs text-slate">
              {format(new Date(selected.created_at), 'MMM d, yyyy h:mm a')} · {selected.status}
            </p>

            <div className="flex flex-wrap gap-2">
              {selected.status !== 'published' && (
                <Button variant="secondary" onClick={() => setStatus(selected.id, 'published')}>
                  Publish
                </Button>
              )}
              {selected.status === 'published' && (
                <Button variant="secondary" onClick={() => setStatus(selected.id, 'hidden')}>
                  Hide
                </Button>
              )}
              <Button variant="ghost" onClick={() => toggleFeatured(selected)}>
                {selected.is_featured ? 'Unfeature' : 'Feature'}
              </Button>
            </div>

            <Field label="Public reply">
              <Textarea value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Thank the customer…" />
            </Field>
            <div className="flex justify-end">
              <Button onClick={saveReply} disabled={saving}>
                {saving ? 'Saving…' : 'Save reply'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Textarea, Select } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import type { QuoteRequest, QuoteRequestStatus } from '../types'

const statusStyles: Record<QuoteRequestStatus, string> = {
  new: 'bg-brass/10 text-brass',
  reviewed: 'bg-line text-slate',
  quoted: 'bg-sage/10 text-sage-deep',
  declined: 'bg-clay/10 text-clay',
  converted: 'bg-sage/10 text-sage-deep',
}

type QuoteRequestRow = QuoteRequest & {
  businesses?: { name: string } | null
}

export default function QuoteRequests() {
  const [items, setItems] = useState<QuoteRequestRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | QuoteRequestStatus>('all')
  const [selected, setSelected] = useState<QuoteRequest | null>(null)
  const [adminNotes, setAdminNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('quote_requests')
      .select('*, businesses(name)')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return items
    return items.filter((i) => i.status === filter)
  }, [items, filter])

  const newCount = items.filter((i) => i.status === 'new').length

  async function updateStatus(id: string, status: QuoteRequestStatus) {
    const { error } = await supabase.from('quote_requests').update({ status }).eq('id', id)
    if (error) setError(error.message)
    else {
      setItems((list) => list.map((i) => (i.id === id ? { ...i, status } : i)))
      if (selected?.id === id) setSelected((s) => (s ? { ...s, status } : s))
    }
  }

  async function saveNotes() {
    if (!selected) return
    setSaving(true)
    const { error } = await supabase
      .from('quote_requests')
      .update({ admin_notes: adminNotes })
      .eq('id', selected.id)
    if (error) setError(error.message)
    else {
      setItems((list) =>
        list.map((i) => (i.id === selected.id ? { ...i, admin_notes: adminNotes } : i))
      )
      setSelected((s) => (s ? { ...s, admin_notes: adminNotes } : s))
    }
    setSaving(false)
  }

  async function convertToCustomer(req: QuoteRequest) {
    if (!confirm(`Create a customer record for ${req.first_name} ${req.last_name}?`)) return
    const { data, error } = await supabase
      .from('customers')
      .insert({
        first_name: req.first_name,
        last_name: req.last_name,
        email: req.email,
        phone: req.phone,
        address: req.address,
        city: req.city,
        zip: req.zip,
        square_footage: req.square_footage,
        bedrooms: req.bedrooms,
        bathrooms: req.bathrooms,
        cleaning_frequency: req.frequency,
        notes: req.message,
      })
      .select('id')
      .single()
    if (error) {
      setError(error.message)
      return
    }
    await updateStatus(req.id, 'converted')
    alert(`Customer created (id ${data.id.slice(0, 8)}…). You can now build a quote on the Quotes page.`)
  }

  return (
    <>
      <Topbar title="Quote requests" subtitle={`${newCount} new · ${items.length} total`} />
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

        <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1 mb-5 w-fit flex-wrap">
          {(['all', 'new', 'reviewed', 'quoted', 'converted', 'declined'] as const).map((f) => (
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

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Received</th>
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Business</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Service</th>
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
                    {items.length === 0
                      ? 'No online quote requests yet. Share /request-quote with prospects.'
                      : 'No requests match this filter.'}
                  </td>
                </tr>
              )}
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                  <td className="px-5 py-3 font-mono-num text-ink">
                    {format(new Date(r.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3 font-medium text-ink">
                    {r.first_name} {r.last_name}
                  </td>
                  <td className="px-5 py-3 text-slate">
                    {r.businesses?.name || '—'}
                  </td>
                  <td className="px-5 py-3 text-slate">
                    <div>{r.email}</div>
                    <div className="text-xs">{r.phone}</div>
                  </td>
                  <td className="px-5 py-3 text-slate capitalize">
                    {r.service_type.replace(/_/g, ' ')} · {r.frequency.replace('_', ' ')}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[r.status]}`}>
                      {r.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right">
                    <button
                      onClick={() => {
                        setSelected(r)
                        setAdminNotes(r.admin_notes ?? '')
                      }}
                      className="text-xs font-medium text-sage-deep hover:underline"
                    >
                      Open
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>

      {selected && (
        <Modal title={`${selected.first_name} ${selected.last_name}`} onClose={() => setSelected(null)}>
          <div className="space-y-4 text-sm">
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <dt className="text-xs text-slate uppercase">Business</dt>
                <dd>{selected.businesses?.name || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate uppercase">Email</dt>
                <dd>{selected.email}</dd>
              </div>
              <div>
                <dt className="text-xs text-slate uppercase">Phone</dt>
                <dd>{selected.phone || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate uppercase">Address</dt>
                <dd>
                  {[selected.address, selected.city, selected.zip].filter(Boolean).join(', ') || '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate uppercase">Home</dt>
                <dd>
                  {selected.square_footage ?? '—'} sqft · {selected.bedrooms ?? '—'} bed ·{' '}
                  {selected.bathrooms ?? '—'} bath
                </dd>
              </div>
              <div>
                <dt className="text-xs text-slate uppercase">Preferred date</dt>
                <dd>{selected.preferred_date || '—'}</dd>
              </div>
              <div className="col-span-2">
                <dt className="text-xs text-slate uppercase">Message</dt>
                <dd className="text-slate">{selected.message || '—'}</dd>
              </div>
            </dl>

            <Field label="Status">
              <Select
                value={selected.status}
                onChange={(e) => updateStatus(selected.id, e.target.value as QuoteRequestStatus)}
              >
                <option value="new">New</option>
                <option value="reviewed">Reviewed</option>
                <option value="quoted">Quoted</option>
                <option value="converted">Converted</option>
                <option value="declined">Declined</option>
              </Select>
            </Field>

            <Field label="Admin notes">
              <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} />
            </Field>

            <div className="flex flex-wrap justify-end gap-2 pt-2">
              <Button variant="secondary" onClick={saveNotes} disabled={saving}>
                {saving ? 'Saving…' : 'Save notes'}
              </Button>
              {selected.status !== 'converted' && (
                <Button onClick={() => convertToCustomer(selected)}>Convert to customer</Button>
              )}
            </div>
          </div>
        </Modal>
      )}
    </>
  )
}

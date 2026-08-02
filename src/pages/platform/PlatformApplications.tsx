import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { Field, Input, Textarea } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import type { BusinessApplication } from '../../types'

const DEFAULT_TERMS = `TidyLedger Platform Commission Terms

1. Platform fee: a percentage of paid job revenue processed through TidyLedger.
2. Commission is calculated on jobs marked paid within each billing period.
3. Invoices are issued monthly; payment due within 15 days.
4. The business remains responsible for employee payroll, taxes, and insurance.
5. Either party may terminate with 30 days written notice; outstanding commissions remain due.

By accepting, the business agrees to these terms.`

export default function PlatformApplications() {
  const [apps, setApps] = useState<BusinessApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<BusinessApplication | null>(null)
  const [rate, setRate] = useState('8')
  const [terms, setTerms] = useState(DEFAULT_TERMS)
  const [notes, setNotes] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    const { data, error } = await supabase
      .from('business_applications')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) setError(error.message)
    setApps((data as BusinessApplication[]) ?? [])
    setLoading(false)
  }

  function openReview(app: BusinessApplication) {
    setSelected(app)
    setRate(String(app.commission_rate_pct ?? 8))
    setTerms(app.commission_terms || DEFAULT_TERMS)
    setNotes(app.review_notes || '')
  }

  async function act(action: 'approve' | 'deny' | 'send_terms') {
    if (!selected) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('review_business_application', {
      p_application_id: selected.id,
      p_action: action,
      p_commission_rate_pct: Number(rate) || 8,
      p_commission_terms: terms,
      p_review_notes: notes || null,
    })
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    setSelected(null)
    await load()
  }

  return (
    <>
      <Topbar title="Business applications" subtitle="Approve, deny, or send commission terms" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">{error}</div>
        )}

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Contact</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Submitted</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate">Loading…</td></tr>
                )}
                {!loading && apps.length === 0 && (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate">No applications yet.</td></tr>
                )}
                {apps.map((app) => (
                  <tr key={app.id} className="border-b border-line/70 hover:bg-paper/50">
                    <td className="px-4 py-3 font-medium text-ink">{app.business_name}</td>
                    <td className="px-4 py-3 text-slate">
                      {app.contact_name}
                      <br />
                      <span className="text-xs">{app.contact_email}</span>
                    </td>
                    <td className="px-4 py-3 capitalize">{app.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate">{format(new Date(app.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        className="text-xs font-medium text-sage-deep hover:underline"
                        onClick={() => openReview(app)}
                      >
                        Review
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Review application">
        {selected && (
          <div className="space-y-4">
            <div className="text-sm">
              <p className="font-medium text-ink">{selected.business_name}</p>
              <p className="text-slate">{selected.contact_name} · {selected.contact_email}</p>
              {selected.message && <p className="text-slate mt-2 text-xs">{selected.message}</p>}
            </div>
            <Field label="Commission rate %">
              <Input type="number" step="0.1" min="0" value={rate} onChange={(e) => setRate(e.target.value)} />
            </Field>
            <Field label="Commission terms">
              <Textarea rows={8} value={terms} onChange={(e) => setTerms(e.target.value)} />
            </Field>
            <Field label="Internal notes">
              <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="flex flex-wrap gap-2 justify-end">
              <Button type="button" variant="danger" disabled={busy} onClick={() => act('deny')}>
                Deny
              </Button>
              <Button type="button" variant="secondary" disabled={busy} onClick={() => act('send_terms')}>
                Send terms
              </Button>
              <Button type="button" disabled={busy} onClick={() => act('approve')}>
                Approve
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  )
}

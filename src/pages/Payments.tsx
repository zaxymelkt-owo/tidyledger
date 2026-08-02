import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import { Field, Input, Select, Textarea } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import type { Customer, Job, Payment, PaymentFormInput, PaymentStatus } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; payment: Payment } | null

const statusStyles: Record<PaymentStatus, string> = {
  pending: 'bg-brass/10 text-brass',
  processing: 'bg-line text-slate',
  succeeded: 'bg-sage/10 text-sage-deep',
  failed: 'bg-clay/10 text-clay',
  refunded: 'bg-line text-slate',
}

function emptyForm(): PaymentFormInput {
  return {
    customer_id: null,
    job_id: null,
    amount: 0,
    currency: 'usd',
    status: 'pending',
    method: 'card',
    reference: null,
    payer_name: null,
    payer_email: null,
    description: '',
  }
}

export default function Payments() {
  const [payments, setPayments] = useState<Payment[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [jobs, setJobs] = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | PaymentStatus>('all')
  const [modal, setModal] = useState<ModalState>(null)
  const [form, setForm] = useState<PaymentFormInput>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    const [payRes, custRes, jobsRes] = await Promise.all([
      supabase.from('payments').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('last_name'),
      supabase.from('jobs').select('*').order('job_date', { ascending: false }),
    ])
    if (payRes.error) setError(payRes.error.message)
    else setPayments(payRes.data ?? [])
    setCustomers(custRes.data ?? [])
    setJobs(jobsRes.data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return payments
    return payments.filter((p) => p.status === filter)
  }, [payments, filter])

  const succeededTotal = payments
    .filter((p) => p.status === 'succeeded')
    .reduce((s, p) => s + p.amount, 0)
  const pendingTotal = payments
    .filter((p) => p.status === 'pending')
    .reduce((s, p) => s + p.amount, 0)

  function openAdd() {
    setForm(emptyForm())
    setModal({ mode: 'add' })
  }

  function openEdit(p: Payment) {
    setForm({
      customer_id: p.customer_id,
      job_id: p.job_id,
      amount: p.amount,
      currency: p.currency,
      status: p.status,
      method: p.method,
      reference: p.reference,
      payer_name: p.payer_name,
      payer_email: p.payer_email,
      description: p.description,
    })
    setModal({ mode: 'edit', payment: p })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const payload = {
        ...form,
        customer_id: form.customer_id || null,
        job_id: form.job_id || null,
        amount: Number(form.amount),
      }
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('payments').update(payload).eq('id', modal.payment.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('payments').insert(payload)
        if (error) throw error
      }
      setModal(null)
      await loadAll()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save payment.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(p: Payment) {
    if (!confirm('Delete this payment record?')) return
    const { error } = await supabase.from('payments').delete().eq('id', p.id)
    if (error) setError(error.message)
    else setPayments((list) => list.filter((x) => x.id !== p.id))
  }

  function copyPayLink(p: Payment) {
    if (!p.access_token) return
    const base = window.location.origin + (import.meta.env.BASE_URL || '/').replace(/\/$/, '')
    const url = `${base}/pay/${p.access_token}`
    navigator.clipboard.writeText(url)
    setCopiedId(p.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <>
      <Topbar title="Payments" subtitle={`${payments.length} records`} />
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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8">
          <StatCard
            label="Collected"
            value={`$${succeededTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            ticketNo="PAID"
            accent="sage"
          />
          <StatCard
            label="Outstanding"
            value={`$${pendingTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}`}
            ticketNo="DUE"
            accent="brass"
          />
        </div>

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1 flex-wrap">
            {(['all', 'pending', 'succeeded', 'failed', 'refunded'] as const).map((f) => (
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
          <Button onClick={openAdd}>+ Create payment link</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Created</th>
                <th className="px-5 py-3 font-medium">Payer</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
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
                    No payments yet — create a payment link. Customers pay via Stripe Checkout.
                  </td>
                </tr>
              )}
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0 hover:bg-paper/60">
                  <td className="px-5 py-3 font-mono-num">
                    {format(new Date(p.created_at), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3">
                    <div className="font-medium text-ink">{p.payer_name || '—'}</div>
                    <div className="text-xs text-slate">{p.payer_email}</div>
                  </td>
                  <td className="px-5 py-3 text-slate max-w-[180px] truncate">{p.description || '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[p.status]}`}>
                      {p.status}
                    </span>
                    {p.stripe_checkout_session_id && (
                      <div className="text-[10px] text-slate mt-0.5 font-mono-num truncate max-w-[120px]" title={p.stripe_checkout_session_id}>
                        Stripe
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right font-mono-num font-medium">
                    ${p.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    {p.access_token && p.status === 'pending' && (
                      <button
                        onClick={() => copyPayLink(p)}
                        className="text-xs font-medium text-sage-deep hover:underline mr-3"
                      >
                        {copiedId === p.id ? 'Copied!' : 'Copy link'}
                      </button>
                    )}
                    <button onClick={() => openEdit(p)} className="text-xs font-medium text-sage-deep hover:underline mr-3">
                      Edit
                    </button>
                    <button onClick={() => handleDelete(p)} className="text-xs font-medium text-clay hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit payment' : 'Create payment link'} onClose={() => setModal(null)}>
          <form onSubmit={handleSave} className="space-y-4">
            <Field label="Customer">
              <Select
                value={form.customer_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null
                  const c = customers.find((x) => x.id === id)
                  setForm((f) => ({
                    ...f,
                    customer_id: id,
                    payer_name: c ? `${c.first_name} ${c.last_name}` : f.payer_name,
                    payer_email: c?.email ?? f.payer_email,
                  }))
                }}
              >
                <option value="">— Optional —</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.first_name} {c.last_name}
                  </option>
                ))}
              </Select>
            </Field>

            <Field label="Linked job">
              <Select
                value={form.job_id ?? ''}
                onChange={(e) => {
                  const id = e.target.value || null
                  const j = jobs.find((x) => x.id === id)
                  setForm((f) => ({
                    ...f,
                    job_id: id,
                    amount: j?.price ?? f.amount,
                    description: j?.service ? `${j.service} (${j.job_date})` : f.description,
                  }))
                }}
              >
                <option value="">— Optional —</option>
                {jobs
                  .filter((j) => !form.customer_id || j.customer_id === form.customer_id)
                  .map((j) => (
                    <option key={j.id} value={j.id}>
                      {j.job_date} · {j.service || 'Job'} · ${j.price ?? 0}
                    </option>
                  ))}
              </Select>
            </Field>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Amount ($)">
                <Input
                  type="number"
                  step="0.01"
                  required
                  min="0.01"
                  value={form.amount || ''}
                  onChange={(e) => setForm((f) => ({ ...f, amount: Number(e.target.value) }))}
                />
              </Field>
              <Field label="Status">
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as PaymentStatus }))}
                >
                  <option value="pending">Pending</option>
                  <option value="processing">Processing</option>
                  <option value="succeeded">Succeeded</option>
                  <option value="failed">Failed</option>
                  <option value="refunded">Refunded</option>
                </Select>
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Field label="Payer name">
                <Input
                  value={form.payer_name ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, payer_name: e.target.value }))}
                />
              </Field>
              <Field label="Payer email">
                <Input
                  type="email"
                  value={form.payer_email ?? ''}
                  onChange={(e) => setForm((f) => ({ ...f, payer_email: e.target.value }))}
                />
              </Field>
            </div>

            <Field label="Description">
              <Textarea
                value={form.description ?? ''}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </Field>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={() => setModal(null)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? 'Saving…' : modal.mode === 'edit' ? 'Save' : 'Create link'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import { format, addDays } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import type {
  Customer,
  Quote,
  QuoteFormInput,
  QuoteFrequency,
  QuoteStatus,
  ServiceType,
} from '../types'

// Pricing engine — tunable rates for a typical residential cleaning business
const BASE_RATES: Record<ServiceType, number> = {
  standard: 0.12,           // per sq ft
  deep: 0.20,
  move_in_out: 0.25,
  post_construction: 0.30,
  airbnb: 0.15,
}

const BEDROOM_ADDON = 15
const BATHROOM_ADDON = 25
const FREQUENCY_DISCOUNT: Record<QuoteFrequency, number> = {
  one_time: 0,
  weekly: 15,
  biweekly: 10,
  monthly: 5,
}

const ADDONS = [
  { id: 'fridge', label: 'Inside fridge', price: 40 },
  { id: 'oven', label: 'Inside oven', price: 35 },
  { id: 'windows', label: 'Interior windows', price: 50 },
  { id: 'cabinets', label: 'Inside cabinets', price: 45 },
  { id: 'laundry', label: 'Laundry (per load)', price: 20 },
  { id: 'pets', label: 'Pet hair deep clean', price: 30 },
]

type ModalState = { mode: 'view'; quote: Quote } | null

function calculateQuote(input: {
  square_footage: number
  bedrooms: number
  bathrooms: number
  service_type: ServiceType
  frequency: QuoteFrequency
  selectedAddons: string[]
  discount_pct: number
}) {
  const base = (input.square_footage || 0) * BASE_RATES[input.service_type]
  const roomAddons =
    (input.bedrooms || 0) * BEDROOM_ADDON + (input.bathrooms || 0) * BATHROOM_ADDON
  const addonsTotal = ADDONS.filter((a) => input.selectedAddons.includes(a.id)).reduce(
    (s, a) => s + a.price,
    0
  )
  const subtotal = base + roomAddons + addonsTotal
  const freqDiscount = FREQUENCY_DISCOUNT[input.frequency]
  const extraDiscount = input.discount_pct || 0
  const totalDiscountPct = Math.min(freqDiscount + extraDiscount, 40)
  const total = Math.round(subtotal * (1 - totalDiscountPct / 100) * 100) / 100
  return {
    base_rate: Math.round(base * 100) / 100,
    addons_total: Math.round((roomAddons + addonsTotal) * 100) / 100,
    discount_pct: totalDiscountPct,
    total,
  }
}

const statusStyles: Record<QuoteStatus, string> = {
  draft: 'bg-line text-slate',
  sent: 'bg-brass/10 text-brass',
  accepted: 'bg-sage/10 text-sage-deep',
  declined: 'bg-clay/10 text-clay',
  expired: 'bg-line text-slate',
}

export default function Quotes() {
  const [quotes, setQuotes] = useState<Quote[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)
  const [showCalculator, setShowCalculator] = useState(true)

  // Calculator state
  const [sqft, setSqft] = useState(1500)
  const [bedrooms, setBedrooms] = useState(3)
  const [bathrooms, setBathrooms] = useState(2)
  const [serviceType, setServiceType] = useState<ServiceType>('standard')
  const [frequency, setFrequency] = useState<QuoteFrequency>('one_time')
  const [selectedAddons, setSelectedAddons] = useState<string[]>([])
  const [extraDiscount, setExtraDiscount] = useState(0)
  const [customerId, setCustomerId] = useState('')
  const [customerName, setCustomerName] = useState('')
  const [notes, setNotes] = useState('')

  useEffect(() => {
    loadAll()
  }, [])

  async function loadAll() {
    setLoading(true)
    setError(null)
    const [quotesRes, customersRes] = await Promise.all([
      supabase.from('quotes').select('*').order('created_at', { ascending: false }),
      supabase.from('customers').select('*').order('last_name', { ascending: true }),
    ])
    if (quotesRes.error) setError(quotesRes.error.message)
    else setQuotes(quotesRes.data ?? [])
    setCustomers(customersRes.data ?? [])
    setLoading(false)
  }

  const calc = useMemo(
    () =>
      calculateQuote({
        square_footage: sqft,
        bedrooms,
        bathrooms,
        service_type: serviceType,
        frequency,
        selectedAddons,
        discount_pct: extraDiscount,
      }),
    [sqft, bedrooms, bathrooms, serviceType, frequency, selectedAddons, extraDiscount]
  )

  function toggleAddon(id: string) {
    setSelectedAddons((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  function fillFromCustomer(id: string) {
    setCustomerId(id)
    const c = customers.find((x) => x.id === id)
    if (c) {
      setCustomerName(`${c.first_name} ${c.last_name}`)
      if (c.square_footage) setSqft(c.square_footage)
      if (c.bedrooms) setBedrooms(c.bedrooms)
      if (c.bathrooms) setBathrooms(c.bathrooms)
      if (c.cleaning_frequency) {
        const f = c.cleaning_frequency as QuoteFrequency
        if (['one_time', 'weekly', 'biweekly', 'monthly'].includes(f)) setFrequency(f)
      }
    }
  }

  async function saveQuote(status: QuoteStatus = 'draft') {
    setSubmitting(true)
    setError(null)
    try {
      const payload: QuoteFormInput = {
        customer_id: customerId || null,
        customer_name: customerName || null,
        square_footage: sqft,
        bedrooms,
        bathrooms,
        service_type: serviceType,
        frequency,
        base_rate: calc.base_rate,
        addons_total: calc.addons_total,
        discount_pct: calc.discount_pct,
        total: calc.total,
        status,
        valid_until: format(addDays(new Date(), 30), 'yyyy-MM-dd'),
        notes: notes || null,
      }
      const { error } = await supabase.from('quotes').insert(payload)
      if (error) throw error
      await loadAll()
      setShowCalculator(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save quote.')
    } finally {
      setSubmitting(false)
    }
  }

  async function updateStatus(quote: Quote, status: QuoteStatus) {
    const { error } = await supabase.from('quotes').update({ status }).eq('id', quote.id)
    if (error) setError(error.message)
    else setQuotes((qs) => qs.map((q) => (q.id === quote.id ? { ...q, status } : q)))
  }

  async function handleDelete(quote: Quote) {
    if (!confirm('Delete this quote?')) return
    const { error } = await supabase.from('quotes').delete().eq('id', quote.id)
    if (error) setError(error.message)
    else setQuotes((qs) => qs.filter((q) => q.id !== quote.id))
  }

  return (
    <>
      <Topbar title="Quote Calculator" subtitle={`${quotes.length} saved quotes`} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs text-clay/80">
                Have you run <code className="font-mono-num">database/003_new_modules.sql</code> in your Supabase project?
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5">
          <h2 className="text-sm font-medium text-slate uppercase tracking-wide">
            {showCalculator ? 'Build a quote' : 'Saved quotes'}
          </h2>
          <Button
            variant={showCalculator ? 'secondary' : 'primary'}
            onClick={() => setShowCalculator((v) => !v)}
          >
            {showCalculator ? 'View saved quotes' : '+ New quote'}
          </Button>
        </div>

        {showCalculator && (
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
            {/* Inputs */}
            <div className="lg:col-span-3 ticket-card p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Link customer (optional)">
                  <Select value={customerId} onChange={(e) => fillFromCustomer(e.target.value)}>
                    <option value="">— Walk-in / new —</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.first_name} {c.last_name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Customer name">
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Name for the quote" />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Sq. footage">
                  <Input type="number" value={sqft} onChange={(e) => setSqft(Number(e.target.value))} />
                </Field>
                <Field label="Bedrooms">
                  <Input type="number" value={bedrooms} onChange={(e) => setBedrooms(Number(e.target.value))} />
                </Field>
                <Field label="Bathrooms">
                  <Input type="number" step="0.5" value={bathrooms} onChange={(e) => setBathrooms(Number(e.target.value))} />
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Service type">
                  <Select value={serviceType} onChange={(e) => setServiceType(e.target.value as ServiceType)}>
                    <option value="standard">Standard clean</option>
                    <option value="deep">Deep clean</option>
                    <option value="move_in_out">Move-in / Move-out</option>
                    <option value="post_construction">Post-construction</option>
                    <option value="airbnb">Airbnb turnover</option>
                  </Select>
                </Field>
                <Field label="Frequency">
                  <Select value={frequency} onChange={(e) => setFrequency(e.target.value as QuoteFrequency)}>
                    <option value="one_time">One-time</option>
                    <option value="weekly">Weekly (−15%)</option>
                    <option value="biweekly">Biweekly (−10%)</option>
                    <option value="monthly">Monthly (−5%)</option>
                  </Select>
                </Field>
              </div>

              <div>
                <span className="block text-xs font-medium uppercase tracking-wide text-slate mb-2">Add-ons</span>
                <div className="grid grid-cols-2 gap-2">
                  {ADDONS.map((a) => (
                    <label
                      key={a.id}
                      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm cursor-pointer transition-colors ${
                        selectedAddons.includes(a.id)
                          ? 'border-sage bg-sage/5 text-sage-deep'
                          : 'border-line hover:border-sage/40'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedAddons.includes(a.id)}
                        onChange={() => toggleAddon(a.id)}
                        className="accent-sage-deep"
                      />
                      <span className="flex-1">{a.label}</span>
                      <span className="font-mono-num text-xs">${a.price}</span>
                    </label>
                  ))}
                </div>
              </div>

              <Field label="Extra discount (%)">
                <Input
                  type="number"
                  min={0}
                  max={25}
                  value={extraDiscount}
                  onChange={(e) => setExtraDiscount(Number(e.target.value))}
                />
              </Field>

              <Field label="Notes">
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Special instructions, access notes…" />
              </Field>
            </div>

            {/* Live total */}
            <div className="lg:col-span-2">
              <div className="ticket-card p-6 sticky top-6">
                <p className="ticket-number mb-1">QUOTE PREVIEW</p>
                <h3 className="font-display text-2xl font-semibold text-ink mb-6">
                  ${calc.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </h3>

                <dl className="space-y-2 text-sm mb-6">
                  <div className="flex justify-between">
                    <dt className="text-slate">Base ({sqft} sq ft × ${BASE_RATES[serviceType]})</dt>
                    <dd className="font-mono-num">${calc.base_rate.toFixed(2)}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate">Rooms & add-ons</dt>
                    <dd className="font-mono-num">${calc.addons_total.toFixed(2)}</dd>
                  </div>
                  {calc.discount_pct > 0 && (
                    <div className="flex justify-between text-sage-deep">
                      <dt>Discount ({calc.discount_pct}%)</dt>
                      <dd className="font-mono-num">
                        −${((calc.base_rate + calc.addons_total) * calc.discount_pct / 100).toFixed(2)}
                      </dd>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-line pt-2 font-semibold text-ink">
                    <dt>Total</dt>
                    <dd className="font-mono-num text-lg">${calc.total.toFixed(2)}</dd>
                  </div>
                </dl>

                <div className="flex flex-col gap-2">
                  <Button onClick={() => saveQuote('draft')} disabled={submitting}>
                    {submitting ? 'Saving…' : 'Save as draft'}
                  </Button>
                  <Button variant="secondary" onClick={() => saveQuote('sent')} disabled={submitting}>
                    Save & mark sent
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {!showCalculator && (
          <div className="ticket-card overflow-hidden">
            <div className="table-scroll"><table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Customer</th>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium"></th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate">Loading quotes…</td>
                  </tr>
                )}
                {!loading && quotes.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-slate">
                      No saved quotes yet — build one with the calculator.
                    </td>
                  </tr>
                )}
                {quotes.map((q) => (
                  <tr key={q.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                    <td className="px-5 py-3 font-mono-num text-ink">
                      {format(new Date(q.created_at), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3 font-medium text-ink">{q.customer_name || '—'}</td>
                    <td className="px-5 py-3 text-slate capitalize">
                      {q.service_type.replace(/_/g, ' ')} · {q.frequency.replace('_', ' ')}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[q.status]}`}>
                        {q.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-mono-num text-ink font-medium">
                      ${q.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      {q.status === 'draft' && (
                        <button
                          onClick={() => updateStatus(q, 'sent')}
                          className="text-xs font-medium text-sage-deep hover:underline mr-3"
                        >
                          Mark sent
                        </button>
                      )}
                      {q.status === 'sent' && (
                        <>
                          <button
                            onClick={() => updateStatus(q, 'accepted')}
                            className="text-xs font-medium text-sage-deep hover:underline mr-3"
                          >
                            Accept
                          </button>
                          <button
                            onClick={() => updateStatus(q, 'declined')}
                            className="text-xs font-medium text-clay hover:underline mr-3"
                          >
                            Decline
                          </button>
                        </>
                      )}
                      <button onClick={() => handleDelete(q)} className="text-xs font-medium text-clay hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          </div>
        )}
      </main>

      {modal && (
        <Modal title="Quote detail" onClose={() => setModal(null)}>
          <pre className="text-xs">{JSON.stringify(modal.quote, null, 2)}</pre>
        </Modal>
      )}
    </>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Field, Input, Textarea, Select } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import { allowAction, rateLimitMessage } from '../../lib/rateLimit'
import type { QuoteRequestFormInput } from '../../types'
import Seo from '../../components/Seo'

const empty: QuoteRequestFormInput = {
  business_id: null,
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  zip: '',
  square_footage: null,
  bedrooms: null,
  bathrooms: null,
  service_type: 'standard',
  frequency: 'one_time',
  preferred_date: null,
  message: '',
}

export default function RequestQuote() {
  const [form, setForm] = useState<QuoteRequestFormInput>(empty)
  const [businesses, setBusinesses] = useState<Array<{ id: string; name: string }>>([])
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadBusinesses()
  }, [])

  async function loadBusinesses() {
    const { data, error } = await supabase
      .from('businesses')
      .select('id, name')
      .eq('status', 'active')
      .order('name')

    if (!error) setBusinesses((data as Array<{ id: string; name: string }> | null) ?? [])
  }

  function update<K extends keyof QuoteRequestFormInput>(key: K, value: QuoteRequestFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const key = `quote:${(form.email || '').toLowerCase()}`
    if (!allowAction(key, 5, 60 * 60 * 1000)) {
      setError(rateLimitMessage(3600))
      return
    }
    // Server-side helper when 015 is applied
    try {
      const { data: allowed } = await supabase.rpc('check_rate_limit', {
        p_bucket: key,
        p_max: 5,
        p_window_seconds: 3600,
      })
      if (allowed === false) {
        setError(rateLimitMessage(3600))
        return
      }
    } catch { /* optional until migration runs */ }
    setSubmitting(true)
    setError(null)
    try {
      const { error } = await supabase.from('quote_requests').insert({
        ...form,
        preferred_date: form.preferred_date || null,
        square_footage: form.square_footage || null,
        bedrooms: form.bedrooms || null,
        bathrooms: form.bathrooms || null,
      })
      if (error) throw error

      // Best-effort staff notification (Edge Function + Resend)
      if (form.business_id) {
        const { data: biz } = await supabase
          .from('businesses')
          .select('email, name')
          .eq('id', form.business_id)
          .maybeSingle()
        if (biz?.email) {
          const { notifyEmail } = await import('../../lib/notify')
          void notifyEmail('quote_request_received', biz.email, {
            name: `${form.first_name} ${form.last_name}`,
            email: form.email,
            service: form.service_type,
            business: biz.name,
          })
        }
      }
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not submit request.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
    <Seo title="Request a quote" description="Request a free housekeeping quote online. Tell us about your home and preferred cleaning schedule." path="/request-quote" />
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line bg-paper-raised">
        <div className="max-w-3xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="font-display font-semibold text-lg text-ink">
            Tidy<span className="text-sage-deep">Ledger</span>
          </span>
          <Link to="/portal" className="text-sm text-slate hover:text-ink">
            Customer portal
          </Link>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        {done ? (
          <div className="ticket-card p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-sage/15 text-sage-deep flex items-center justify-center mx-auto mb-4 text-2xl">✓</div>
            <h1 className="font-display text-2xl font-semibold text-ink mb-2">Request received</h1>
            <p className="text-slate mb-6">
              Thanks, {form.first_name}! We will review your details and send a personalized quote to{' '}
              <strong className="text-ink">{form.email}</strong> shortly from{' '}
              <strong className="text-ink">{businesses.find((b) => b.id === form.business_id)?.name ?? 'your selected business'}</strong>.
            </p>
            <Button onClick={() => { setDone(false); setForm(empty) }}>Submit another request</Button>
          </div>
        ) : (
          <>
            <div className="mb-8">
              <p className="ticket-number mb-1">ONLINE QUOTE REQUEST</p>
              <h1 className="font-display text-3xl font-semibold text-ink mb-2">Get a free cleaning quote</h1>
              <p className="text-slate">
                Choose the business you want quoted, then tell us about your home and preferred service.
              </p>
            </div>

            {error && (
              <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">{error}</div>
            )}

            <form onSubmit={handleSubmit} className="ticket-card p-6 space-y-5">
              <Field label="Business to quote">
                <Select
                  required
                  value={form.business_id ?? ''}
                  onChange={(e) => update('business_id', e.target.value || null)}
                >
                  <option value="">Select a business…</option>
                  {businesses.map((business) => (
                    <option key={business.id} value={business.id}>
                      {business.name}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First name">
                  <Input required value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
                </Field>
                <Field label="Last name">
                  <Input required value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Email">
                  <Input type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
                </Field>
                <Field label="Phone">
                  <Input value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
                </Field>
              </div>

              <Field label="Street address">
                <Input value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="City">
                  <Input value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} />
                </Field>
                <Field label="ZIP">
                  <Input value={form.zip ?? ''} onChange={(e) => update('zip', e.target.value)} />
                </Field>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <Field label="Sq. footage">
                  <Input
                    type="number"
                    value={form.square_footage ?? ''}
                    onChange={(e) => update('square_footage', e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
                <Field label="Bedrooms">
                  <Input
                    type="number"
                    value={form.bedrooms ?? ''}
                    onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
                <Field label="Bathrooms">
                  <Input
                    type="number"
                    step="0.5"
                    value={form.bathrooms ?? ''}
                    onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : null)}
                  />
                </Field>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Service type">
                  <Select value={form.service_type} onChange={(e) => update('service_type', e.target.value)}>
                    <option value="standard">Standard clean</option>
                    <option value="deep">Deep clean</option>
                    <option value="move_in_out">Move-in / Move-out</option>
                    <option value="post_construction">Post-construction</option>
                    <option value="airbnb">Airbnb turnover</option>
                  </Select>
                </Field>
                <Field label="Frequency">
                  <Select value={form.frequency} onChange={(e) => update('frequency', e.target.value)}>
                    <option value="one_time">One-time</option>
                    <option value="weekly">Weekly</option>
                    <option value="biweekly">Biweekly</option>
                    <option value="monthly">Monthly</option>
                  </Select>
                </Field>
              </div>

              <Field label="Preferred date (optional)">
                <Input
                  type="date"
                  value={form.preferred_date ?? ''}
                  onChange={(e) => update('preferred_date', e.target.value || null)}
                />
              </Field>

              <Field label="Anything else we should know?">
                <Textarea
                  value={form.message ?? ''}
                  onChange={(e) => update('message', e.target.value)}
                  placeholder="Pets, access notes, special requests…"
                />
              </Field>

              <div className="flex justify-end pt-2">
                <Button type="submit" disabled={submitting || businesses.length === 0}>
                  {submitting ? 'Sending…' : 'Request free quote'}
                </Button>
              </div>
            </form>
          </>
        )}
      </main>
    </div>
    </>
  )
}
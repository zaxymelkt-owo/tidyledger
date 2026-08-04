import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { QuotePricingAddon } from '../types'

const defaultBaseRates = {
  standard: '0.12',
  deep: '0.20',
  move_in_out: '0.25',
  post_construction: '0.30',
  airbnb: '0.15',
}

export default function QuoteEstimatorSettings() {
  const { business, isOwnerOrManager, refreshProfile } = useAuth()
  const [baseRates, setBaseRates] = useState(defaultBaseRates)
  const [bedroomAddon, setBedroomAddon] = useState('15')
  const [bathroomAddon, setBathroomAddon] = useState('25')
  const [weeklyDiscount, setWeeklyDiscount] = useState('15')
  const [biweeklyDiscount, setBiweeklyDiscount] = useState('10')
  const [monthlyDiscount, setMonthlyDiscount] = useState('5')
  const [addons, setAddons] = useState<QuotePricingAddon[]>([])
  const [laundryQualityEnabled, setLaundryQualityEnabled] = useState(false)
  const [newLabel, setNewLabel] = useState('')
  const [newPrice, setNewPrice] = useState('0')
  const [newDescription, setNewDescription] = useState('')
  const [newQuantityLabel, setNewQuantityLabel] = useState('')
  const [newQuantityDefault, setNewQuantityDefault] = useState('1')
  const [multipleCharge, setMultipleCharge] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!business?.id) return

    setBaseRates({
      standard: String(business.quote_base_rate_standard ?? defaultBaseRates.standard),
      deep: String(business.quote_base_rate_deep ?? defaultBaseRates.deep),
      move_in_out: String(
        business.quote_base_rate_move_in_out ?? defaultBaseRates.move_in_out
      ),
      post_construction: String(
        business.quote_base_rate_post_construction ?? defaultBaseRates.post_construction
      ),
      airbnb: String(business.quote_base_rate_airbnb ?? defaultBaseRates.airbnb),
    })
    setBedroomAddon(String(business.quote_bedroom_addon ?? '15'))
    setBathroomAddon(String(business.quote_bathroom_addon ?? '25'))
    setWeeklyDiscount(String(business.quote_discount_weekly ?? '15'))
    setBiweeklyDiscount(String(business.quote_discount_biweekly ?? '10'))
    setMonthlyDiscount(String(business.quote_discount_monthly ?? '5'))

    supabase
      .from('quote_pricing_addons')
      .select('*')
      .eq('business_id', business.id)
      .eq('active', true)
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else {
          const activeAddons = (data as QuotePricingAddon[]) ?? []
          setAddons(activeAddons)
          setLaundryQualityEnabled(
            activeAddons.some(
              (item) =>
                item.id === 'laundry_quality' ||
                item.label.toLowerCase() === 'laundry quality (per load)'
            )
          )
        }
      })
  }, [business?.id])

  const hasActiveBusiness = Boolean(business?.id)

  async function savePricing(e: React.FormEvent) {
    e.preventDefault()
    if (!business?.id) return

    setBusy(true)
    setError(null)
    setSaved(false)

    try {
      const { error: businessError } = await supabase
        .from('businesses')
        .update({
          quote_base_rate_standard: Number(baseRates.standard) || 0,
          quote_base_rate_deep: Number(baseRates.deep) || 0,
          quote_base_rate_move_in_out: Number(baseRates.move_in_out) || 0,
          quote_base_rate_post_construction: Number(baseRates.post_construction) || 0,
          quote_base_rate_airbnb: Number(baseRates.airbnb) || 0,
          quote_bedroom_addon: Number(bedroomAddon) || 0,
          quote_bathroom_addon: Number(bathroomAddon) || 0,
          quote_discount_weekly: Number(weeklyDiscount) || 0,
          quote_discount_biweekly: Number(biweeklyDiscount) || 0,
          quote_discount_monthly: Number(monthlyDiscount) || 0,
        })
        .eq('id', business.id)

      if (businessError) throw businessError

      const laundryQualityExisting = addons.find(
        (item) => item.id === 'laundry_quality' || item.label.toLowerCase() === 'laundry quality (per load)'
      )

      const persistedAddons = addons.filter((item) => {
        if (!laundryQualityEnabled && laundryQualityExisting && item.id === laundryQualityExisting.id) {
          return false
        }
        return true
      })

      const updates = persistedAddons.map((item, index) =>
        supabase
          .from('quote_pricing_addons')
          .update({
            label: item.label,
            price: Number(item.price) || 0,
            description: item.description || null,
            sort_order: index,
            active: true,
            is_multiple: Boolean(item.is_multiple),
            quantity_label: item.is_multiple ? item.quantity_label || 'loads' : null,
            quantity_default: item.is_multiple ? Math.max(1, Number(item.quantity_default) || 1) : 1,
          })
          .eq('id', item.id)
      )

      const results = await Promise.all(updates)
      const updateFailure = results.find((result) => result.error)
      if (updateFailure?.error) throw updateFailure.error

      if (laundryQualityEnabled && !laundryQualityExisting) {
        const { data: inserted, error: insertErr } = await supabase
          .from('quote_pricing_addons')
          .insert({
            business_id: business.id,
            label: 'Laundry quality (per load)',
            price: 10,
            description: 'Adds a quality upgrade for laundry loads.',
            sort_order: addons.length,
            active: true,
          })
          .select('*')
          .single()

        if (insertErr) throw insertErr
        setAddons((prev) => [...prev, inserted as QuotePricingAddon])
      }

      if (!laundryQualityEnabled && laundryQualityExisting) {
        const { error: disableErr } = await supabase
          .from('quote_pricing_addons')
          .update({ active: false })
          .eq('id', laundryQualityExisting.id)

        if (disableErr) throw disableErr
        setAddons((prev) => prev.filter((item) => item.id !== laundryQualityExisting.id))
      }

      setSaved(true)
      await refreshProfile()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save pricing settings.')
    } finally {
      setBusy(false)
    }
  }

  async function addAddon() {
    if (!business?.id || !newLabel.trim()) return

    const { data, error } = await supabase
      .from('quote_pricing_addons')
      .insert({
        business_id: business.id,
        label: newLabel.trim(),
        price: Number(newPrice) || 0,
        description: newDescription.trim() || null,
        sort_order: addons.length,
        active: true,
        is_multiple: multipleCharge,
        quantity_label: multipleCharge ? (newQuantityLabel.trim() || 'loads') : null,
        quantity_default: multipleCharge ? Math.max(1, Number(newQuantityDefault) || 1) : 1,
      })
      .select('*')
      .single()

    if (error) {
      setError(error.message)
      return
    }

    setAddons((prev) => [...prev, data as QuotePricingAddon])
    setNewLabel('')
    setNewPrice('0')
    setNewDescription('')
    setNewQuantityLabel('')
    setNewQuantityDefault('1')
    setMultipleCharge(false)
  }

  async function removeAddon(id: string) {
    const { error } = await supabase
      .from('quote_pricing_addons')
      .update({ active: false })
      .eq('id', id)

    if (error) {
      setError(error.message)
      return
    }

    setAddons((prev) => prev.filter((item) => item.id !== id))
  }

  const addonSummary = useMemo(() => {
    return addons.length > 0 ? addons.map((item) => item.label).join(', ') : 'No custom add-ons yet'
  }, [addons])

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Quote estimator pricing" />
        <main className="p-6 text-sm text-slate">
          Only owners and managers can adjust quote estimator pricing.
        </main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Quote estimator pricing" subtitle="Business-wide pricing defaults" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <form onSubmit={savePricing} className="ticket-card max-w-4xl p-6 space-y-6">
          {error && <div className="text-sm text-clay">{error}</div>}
          {saved && <div className="text-sm text-sage-deep">Estimator pricing saved.</div>}

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Base pricing</h2>
              <p className="text-sm text-slate mt-1">
                These values are per-square-foot defaults used by your quote estimator.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-3">
              <Field label="Standard clean / sq ft">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseRates.standard}
                  onChange={(e) => setBaseRates((prev) => ({ ...prev, standard: e.target.value }))}
                />
              </Field>
              <Field label="Deep clean / sq ft">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseRates.deep}
                  onChange={(e) => setBaseRates((prev) => ({ ...prev, deep: e.target.value }))}
                />
              </Field>
              <Field label="Move-in / sq ft">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseRates.move_in_out}
                  onChange={(e) =>
                    setBaseRates((prev) => ({ ...prev, move_in_out: e.target.value }))
                  }
                />
              </Field>
              <Field label="Post-construction / sq ft">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseRates.post_construction}
                  onChange={(e) =>
                    setBaseRates((prev) => ({ ...prev, post_construction: e.target.value }))
                  }
                />
              </Field>
              <Field label="Airbnb / sq ft">
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={baseRates.airbnb}
                  onChange={(e) => setBaseRates((prev) => ({ ...prev, airbnb: e.target.value }))}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Room add-ons</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Bedroom add-on">
                <Input
                  type="number"
                  min="0"
                  value={bedroomAddon}
                  onChange={(e) => setBedroomAddon(e.target.value)}
                />
              </Field>
              <Field label="Bathroom add-on">
                <Input
                  type="number"
                  min="0"
                  value={bathroomAddon}
                  onChange={(e) => setBathroomAddon(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div>
              <h2 className="font-display text-xl font-semibold text-ink">Frequency discounts</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Weekly discount (%)">
                <Input
                  type="number"
                  min="0"
                  max="40"
                  value={weeklyDiscount}
                  onChange={(e) => setWeeklyDiscount(e.target.value)}
                />
              </Field>
              <Field label="Biweekly discount (%)">
                <Input
                  type="number"
                  min="0"
                  max="40"
                  value={biweeklyDiscount}
                  onChange={(e) => setBiweeklyDiscount(e.target.value)}
                />
              </Field>
              <Field label="Monthly discount (%)">
                <Input
                  type="number"
                  min="0"
                  max="40"
                  value={monthlyDiscount}
                  onChange={(e) => setMonthlyDiscount(e.target.value)}
                />
              </Field>
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-semibold text-ink">Custom add-ons</h2>
                <p className="text-sm text-slate mt-1">{addonSummary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Add-on name">
                <Input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} />
              </Field>
              <Field label="Price">
                <Input type="number" min="0" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
              </Field>
              <Field label="Description">
                <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} />
              </Field>
            </div>

            <label className="flex items-center justify-between gap-3 rounded-xl border border-line bg-paper px-3 py-3 text-sm">
              <div>
                <p className="font-medium text-ink">Charge multiple times</p>
                <p className="text-xs text-slate">Enable quantity-based billing so the estimator multiplies the price by the chosen count.</p>
              </div>
              <input
                type="checkbox"
                checked={multipleCharge}
                onChange={(e) => setMultipleCharge(e.target.checked)}
                className="accent-sage-deep h-4 w-4"
              />
            </label>

            {multipleCharge && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Field label="Quantity label">
                  <Input value={newQuantityLabel} onChange={(e) => setNewQuantityLabel(e.target.value)} placeholder="loads" />
                </Field>
                <Field label="Default quantity">
                  <Input type="number" min="1" value={newQuantityDefault} onChange={(e) => setNewQuantityDefault(e.target.value)} />
                </Field>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={addAddon} disabled={!hasActiveBusiness || !newLabel.trim()}>
                Add add-on
              </Button>
            </div>

            <div className="space-y-2">
              {addons.map((item) => (
                <div key={item.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2 rounded-lg border border-line px-3 py-2">
                  <div>
                    <p className="font-medium text-ink">{item.label}</p>
                    <p className="text-xs text-slate">${Number(item.price).toFixed(2)}{item.description ? ` · ${item.description}` : ''}</p>
                  </div>
                  <Button type="button" variant="secondary" onClick={() => removeAddon(item.id)}>
                    Remove
                  </Button>
                </div>
              ))}
              {addons.length === 0 && (
                <p className="text-sm text-slate">No custom add-ons have been created for this business yet.</p>
              )}
            </div>
          </section>

          <div className="flex justify-end">
            <Button type="submit" disabled={busy || !hasActiveBusiness}>
              {busy ? 'Saving…' : 'Save estimator settings'}
            </Button>
          </div>
        </form>
      </main>
    </>
  )
}

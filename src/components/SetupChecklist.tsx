import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

type Step = {
  id: string
  label: string
  done: boolean
  to: string
  hint: string
}

/** First-run checklist for owners/managers. */
export default function SetupChecklist() {
  const { isOwnerOrManager, business } = useAuth()
  const [hasAddons, setHasAddons] = useState(false)
  const [hasInvite, setHasInvite] = useState(false)
  const [hasCustomer, setHasCustomer] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!business?.id || !isOwnerOrManager) return
    let cancelled = false
    ;(async () => {
      const [addons, invites, customers] = await Promise.all([
        supabase
          .from('quote_pricing_addons')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id)
          .eq('active', true),
        supabase
          .from('staff_invites')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('business_id', business.id),
      ])
      if (cancelled) return
      setHasAddons((addons.count ?? 0) > 0)
      setHasInvite((invites.count ?? 0) > 0)
      setHasCustomer((customers.count ?? 0) > 0)
      setLoaded(true)
    })()
    return () => {
      cancelled = true
    }
  }, [business?.id, isOwnerOrManager])

  if (!isOwnerOrManager || !loaded) return null

  const hasPricing =
    hasAddons ||
    business?.quote_base_rate_standard != null ||
    business?.quote_bedroom_addon != null

  const steps: Step[] = [
    {
      id: 'pricing',
      label: 'Set quote pricing',
      done: Boolean(hasPricing),
      to: '/quote-estimator-settings',
      hint: 'Base rates, room add-ons, and custom add-ons',
    },
    {
      id: 'team',
      label: 'Invite your team',
      done: hasInvite,
      to: '/team',
      hint: 'Managers and employees via invite link',
    },
    {
      id: 'customer',
      label: 'Add a customer',
      done: hasCustomer,
      to: '/customers',
      hint: 'Enable portal code when they are ready',
    },
    {
      id: 'theme',
      label: 'Pick a theme',
      done: Boolean(business?.dashboard_theme_mode),
      to: '/theme-settings',
      hint: 'Light/dark and color scheme',
    },
  ]

  const remaining = steps.filter((s) => !s.done)
  if (remaining.length === 0) return null

  return (
    <div className="ticket-card p-5 sm:p-6">
      <p className="ticket-number mb-1">GETTING STARTED</p>
      <h2 className="font-display text-lg font-semibold text-ink">
        Finish setting up {business?.name ?? 'your workspace'}
      </h2>
      <p className="text-sm text-slate mt-1 mb-4">
        {remaining.length} step{remaining.length === 1 ? '' : 's'} left to make day-to-day work smoother.
      </p>
      <ul className="space-y-2">
        {steps.map((step) => (
          <li key={step.id}>
            <Link
              to={step.to}
              className={`flex items-start gap-3 rounded-xl border px-3 py-3 transition-colors ${
                step.done
                  ? 'border-line bg-paper text-slate'
                  : 'border-sage/30 bg-sage/5 hover:bg-sage/10 text-ink'
              }`}
            >
              <span
                className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs ${
                  step.done
                    ? 'bg-sage/20 text-sage-deep'
                    : 'bg-paper-raised border border-line text-slate'
                }`}
              >
                {step.done ? '✓' : ''}
              </span>
              <span>
                <span className="block text-sm font-medium">{step.label}</span>
                <span className="block text-xs text-slate mt-0.5">{step.hint}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import StatCard from '../../components/ui/StatCard'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import type { Business, BusinessApplication, CommissionEntry } from '../../types'

export default function PlatformDashboard() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [apps, setApps] = useState<BusinessApplication[]>([])
  const [commissions, setCommissions] = useState<CommissionEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    setLoading(true)
    setError(null)
    const [b, a, c] = await Promise.all([
      supabase.from('businesses').select('*').order('created_at', { ascending: false }),
      supabase
        .from('business_applications')
        .select('*')
        .in('status', ['pending', 'terms_sent'])
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('commission_entries')
        .select('*')
        .eq('status', 'open')
        .order('period_end', { ascending: false })
        .limit(10),
    ])
    if (b.error) setError(b.error.message)
    setBusinesses((b.data as Business[]) ?? [])
    setApps((a.data as BusinessApplication[]) ?? [])
    setCommissions((c.data as CommissionEntry[]) ?? [])
    setLoading(false)
  }

  const active = businesses.filter((x) => x.status === 'active').length
  const pending = businesses.filter((x) => x.status === 'pending').length
  const openComm = commissions.reduce((s, c) => s + Number(c.commission_due), 0)

  return (
    <>
      <Topbar title="Platform master" subtitle="TidyLedger — all businesses" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            <p className="text-xs mt-1">
              Run database/009_platform_payroll_commission.sql and add yourself to platform_admins.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Businesses" value={loading ? '—' : String(businesses.length)} ticketNo="ALL" accent="sage" />
          <StatCard label="Active" value={loading ? '—' : String(active)} ticketNo="ACT" accent="sage" />
          <StatCard label="Pending review" value={loading ? '—' : String(pending)} ticketNo="PEN" accent="brass" />
          <StatCard
            label="Open commissions"
            value={loading ? '—' : `$${openComm.toLocaleString()}`}
            ticketNo="COM"
            accent="clay"
          />
        </div>

        <div className="flex flex-wrap gap-2 mb-6">
          <Link to="/platform/applications"><Button>Review applications</Button></Link>
          <Link to="/platform/commissions"><Button variant="secondary">Commissions</Button></Link>
          <Link to="/platform/businesses"><Button variant="secondary">All businesses</Button></Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex justify-between">
              <h3 className="font-display font-semibold">Applications queue</h3>
              <Link to="/platform/applications" className="text-xs text-sage-deep hover:underline">View all</Link>
            </div>
            {apps.length === 0 ? (
              <p className="p-5 text-sm text-slate">No pending applications.</p>
            ) : (
              <ul className="divide-y divide-line">
                {apps.map((app) => (
                  <li key={app.id} className="px-5 py-3 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{app.business_name}</p>
                      <p className="text-xs text-slate">{app.contact_name} · {app.contact_email}</p>
                    </div>
                    <span className="chip-purple text-[11px] px-2 py-0.5 rounded-full capitalize h-fit">
                      {app.status.replace('_', ' ')}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex justify-between">
              <h3 className="font-display font-semibold">Recent businesses</h3>
              <Link to="/platform/businesses" className="text-xs text-sage-deep hover:underline">View all</Link>
            </div>
            {loading ? (
              <p className="p-5 text-sm text-slate">Loading…</p>
            ) : (
              <ul className="divide-y divide-line">
                {businesses.slice(0, 8).map((b) => (
                  <li key={b.id} className="px-5 py-3 text-sm flex justify-between gap-2">
                    <div>
                      <p className="font-medium text-ink">{b.name}</p>
                      <p className="text-xs text-slate">
                        {b.email || '—'} · {format(new Date(b.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <span className="text-[11px] capitalize text-slate">{b.status || 'active'}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

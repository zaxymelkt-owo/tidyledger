import { useEffect, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import Button from '../../components/ui/Button'
import { downloadCsv } from '../../lib/csv'
import { Field, Input, Select } from '../../components/ui/Field'
import { supabase } from '../../lib/supabase'
import type { Business, CommissionEntry } from '../../types'

export default function PlatformCommissions() {
  const [entries, setEntries] = useState<(CommissionEntry & { businesses?: { name: string } })[]>([])
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [bizId, setBizId] = useState('')
  const [start, setStart] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [end, setEnd] = useState(format(endOfMonth(new Date()), 'yyyy-MM-dd'))
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    load()
  }, [])

  async function load() {
    const [e, b] = await Promise.all([
      supabase
        .from('commission_entries')
        .select('*, businesses(name)')
        .order('created_at', { ascending: false }),
      supabase.from('businesses').select('*').eq('status', 'active').order('name'),
    ])
    if (e.error) setError(e.error.message)
    setEntries((e.data as typeof entries) ?? [])
    setBusinesses((b.data as Business[]) ?? [])
    if (!bizId && b.data?.[0]) setBizId(b.data[0].id)
  }

  async function generate() {
    if (!bizId) return
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('generate_commission_entry', {
      p_business_id: bizId,
      p_period_start: start,
      p_period_end: end,
    })
    setBusy(false)
    if (error) setError(error.message)
    else load()
  }

  async function markPaid(id: string) {
    const { error } = await supabase
      .from('commission_entries')
      .update({ status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', id)
    if (error) setError(error.message)
    else load()
  }

  return (
    <>
      <Topbar title="Commissions" subtitle="Platform fees from business revenue" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {error && <div className="text-sm text-clay">{error}</div>}

        <div className="ticket-card p-5 grid grid-cols-1 sm:grid-cols-4 gap-3 items-end">
          <Field label="Business">
            <Select value={bizId} onChange={(e) => setBizId(e.target.value)}>
              {businesses.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </Select>
          </Field>
          <Field label="Period start">
            <Input type="date" value={start} onChange={(e) => setStart(e.target.value)} />
          </Field>
          <Field label="Period end">
            <Input type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </Field>
          <div className="flex flex-col gap-2">
            <Button onClick={generate} disabled={busy || !bizId}>
              {busy ? 'Calculating…' : 'Generate entry'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={entries.length === 0}
              onClick={() =>
                downloadCsv(
                  'platform-commissions.csv',
                  entries.map((e) => ({
                    business: e.businesses?.name ?? e.business_id,
                    period_start: e.period_start,
                    period_end: e.period_end,
                    gross_revenue: e.gross_revenue,
                    rate_pct: e.rate_pct,
                    commission_due: e.commission_due,
                    status: e.status,
                    paid_at: e.paid_at,
                  }))
                )
              }
            >
              Export CSV
            </Button>
          </div>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-slate">
                  <th className="px-4 py-3">Business</th>
                  <th className="px-4 py-3">Period</th>
                  <th className="px-4 py-3">Gross</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Due</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {entries.map((e) => (
                  <tr key={e.id} className="border-b border-line/70">
                    <td className="px-4 py-3">{e.businesses?.name || e.business_id.slice(0, 8)}</td>
                    <td className="px-4 py-3 text-slate text-xs">
                      {e.period_start} → {e.period_end}
                    </td>
                    <td className="px-4 py-3 font-mono-num">${Number(e.gross_revenue).toLocaleString()}</td>
                    <td className="px-4 py-3 font-mono-num">{e.rate_pct}%</td>
                    <td className="px-4 py-3 font-mono-num text-clay">${Number(e.commission_due).toLocaleString()}</td>
                    <td className="px-4 py-3 capitalize">{e.status}</td>
                    <td className="px-4 py-3">
                      {e.status !== 'paid' && (
                        <button
                          type="button"
                          className="text-xs font-medium text-sage-deep hover:underline"
                          onClick={() => markPaid(e.id)}
                        >
                          Mark paid
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </>
  )
}

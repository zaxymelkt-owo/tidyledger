import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../../components/layout/Topbar'
import { supabase } from '../../lib/supabase'
import type { Business } from '../../types'

export default function PlatformBusinesses() {
  const [rows, setRows] = useState<Business[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase.from('businesses').select('*').order('name')
      if (error) setError(error.message)
      setRows((data as Business[]) ?? [])
      setLoading(false)
    })()
  }, [])

  return (
    <>
      <Topbar title="All businesses" subtitle="Platform directory" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && <div className="mb-4 text-sm text-clay">{error}</div>}
        <div className="ticket-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-slate">
                  <th className="px-4 py-3">Name</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Commission %</th>
                  <th className="px-4 py-3">Terms accepted</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {loading && <tr><td colSpan={5} className="px-4 py-8 text-center text-slate">Loading…</td></tr>}
                {rows.map((b) => (
                  <tr key={b.id} className="border-b border-line/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{b.name}</p>
                      <p className="text-xs text-slate">{b.email}</p>
                    </td>
                    <td className="px-4 py-3 capitalize">{b.status || 'active'}</td>
                    <td className="px-4 py-3 font-mono-num">{b.commission_rate_pct ?? '—'}%</td>
                    <td className="px-4 py-3 text-slate">
                      {b.commission_accepted_at
                        ? format(new Date(b.commission_accepted_at), 'MMM d, yyyy')
                        : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate">{format(new Date(b.created_at), 'MMM d, yyyy')}</td>
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

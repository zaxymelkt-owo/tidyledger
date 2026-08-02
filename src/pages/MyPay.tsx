import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { PayrollLine, PayrollRun, TimeEntry } from '../types'

/** Employee self-service: current hours and latest payout line */
export default function MyPay() {
  const { session, profile } = useAuth()
  const [employeeId, setEmployeeId] = useState<string | null>(null)
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [lines, setLines] = useState<(PayrollLine & { payroll_runs?: PayrollRun })[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    load()
  }, [session?.user?.email, profile?.id])

  async function load() {
    setLoading(true)
    setError(null)
    // Resolve employees row by profile or email
    let empId: string | null = null
    if (profile?.id) {
      const byProfile = await supabase
        .from('employees')
        .select('id')
        .eq('profile_id', profile.id)
        .maybeSingle()
      empId = byProfile.data?.id ?? null
    }
    if (!empId && session?.user?.email) {
      const byEmail = await supabase
        .from('employees')
        .select('id')
        .ilike('email', session.user.email)
        .maybeSingle()
      empId = byEmail.data?.id ?? null
    }
    setEmployeeId(empId)
    if (!empId) {
      setLoading(false)
      setError('No employee record linked to your login. Ask a manager to match your email on the Employees page.')
      return
    }

    const [te, pl] = await Promise.all([
      supabase
        .from('time_entries')
        .select('*')
        .eq('employee_id', empId)
        .order('work_date', { ascending: false })
        .limit(20),
      supabase
        .from('payroll_lines')
        .select('*, payroll_runs(*)')
        .eq('employee_id', empId)
        .order('id', { ascending: false })
        .limit(8),
    ])
    setEntries((te.data as TimeEntry[]) ?? [])
    setLines((pl.data as typeof lines) ?? [])
    setLoading(false)
  }

  const openHours = entries.reduce((s, e) => s + Number(e.hours), 0)
  const latest = lines[0]

  return (
    <>
      <Topbar title="My pay" subtitle="Your hours and payouts" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-2xl">
        {error && (
          <div className="rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">{error}</div>
        )}
        {loading && <p className="text-sm text-slate">Loading…</p>}

        {!loading && employeeId && (
          <>
            <div className="ticket-card p-6">
              <p className="ticket-number mb-1">CURRENT CYCLE</p>
              <p className="font-display text-3xl font-semibold text-sage-deep">
                {openHours.toFixed(2)} hrs
              </p>
              <p className="text-sm text-slate mt-1">Logged in recent time entries (last 20 shown below)</p>
            </div>

            {latest && (
              <div className="ticket-card p-6">
                <p className="ticket-number mb-1">LATEST PAYOUT LINE</p>
                <p className="font-display text-2xl font-semibold text-ink">
                  ${Number(latest.gross_pay).toFixed(2)}
                </p>
                <p className="text-sm text-slate mt-1">
                  {Number(latest.hours)}h × ${Number(latest.hourly_rate)}/hr
                  {latest.payroll_runs && (
                    <>
                      {' '}
                      · {latest.payroll_runs.period_start} → {latest.payroll_runs.period_end} ·{' '}
                      <span className="capitalize">{latest.payroll_runs.status}</span>
                    </>
                  )}
                </p>
              </div>
            )}

            <div className="ticket-card overflow-hidden">
              <div className="px-5 py-4 border-b border-line">
                <h3 className="font-display font-semibold">Recent hours</h3>
              </div>
              <ul className="divide-y divide-line">
                {entries.map((e) => (
                  <li key={e.id} className="px-5 py-2.5 text-sm flex justify-between">
                    <span>{e.work_date}</span>
                    <span className="font-mono-num">{Number(e.hours)}h</span>
                  </li>
                ))}
                {entries.length === 0 && (
                  <li className="px-5 py-6 text-sm text-slate">No hours logged yet.</li>
                )}
              </ul>
            </div>
          </>
        )}
      </main>
    </>
  )
}

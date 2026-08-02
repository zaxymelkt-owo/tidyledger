import { useEffect, useMemo, useState } from 'react'
import { format, subDays } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Employee, PayrollLine, PayrollRun, TimeEntry } from '../types'

type Emp = Employee & { pay_period?: string; business_id?: string | null }

export default function Payroll() {
  const { business, isOwnerOrManager, role } = useAuth()
  const [employees, setEmployees] = useState<Emp[]>([])
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [runs, setRuns] = useState<PayrollRun[]>([])
  const [lines, setLines] = useState<PayrollLine[]>([])
  const [selectedRun, setSelectedRun] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [timeOpen, setTimeOpen] = useState(false)
  const [employeeId, setEmployeeId] = useState('')
  const [workDate, setWorkDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState('8')
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 13), 'yyyy-MM-dd'))
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [busy, setBusy] = useState(false)

  const canManage = isOwnerOrManager || role === 'manager'
  // Leads see hours; managers+ see full payroll

  useEffect(() => {
    load()
  }, [business?.id])

  async function load() {
    const [emp, te, pr] = await Promise.all([
      supabase.from('employees').select('*').eq('status', 'active').order('last_name'),
      supabase
        .from('time_entries')
        .select('*')
        .order('work_date', { ascending: false })
        .limit(40),
      supabase.from('payroll_runs').select('*').order('created_at', { ascending: false }).limit(12),
    ])
    if (emp.error) setError(emp.error.message)
    setEmployees((emp.data as Emp[]) ?? [])
    setEntries((te.data as TimeEntry[]) ?? [])
    setRuns((pr.data as PayrollRun[]) ?? [])
    if (!employeeId && emp.data?.[0]) setEmployeeId(emp.data[0].id)
  }

  async function loadLines(runId: string) {
    setSelectedRun(runId)
    const { data } = await supabase.from('payroll_lines').select('*').eq('payroll_run_id', runId)
    setLines((data as PayrollLine[]) ?? [])
  }

  async function addTime(e: React.FormEvent) {
    e.preventDefault()
    if (!business?.id) {
      setError('Business context required')
      return
    }
    setBusy(true)
    const { error } = await supabase.from('time_entries').insert({
      business_id: business.id,
      employee_id: employeeId,
      work_date: workDate,
      hours: Number(hours),
    })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setTimeOpen(false)
      load()
    }
  }

  async function setPayPeriod(empId: string, period: string) {
    const { error } = await supabase.from('employees').update({ pay_period: period }).eq('id', empId)
    if (error) setError(error.message)
    else load()
  }

  async function buildRun() {
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('build_payroll_run', {
      p_period_start: periodStart,
      p_period_end: periodEnd,
    })
    setBusy(false)
    if (error) setError(error.message)
    else {
      await load()
      if (data) loadLines(data as string)
    }
  }

  async function markPaid(runId: string) {
    const { error } = await supabase.rpc('mark_payroll_paid', { p_run_id: runId })
    if (error) setError(error.message)
    else load()
  }

  const empName = useMemo(() => {
    const m = new Map(employees.map((e) => [e.id, `${e.first_name} ${e.last_name}`]))
    return (id: string) => m.get(id) || id.slice(0, 8)
  }, [employees])

  return (
    <>
      <Topbar title="Payroll" subtitle="Hours, pay periods, and payouts" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        {error && (
          <div className="rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            <p className="text-xs mt-1">Ensure database/009_platform_payroll_commission.sql is applied.</p>
          </div>
        )}

        {canManage && (
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setTimeOpen(true)}>+ Time entry</Button>
            <Button variant="secondary" onClick={buildRun} disabled={busy}>
              {busy ? 'Building…' : 'Build payroll run'}
            </Button>
            <div className="flex gap-2 items-center text-sm">
              <Input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} />
              <span className="text-slate">to</span>
              <Input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} />
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold">Employees & pay periods</h3>
            </div>
            <ul className="divide-y divide-line">
              {employees.map((e) => (
                <li key={e.id} className="px-5 py-3 text-sm flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium text-ink">
                      {e.first_name} {e.last_name}
                    </p>
                    <p className="text-xs text-slate capitalize">
                      {e.role} · ${e.hourly_rate ?? 0}/hr
                    </p>
                  </div>
                  {canManage ? (
                    <Select
                      value={(e as Emp).pay_period || 'biweekly'}
                      onChange={(ev) => setPayPeriod(e.id, ev.target.value)}
                      className="max-w-[140px]"
                    >
                      <option value="weekly">Weekly</option>
                      <option value="biweekly">Bi-weekly</option>
                      <option value="semimonthly">Semi-monthly</option>
                      <option value="monthly">Monthly</option>
                    </Select>
                  ) : (
                    <span className="text-xs text-slate capitalize">{(e as Emp).pay_period || 'biweekly'}</span>
                  )}
                </li>
              ))}
              {employees.length === 0 && (
                <li className="px-5 py-6 text-sm text-slate">No active employees. Add them under Employees first.</li>
              )}
            </ul>
          </div>

          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold">Recent hours</h3>
            </div>
            <ul className="divide-y divide-line max-h-80 overflow-y-auto">
              {entries.map((t) => (
                <li key={t.id} className="px-5 py-2.5 text-sm flex justify-between gap-2">
                  <span>
                    {empName(t.employee_id)} · {t.work_date}
                  </span>
                  <span className="font-mono-num">{Number(t.hours)}h</span>
                </li>
              ))}
              {entries.length === 0 && (
                <li className="px-5 py-6 text-sm text-slate">No time entries yet.</li>
              )}
            </ul>
          </div>
        </div>

        {canManage && (
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold">Payroll runs</h3>
            </div>
            <div className="table-scroll">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase text-slate">
                    <th className="px-4 py-3">Period</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} className="border-b border-line/70">
                      <td className="px-4 py-3">
                        {r.period_start} → {r.period_end}
                      </td>
                      <td className="px-4 py-3 capitalize">{r.status}</td>
                      <td className="px-4 py-3 space-x-3">
                        <button
                          type="button"
                          className="text-xs font-medium text-sage-deep hover:underline"
                          onClick={() => loadLines(r.id)}
                        >
                          View lines
                        </button>
                        {r.status !== 'paid' && (
                          <button
                            type="button"
                            className="text-xs font-medium text-brass hover:underline"
                            onClick={() => markPaid(r.id)}
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
            {selectedRun && lines.length > 0 && (
              <div className="border-t border-line px-4 py-3">
                <p className="text-xs uppercase text-slate mb-2">Lines for selected run</p>
                <ul className="space-y-1 text-sm">
                  {lines.map((l) => (
                    <li key={l.id} className="flex justify-between">
                      <span>{empName(l.employee_id)}</span>
                      <span className="font-mono-num text-right">
                        {Number(l.hours)}h × ${Number(l.hourly_rate)} = ${Number(l.gross_pay).toFixed(2)}
                        {(l as { tax_withheld?: number; net_pay?: number }).tax_withheld != null && (
                          <span className="block text-[11px] text-slate">
                            Tax ${(l as { tax_withheld?: number }).tax_withheld?.toFixed?.(2) ?? Number((l as { tax_withheld?: number }).tax_withheld || 0).toFixed(2)}
                            {' · '}Net $
                            {Number((l as { net_pay?: number }).net_pay ?? Number(l.gross_pay) - Number((l as { tax_withheld?: number }).tax_withheld || 0)).toFixed(2)}
                          </span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </main>

      <Modal open={timeOpen} onClose={() => setTimeOpen(false)} title="Add time entry">
        <form onSubmit={addTime} className="space-y-4">
          <Field label="Employee">
            <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Date">
            <Input type="date" value={workDate} onChange={(e) => setWorkDate(e.target.value)} />
          </Field>
          <Field label="Hours">
            <Input type="number" step="0.25" min="0" max="24" value={hours} onChange={(e) => setHours(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setTimeOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { Field, Input, Textarea } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Employee } from '../types'

export default function TaxSettings() {
  const { business, isOwnerOrManager, refreshProfile } = useAuth()
  const [fed, setFed] = useState('0')
  const [state, setState] = useState('0')
  const [local, setLocal] = useState('0')
  const [notes, setNotes] = useState('')
  const [employees, setEmployees] = useState<Employee[]>([])
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!business) return
    setFed(String(business.tax_federal_pct ?? 0))
    setState(String(business.tax_state_pct ?? 0))
    setLocal(String(business.tax_local_pct ?? 0))
    setNotes(business.tax_notes ?? '')
    supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => setEmployees((data as Employee[]) ?? []))
  }, [business?.id])

  async function saveBusiness(e: React.FormEvent) {
    e.preventDefault()
    if (!business?.id) return
    setBusy(true)
    setError(null)
    setSaved(false)
    const { error } = await supabase
      .from('businesses')
      .update({
        tax_federal_pct: Number(fed) || 0,
        tax_state_pct: Number(state) || 0,
        tax_local_pct: Number(local) || 0,
        tax_notes: notes || null,
      })
      .eq('id', business.id)
    setBusy(false)
    if (error) setError(error.message)
    else {
      setSaved(true)
      await refreshProfile()
    }
  }

  async function saveEmployeeTax(
    id: string,
    patch: { tax_federal_pct?: number | null; tax_state_pct?: number | null; tax_local_pct?: number | null; tax_exempt?: boolean }
  ) {
    const { error } = await supabase.from('employees').update(patch).eq('id', id)
    if (error) setError(error.message)
    else {
      const { data } = await supabase.from('employees').select('*').eq('status', 'active').order('last_name')
      setEmployees((data as Employee[]) ?? [])
    }
  }

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Tax withholding" />
        <main className="p-6 text-sm text-slate">Only owners and managers can configure tax withholding.</main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Tax withholding" subtitle="Defaults applied when building payroll" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl">
        {error && <div className="text-sm text-clay">{error}</div>}
        {saved && <div className="text-sm text-sage-deep">Business defaults saved.</div>}

        <form onSubmit={saveBusiness} className="ticket-card p-6 space-y-4">
          <h3 className="font-display font-semibold">Business defaults (%)</h3>
          <div className="grid grid-cols-3 gap-3">
            <Field label="Federal">
              <Input type="number" step="0.01" min="0" value={fed} onChange={(e) => setFed(e.target.value)} />
            </Field>
            <Field label="State">
              <Input type="number" step="0.01" min="0" value={state} onChange={(e) => setState(e.target.value)} />
            </Field>
            <Field label="Local">
              <Input type="number" step="0.01" min="0" value={local} onChange={(e) => setLocal(e.target.value)} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
          <Button type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save defaults'}
          </Button>
        </form>

        <div className="ticket-card overflow-hidden">
          <div className="px-5 py-4 border-b border-line">
            <h3 className="font-display font-semibold">Employee overrides</h3>
            <p className="text-xs text-slate mt-1">Leave blank to use business defaults. Exempt skips all withholding.</p>
          </div>
          <ul className="divide-y divide-line">
            {employees.map((emp) => (
              <li key={emp.id} className="px-5 py-3 text-sm grid grid-cols-1 sm:grid-cols-5 gap-2 items-center">
                <span className="font-medium text-ink sm:col-span-1">
                  {emp.first_name} {emp.last_name}
                </span>
                <Input
                  type="number"
                  placeholder="Fed %"
                  defaultValue={(emp as Employee & { tax_federal_pct?: number }).tax_federal_pct ?? ''}
                  onBlur={(e) =>
                    saveEmployeeTax(emp.id, {
                      tax_federal_pct: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="State %"
                  defaultValue={(emp as Employee & { tax_state_pct?: number }).tax_state_pct ?? ''}
                  onBlur={(e) =>
                    saveEmployeeTax(emp.id, {
                      tax_state_pct: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                <Input
                  type="number"
                  placeholder="Local %"
                  defaultValue={(emp as Employee & { tax_local_pct?: number }).tax_local_pct ?? ''}
                  onBlur={(e) =>
                    saveEmployeeTax(emp.id, {
                      tax_local_pct: e.target.value === '' ? null : Number(e.target.value),
                    })
                  }
                />
                <label className="flex items-center gap-2 text-xs text-slate">
                  <input
                    type="checkbox"
                    defaultChecked={(emp as Employee & { tax_exempt?: boolean }).tax_exempt}
                    onChange={(e) => saveEmployeeTax(emp.id, { tax_exempt: e.target.checked })}
                  />
                  Exempt
                </label>
              </li>
            ))}
          </ul>
        </div>
      </main>
    </>
  )
}

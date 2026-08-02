import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import EmployeeForm from '../components/EmployeeForm'
import { supabase } from '../lib/supabase'
import type { Employee, EmployeeFormInput, EmployeeStatus } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; employee: Employee } | null

const statusStyles: Record<EmployeeStatus, string> = {
  active: 'bg-sage/10 text-sage-deep',
  inactive: 'bg-line text-slate',
  on_leave: 'bg-brass/10 text-brass',
}

export default function Employees() {
  const [employees, setEmployees] = useState<Employee[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadEmployees()
  }, [])

  async function loadEmployees() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) setError(error.message)
    else setEmployees(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return employees
    return employees.filter((e) =>
      `${e.first_name} ${e.last_name} ${e.email ?? ''} ${e.phone ?? ''} ${e.role}`
        .toLowerCase()
        .includes(q)
    )
  }, [employees, search])

  async function handleSave(values: EmployeeFormInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('employees').update(values).eq('id', modal.employee.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('employees').insert(values)
        if (error) throw error
      }
      setModal(null)
      await loadEmployees()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save employee.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(employee: Employee) {
    if (!confirm(`Delete ${employee.first_name} ${employee.last_name}? This can't be undone.`)) return
    const { error } = await supabase.from('employees').delete().eq('id', employee.id)
    if (error) setError(error.message)
    else setEmployees((es) => es.filter((e) => e.id !== employee.id))
  }

  const activeCount = employees.filter((e) => e.status === 'active').length

  return (
    <>
      <Topbar title="Employees" subtitle={`${activeCount} active · ${employees.length} total`} />
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
          <input
            placeholder="Search by name, email, phone, role…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors"
          />
          <Button onClick={() => setModal({ mode: 'add' })}>+ Add employee</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Rate</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate">Loading employees…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate">
                    {employees.length === 0
                      ? 'No employees yet — add your first team member.'
                      : 'No employees match that search.'}
                  </td>
                </tr>
              )}
              {filtered.map((e) => (
                <tr key={e.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {e.first_name} {e.last_name}
                  </td>
                  <td className="px-5 py-3 text-slate">
                    <div>{e.phone || '—'}</div>
                    <div className="text-xs">{e.email}</div>
                  </td>
                  <td className="px-5 py-3 capitalize text-slate">{e.role}</td>
                  <td className="px-5 py-3 font-mono-num text-ink">
                    {e.hourly_rate != null ? `$${e.hourly_rate.toFixed(2)}/hr` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${statusStyles[e.status]}`}>
                      {e.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModal({ mode: 'edit', employee: e })}
                      className="text-xs font-medium text-sage-deep hover:underline mr-4"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(e)} className="text-xs font-medium text-clay hover:underline">
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </main>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit employee' : 'Add employee'} onClose={() => setModal(null)}>
          <EmployeeForm
            initial={modal.mode === 'edit' ? modal.employee : null}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </>
  )
}

import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import CustomerForm from '../components/CustomerForm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Customer, CustomerFormInput } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; customer: Customer } | null

export default function Customers() {
  const { business } = useAuth()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadCustomers()
  }, [])

  async function loadCustomers() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_name', { ascending: true })

    if (error) setError(error.message)
    else setCustomers(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return customers
    return customers.filter((c) =>
      `${c.first_name} ${c.last_name} ${c.city ?? ''} ${c.phone ?? ''} ${c.email ?? ''}`
        .toLowerCase()
        .includes(q)
    )
  }, [customers, search])

  async function handleSave(values: CustomerFormInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('customers').update(values).eq('id', modal.customer.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('customers').insert({ ...values, business_id: business?.id ?? null })
        if (error) throw error
      }
      setModal(null)
      await loadCustomers()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save customer.')
    } finally {
      setSubmitting(false)
    }
  }

  
  async function enablePortal(customer: Customer) {
    const code = customer.portal_code || `TIDY-${Math.random().toString(36).slice(2, 6).toUpperCase()}${Math.random().toString(36).slice(2, 4).toUpperCase()}`
    const { error } = await supabase
      .from('customers')
      .update({ portal_enabled: true, portal_code: code })
      .eq('id', customer.id)
    if (error) setError(error.message)
    else {
      setCustomers((cs) =>
        cs.map((c) => (c.id === customer.id ? { ...c, portal_enabled: true, portal_code: code } : c))
      )
      alert(`Portal enabled.\nAccess code: ${code}\nShare with ${customer.email || customer.first_name}.`)
    }
  }

  async function disablePortal(customer: Customer) {
    const { error } = await supabase
      .from('customers')
      .update({ portal_enabled: false })
      .eq('id', customer.id)
    if (error) setError(error.message)
    else setCustomers((cs) => cs.map((c) => (c.id === customer.id ? { ...c, portal_enabled: false } : c)))
  }

  async function handleDelete(customer: Customer) {
    if (!confirm(`Delete ${customer.first_name} ${customer.last_name}? This can't be undone.`)) return
    const { error } = await supabase.from('customers').delete().eq('id', customer.id)
    if (error) setError(error.message)
    else setCustomers((cs) => cs.filter((c) => c.id !== customer.id))
  }

  return (
    <>
      <Topbar title="Customers" subtitle={`${customers.length} on file`} />
      <main className="flex-1 overflow-y-auto p-6">
        {error && (
          <div className="mb-6 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('relation') && (
              <p className="mt-1 text-xs text-clay/80">
                Have you run <code className="font-mono-num">database/schema.sql</code> in your Supabase project yet?
              </p>
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5">
          <input
            placeholder="Search by name, city, phone, email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors"
          />
          <Button onClick={() => setModal({ mode: 'add' })}>+ Add customer</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Name</th>
                <th className="px-5 py-3 font-medium">Contact</th>
                <th className="px-5 py-3 font-medium">Address</th>
                <th className="px-5 py-3 font-medium">Frequency</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate">
                    Loading customers…
                  </td>
                </tr>
              )}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-slate">
                    {customers.length === 0
                      ? 'No customers yet — add your first one to get started.'
                      : 'No customers match that search.'}
                  </td>
                </tr>
              )}

              {filtered.map((c) => (
                <tr key={c.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                  <td className="px-5 py-3 font-medium text-ink">
                    {c.first_name} {c.last_name}
                  </td>
                  <td className="px-5 py-3 text-slate">
                    <div>{c.phone}</div>
                    <div className="text-xs">{c.email}</div>
                  </td>
                  <td className="px-5 py-3 text-slate">
                    {c.address ? `${c.address}${c.city ? `, ${c.city}` : ''}` : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-block rounded-full bg-sage/10 text-sage-deep text-xs font-medium px-2.5 py-1 capitalize">
                      {c.cleaning_frequency?.replace('_', ' ') || '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModal({ mode: 'edit', customer: c })}
                      className="text-xs font-medium text-sage-deep hover:underline mr-3"
                    >
                      Edit
                    </button>
                    {c.portal_enabled ? (
                      <button
                        onClick={() => disablePortal(c)}
                        title={c.portal_code ? `Code: ${c.portal_code}` : ''}
                        className="text-xs font-medium text-brass hover:underline mr-3"
                      >
                        Portal on
                      </button>
                    ) : (
                      <button
                        onClick={() => enablePortal(c)}
                        className="text-xs font-medium text-sage-deep hover:underline mr-3"
                      >
                        Enable portal
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c)}
                      className="text-xs font-medium text-clay hover:underline"
                    >
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
        <Modal
          title={modal.mode === 'edit' ? 'Edit customer' : 'Add customer'}
          onClose={() => setModal(null)}
        >
          <CustomerForm
            initial={modal.mode === 'edit' ? modal.customer : null}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </>
  )
}

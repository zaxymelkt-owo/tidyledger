import { useEffect, useMemo, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import InventoryForm from '../components/InventoryForm'
import { supabase } from '../lib/supabase'
import type { InventoryItem, InventoryFormInput } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; item: InventoryItem } | null

export default function Inventory() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadItems()
  }, [])

  async function loadItems() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase.from('inventory').select('*').order('name', { ascending: true })
    if (error) setError(error.message)
    else setItems(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((i) =>
      `${i.name} ${i.category} ${i.notes ?? ''}`.toLowerCase().includes(q)
    )
  }, [items, search])

  const lowStock = items.filter((i) => i.quantity <= i.reorder_level)

  async function handleSave(values: InventoryFormInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('inventory').update(values).eq('id', modal.item.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('inventory').insert(values)
        if (error) throw error
      }
      setModal(null)
      await loadItems()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save item.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(item: InventoryItem) {
    if (!confirm(`Delete "${item.name}"? This can't be undone.`)) return
    const { error } = await supabase.from('inventory').delete().eq('id', item.id)
    if (error) setError(error.message)
    else setItems((is) => is.filter((i) => i.id !== item.id))
  }

  return (
    <>
      <Topbar title="Inventory" subtitle={`${items.length} items · ${lowStock.length} low stock`} />
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

        {lowStock.length > 0 && (
          <div className="mb-5 rounded-lg border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-brass">
            <strong>Low stock alert:</strong>{' '}
            {lowStock.map((i) => i.name).join(', ')} — reorder soon.
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-5">
          <input
            placeholder="Search inventory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors"
          />
          <Button onClick={() => setModal({ mode: 'add' })}>+ Add item</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Item</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-right">Qty</th>
                <th className="px-5 py-3 font-medium">Unit</th>
                <th className="px-5 py-3 font-medium text-right">Reorder at</th>
                <th className="px-5 py-3 font-medium text-right">Unit cost</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate">Loading inventory…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate">
                    {items.length === 0
                      ? 'No inventory items yet — add your first supply or equipment.'
                      : 'No items match that search.'}
                  </td>
                </tr>
              )}
              {filtered.map((i) => {
                const isLow = i.quantity <= i.reorder_level
                return (
                  <tr key={i.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                    <td className="px-5 py-3 font-medium text-ink">{i.name}</td>
                    <td className="px-5 py-3 capitalize text-slate">{i.category}</td>
                    <td className={`px-5 py-3 text-right font-mono-num ${isLow ? 'text-clay font-semibold' : 'text-ink'}`}>
                      {i.quantity}
                    </td>
                    <td className="px-5 py-3 text-slate">{i.unit}</td>
                    <td className="px-5 py-3 text-right font-mono-num text-slate">{i.reorder_level}</td>
                    <td className="px-5 py-3 text-right font-mono-num text-ink">
                      {i.unit_cost != null ? `$${i.unit_cost.toFixed(2)}` : '—'}
                    </td>
                    <td className="px-5 py-3 text-right whitespace-nowrap">
                      <button
                        onClick={() => setModal({ mode: 'edit', item: i })}
                        className="text-xs font-medium text-sage-deep hover:underline mr-4"
                      >
                        Edit
                      </button>
                      <button onClick={() => handleDelete(i)} className="text-xs font-medium text-clay hover:underline">
                        Delete
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table></div>
        </div>
      </main>

      {modal && (
        <Modal title={modal.mode === 'edit' ? 'Edit item' : 'Add item'} onClose={() => setModal(null)}>
          <InventoryForm
            initial={modal.mode === 'edit' ? modal.item : null}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </>
  )
}

import { useEffect, useMemo, useRef, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import InventoryForm from '../components/InventoryForm'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { parseCsv, readFileAsText } from '../lib/csv'
import {
  csvRowsToInventory,
  downloadInventoryCsv,
  downloadInventoryTemplate,
  openInventoryPdf,
} from '../lib/inventoryIo'
import type { InventoryItem, InventoryFormInput } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; item: InventoryItem } | null

export default function Inventory() {
  const { business } = useAuth()
  const fileRef = useRef<HTMLInputElement>(null)
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importing, setImporting] = useState(false)

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

  async function handleImportFile(file: File) {
    setImporting(true)
    setError(null)
    setInfo(null)
    try {
      const text = await readFileAsText(file)
      const rows = parseCsv(text)
      if (!rows.length) {
        setError('No data rows found. Use the template CSV (header + at least one item).')
        return
      }

      const { items: parsed, skipped, errors } = csvRowsToInventory(rows)
      if (errors.length) {
        setError(errors.slice(0, 5).join(' · '))
      }
      if (!parsed.length) {
        setError((prev) => prev || 'No valid inventory rows to import.')
        return
      }

      // Upsert by name (case-insensitive): update qty/fields if name exists
      const byName = new Map(items.map((i) => [i.name.trim().toLowerCase(), i]))
      let inserted = 0
      let updated = 0

      for (const row of parsed) {
        const key = row.name.trim().toLowerCase()
        const existing = byName.get(key)
        if (existing) {
          const { error } = await supabase
            .from('inventory')
            .update({
              category: row.category,
              quantity: row.quantity,
              unit: row.unit,
              reorder_level: row.reorder_level,
              unit_cost: row.unit_cost,
              notes: row.notes,
            })
            .eq('id', existing.id)
          if (error) throw error
          updated++
        } else {
          const { error } = await supabase.from('inventory').insert(row)
          if (error) throw error
          inserted++
        }
      }

      await loadItems()
      setInfo(
        `Import complete: ${inserted} added, ${updated} updated` +
          (skipped ? `, ${skipped} skipped` : '') +
          '.'
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
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

        {info && (
          <div className="mb-6 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-deep">
            {info}
          </div>
        )}

        {lowStock.length > 0 && (
          <div className="mb-5 rounded-lg border border-brass/30 bg-brass/5 px-4 py-3 text-sm text-brass">
            <strong>Low stock alert:</strong>{' '}
            {lowStock.map((i) => i.name).join(', ')} — reorder soon.
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
          <input
            placeholder="Search inventory…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-line bg-paper-raised px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sage/40 focus:border-sage transition-colors"
          />
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) void handleImportFile(file)
              }}
            />
            <Button
              type="button"
              variant="secondary"
              disabled={importing}
              onClick={() => fileRef.current?.click()}
            >
              {importing ? 'Importing…' : 'Import CSV'}
            </Button>
            <Button type="button" variant="secondary" onClick={() => downloadInventoryTemplate()}>
              Template
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={filtered.length === 0}
              onClick={() => downloadInventoryCsv(filtered)}
            >
              Export CSV
            </Button>
            <Button
              type="button"
              variant="secondary"
              disabled={filtered.length === 0}
              onClick={() =>
                openInventoryPdf(filtered, {
                  businessName: business?.name ?? 'TidyLedger',
                  title: search.trim() ? 'Inventory (filtered)' : 'Inventory report',
                })
              }
            >
              Export PDF
            </Button>
            <Button onClick={() => setModal({ mode: 'add' })}>+ Add item</Button>
          </div>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
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
                    <td colSpan={7} className="px-5 py-10 text-center text-slate">
                      Loading inventory…
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-slate">
                      {items.length === 0
                        ? 'No inventory items yet — add an item or import a CSV.'
                        : 'No items match that search.'}
                    </td>
                  </tr>
                )}
                {filtered.map((i) => {
                  const isLow = i.quantity <= i.reorder_level
                  return (
                    <tr
                      key={i.id}
                      className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors"
                    >
                      <td className="px-5 py-3 font-medium text-ink">{i.name}</td>
                      <td className="px-5 py-3 capitalize text-slate">{i.category}</td>
                      <td
                        className={`px-5 py-3 text-right font-mono-num ${
                          isLow ? 'text-clay font-semibold' : 'text-ink'
                        }`}
                      >
                        {i.quantity}
                      </td>
                      <td className="px-5 py-3 text-slate">{i.unit}</td>
                      <td className="px-5 py-3 text-right font-mono-num text-slate">
                        {i.reorder_level}
                      </td>
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
                        <button
                          onClick={() => handleDelete(i)}
                          className="text-xs font-medium text-clay hover:underline"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {modal && (
        <Modal
          title={modal.mode === 'edit' ? 'Edit item' : 'Add item'}
          onClose={() => setModal(null)}
        >
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

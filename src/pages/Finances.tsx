import { useEffect, useMemo, useState } from 'react'
import { format, startOfMonth, endOfMonth } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import StatCard from '../components/ui/StatCard'
import TransactionForm from '../components/TransactionForm'
import { supabase } from '../lib/supabase'
import type { Transaction, TransactionFormInput } from '../types'

type ModalState = { mode: 'add' } | { mode: 'edit'; txn: Transaction } | null
type Filter = 'all' | 'income' | 'expense'

export default function Finances() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filter, setFilter] = useState<Filter>('all')
  const [modal, setModal] = useState<ModalState>(null)
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadTxns()
  }, [])

  async function loadTxns() {
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('txn_date', { ascending: false })

    if (error) setError(error.message)
    else setTxns(data ?? [])
    setLoading(false)
  }

  const filtered = useMemo(() => {
    if (filter === 'all') return txns
    return txns.filter((t) => t.type === filter)
  }, [txns, filter])

  const monthStart = startOfMonth(new Date())
  const monthEnd = endOfMonth(new Date())
  const thisMonth = txns.filter((t) => {
    const d = new Date(t.txn_date + 'T00:00:00')
    return d >= monthStart && d <= monthEnd
  })
  const incomeMonth = thisMonth.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0)
  const expenseMonth = thisMonth.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0)
  const netMonth = incomeMonth - expenseMonth

  async function handleSave(values: TransactionFormInput) {
    setSubmitting(true)
    setError(null)
    try {
      if (modal?.mode === 'edit') {
        const { error } = await supabase.from('transactions').update(values).eq('id', modal.txn.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('transactions').insert(values)
        if (error) throw error
      }
      setModal(null)
      await loadTxns()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save transaction.')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete(txn: Transaction) {
    if (!confirm('Delete this transaction? This can\'t be undone.')) return
    const { error } = await supabase.from('transactions').delete().eq('id', txn.id)
    if (error) setError(error.message)
    else setTxns((ts) => ts.filter((t) => t.id !== txn.id))
  }

  return (
    <>
      <Topbar title="Finances" subtitle={`${txns.length} transactions on record`} />
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
          <StatCard label="Income this month" value={`$${incomeMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} ticketNo="INC" accent="sage" />
          <StatCard label="Expenses this month" value={`$${expenseMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} ticketNo="EXP" accent="clay" />
          <StatCard label="Net this month" value={`$${netMonth.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} ticketNo="NET" accent="brass" />
        </div>

        <div className="flex items-center justify-between gap-4 mb-5 flex-wrap">
          <div className="flex gap-1.5 bg-paper-raised border border-line rounded-lg p-1">
            {(['all', 'income', 'expense'] as Filter[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${
                  filter === f ? 'bg-sage-deep text-white' : 'text-slate hover:text-ink'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
          <Button onClick={() => setModal({ mode: 'add' })}>+ Add transaction</Button>
        </div>

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll"><table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-slate">
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Method</th>
                <th className="px-5 py-3 font-medium text-right">Amount</th>
                <th className="px-5 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate">Loading transactions…</td>
                </tr>
              )}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-slate">
                    {txns.length === 0
                      ? 'No transactions yet — log your first income or expense.'
                      : 'No transactions match this filter.'}
                  </td>
                </tr>
              )}
              {filtered.map((t) => (
                <tr key={t.id} className="border-b border-line last:border-0 hover:bg-paper/60 transition-colors">
                  <td className="px-5 py-3 font-mono-num text-ink">
                    {format(new Date(t.txn_date + 'T00:00:00'), 'MMM d, yyyy')}
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`inline-block rounded-full text-xs font-medium px-2.5 py-1 capitalize ${
                        t.type === 'income' ? 'bg-sage/10 text-sage-deep' : 'bg-clay/10 text-clay'
                      }`}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-slate">{t.category}</td>
                  <td className="px-5 py-3 text-slate max-w-[200px] truncate">{t.description || '—'}</td>
                  <td className="px-5 py-3 text-slate capitalize">{t.payment_method?.replace('_', ' ') || '—'}</td>
                  <td className={`px-5 py-3 text-right font-mono-num font-medium ${t.type === 'income' ? 'text-sage-deep' : 'text-clay'}`}>
                    {t.type === 'income' ? '+' : '−'}${t.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </td>
                  <td className="px-5 py-3 text-right whitespace-nowrap">
                    <button
                      onClick={() => setModal({ mode: 'edit', txn: t })}
                      className="text-xs font-medium text-sage-deep hover:underline mr-4"
                    >
                      Edit
                    </button>
                    <button onClick={() => handleDelete(t)} className="text-xs font-medium text-clay hover:underline">
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
        <Modal title={modal.mode === 'edit' ? 'Edit transaction' : 'Add transaction'} onClose={() => setModal(null)}>
          <TransactionForm
            initial={modal.mode === 'edit' ? modal.txn : null}
            onSubmit={handleSave}
            onCancel={() => setModal(null)}
            submitting={submitting}
          />
        </Modal>
      )}
    </>
  )
}

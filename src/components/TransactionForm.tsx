import { useState } from 'react'
import { format } from 'date-fns'
import { Field, Input, Textarea, Select } from './ui/Field'
import Button from './ui/Button'
import type { Transaction, TransactionFormInput } from '../types'

const INCOME_CATEGORIES = ['Job payment', 'Deposit', 'Tip', 'Other income']
const EXPENSE_CATEGORIES = [
  'Supplies',
  'Equipment',
  'Payroll',
  'Fuel / Mileage',
  'Insurance',
  'Marketing',
  'Software',
  'Utilities',
  'Other expense',
]

function emptyForm(): TransactionFormInput {
  return {
    txn_date: format(new Date(), 'yyyy-MM-dd'),
    type: 'expense',
    category: 'Supplies',
    amount: 0,
    description: '',
    related_job_id: null,
    payment_method: '',
  }
}

export default function TransactionForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Transaction | null
  onSubmit: (values: TransactionFormInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<TransactionFormInput>(
    initial
      ? {
          txn_date: initial.txn_date,
          type: initial.type,
          category: initial.category,
          amount: initial.amount,
          description: initial.description,
          related_job_id: initial.related_job_id,
          payment_method: initial.payment_method,
        }
      : emptyForm()
  )

  function update<K extends keyof TransactionFormInput>(key: K, value: TransactionFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleTypeChange(type: TransactionFormInput['type']) {
    const cats = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
    setForm((f) => ({ ...f, type, category: cats[0] }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  const categories = form.type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Date">
          <Input type="date" required value={form.txn_date} onChange={(e) => update('txn_date', e.target.value)} />
        </Field>
        <Field label="Type">
          <Select value={form.type} onChange={(e) => handleTypeChange(e.target.value as TransactionFormInput['type'])}>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <Select value={form.category} onChange={(e) => update('category', e.target.value)}>
            {categories.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </Select>
        </Field>
        <Field label="Amount ($)">
          <Input
            type="number"
            step="0.01"
            required
            min="0.01"
            value={form.amount || ''}
            onChange={(e) => update('amount', Number(e.target.value))}
          />
        </Field>
      </div>

      <Field label="Payment method">
        <Select value={form.payment_method ?? ''} onChange={(e) => update('payment_method', e.target.value || null)}>
          <option value="">—</option>
          <option value="cash">Cash</option>
          <option value="check">Check</option>
          <option value="card">Card</option>
          <option value="bank_transfer">Bank transfer</option>
          <option value="venmo">Venmo / Zelle</option>
          <option value="other">Other</option>
        </Select>
      </Field>

      <Field label="Description">
        <Textarea value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add transaction'}
        </Button>
      </div>
    </form>
  )
}

import { useEffect, useState } from 'react'
import { Field, Input, Textarea, Select } from './ui/Field'
import Button from './ui/Button'
import type { Job, JobFormInput, JobWithCustomer, Employee } from '../types'
import type { Customer } from '../types'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'

function emptyForm(defaultCustomerId = ''): JobFormInput {
  return {
    customer_id: defaultCustomerId,
    job_date: format(new Date(), 'yyyy-MM-dd'),
    status: 'scheduled',
    service: '',
    price: null,
    payment_status: 'unpaid',
    assigned_employee: '',
    notes: '',
  }
}

export default function JobForm({
  initial,
  customers,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Job | JobWithCustomer | null
  customers: Customer[]
  onSubmit: (values: JobFormInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<JobFormInput>(
    initial
      ? {
          customer_id: initial.customer_id,
          job_date: initial.job_date,
          status: initial.status,
          service: initial.service,
          price: initial.price,
          payment_status: initial.payment_status,
          assigned_employee: initial.assigned_employee,
          notes: initial.notes,
        }
      : emptyForm()
  )
  const [employees, setEmployees] = useState<Employee[]>([])

  useEffect(() => {
    supabase
      .from('employees')
      .select('*')
      .eq('status', 'active')
      .order('last_name')
      .then(({ data }) => setEmployees(data ?? []))
  }, [])

  function update<K extends keyof JobFormInput>(key: K, value: JobFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Customer">
        <Select
          required
          value={form.customer_id}
          onChange={(e) => update('customer_id', e.target.value)}
        >
          <option value="" disabled>
            Select a customer…
          </option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </Select>
        {customers.length === 0 && (
          <p className="text-xs text-clay mt-1.5">
            No customers yet — add one on the Customers page first.
          </p>
        )}
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Date">
          <Input
            type="date"
            required
            value={form.job_date}
            onChange={(e) => update('job_date', e.target.value)}
          />
        </Field>
        <Field label="Service">
          <Input value={form.service ?? ''} onChange={(e) => update('service', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Status">
          <Select value={form.status} onChange={(e) => update('status', e.target.value as JobFormInput['status'])}>
            <option value="scheduled">Scheduled</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </Select>
        </Field>
        <Field label="Payment status">
          <Select
            value={form.payment_status}
            onChange={(e) => update('payment_status', e.target.value as JobFormInput['payment_status'])}
          >
            <option value="unpaid">Unpaid</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Price ($)">
          <Input
            type="number"
            step="0.01"
            value={form.price ?? ''}
            onChange={(e) => update('price', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Assigned employee">
          {employees.length > 0 ? (
            <Select
              value={form.assigned_employee ?? ''}
              onChange={(e) => update('assigned_employee', e.target.value)}
            >
              <option value="">— Unassigned —</option>
              {employees.map((e) => (
                <option key={e.id} value={`${e.first_name} ${e.last_name}`}>
                  {e.first_name} {e.last_name}
                </option>
              ))}
            </Select>
          ) : (
            <Input
              value={form.assigned_employee ?? ''}
              onChange={(e) => update('assigned_employee', e.target.value)}
              placeholder="Name or leave blank"
            />
          )}
        </Field>
      </div>

      <Field label="Notes">
        <Textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting || customers.length === 0}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add job'}
        </Button>
      </div>
    </form>
  )
}

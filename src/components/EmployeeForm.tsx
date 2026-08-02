import { useState } from 'react'
import { Field, Input, Textarea, Select } from './ui/Field'
import Button from './ui/Button'
import type { Employee, EmployeeFormInput } from '../types'

const emptyForm: EmployeeFormInput = {
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  role: 'cleaner',
  hire_date: '',
  hourly_rate: null,
  status: 'active',
  notes: '',
}

export default function EmployeeForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Employee | null
  onSubmit: (values: EmployeeFormInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<EmployeeFormInput>(
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          email: initial.email,
          phone: initial.phone,
          role: initial.role,
          hire_date: initial.hire_date,
          hourly_rate: initial.hourly_rate,
          status: initial.status,
          notes: initial.notes,
        }
      : emptyForm
  )

  function update<K extends keyof EmployeeFormInput>(key: K, value: EmployeeFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit({
      ...form,
      hire_date: form.hire_date || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <Input required value={form.first_name} onChange={(e) => update('first_name', e.target.value)} />
        </Field>
        <Field label="Last name">
          <Input required value={form.last_name} onChange={(e) => update('last_name', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Email">
          <Input type="email" value={form.email ?? ''} onChange={(e) => update('email', e.target.value)} />
        </Field>
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Role">
          <Select value={form.role} onChange={(e) => update('role', e.target.value as EmployeeFormInput['role'])}>
            <option value="cleaner">Cleaner</option>
            <option value="lead">Lead</option>
            <option value="manager">Manager</option>
            <option value="admin">Admin</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => update('status', e.target.value as EmployeeFormInput['status'])}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="on_leave">On leave</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Hire date">
          <Input type="date" value={form.hire_date ?? ''} onChange={(e) => update('hire_date', e.target.value)} />
        </Field>
        <Field label="Hourly rate ($)">
          <Input
            type="number"
            step="0.01"
            value={form.hourly_rate ?? ''}
            onChange={(e) => update('hourly_rate', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add employee'}
        </Button>
      </div>
    </form>
  )
}

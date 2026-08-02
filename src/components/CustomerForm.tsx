import { useState } from 'react'
import { Field, Input, Textarea, Select } from './ui/Field'
import Button from './ui/Button'
import type { Customer, CustomerFormInput } from '../types'

const emptyForm: CustomerFormInput = {
  first_name: '',
  last_name: '',
  phone: '',
  email: '',
  address: '',
  city: '',
  zip: '',
  gate_code: '',
  alarm_code: '',
  pets: '',
  preferred_cleaner: '',
  cleaning_frequency: 'biweekly',
  square_footage: null,
  bedrooms: null,
  bathrooms: null,
  notes: '',
}

export default function CustomerForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: Customer | null
  onSubmit: (values: CustomerFormInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<CustomerFormInput>(
    initial
      ? {
          first_name: initial.first_name,
          last_name: initial.last_name,
          phone: initial.phone,
          email: initial.email,
          address: initial.address,
          city: initial.city,
          zip: initial.zip,
          gate_code: initial.gate_code,
          alarm_code: initial.alarm_code,
          pets: initial.pets,
          preferred_cleaner: initial.preferred_cleaner,
          cleaning_frequency: initial.cleaning_frequency,
          square_footage: initial.square_footage,
          bedrooms: initial.bedrooms,
          bathrooms: initial.bathrooms,
          notes: initial.notes,
        }
      : emptyForm
  )

  function update<K extends keyof CustomerFormInput>(key: K, value: CustomerFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <Input
            required
            value={form.first_name}
            onChange={(e) => update('first_name', e.target.value)}
          />
        </Field>
        <Field label="Last name">
          <Input
            required
            value={form.last_name}
            onChange={(e) => update('last_name', e.target.value)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Phone">
          <Input value={form.phone ?? ''} onChange={(e) => update('phone', e.target.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email ?? ''}
            onChange={(e) => update('email', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Address">
        <Input value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="City">
          <Input value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} />
        </Field>
        <Field label="ZIP">
          <Input value={form.zip ?? ''} onChange={(e) => update('zip', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Gate code">
          <Input value={form.gate_code ?? ''} onChange={(e) => update('gate_code', e.target.value)} />
        </Field>
        <Field label="Alarm code">
          <Input value={form.alarm_code ?? ''} onChange={(e) => update('alarm_code', e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Sq. footage">
          <Input
            type="number"
            value={form.square_footage ?? ''}
            onChange={(e) => update('square_footage', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Bedrooms">
          <Input
            type="number"
            value={form.bedrooms ?? ''}
            onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
        <Field label="Bathrooms">
          <Input
            type="number"
            step="0.5"
            value={form.bathrooms ?? ''}
            onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Cleaning frequency">
          <Select
            value={form.cleaning_frequency ?? ''}
            onChange={(e) => update('cleaning_frequency', e.target.value)}
          >
            <option value="weekly">Weekly</option>
            <option value="biweekly">Biweekly</option>
            <option value="monthly">Monthly</option>
            <option value="one_time">One-time</option>
          </Select>
        </Field>
        <Field label="Preferred cleaner">
          <Input
            value={form.preferred_cleaner ?? ''}
            onChange={(e) => update('preferred_cleaner', e.target.value)}
          />
        </Field>
      </div>

      <Field label="Pets">
        <Input value={form.pets ?? ''} onChange={(e) => update('pets', e.target.value)} />
      </Field>

      <Field label="Notes">
        <Textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add customer'}
        </Button>
      </div>
    </form>
  )
}

import { useState } from 'react'
import { Field, Input, Textarea, Select } from './ui/Field'
import Button from './ui/Button'
import type { InventoryItem, InventoryFormInput } from '../types'

const emptyForm: InventoryFormInput = {
  name: '',
  category: 'supplies',
  quantity: 0,
  unit: 'each',
  reorder_level: 5,
  unit_cost: null,
  notes: '',
}

export default function InventoryForm({
  initial,
  onSubmit,
  onCancel,
  submitting,
}: {
  initial?: InventoryItem | null
  onSubmit: (values: InventoryFormInput) => void
  onCancel: () => void
  submitting: boolean
}) {
  const [form, setForm] = useState<InventoryFormInput>(
    initial
      ? {
          name: initial.name,
          category: initial.category,
          quantity: initial.quantity,
          unit: initial.unit,
          reorder_level: initial.reorder_level,
          unit_cost: initial.unit_cost,
          notes: initial.notes,
        }
      : emptyForm
  )

  function update<K extends keyof InventoryFormInput>(key: K, value: InventoryFormInput[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    onSubmit(form)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <Field label="Item name">
        <Input required value={form.name} onChange={(e) => update('name', e.target.value)} />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field label="Category">
          <Select value={form.category} onChange={(e) => update('category', e.target.value as InventoryFormInput['category'])}>
            <option value="supplies">Supplies</option>
            <option value="equipment">Equipment</option>
            <option value="consumables">Consumables</option>
            <option value="ppe">PPE</option>
            <option value="other">Other</option>
          </Select>
        </Field>
        <Field label="Unit">
          <Select value={form.unit} onChange={(e) => update('unit', e.target.value)}>
            <option value="each">Each</option>
            <option value="box">Box</option>
            <option value="case">Case</option>
            <option value="gallon">Gallon</option>
            <option value="liter">Liter</option>
            <option value="pack">Pack</option>
            <option value="roll">Roll</option>
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <Field label="Quantity">
          <Input
            type="number"
            step="0.01"
            required
            value={form.quantity}
            onChange={(e) => update('quantity', Number(e.target.value))}
          />
        </Field>
        <Field label="Reorder level">
          <Input
            type="number"
            step="0.01"
            value={form.reorder_level}
            onChange={(e) => update('reorder_level', Number(e.target.value))}
          />
        </Field>
        <Field label="Unit cost ($)">
          <Input
            type="number"
            step="0.01"
            value={form.unit_cost ?? ''}
            onChange={(e) => update('unit_cost', e.target.value ? Number(e.target.value) : null)}
          />
        </Field>
      </div>

      <Field label="Notes">
        <Textarea value={form.notes ?? ''} onChange={(e) => update('notes', e.target.value)} />
      </Field>

      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={submitting}>
          {submitting ? 'Saving…' : initial ? 'Save changes' : 'Add item'}
        </Button>
      </div>
    </form>
  )
}

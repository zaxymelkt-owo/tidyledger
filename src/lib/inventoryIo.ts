import type { InventoryCategory, InventoryFormInput, InventoryItem } from '../types'
import { downloadCsv, parseCsv } from './csv'

const CATEGORIES: InventoryCategory[] = ['supplies', 'equipment', 'consumables', 'ppe', 'other']

export const INVENTORY_CSV_HEADERS = [
  'name',
  'category',
  'quantity',
  'unit',
  'reorder_level',
  'unit_cost',
  'notes',
] as const

function normalizeCategory(raw: string): InventoryCategory {
  const v = raw.trim().toLowerCase()
  if (CATEGORIES.includes(v as InventoryCategory)) return v as InventoryCategory
  return 'other'
}

function num(raw: string | undefined, fallback = 0): number {
  if (raw == null || raw === '') return fallback
  const n = Number(String(raw).replace(/[$,]/g, ''))
  return Number.isFinite(n) ? n : fallback
}

/** Map CSV rows to inventory insert payloads. Skips rows without a name. */
export function csvRowsToInventory(rows: Record<string, string>[]): {
  items: InventoryFormInput[]
  skipped: number
  errors: string[]
} {
  const items: InventoryFormInput[] = []
  const errors: string[] = []
  let skipped = 0

  rows.forEach((row, i) => {
    const name =
      row.name ||
      row.item ||
      row.item_name ||
      row.product ||
      ''
    if (!name.trim()) {
      skipped++
      return
    }

    const quantity = num(row.quantity ?? row.qty ?? row.stock, 0)
    const reorder = num(row.reorder_level ?? row.reorder ?? row.min_qty, 0)
    const unitCostRaw = row.unit_cost ?? row.cost ?? row.price
    const unitCost =
      unitCostRaw === undefined || unitCostRaw === ''
        ? null
        : num(unitCostRaw, 0)

    if (quantity < 0 || reorder < 0) {
      errors.push(`Row ${i + 2}: quantity/reorder cannot be negative (${name})`)
      skipped++
      return
    }

    items.push({
      name: name.trim(),
      category: normalizeCategory(row.category ?? row.type ?? 'other'),
      quantity,
      unit: (row.unit || row.uom || 'ea').trim() || 'ea',
      reorder_level: reorder,
      unit_cost: unitCost,
      notes: (row.notes || row.note || row.description || '').trim() || null,
    })
  })

  return { items, skipped, errors }
}

export function inventoryToCsvRows(items: InventoryItem[]) {
  return items.map((i) => ({
    name: i.name,
    category: i.category,
    quantity: i.quantity,
    unit: i.unit,
    reorder_level: i.reorder_level,
    unit_cost: i.unit_cost,
    notes: i.notes,
  }))
}

export function downloadInventoryCsv(items: InventoryItem[], filename?: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  downloadCsv(filename ?? `inventory-${stamp}.csv`, inventoryToCsvRows(items))
}

/** Template file users can fill in for imports */
export function downloadInventoryTemplate() {
  downloadCsv('inventory-import-template.csv', [
    {
      name: 'All-purpose cleaner',
      category: 'supplies',
      quantity: 12,
      unit: 'bottle',
      reorder_level: 4,
      unit_cost: 3.5,
      notes: 'Example row — replace with your items',
    },
  ])
}

export function openInventoryPdf(
  items: InventoryItem[],
  opts?: { businessName?: string; title?: string }
) {
  const stamp = new Date().toLocaleString()
  const title = opts?.title ?? 'Inventory report'
  const business = opts?.businessName ?? 'TidyLedger'
  const low = items.filter((i) => i.quantity <= i.reorder_level).length
  const totalValue = items.reduce(
    (s, i) => s + (i.unit_cost != null ? i.unit_cost * i.quantity : 0),
    0
  )

  const rows = items
    .map((i) => {
      const lowClass = i.quantity <= i.reorder_level ? ' style="color:#B8433F;font-weight:600"' : ''
      const cost = i.unit_cost != null ? `$${i.unit_cost.toFixed(2)}` : '—'
      const lineVal =
        i.unit_cost != null ? `$${(i.unit_cost * i.quantity).toFixed(2)}` : '—'
      return `<tr>
        <td>${escapeHtml(i.name)}</td>
        <td>${escapeHtml(i.category)}</td>
        <td class="num"${lowClass}>${i.quantity}</td>
        <td>${escapeHtml(i.unit)}</td>
        <td class="num">${i.reorder_level}</td>
        <td class="num">${cost}</td>
        <td class="num">${lineVal}</td>
      </tr>`
    })
    .join('')

  const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #0F1F1A; margin: 0; padding: 28px; }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .muted { color: #4A635A; font-size: 12px; }
    table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
    th, td { border-bottom: 1px solid #B9D0C4; padding: 8px 6px; text-align: left; }
    th { text-transform: uppercase; letter-spacing: 0.04em; color: #4A635A; font-size: 10px; }
    .num { text-align: right; font-variant-numeric: tabular-nums; }
    .summary { margin-top: 16px; font-size: 13px; }
    @media print { body { padding: 0; } .no-print { display: none; } }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p class="muted">${escapeHtml(business)} · Generated ${escapeHtml(stamp)}</p>
  <p class="summary">${items.length} items · ${low} low stock · Est. value $${totalValue.toFixed(2)}</p>
  <table>
    <thead>
      <tr>
        <th>Item</th><th>Category</th><th class="num">Qty</th><th>Unit</th>
        <th class="num">Reorder</th><th class="num">Unit cost</th><th class="num">Value</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="7">No items</td></tr>'}
    </tbody>
  </table>
  <p class="no-print muted" style="margin-top:24px">Use Print → Save as PDF to download.</p>
  <script>window.onload = function () { setTimeout(function () { window.print() }, 200) }</script>
</body>
</html>`

  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=700')
  if (!win) {
    alert('Pop-up blocked — allow pop-ups to export PDF.')
    return
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

import { supabase } from './supabase'
import { downloadCsv, toCsv } from './csv'

/**
 * Business-level data export for offboarding / backup.
 * Downloads several CSV files (and a combined JSON) scoped by RLS to the current tenant.
 */
export async function exportBusinessData(businessName: string) {
  const stamp = new Date().toISOString().slice(0, 10)
  const prefix = `tidyledger-${(businessName || 'business').replace(/\s+/g, '-').toLowerCase()}-${stamp}`

  const tables = [
    'customers',
    'jobs',
    'quotes',
    'quote_requests',
    'payments',
    'transactions',
    'employees',
    'inventory',
    'reviews',
  ] as const

  const bundle: Record<string, unknown[]> = {}

  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('*').limit(10000)
    if (error) {
      console.warn(`export skip ${table}:`, error.message)
      bundle[table] = []
      continue
    }
    const rows = data ?? []
    bundle[table] = rows
    if (rows.length > 0) {
      downloadCsv(
        `${prefix}-${table}.csv`,
        rows as Record<string, string | number | null | undefined>[]
      )
      // Small delay so browsers don’t collapse multiple downloads
      await new Promise((r) => setTimeout(r, 200))
    }
  }

  const json = JSON.stringify(
    { exported_at: new Date().toISOString(), business: businessName, tables: bundle },
    null,
    2
  )
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${prefix}-full.json`
  a.click()
  URL.revokeObjectURL(url)

  return {
    tables: Object.fromEntries(Object.entries(bundle).map(([k, v]) => [k, v.length])),
    csvHint: 'One CSV per table that had rows, plus a full JSON bundle.',
  }
}

export function previewCsvSample(rows: Record<string, unknown>[], max = 3) {
  return toCsv(rows.slice(0, max) as Record<string, string | number | null | undefined>[])
}

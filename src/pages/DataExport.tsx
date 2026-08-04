import { useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { exportBusinessData } from '../lib/businessExport'

export default function DataExport() {
  const { business, isOwnerOrManager } = useAuth()
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function runExport() {
    setBusy(true)
    setError(null)
    setResult(null)
    try {
      const summary = await exportBusinessData(business?.name ?? 'business')
      const lines = Object.entries(summary.tables)
        .map(([k, n]) => `${k}: ${n} rows`)
        .join('\n')
      setResult(`${summary.csvHint}\n\n${lines}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Export failed')
    } finally {
      setBusy(false)
    }
  }

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Data export" subtitle="Backup & offboarding" />
        <main className="p-6 text-sm text-slate">Only owners and managers can export business data.</main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Data export" subtitle="Download customers, jobs, finances, and more" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
        <div className="ticket-card p-6 space-y-4">
          <p className="ticket-number">BACKUP</p>
          <h2 className="font-display text-xl font-semibold text-ink">Export {business?.name ?? 'workspace'} data</h2>
          <p className="text-sm text-slate leading-relaxed">
            Downloads CSV files for each table you can access (customers, jobs, quotes, payments, transactions,
            employees, inventory, reviews) plus a combined JSON bundle. Use this for offboarding, bookkeeping
            archives, or moving to another system. Sensitive gate/alarm codes are included in staff exports —
            store the files securely.
          </p>
          <Button type="button" onClick={runExport} disabled={busy}>
            {busy ? 'Exporting…' : 'Download export'}
          </Button>
          {error && (
            <div className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay">{error}</div>
          )}
          {result && (
            <pre className="text-xs text-slate whitespace-pre-wrap rounded-lg border border-line bg-paper p-3">
              {result}
            </pre>
          )}
        </div>
      </main>
    </>
  )
}

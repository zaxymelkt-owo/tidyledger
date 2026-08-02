import { useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

export default function CommissionTerms() {
  const { business, refreshProfile, isOwnerOrManager } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)

  async function accept() {
    setBusy(true)
    setError(null)
    const { error } = await supabase.rpc('accept_commission_terms')
    setBusy(false)
    if (error) setError(error.message)
    else {
      setDone(true)
      await refreshProfile()
    }
  }

  return (
    <>
      <Topbar title="Platform commission terms" subtitle={business?.name} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 max-w-2xl">
        <div className="ticket-card p-6 space-y-4">
          <p className="text-sm text-slate">
            Rate:{' '}
            <span className="font-mono-num text-ink font-medium">
              {business?.commission_rate_pct ?? 8}%
            </span>{' '}
            of paid job revenue
          </p>
          <pre className="text-xs whitespace-pre-wrap bg-paper border border-line rounded-lg p-4 text-ink">
            {business?.commission_terms || 'Terms will appear after TidyLedger sends them.'}
          </pre>
          {error && <p className="text-sm text-clay">{error}</p>}
          {done && <p className="text-sm text-sage-deep">Terms accepted. Thank you.</p>}
          {isOwnerOrManager && !business?.commission_accepted_at && (
            <Button onClick={accept} disabled={busy}>
              {busy ? 'Saving…' : 'Accept terms'}
            </Button>
          )}
          {business?.commission_accepted_at && (
            <p className="text-sm text-sage-deep">Already accepted.</p>
          )}
        </div>
      </main>
    </>
  )
}

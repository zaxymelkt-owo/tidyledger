import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Textarea, Select } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { CommissionEntry } from '../types'

type Dispute = {
  id: string
  created_at: string
  business_id: string
  commission_id: string | null
  subject: string
  description: string
  status: 'open' | 'under_review' | 'resolved' | 'rejected'
  resolution: string | null
  resolved_at: string | null
}

export default function CommissionDisputes() {
  const { business, isPlatformAdmin, isOwnerOrManager, profile } = useAuth()
  const [rows, setRows] = useState<Dispute[]>([])
  const [commissions, setCommissions] = useState<CommissionEntry[]>([])
  const [open, setOpen] = useState(false)
  const [subject, setSubject] = useState('')
  const [description, setDescription] = useState('')
  const [commissionId, setCommissionId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [resolveId, setResolveId] = useState<string | null>(null)
  const [resolution, setResolution] = useState('')
  const [resolveStatus, setResolveStatus] = useState<'resolved' | 'rejected'>('resolved')

  useEffect(() => {
    load()
  }, [business?.id, isPlatformAdmin])

  async function load() {
    let q = supabase.from('commission_disputes').select('*').order('created_at', { ascending: false })
    if (!isPlatformAdmin && business?.id) q = q.eq('business_id', business.id)
    const { data, error } = await q
    if (error) setError(error.message)
    setRows((data as Dispute[]) ?? [])

    if (business?.id) {
      const { data: c } = await supabase
        .from('commission_entries')
        .select('*')
        .eq('business_id', business.id)
        .order('period_end', { ascending: false })
        .limit(20)
      setCommissions((c as CommissionEntry[]) ?? [])
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!business?.id) {
      setError('Business context required')
      return
    }
    setBusy(true)
    setError(null)
    const { error } = await supabase.from('commission_disputes').insert({
      business_id: business.id,
      commission_id: commissionId || null,
      opened_by: profile?.id ?? null,
      subject: subject.trim(),
      description: description.trim(),
      status: 'open',
    })
    setBusy(false)
    if (error) setError(error.message)
    else {
      setOpen(false)
      setSubject('')
      setDescription('')
      setCommissionId('')
      load()
    }
  }

  async function resolve() {
    if (!resolveId) return
    setBusy(true)
    const { error } = await supabase
      .from('commission_disputes')
      .update({
        status: resolveStatus,
        resolution,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', resolveId)
    setBusy(false)
    if (error) setError(error.message)
    else {
      setResolveId(null)
      setResolution('')
      load()
    }
  }

  return (
    <>
      <Topbar title="Commission disputes" subtitle="Challenge or review platform fees" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            <p className="text-xs mt-1">Run database/010_disputes_tax.sql if tables are missing.</p>
          </div>
        )}

        {isOwnerOrManager && (
          <div className="mb-4">
            <Button onClick={() => setOpen(true)}>Open dispute</Button>
          </div>
        )}

        <div className="ticket-card overflow-hidden">
          <div className="table-scroll">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase text-slate">
                  <th className="px-4 py-3">Subject</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Opened</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate">
                      No disputes yet.
                    </td>
                  </tr>
                )}
                {rows.map((d) => (
                  <tr key={d.id} className="border-b border-line/70">
                    <td className="px-4 py-3">
                      <p className="font-medium text-ink">{d.subject}</p>
                      <p className="text-xs text-slate line-clamp-2">{d.description}</p>
                      {d.resolution && (
                        <p className="text-xs text-sage-deep mt-1">Resolution: {d.resolution}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 capitalize">{d.status.replace('_', ' ')}</td>
                    <td className="px-4 py-3 text-slate">{format(new Date(d.created_at), 'MMM d, yyyy')}</td>
                    <td className="px-4 py-3">
                      {isPlatformAdmin && d.status !== 'resolved' && d.status !== 'rejected' && (
                        <button
                          type="button"
                          className="text-xs font-medium text-sage-deep hover:underline"
                          onClick={() => setResolveId(d.id)}
                        >
                          Resolve
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Open commission dispute">
        <form onSubmit={submit} className="space-y-4">
          <Field label="Related commission (optional)">
            <Select value={commissionId} onChange={(e) => setCommissionId(e.target.value)}>
              <option value="">— None —</option>
              {commissions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.period_start} → {c.period_end} · ${Number(c.commission_due).toFixed(2)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Subject">
            <Input required value={subject} onChange={(e) => setSubject(e.target.value)} />
          </Field>
          <Field label="Description">
            <Textarea required rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              Submit
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!resolveId} onClose={() => setResolveId(null)} title="Resolve dispute">
        <div className="space-y-4">
          <Field label="Outcome">
            <Select
              value={resolveStatus}
              onChange={(e) => setResolveStatus(e.target.value as 'resolved' | 'rejected')}
            >
              <option value="resolved">Resolved (favor business / adjusted)</option>
              <option value="rejected">Rejected</option>
            </Select>
          </Field>
          <Field label="Resolution notes">
            <Textarea rows={3} value={resolution} onChange={(e) => setResolution(e.target.value)} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setResolveId(null)}>
              Cancel
            </Button>
            <Button type="button" onClick={resolve} disabled={busy}>
              Save
            </Button>
          </div>
        </div>
      </Modal>
    </>
  )
}

import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import Modal from '../components/ui/Modal'
import { Field, Input, Select } from '../components/ui/Field'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import type { Profile, StaffInvite } from '../types'

export default function Team() {
  const { business, isOwnerOrManager, profile } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [invites, setInvites] = useState<StaffInvite[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [role, setRole] = useState<'employee' | 'manager'>('employee')
  const [busy, setBusy] = useState(false)
  const [lastLink, setLastLink] = useState<string | null>(null)

  useEffect(() => {
    load()
  }, [business?.id])

  async function load() {
    if (!business?.id) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    const [m, i] = await Promise.all([
      supabase
        .from('profiles')
        .select('*')
        .eq('business_id', business.id)
        .in('role', ['owner', 'manager', 'employee'])
        .order('created_at'),
      supabase
        .from('staff_invites')
        .select('*')
        .eq('business_id', business.id)
        .is('accepted_at', null)
        .order('created_at', { ascending: false }),
    ])
    if (m.error) setError(m.error.message)
    setMembers((m.data as Profile[]) ?? [])
    setInvites((i.data as StaffInvite[]) ?? [])
    setLoading(false)
  }

  async function createInvite(e: React.FormEvent) {
    e.preventDefault()
    if (!business?.id || !profile) return
    setBusy(true)
    setError(null)
    const { data, error } = await supabase
      .from('staff_invites')
      .insert({
        business_id: business.id,
        email: email.trim().toLowerCase(),
        full_name: fullName.trim() || null,
        role,
        invited_by: profile.id,
      })
      .select('*')
      .single()
    setBusy(false)
    if (error) {
      setError(error.message)
      return
    }
    const inv = data as StaffInvite
    const link = `${window.location.origin}${import.meta.env.BASE_URL}invite/${inv.token}`
    setLastLink(link)
    setOpen(false)
    setEmail('')
    setFullName('')
    setRole('employee')
    await load()
  }

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Team" subtitle="Staff access" />
        <main className="p-6">
          <p className="text-sm text-slate">Only owners and managers can manage staff logins.</p>
        </main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Team" subtitle={business ? business.name : 'Staff logins'} />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {(error.includes('staff_invites') || error.includes('relation')) && (
              <p className="text-xs mt-1">Run database/008_multitenant_accounts.sql in Supabase.</p>
            )}
          </div>
        )}

        {lastLink && (
          <div className="mb-4 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 text-sm">
            <p className="font-medium text-sage-deep mb-1">Invite link ready — send this to your employee:</p>
            <code className="text-xs break-all text-ink">{lastLink}</code>
            <button
              type="button"
              className="block mt-2 text-xs font-medium text-brass-deep hover:underline"
              onClick={() => navigator.clipboard.writeText(lastLink)}
            >
              Copy link
            </button>
          </div>
        )}

        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-slate">Create a login invite for cleaners and managers.</p>
          <Button onClick={() => setOpen(true)}>+ Invite staff</Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold">Active team</h3>
            </div>
            {loading ? (
              <p className="p-5 text-sm text-slate">Loading…</p>
            ) : members.length === 0 ? (
              <p className="p-5 text-sm text-slate">No profiles yet — create your business workspace first.</p>
            ) : (
              <ul className="divide-y divide-line">
                {members.map((m) => (
                  <li key={m.id} className="px-5 py-3 flex justify-between gap-2 text-sm">
                    <div>
                      <p className="font-medium text-ink">{m.full_name || m.email}</p>
                      <p className="text-xs text-slate">{m.email}</p>
                    </div>
                    <span className="chip-purple text-[11px] font-medium px-2 py-0.5 rounded-full capitalize h-fit">
                      {m.role}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line">
              <h3 className="font-display font-semibold">Pending invites</h3>
            </div>
            {invites.length === 0 ? (
              <p className="p-5 text-sm text-slate">No open invites.</p>
            ) : (
              <ul className="divide-y divide-line">
                {invites.map((inv) => (
                  <li key={inv.id} className="px-5 py-3 text-sm">
                    <div className="flex justify-between gap-2">
                      <p className="font-medium text-ink">{inv.full_name || inv.email}</p>
                      <span className="text-xs capitalize text-slate">{inv.role}</span>
                    </div>
                    <p className="text-xs text-slate">{inv.email}</p>
                    <p className="text-[11px] text-slate mt-1">
                      Expires {format(new Date(inv.expires_at), 'MMM d, yyyy')}
                    </p>
                    <button
                      type="button"
                      className="text-xs font-medium text-brass mt-1 hover:underline"
                      onClick={() => {
                        const link = `${window.location.origin}${import.meta.env.BASE_URL}invite/${inv.token}`
                        navigator.clipboard.writeText(link)
                        setLastLink(link)
                      }}
                    >
                      Copy invite link
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </main>

      <Modal open={open} onClose={() => setOpen(false)} title="Invite staff member">
        <form onSubmit={createInvite} className="space-y-4">
          <Field label="Email">
            <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Full name">
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </Field>
          <Field label="Role">
            <Select value={role} onChange={(e) => setRole(e.target.value as 'employee' | 'manager')}>
              <option value="employee">Employee</option>
              <option value="manager">Manager</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy ? 'Creating…' : 'Create invite'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  )
}

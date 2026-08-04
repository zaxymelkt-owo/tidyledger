import { useEffect, useState } from 'react'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { Field, Input } from '../components/ui/Field'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { Profile } from '../types'

const roleStyles: Record<string, string> = {
  owner: 'bg-sage-deep text-white',
  manager: 'bg-sage/15 text-sage-deep',
  employee: 'bg-line text-slate',
}

const defaultPayRates = {
  owner: 24,
  manager: 22,
  employee: 18,
}

export default function RoleHierarchy() {
  const { business, profile, isOwnerOrManager } = useAuth()
  const [members, setMembers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busyIds, setBusyIds] = useState<string[]>([])
  const [payRates, setPayRates] = useState(defaultPayRates)
  const [bonusMessage, setBonusMessage] = useState('')
  const [settingsSaved, setSettingsSaved] = useState(false)

  useEffect(() => {
    if (!business?.id) {
      setLoading(false)
      return
    }

    loadMembers()
    const stored = localStorage.getItem('tidyledger_role_settings')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        setPayRates({ ...defaultPayRates, ...(parsed.payRates ?? {}) })
        setBonusMessage(parsed.bonusMessage ?? '')
      } catch {
        // Ignore malformed local settings.
      }
    }
  }, [business?.id])

  async function loadMembers() {
    if (!business?.id) return
    setLoading(true)
    setError(null)
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('business_id', business.id)
      .in('role', ['owner', 'manager', 'employee'])
      .order('created_at', { ascending: true })

    if (error) setError(error.message)
    else setMembers((data as Profile[]) ?? [])
    setLoading(false)
  }

  async function updateMemberRole(member: Profile, role: Profile['role']) {
    if (!business?.id || !isOwnerOrManager) return
    setBusyIds((prev) => [...prev, member.id])
    setError(null)
    const { error } = await supabase.from('profiles').update({ role }).eq('id', member.id)
    if (error) setError(error.message)
    else await loadMembers()
    setBusyIds((prev) => prev.filter((id) => id !== member.id))
  }

  async function toggleSuspended(member: Profile) {
    if (!business?.id || !isOwnerOrManager) return
    setBusyIds((prev) => [...prev, member.id])
    setError(null)
    const { error } = await supabase
      .from('profiles')
      .update({ active: !member.active })
      .eq('id', member.id)

    if (error) setError(error.message)
    else await loadMembers()
    setBusyIds((prev) => prev.filter((id) => id !== member.id))
  }

  function saveRoleSettings() {
    localStorage.setItem(
      'tidyledger_role_settings',
      JSON.stringify({
        payRates,
        bonusMessage,
      })
    )
    setSettingsSaved(true)
  }

  function splitName(fullName: string | null, email: string | null) {
    const fallback = (fullName || email || '').trim()
    if (!fallback) return { firstName: 'Unnamed', lastName: 'Member' }
    const parts = fallback.split(/\s+/)
    return {
      firstName: parts[0] ?? 'Unnamed',
      lastName: parts.slice(1).join(' ') || 'Member',
    }
  }

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Roles" subtitle="Business access" />
        <main className="p-6 text-sm text-slate">Only business owners and managers can manage role access.</main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Roles" subtitle="Business team access" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">{error}</div>}
        {settingsSaved && (
          <div className="mb-4 rounded-lg border border-sage/30 bg-sage/10 px-4 py-3 text-sm text-sage-deep">
            Default pay and bonus settings saved for this browser.
          </div>
        )}

        <div className="space-y-6">
          <div className="ticket-card overflow-hidden">
            <div className="px-5 py-4 border-b border-line flex items-center justify-between">
              <h3 className="font-display font-semibold text-ink">Business team roles</h3>
              <span className="text-xs text-slate">First name, last name, role, and status</span>
            </div>

            {loading ? (
              <p className="p-5 text-sm text-slate">Loading business members…</p>
            ) : members.length === 0 ? (
              <p className="p-5 text-sm text-slate">No business profiles found for this workspace yet.</p>
            ) : (
              <div className="divide-y divide-line">
                {members.map((member) => {
                  const { firstName, lastName } = splitName(member.full_name, member.email)
                  return (
                    <div key={member.id} className="px-5 py-3 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                      <div className="min-w-0 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate">First name</p>
                          <p className="font-medium text-ink">{firstName}</p>
                        </div>
                        <div>
                          <p className="text-[11px] uppercase tracking-wide text-slate">Last name</p>
                          <p className="font-medium text-ink">{lastName}</p>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold capitalize ${roleStyles[member.role]}`}>
                          {member.role}
                        </span>
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${member.active ? 'bg-sage/10 text-sage-deep' : 'bg-clay/10 text-clay'}`}>
                          {member.active ? 'Active' : 'Suspended'}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {member.id !== profile?.id && member.role !== 'owner' && (
                          <>
                            {member.role === 'employee' && (
                              <Button type="button" variant="secondary" disabled={busyIds.includes(member.id)} onClick={() => updateMemberRole(member, 'manager')}>
                                Promote to manager
                              </Button>
                            )}
                            {member.role === 'manager' && (
                              <Button type="button" variant="secondary" disabled={busyIds.includes(member.id)} onClick={() => updateMemberRole(member, 'employee')}>
                                Demote to employee
                              </Button>
                            )}
                          </>
                        )}

                        {member.id !== profile?.id && (
                          <Button
                            type="button"
                            variant={member.active ? 'secondary' : 'primary'}
                            disabled={busyIds.includes(member.id)}
                            onClick={() => toggleSuspended(member)}
                          >
                            {member.active ? 'Suspend' : 'Restore'}
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div className="ticket-card p-5 space-y-4">
            <div>
              <h3 className="font-display font-semibold text-ink">Payroll defaults & bonus alerts</h3>
              <p className="text-sm text-slate mt-1">Set default pay rates per role and prepare a bonus message for the employee dashboard inbox.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <Field label="Owner default pay ($/hr)">
                <Input type="number" value={payRates.owner} onChange={(e) => setPayRates((prev) => ({ ...prev, owner: Number(e.target.value) || 0 }))} />
              </Field>
              <Field label="Manager default pay ($/hr)">
                <Input type="number" value={payRates.manager} onChange={(e) => setPayRates((prev) => ({ ...prev, manager: Number(e.target.value) || 0 }))} />
              </Field>
              <Field label="Employee default pay ($/hr)">
                <Input type="number" value={payRates.employee} onChange={(e) => setPayRates((prev) => ({ ...prev, employee: Number(e.target.value) || 0 }))} />
              </Field>
            </div>

            <Field label="Bonus alert message">
              <Input value={bonusMessage} onChange={(e) => setBonusMessage(e.target.value)} placeholder="Quarterly bonus approved — check your dashboard inbox." />
            </Field>

            <div className="flex justify-end">
              <Button type="button" onClick={saveRoleSettings}>Save settings</Button>
            </div>
          </div>
        </div>
      </main>
    </>
  )
}

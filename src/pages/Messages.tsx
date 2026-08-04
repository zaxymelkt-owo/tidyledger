import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

type PortalMessage = {
  id: string
  created_at: string
  business_id: string | null
  customer_id: string | null
  customer_name: string | null
  customer_email: string | null
  body: string
  read_at: string | null
}

export default function Messages() {
  const { business, isOwnerOrManager } = useAuth()
  const [items, setItems] = useState<PortalMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<PortalMessage | null>(null)

  useEffect(() => {
    load()
  }, [business?.id])

  async function load() {
    setLoading(true)
    setError(null)
    let q = supabase.from('portal_messages').select('*').order('created_at', { ascending: false }).limit(100)
    if (business?.id) q = q.eq('business_id', business.id)
    const { data, error } = await q
    if (error) setError(error.message)
    else setItems((data as PortalMessage[]) ?? [])
    setLoading(false)
  }

  async function markRead(msg: PortalMessage) {
    setSelected(msg)
    if (msg.read_at) return
    const { error } = await supabase
      .from('portal_messages')
      .update({ read_at: new Date().toISOString() })
      .eq('id', msg.id)
    if (!error) {
      setItems((list) =>
        list.map((m) => (m.id === msg.id ? { ...m, read_at: new Date().toISOString() } : m))
      )
      setSelected((s) => (s?.id === msg.id ? { ...s, read_at: new Date().toISOString() } : s))
    }
  }

  async function markAllRead() {
    const unread = items.filter((m) => !m.read_at)
    if (!unread.length) return
    const ids = unread.map((m) => m.id)
    const { error } = await supabase
      .from('portal_messages')
      .update({ read_at: new Date().toISOString() })
      .in('id', ids)
    if (error) setError(error.message)
    else load()
  }

  const unreadCount = items.filter((m) => !m.read_at).length

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Messages" subtitle="Customer portal inbox" />
        <main className="p-6 text-sm text-slate">Only owners and managers can view portal messages.</main>
      </>
    )
  }

  return (
    <>
      <Topbar
        title="Messages"
        subtitle={
          unreadCount > 0
            ? `${unreadCount} unread from the customer portal`
            : 'Messages from the customer portal'
        }
      />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {error && (
          <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay">
            {error}
            {error.includes('portal_messages') && (
              <p className="text-xs mt-1">Run database/014_portal_quote_actions.sql in Supabase.</p>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-4">
          <Button type="button" variant="secondary" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button type="button" variant="secondary" onClick={markAllRead} disabled={unreadCount === 0}>
            Mark all read
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          <div className="lg:col-span-2 ticket-card overflow-hidden">
            <div className="px-4 py-3 border-b border-line">
              <h2 className="font-display font-semibold text-ink text-sm">Inbox</h2>
            </div>
            {loading ? (
              <p className="p-5 text-sm text-slate">Loading…</p>
            ) : items.length === 0 ? (
              <p className="p-5 text-sm text-slate">No portal messages yet.</p>
            ) : (
              <ul className="divide-y divide-line max-h-[70vh] overflow-y-auto">
                {items.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => markRead(m)}
                      className={`w-full text-left px-4 py-3 hover:bg-sage/5 ${
                        selected?.id === m.id ? 'bg-sage/10' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm ${m.read_at ? 'text-slate' : 'font-semibold text-ink'}`}>
                          {m.customer_name || m.customer_email || 'Customer'}
                        </span>
                        {!m.read_at && (
                          <span className="w-2 h-2 rounded-full bg-sage-deep shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate mt-0.5 line-clamp-2">{m.body}</p>
                      <p className="text-[11px] text-slate/80 mt-1">
                        {format(new Date(m.created_at), 'MMM d, yyyy · h:mm a')}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="lg:col-span-3 ticket-card p-5 min-h-[240px]">
            {!selected ? (
              <p className="text-sm text-slate">Select a message to read it.</p>
            ) : (
              <div className="space-y-3">
                <div>
                  <p className="ticket-number mb-1">PORTAL MESSAGE</p>
                  <h2 className="font-display text-xl font-semibold text-ink">
                    {selected.customer_name || 'Customer'}
                  </h2>
                  {selected.customer_email && (
                    <a
                      href={`mailto:${selected.customer_email}`}
                      className="text-sm text-sage-deep hover:underline"
                    >
                      {selected.customer_email}
                    </a>
                  )}
                  <p className="text-xs text-slate mt-1">
                    {format(new Date(selected.created_at), 'EEEE, MMM d, yyyy · h:mm a')}
                    {selected.read_at ? ' · Read' : ' · Unread'}
                  </p>
                </div>
                <p className="text-sm text-ink leading-relaxed whitespace-pre-wrap border-t border-line pt-4">
                  {selected.body}
                </p>
                {selected.customer_email && (
                  <a href={`mailto:${selected.customer_email}?subject=Re: your message`}>
                    <Button type="button" variant="secondary">
                      Reply by email
                    </Button>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}

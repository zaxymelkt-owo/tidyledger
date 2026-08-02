import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import Seo from '../components/Seo'

type InviteInfo = {
  id: string
  email: string
  full_name: string | null
  role: string
  business_name: string
  expires_at: string
  accepted_at: string | null
}

export default function AcceptInvite() {
  const { token } = useParams<{ token: string }>()
  const { signUp, signIn, refreshProfile, session } = useAuth()
  const navigate = useNavigate()
  const [invite, setInvite] = useState<InviteInfo | null>(null)
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      const { data, error } = await supabase.rpc('get_staff_invite', { p_token: token })
      if (error) setError(error.message)
      else {
        const row = Array.isArray(data) ? data[0] : data
        setInvite(row as InviteInfo)
      }
      setLoading(false)
    })()
  }, [token])

  async function accept(e: React.FormEvent) {
    e.preventDefault()
    if (!invite || !token) return
    setBusy(true)
    setError(null)
    try {
      if (!session) {
        let { error } = await signUp(invite.email, password)
        if (error) {
          const again = await signIn(invite.email, password)
          if (again.error) throw new Error(error)
        } else {
          await signIn(invite.email, password)
        }
      }
      const { error: accErr } = await supabase.rpc('accept_staff_invite', { p_token: token })
      if (accErr) throw accErr
      await refreshProfile()
      navigate('/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not accept invite')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Seo title="Accept staff invite" noIndex path={`/invite/${token || ''}`} />
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center">
            <Link to="/" className="font-display font-semibold text-lg">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md ticket-card p-6">
            {loading && <p className="text-sm text-slate">Loading invite…</p>}
            {error && (
              <div className="mb-4 rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay">
                {error}
              </div>
            )}
            {invite && !invite.accepted_at && new Date(invite.expires_at) > new Date() && (
              <>
                <p className="ticket-number mb-1">STAFF INVITE</p>
                <h1 className="font-display text-xl font-semibold text-ink mb-1">
                  Join {invite.business_name}
                </h1>
                <p className="text-sm text-slate mb-4">
                  You’re invited as <span className="capitalize text-ink font-medium">{invite.role}</span> (
                  {invite.email}).
                </p>
                <form onSubmit={accept} className="space-y-4">
                  {!session && (
                    <Field label="Choose a password">
                      <Input
                        type="password"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                      />
                    </Field>
                  )}
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Joining…' : 'Accept & continue'}
                  </Button>
                </form>
              </>
            )}
            {invite?.accepted_at && (
              <p className="text-sm text-slate">
                This invite was already accepted.{' '}
                <Link to="/login" className="text-sage-deep underline">
                  Sign in
                </Link>
              </p>
            )}
          </div>
        </main>
      </div>
    </>
  )
}

import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Field, Input } from '../../components/ui/Field'
import Button from '../../components/ui/Button'
import { supabase } from '../../lib/supabase'
import Seo from '../../components/Seo'
import { useAuth } from '../../contexts/AuthContext'

const STORAGE_KEY = 'tidyledger_portal_customer'

export type PortalSession = {
  id: string
  first_name: string
  last_name: string
  email: string
  portal_code: string
  business_id?: string | null
  claimed?: boolean
}

// Shape returned by the portal_login RPC — deliberately narrow. It never
// includes gate_code/alarm_code/notes/etc; the portal UI has no need for
// them and shouldn't be fetching them client-side.
type PortalLoginResult = {
  id: string
  first_name: string
  last_name: string
  email: string | null
  portal_code: string | null
  business_id: string | null
  auth_user_id: string | null
  account_claimed_at: string | null
}

export function savePortalCustomer(c: PortalLoginResult & { portal_code: string }) {
  const session: PortalSession = {
    id: c.id,
    first_name: c.first_name,
    last_name: c.last_name,
    email: (c.email || '').trim(),
    portal_code: c.portal_code,
    business_id: c.business_id,
    claimed: Boolean(c.auth_user_id || c.account_claimed_at),
  }
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session))
}

export function loadPortalCustomer(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PortalSession
    if (!parsed?.id || !parsed?.email || !parsed?.portal_code) return null
    return parsed
  } catch {
    return null
  }
}

export function clearPortalCustomer() {
  sessionStorage.removeItem(STORAGE_KEY)
}

export default function PortalLogin() {
  const navigate = useNavigate()
  const { signIn, signUp, refreshProfile, session } = useAuth()
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [mode, setMode] = useState<'code' | 'password' | 'claim'>('code')
  const [pendingClaim, setPendingClaim] = useState<PortalLoginResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [info, setInfo] = useState<string | null>(null)

  async function handleCodeLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setInfo(null)
    try {
      const { data, error } = await supabase
        .rpc('portal_login', { p_email: email.trim(), p_portal_code: code.trim() })
        .returns<PortalLoginResult[]>()
        .maybeSingle()

      if (error) throw error
      if (!data) {
        setError('No portal account found for that email and access code.')
        return
      }

      // Already claimed — prefer password login
      if (data.auth_user_id || data.account_claimed_at) {
        setPendingClaim(data)
        setMode('password')
        setInfo('This portal is linked to a password. Sign in with your password, or use “Set password” if this is your first time after the code.')
        return
      }

      // First-time code success → offer password claim
      setPendingClaim(data)
      savePortalCustomer({ ...data, portal_code: data.portal_code ?? code.trim() })
      setMode('claim')
      setInfo('Code accepted. Create a password so you can sign in next time without the portal code.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.')
    } finally {
      setLoading(false)
    }
  }

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await signIn(email.trim(), password)
    if (error) {
      setError(error)
      setLoading(false)
      return
    }
    await refreshProfile()
    if (pendingClaim?.portal_code) {
      savePortalCustomer({ ...pendingClaim, portal_code: pendingClaim.portal_code })
    }
    setLoading(false)
    navigate('/portal/dashboard')
  }

  async function handleClaim(e: React.FormEvent) {
    e.preventDefault()
    if (!pendingClaim?.portal_code) return
    setLoading(true)
    setError(null)
    try {
      let { error } = await signUp(email.trim(), password)
      if (error) {
        // existing user — try sign in
        const again = await signIn(email.trim(), password)
        if (again.error) throw new Error(error)
      } else {
        await signIn(email.trim(), password)
      }

      const { error: claimErr } = await supabase.rpc('claim_customer_account', {
        p_email: email.trim(),
        p_portal_code: pendingClaim.portal_code,
      })
      if (claimErr) throw claimErr

      await refreshProfile()
      savePortalCustomer({
        ...pendingClaim,
        portal_code: pendingClaim.portal_code,
        auth_user_id: session?.user?.id ?? pendingClaim.auth_user_id,
        account_claimed_at: new Date().toISOString(),
      })
      navigate('/portal/dashboard')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create account')
    } finally {
      setLoading(false)
    }
  }

  function skipClaim() {
    if (pendingClaim?.portal_code) {
      savePortalCustomer({ ...pendingClaim, portal_code: pendingClaim.portal_code })
      navigate('/portal/dashboard')
    }
  }

  return (
    <>
      <Seo
        title="Customer portal"
        description="Access your jobs, quotes, and payments with your customer portal code or password."
        path="/portal"
      />
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="font-display font-semibold text-lg">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
            <Link to="/" className="text-xs text-slate hover:text-ink">
              ← Hub
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <p className="ticket-number mb-1">CUSTOMER PORTAL</p>
            <h1 className="font-display text-2xl font-semibold text-ink mb-1">
              {mode === 'claim' ? 'Create your password' : mode === 'password' ? 'Welcome back' : 'Sign in'}
            </h1>
            <p className="text-sm text-slate mb-6">
              {mode === 'code' && 'Use the email and one-time portal code from your cleaner.'}
              {mode === 'claim' && 'After this, you can sign in with email + password only.'}
              {mode === 'password' && 'Use the password you created after your first portal code login.'}
            </p>

            <div className="ticket-card p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay">{error}</div>
              )}
              {info && (
                <div className="rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 text-sm text-sage-deep">{info}</div>
              )}

              {mode === 'code' && (
                <form onSubmit={handleCodeLogin} className="space-y-4">
                  <Field label="Email">
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Portal code">
                    <Input required value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Checking…' : 'Continue'}
                  </Button>
                  <button
                    type="button"
                    className="w-full text-xs text-brass hover:underline"
                    onClick={() => setMode('password')}
                  >
                    I already set a password
                  </button>
                </form>
              )}

              {mode === 'password' && (
                <form onSubmit={handlePasswordLogin} className="space-y-4">
                  <Field label="Email">
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Password">
                    <Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Signing in…' : 'Sign in'}
                  </Button>
                  <button type="button" className="w-full text-xs text-slate hover:underline" onClick={() => setMode('code')}>
                    Use portal code instead
                  </button>
                </form>
              )}

              {mode === 'claim' && (
                <form onSubmit={handleClaim} className="space-y-4">
                  <Field label="Email">
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Create password">
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? 'Saving…' : 'Save password & enter portal'}
                  </Button>
                  <button type="button" className="w-full text-xs text-slate hover:underline" onClick={skipClaim}>
                    Skip for now (code only this session)
                  </button>
                </form>
              )}
            </div>

            <p className="mt-6 text-center text-xs text-slate">
              Need an access code? Ask your cleaner — portal access is enabled by staff from Customers.
            </p>
          </div>
        </main>
      </div>
    </>
  )
}

import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import Seo from '../components/Seo'
import { clearPortalCustomer } from './portal/PortalLogin'

export default function Login() {
  const { session, signIn, signOut, resetPassword, isPlatformAdmin, profile } = useAuth()
  const [params] = useSearchParams()
  const intent = params.get('intent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [info, setInfo] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [mode, setMode] = useState<'sign_in' | 'forgot'>('sign_in')
  const isStaffIntent = intent === 'employee' || intent === 'owner'

  if (session && !isStaffIntent && mode === 'sign_in') {
    return (
      <Navigate
        to={
          isPlatformAdmin
            ? '/platform'
            : profile?.role === 'customer'
              ? '/portal/dashboard'
              : '/dashboard'
        }
        replace
      />
    )
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      setError('Enter your email to continue.')
      return
    }

    if (mode === 'forgot') {
      setSubmitting(true)
      setError(null)
      setInfo(null)
      try {
        const { error } = await resetPassword(email.trim())
        if (error) setError(error)
        else {
          setInfo('If an account exists for that email, a reset link is on its way. Check your inbox and spam folder.')
        }
      } finally {
        setSubmitting(false)
      }
      return
    }

    if (!password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }

    setSubmitting(true)
    setError(null)
    setInfo(null)

    try {
      if (profile?.role === 'customer' && isStaffIntent) {
        clearPortalCustomer()
        await signOut()
      }

      const { error } = await signIn(email.trim(), password)
      if (error) setError(error)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <Seo title="Staff sign in" description="Sign in to the TidyLedger admin dashboard." path="/login" noIndex />
      <div className="min-h-screen flex flex-col bg-paper">
        <header className="border-b border-line bg-paper-raised">
          <div className="max-w-sm mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="font-display font-semibold text-lg text-ink">
              Tidy<span className="text-sage-deep">Ledger</span>
            </Link>
            <Link to="/" className="text-xs text-slate hover:text-ink">
              ← Hub
            </Link>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-sm">
            <div className="text-center mb-6">
              <p className="ticket-number mb-1">STAFF ACCESS</p>
              <h1 className="font-display font-semibold text-2xl tracking-tight text-ink">
                {mode === 'forgot' ? 'Reset password' : 'Sign in'}
              </h1>
              <p className="text-sm text-slate mt-1">
                {mode === 'forgot'
                  ? 'We will email a link to choose a new password.'
                  : intent === 'employee'
                    ? 'Employee sign-in — use the account from your invite'
                    : intent === 'owner'
                      ? 'Business owner & platform operator sign-in'
                      : 'Staff and platform sign-in'}
              </p>
            </div>

            <form onSubmit={handleSubmit} className="ticket-card p-6 pt-8 space-y-4">
              {error && (
                <div className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay">
                  {error}
                </div>
              )}
              {info && (
                <div className="rounded-lg border border-sage/30 bg-sage/10 px-3 py-2 text-sm text-sage-deep">
                  {info}
                </div>
              )}
              {session && profile?.role === 'customer' && isStaffIntent && mode === 'sign_in' && (
                <div className="rounded-lg border border-brass/30 bg-brass/5 px-3 py-2 text-sm text-brass">
                  Switching from customer portal to staff sign-in.
                </div>
              )}

              <Field label="Email">
                <Input
                  type="email"
                  required
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </Field>

              {mode === 'sign_in' && (
                <Field label="Password">
                  <Input
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </Field>
              )}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting
                  ? mode === 'forgot'
                    ? 'Sending…'
                    : 'Signing in…'
                  : mode === 'forgot'
                    ? 'Send reset link'
                    : 'Sign in'}
              </Button>

              <button
                type="button"
                className="w-full text-xs text-brass hover:underline"
                onClick={() => {
                  setMode((m) => (m === 'sign_in' ? 'forgot' : 'sign_in'))
                  setError(null)
                  setInfo(null)
                }}
              >
                {mode === 'forgot' ? 'Back to sign in' : 'Forgot password?'}
              </button>
            </form>

            <p className="text-xs text-slate text-center mt-4 leading-relaxed">
              New business?{' '}
              <Link to="/register" className="text-sage-deep font-medium hover:underline">
                Create a workspace
              </Link>
              . Employees use the invite link from their owner.
            </p>
            <p className="text-xs text-slate text-center mt-3">
              <Link to="/terms" className="hover:text-ink">
                Terms
              </Link>
              <span className="mx-2 text-line">·</span>
              <Link to="/privacy" className="hover:text-ink">
                Privacy
              </Link>
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

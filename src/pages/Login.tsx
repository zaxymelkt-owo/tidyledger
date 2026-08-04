import { useState } from 'react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import Seo from '../components/Seo'
import { clearPortalCustomer } from './portal/PortalLogin'

export default function Login() {
  const { session, signIn, signOut, isPlatformAdmin, profile } = useAuth()
  const [params] = useSearchParams()
  const intent = params.get('intent')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const isStaffIntent = intent === 'employee' || intent === 'owner'

  if (session && !isStaffIntent) {
    return <Navigate to={isPlatformAdmin ? '/platform' : profile?.role === 'customer' ? '/portal/dashboard' : '/dashboard'} replace />
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      setError('Enter your email and password to continue.')
      return
    }

    setSubmitting(true)
    setError(null)

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
            <h1 className="font-display font-semibold text-2xl tracking-tight text-ink">Sign in</h1>
            <p className="text-sm text-slate mt-1">
              {intent === 'employee'
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
            {session && profile?.role === 'customer' && isStaffIntent && (
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

            <Field label="Password">
              <Input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>

          <p className="text-xs text-slate text-center mt-4 leading-relaxed">
            New business?{' '}
            <Link to="/register" className="text-sage-deep font-medium hover:underline">
              Create a workspace
            </Link>
            . Employees use the invite link from their owner.
          </p>
        </div>
      </div>
    </div>
    </>
  )
}
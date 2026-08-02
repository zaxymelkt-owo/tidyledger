import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { Field, Input } from '../components/ui/Field'
import Button from '../components/ui/Button'
import { supabase } from '../lib/supabase'
import Seo from '../components/Seo'

export default function RegisterBusiness() {
  const { session, profile, refreshProfile, signUp, signIn } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState<'account' | 'business'>(session ? 'business' : 'account')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [businessName, setBusinessName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (profile && profile.role !== 'customer') {
    return <Navigate to="/dashboard" replace />
  }

  async function createAccount(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await signUp(email.trim(), password)
    if (error) {
      // maybe already exists — try sign-in
      const again = await signIn(email.trim(), password)
      if (again.error) {
        setError(error)
        setBusy(false)
        return
      }
    } else {
      // ensure session
      await signIn(email.trim(), password)
    }
    setStep('business')
    setBusy(false)
  }

  async function createBusiness(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { data, error } = await supabase.rpc('register_business', {
      p_business_name: businessName.trim(),
      p_full_name: fullName.trim() || null,
    })
    if (error) {
      setError(error.message)
      setBusy(false)
      return
    }
    await refreshProfile()
    setBusy(false)
    navigate('/dashboard')
    void data
  }

  return (
    <>
      <Seo
        title="Start your business"
        description="Create a TidyLedger workspace for your cleaning company — separate customers, staff, and data."
        path="/register"
        noIndex
      />
      <div className="min-h-screen flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur">
          <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
            <Link to="/" className="font-display font-semibold text-lg">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
            <Link to="/login" className="text-xs text-slate hover:text-ink">
              Staff sign in
            </Link>
          </div>
        </header>

        <main className="flex-1 flex items-center justify-center px-4 py-10">
          <div className="w-full max-w-md">
            <p className="ticket-number mb-1">NEW WORKSPACE</p>
            <h1 className="font-display text-2xl font-semibold text-ink mb-1">
              {step === 'account' ? 'Create owner account' : 'Name your business'}
            </h1>
            <p className="text-sm text-slate mb-6">
              Each business gets its own customers, jobs, and staff — fully separated.
            </p>

            <div className="ticket-card p-6 space-y-4">
              {error && (
                <div className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-sm text-clay">
                  {error}
                  {error.includes('register_business') || error.includes('function') ? (
                    <p className="text-xs mt-1">Run database/008_multitenant_accounts.sql in Supabase.</p>
                  ) : null}
                </div>
              )}

              {step === 'account' ? (
                <form onSubmit={createAccount} className="space-y-4">
                  <Field label="Work email">
                    <Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
                  </Field>
                  <Field label="Password">
                    <Input
                      type="password"
                      required
                      minLength={8}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Creating…' : 'Continue'}
                  </Button>
                </form>
              ) : (
                <form onSubmit={createBusiness} className="space-y-4">
                  <Field label="Your name">
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Alex Rivera" />
                  </Field>
                  <Field label="Business name">
                    <Input
                      required
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      placeholder="Nordic Clean Co"
                    />
                  </Field>
                  <Button type="submit" className="w-full" disabled={busy}>
                    {busy ? 'Setting up…' : 'Create workspace'}
                  </Button>
                </form>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  )
}

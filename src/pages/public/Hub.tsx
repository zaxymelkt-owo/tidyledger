import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import Button from '../../components/ui/Button'
import Seo from '../../components/Seo'

const customerLinks = [
  {
    to: '/request-quote',
    title: 'Get a free quote',
    desc: 'Tell us about your home and preferred service. We’ll follow up by email.',
    cta: 'Request quote',
  },
  {
    to: '/portal',
    title: 'Customer portal',
    desc: 'View jobs, quotes, and payments with your access code or password.',
    cta: 'Enter portal',
  },
  {
    to: '/review/new',
    title: 'Leave a review',
    desc: 'Share how your cleaning went — it helps other homeowners and our team.',
    cta: 'Write a review',
  },
]

export default function Hub() {
  const { session, isPlatformAdmin } = useAuth()
  const [registerOpen, setRegisterOpen] = useState(false)
  const [loginOpen, setLoginOpen] = useState(false)

  return (
    <>
      <Seo
        path="/"
        description="TidyLedger — housekeeping operations platform and customer portal for quotes, payments, and reviews."
      />
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="font-display font-semibold text-lg tracking-tight">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
            <nav className="flex items-center gap-2">
              {session ? (
                <Link to={isPlatformAdmin ? '/platform' : '/dashboard'}>
                  <Button>Open app</Button>
                </Link>
              ) : (
                <>
                  <div className="relative">
                    <Button variant="secondary" type="button" onClick={() => { setRegisterOpen((v) => !v); setLoginOpen(false) }}>
                      Register
                    </Button>
                    {registerOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setRegisterOpen(false)} />
                        <div
  className="
    absolute
    top-full mt-2
    left-1/2 -translate-x-1/2
    sm:left-auto sm:right-0 sm:translate-x-0
    w-64 max-w-[calc(100vw-2rem)]
    ticket-card p-2 z-40 shadow-lg
  "
>
                          <Link
                            to="/register"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setRegisterOpen(false)}
                          >
                            Business register
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Start a cleaning company workspace
                            </span>
                          </Link>
                          <Link
                            to="/portal"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setRegisterOpen(false)}
                          >
                            Customer register
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Use your portal code, then create a password
                            </span>
                          </Link>
                          <Link
                            to="/login?intent=employee"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setRegisterOpen(false)}
                          >
                            Employee register
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Use the invite link from your employer
                            </span>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                  <div className="relative">
                    <Button type="button" onClick={() => { setLoginOpen((v) => !v); setRegisterOpen(false) }}>
                      Login
                    </Button>
                    {loginOpen && (
                      <>
                        <div className="fixed inset-0 z-30" onClick={() => setLoginOpen(false)} />
                        <div
  className="
    absolute
    top-full mt-2
    left-1/2 -translate-x-1/2
    sm:left-auto sm:right-0 sm:translate-x-0
    w-64 max-w-[calc(100vw-2rem)]
    ticket-card p-2 z-40 shadow-lg
  "
>
                          <Link
                            to="/login?intent=owner"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setLoginOpen(false)}
                          >
                            Business owner
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Owners, managers & platform operators
                            </span>
                          </Link>
                          <Link
                            to="/login?intent=employee"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setLoginOpen(false)}
                          >
                            Employee
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Staff login after accepting an invite
                            </span>
                          </Link>
                          <Link
                            to="/portal"
                            className="block px-3 py-2.5 rounded-lg text-sm font-medium text-ink hover:bg-sage/10"
                            onClick={() => setLoginOpen(false)}
                          >
                            Customer
                            <span className="block text-xs font-normal text-slate mt-0.5">
                              Portal code or password
                            </span>
                          </Link>
                        </div>
                      </>
                    )}
                  </div>
                </>
              )}
            </nav>
          </div>
        </header>

        <section className="relative overflow-hidden border-b border-line">
          <div
            className="absolute inset-0 opacity-[0.12] pointer-events-none"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, #1E4D3E 0, transparent 45%), radial-gradient(circle at 85% 10%, #7B68A6 0, transparent 42%)',
            }}
          />
          <div className="relative max-w-5xl mx-auto px-5 py-14 sm:py-20">
            <p className="ticket-number mb-3">HOUSEKEEPING · SIMPLIFIED</p>
            <h1 className="font-display text-4xl sm:text-5xl font-semibold text-ink tracking-tight max-w-2xl leading-[1.15]">
              Clean homes. Clear books. One place to run it all.
            </h1>
            <p className="mt-4 text-slate text-base sm:text-lg max-w-xl leading-relaxed">
              TidyLedger is the operations hub for modern cleaning businesses — and the front door for
              customers to request quotes, pay, and review your work.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/request-quote">
                <Button className="px-6">Get a free quote</Button>
              </Link>
              <Link to="/register">
                <Button variant="secondary" className="px-6">
                  Register your business
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Register / Login panels */}
        <section className="max-w-5xl mx-auto px-5 py-12 w-full grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="ticket-card p-6">
            <p className="ticket-number mb-2">Register</p>
            <h2 className="font-display text-xl font-semibold text-ink mb-4">Create an account</h2>
            <ul className="space-y-3">
              <li>
                <Link to="/register" className="flex items-start gap-3 rounded-lg p-3 hover:bg-sage/10 transition-colors">
                  <span className="chip-green text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">BIZ</span>
                  <span>
                    <span className="block font-medium text-ink">Business register</span>
                    <span className="text-xs text-slate">Owners create a workspace for their company</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/portal" className="flex items-start gap-3 rounded-lg p-3 hover:bg-sage/10 transition-colors">
                  <span className="chip-purple text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">CUS</span>
                  <span>
                    <span className="block font-medium text-ink">Customer register</span>
                    <span className="text-xs text-slate">Portal code once, then set a password</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/login?intent=employee" className="flex items-start gap-3 rounded-lg p-3 hover:bg-sage/10 transition-colors">
                  <span className="chip-green text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">EMP</span>
                  <span>
                    <span className="block font-medium text-ink">Employee register</span>
                    <span className="text-xs text-slate">Open the invite link from your employer</span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="ticket-card p-6">
            <p className="ticket-number mb-2">Login</p>
            <h2 className="font-display text-xl font-semibold text-ink mb-4">Sign back in</h2>
            <ul className="space-y-3">
              <li>
                <Link to="/login?intent=owner" className="flex items-start gap-3 rounded-lg p-3 hover:bg-brass/10 transition-colors">
                  <span className="chip-purple text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">OWN</span>
                  <span>
                    <span className="block font-medium text-ink">Business owner / platform</span>
                    <span className="text-xs text-slate">Same login — platform owners land on the master dashboard</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/login?intent=employee" className="flex items-start gap-3 rounded-lg p-3 hover:bg-brass/10 transition-colors">
                  <span className="chip-green text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">EMP</span>
                  <span>
                    <span className="block font-medium text-ink">Employee</span>
                    <span className="text-xs text-slate">Field staff, leads, and managers</span>
                  </span>
                </Link>
              </li>
              <li>
                <Link to="/portal" className="flex items-start gap-3 rounded-lg p-3 hover:bg-brass/10 transition-colors">
                  <span className="chip-purple text-[10px] font-semibold px-2 py-1 rounded-md mt-0.5">CUS</span>
                  <span>
                    <span className="block font-medium text-ink">Customer</span>
                    <span className="text-xs text-slate">Email + portal code or password</span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-5 pb-12 w-full">
          <h2 className="font-display text-xl font-semibold text-ink mb-1">For customers</h2>
          <p className="text-sm text-slate mb-6">Everything you need — no staff account required.</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {customerLinks.map((item) => (
              <Link
                key={item.to}
                to={item.to}
                className="ticket-card p-6 pt-7 flex flex-col hover:border-sage/40 transition-colors group"
              >
                <h3 className="font-display font-semibold text-lg text-ink group-hover:text-sage-deep transition-colors">
                  {item.title}
                </h3>
                <p className="text-sm text-slate mt-2 flex-1 leading-relaxed">{item.desc}</p>
                <span className="mt-4 text-sm font-medium text-sage-deep">{item.cta} →</span>
              </Link>
            ))}
          </div>
        </section>

        <footer className="border-t border-line mt-auto">
          <div className="max-w-5xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate">
            <span>© {new Date().getFullYear()} TidyLedger</span>
            <div className="flex gap-4">
              <Link to="/register" className="hover:text-ink">Business register</Link>
              <Link to="/login" className="hover:text-ink">Login</Link>
              <Link to="/portal" className="hover:text-ink">Portal</Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

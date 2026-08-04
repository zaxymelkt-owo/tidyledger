import { useState } from 'react'
import { Link } from 'react-router-dom'
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

const faqItems = [
  {
    question: 'What does TidyLedger do?',
    answer:
      'TidyLedger helps cleaning businesses manage quotes, jobs, customer payments, team schedules, payroll, inventory, and customer communication from one workspace.',
  },
  {
    question: 'Can customers use it without a staff account?',
    answer:
      'Yes. Homeowners can request quotes, open a customer portal, pay online, and leave reviews without needing a business login.',
  },
  {
    question: 'Can staff and owners stay organized in the same system?',
    answer:
      'Yes. Owners, managers, and employees each have the right level of access to run operations, track field work, and keep business records up to date.',
  },
  {
    question: 'Is it built for modern cleaning operations?',
    answer:
      'It is designed for service businesses that need simple workflows for scheduling, check-ins, invoices, customer updates, and day-to-day financial visibility.',
  },
]

export default function Hub() {
  const [openItem, setOpenItem] = useState<number | null>(0)

  return (
    <>
      <Seo
        path="/"
        description="TidyLedger — housekeeping operations platform and customer portal for quotes, payments, and reviews."
      />
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-5 h-16 flex items-center">
            <Link to="/" className="font-display font-semibold text-lg tracking-tight">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
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
          </div>
        </section>

        {/* For customers — above business entry points */}
<section className="max-w-5xl mx-auto px-5 py-12 w-full">
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

{/* Business entry points */}
<section className="max-w-5xl mx-auto px-5 pb-12 w-full">
  <h2 className="font-display text-xl font-semibold text-ink mb-1">For businesses</h2>
  <p className="text-sm text-slate mb-6">Register a company or sign in to your workspace.</p>
  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
    <Link
      to="/register"
      className="ticket-card p-6 flex flex-col hover:border-sage/40 transition-colors group"
    >
      <p className="ticket-number mb-2">Register</p>
      <h3 className="font-display text-lg font-semibold text-ink group-hover:text-sage-deep transition-colors">
        Business Registration
      </h3>
      <p className="text-sm text-slate mt-2 flex-1 leading-relaxed">
        Create a workspace for your cleaning company — owners, managers, and staff under one roof.
      </p>
      <span className="mt-4 text-sm font-medium text-sage-deep">Get started →</span>
    </Link>

    <Link
      to="/login?intent=owner"
      className="ticket-card p-6 flex flex-col hover:border-brass/40 transition-colors group"
    >
      <p className="ticket-number mb-2">Portal</p>
      <h3 className="font-display text-lg font-semibold text-ink group-hover:text-sage-deep transition-colors">
        Owner&apos;s Portal
      </h3>
      <p className="text-sm text-slate mt-2 flex-1 leading-relaxed">
        Sign in as an owner, manager, or platform operator to run the day-to-day.
      </p>
      <span className="mt-4 text-sm font-medium text-sage-deep">Sign in →</span>
    </Link>

    <Link
      to="/login?intent=employee"
      className="ticket-card p-6 flex flex-col hover:border-brass/40 transition-colors group"
    >
      <p className="ticket-number mb-2">Portal</p>
      <h3 className="font-display text-lg font-semibold text-ink group-hover:text-sage-deep transition-colors">
        Employee Portal
      </h3>
      <p className="text-sm text-slate mt-2 flex-1 leading-relaxed">
        Staff login after accepting an invite — field crew, leads, and managers.
      </p>
      <span className="mt-4 text-sm font-medium text-sage-deep">Sign in →</span>
    </Link>
  </div>
</section>

<section className="max-w-5xl mx-auto px-5 pb-14 w-full">
  <div className="ticket-card p-6 sm:p-8">
    <div className="mb-6">
      <p className="ticket-number mb-2">Q&A</p>
      <h2 className="font-display text-2xl font-semibold text-ink">What can TidyLedger help you do?</h2>
      <p className="mt-2 text-sm text-slate max-w-2xl">
        This software is designed to keep every part of a cleaning operation moving smoothly — from customer requests to bookkeeping and team coordination.
      </p>
    </div>

    <div className="space-y-3">
      {faqItems.map((item, index) => {
        const isOpen = openItem === index

        return (
          <div key={item.question} className="rounded-2xl border border-line bg-paper overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenItem(isOpen ? null : index)}
              className="w-full flex items-center justify-between gap-4 px-4 py-4 text-left"
            >
              <span className="font-display text-base font-semibold text-ink">{item.question}</span>
              <span className="text-lg text-sage-deep">{isOpen ? '−' : '+'}</span>
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-0">
                <p className="text-sm text-slate leading-relaxed">{item.answer}</p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  </div>
</section>
      </div>
    </>
  )
}
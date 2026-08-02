import type { ReactElement } from 'react'
import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

type NavItem = { to: string; label: string; icon: () => ReactElement }

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
  { to: '/jobs', label: 'Jobs', icon: IconCalendar },
  { to: '/customers', label: 'Customers', icon: IconUsers },
  { to: '/quotes', label: 'Quotes', icon: IconDoc },
  { to: '/quote-requests', label: 'Inbox', icon: IconInbox },
]

const opsNav: NavItem[] = [
  { to: '/employees', label: 'Employees', icon: IconBadge },
  { to: '/team', label: 'Team logins', icon: IconKey },
  { to: '/payroll', label: 'Payroll', icon: IconPay },
  { to: '/my-pay', label: 'My pay', icon: IconWallet },
  { to: '/inventory', label: 'Inventory', icon: IconBox },
]

const moneyNav: NavItem[] = [
  { to: '/finances', label: 'Finances', icon: IconChart },
  { to: '/payments', label: 'Payments', icon: IconCard },
  { to: '/commission-terms', label: 'Commission', icon: IconPercent },
  { to: '/disputes', label: 'Disputes', icon: IconFlag },
  { to: '/tax-settings', label: 'Tax', icon: IconPercent },
]

const moreNav: NavItem[] = [
  { to: '/reviews', label: 'Reviews', icon: IconStar },
  { to: '/reports', label: 'Reports', icon: IconChart },
  { to: '/roles', label: 'Roles', icon: IconLayers },
]

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-5">
      <p className="px-3 mb-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-slate/80">
        {title}
      </p>
      <div className="space-y-0.5">
        {items.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/dashboard'}
            className={({ isActive }) =>
              `group flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-medium transition-all ${
                isActive
                  ? 'bg-sage-deep text-white shadow-sm shadow-sage-deep/20'
                  : 'text-slate hover:bg-white/70 hover:text-ink'
              }`
            }
          >
            <span className="opacity-90">
              <Icon />
            </span>
            {label}
          </NavLink>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { session, signOut, business, isPlatformAdmin, isOwnerOrManager } = useAuth()

  return (
    <aside className="w-[15.5rem] shrink-0 border-r border-line/80 bg-gradient-to-b from-paper-raised via-paper-raised to-mist/20 flex flex-col h-dvh sticky top-0">
      <div className="h-16 flex items-center px-4 border-b border-line/80">
        <NavLink to="/" className="font-display font-semibold text-[1.05rem] tracking-tight">
          <span className="brand-gradient">TidyLedger</span>
        </NavLink>
      </div>

      <nav className="flex-1 px-2.5 py-4 overflow-y-auto">
        {isPlatformAdmin && (
          <div className="mb-4 px-1">
            <NavLink
              to="/platform"
              className={({ isActive }) =>
                `flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-colors ${
                  isActive ? 'bg-brass text-white' : 'bg-brass/15 text-brass-deep hover:bg-brass/25'
                }`
              }
            >
              Platform master
            </NavLink>
          </div>
        )}

        {isOwnerOrManager && business && !business.commission_accepted_at && business.commission_terms && (
          <NavLink
            to="/commission-terms"
            className="mb-4 mx-1 flex items-center px-3 py-2 rounded-xl text-[12px] font-medium text-clay bg-clay/10 border border-clay/20"
          >
            Accept commission terms
          </NavLink>
        )}

        <NavSection title="Workspace" items={mainNav} />
        <NavSection title="People & pay" items={opsNav} />
        <NavSection title="Money" items={moneyNav} />
        <NavSection title="More" items={moreNav} />
      </nav>

      <div className="p-3 border-t border-line/80">
        {session && (
          <div className="rounded-xl bg-white/60 border border-line/60 px-3 py-2.5">
            {business && (
              <p className="text-[11px] font-semibold text-sage-deep truncate">{business.name}</p>
            )}
            <p className="text-[11px] text-slate truncate">{session.user.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <NavLink to="/" className="text-[11px] font-medium text-brass-deep hover:underline">
                Hub
              </NavLink>
              <button
                type="button"
                onClick={() => signOut()}
                className="text-[11px] font-medium text-clay hover:underline"
              >
                Sign out
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}

function IconGrid() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="2" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="2" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
      <rect x="9" y="9" width="5" height="5" rx="1.2" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function IconCalendar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="3" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 6.5h12M5 1.5v3M11 1.5v3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="5" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M3 13c0-2.5 2.2-4 5-4s5 1.5 5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconDoc() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M4 2.5h6l3 3V13a1 1 0 01-1 1H4a1 1 0 01-1-1v-9.5a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M10 2.5V6h3" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function IconInbox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 4.5h12v8a1 1 0 01-1 1H3a1 1 0 01-1-1v-8z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 4.5l6 4 6-4" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function IconBadge() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="6" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M4 13.5c0-2 1.8-3.5 4-3.5s4 1.5 4 3.5" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function IconKey() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5.5" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 8h6M12 8v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconPay() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M8 4.5v7M6.2 6.2c0-.7.8-1.2 1.8-1.2s1.8.4 1.8 1.2-.8 1-1.8 1.2-1.8.5-1.8 1.2.8 1.2 1.8 1.2 1.8-.5 1.8-1.2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  )
}
function IconWallet() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="2" y="4" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M2 7h12" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function IconBox() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 5.5l5-2.5 5 2.5v6l-5 2.5-5-2.5v-6z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function IconChart() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 13V8M6 13V4M10 13V6M14 13V3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconCard() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      <path d="M1.5 6.5h13" stroke="currentColor" strokeWidth="1.4" />
    </svg>
  )
}
function IconPercent() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <circle cx="5" cy="5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="11" cy="11" r="1.5" stroke="currentColor" strokeWidth="1.3" />
      <path d="M12 4L4 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  )
}
function IconFlag() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 2v12M3 3h9l-2 3 2 3H3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}
function IconStar() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 12 8 10.2 5 12l.5-3.5L3 6l3.5-.5L8 2z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
    </svg>
  )
}
function IconLayers() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M2 6l6-3 6 3-6 3-6-3zM2 9l6 3 6-3" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  )
}

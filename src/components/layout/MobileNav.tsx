import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

const links = [
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/jobs', label: 'Jobs' },
  { to: '/customers', label: 'Customers' },
  { to: '/quotes', label: 'Quotes' },
  { to: '/quote-requests', label: 'Inbox' },
  { to: '/employees', label: 'Employees' },
  { to: '/team', label: 'Team logins' },
  { to: '/payroll', label: 'Payroll' },
  { to: '/my-pay', label: 'My pay' },
  { to: '/inventory', label: 'Inventory' },
  { to: '/finances', label: 'Finances' },
  { to: '/payments', label: 'Payments' },
  { to: '/disputes', label: 'Disputes' },
  { to: '/tax-settings', label: 'Tax' },
  { to: '/roles', label: 'Roles' },
  { to: '/reviews', label: 'Reviews' },
  { to: '/reports', label: 'Reports' },
]

export default function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { session, signOut, isPlatformAdmin } = useAuth()

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-ink/40 transition-opacity md:hidden ${
          open ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden
      />

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-[min(18rem,88vw)] bg-paper-raised border-r border-line flex flex-col transition-transform duration-200 md:hidden ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Main navigation"
      >
        <div className="h-14 flex items-center justify-between px-4 border-b border-line">
          <NavLink to="/" onClick={onClose} className="font-display font-semibold">
            <span className="brand-gradient">TidyLedger</span>
          </NavLink>
          <button
            type="button"
            aria-label="Close menu"
            onClick={onClose}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-slate hover:bg-paper"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {isPlatformAdmin && (
            <NavLink
              to="/platform"
              onClick={onClose}
              className="block px-3 py-2.5 rounded-lg text-sm font-medium text-brass-deep"
            >
              Platform master
            </NavLink>
          )}
          {links.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/dashboard'}
              onClick={onClose}
              className={({ isActive }) =>
                `block px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-sage/15 text-sage-deep'
                    : 'text-slate hover:bg-paper hover:text-ink'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="px-4 py-4 border-t border-line safe-pb">
          {session && (
            <>
              <p className="text-xs text-ink truncate mb-2">{session.user.email}</p>
              <NavLink to="/" onClick={onClose} className="block text-xs font-medium text-brass mb-2">
                Public hub
              </NavLink>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  signOut()
                }}
                className="text-xs font-medium text-clay"
              >
                Sign out
              </button>
            </>
          )}
        </div>
      </aside>
    </>
  )
}

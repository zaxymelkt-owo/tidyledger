import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import ThemeToggle from '../ui/ThemeToggle'
import { navSections, type NavItem } from './navConfig'

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
                  : 'text-slate hover:bg-surface/70 hover:text-ink'
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
      <div className="h-16 flex items-center justify-between px-4 border-b border-line/80">
        <NavLink to="/" className="font-display font-semibold text-[1.05rem] tracking-tight">
          <span className="brand-gradient">TidyLedger</span>
        </NavLink>
        <ThemeToggle />
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

        {navSections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} />
        ))}
      </nav>

      <div className="p-3 border-t border-line/80">
        {session && (
          <div className="rounded-xl bg-surface/60 border border-line/60 px-3 py-2.5">
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

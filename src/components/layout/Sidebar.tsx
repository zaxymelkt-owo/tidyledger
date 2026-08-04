import { NavLink } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { navVisibleForRole } from '../../lib/permissions'
import ThemeToggle from '../ui/ThemeToggle'
import { navSections, type NavItem } from './navConfig'

function NavSection({ title, items }: { title: string; items: NavItem[] }) {
  return (
    <div className="mb-4">
      <div className="mb-2 px-2.5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate/70">{title}</p>
      </div>
      <div className="space-y-1">
        {items.map(({ to, label, icon: Icon, subItems }) => (
          <div key={to} className="group relative">
            <NavLink
              to={to}
              end={to === '/dashboard'}
              className={({ isActive }) =>
                `group flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-sage-deep text-white shadow-sm shadow-sage-deep/20'
                    : 'text-slate hover:bg-surface/80 hover:text-ink'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border transition-colors ${
                      isActive
                        ? 'border-white/20 bg-white/10 text-white'
                        : 'border-line bg-paper/70 text-slate group-hover:border-sage/30 group-hover:text-sage-deep'
                    }`}
                  >
                    <Icon />
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>

            {subItems && subItems.length > 0 && (
              <div className="pointer-events-none absolute left-0 top-full z-20 mt-1 hidden min-w-[10rem] rounded-xl border border-line bg-paper-raised p-1 shadow-lg shadow-ink/10 group-hover:block group-hover:pointer-events-auto">
                {subItems.map((subItem) => (
                  <NavLink
                    key={subItem.to}
                    to={subItem.to}
                    className={({ isActive }) =>
                      `block rounded-lg px-3 py-2 text-[12px] font-medium transition-colors ${
                        isActive
                          ? 'bg-sage-deep text-white'
                          : 'text-slate hover:bg-surface/80 hover:text-ink'
                      }`
                    }
                  >
                    {subItem.label}
                  </NavLink>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function Sidebar() {
  const { session, signOut, business, isPlatformAdmin, isOwnerOrManager, role } = useAuth()

  const visibleSections = navSections
    .map((section) => ({
      ...section,
      items: section.items
        .map((item) => ({
          ...item,
          subItems: item.subItems?.filter((sub) => navVisibleForRole(role, sub.to)),
        }))
        .filter((item) => navVisibleForRole(role, item.to)),
    }))
    .filter((section) => section.items.length > 0)

  return (
    <aside className="w-[16rem] shrink-0 border-r border-line/80 bg-gradient-to-b from-paper-raised via-paper-raised to-mist/20 flex flex-col h-dvh sticky top-0">
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
                `flex items-center gap-2 px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all ${
                  isActive
                    ? 'bg-brass text-white shadow-sm shadow-brass/25'
                    : 'bg-brass/12 text-brass-deep hover:bg-brass/20'
                }`
              }
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15">★</span>
              Platform master
            </NavLink>
          </div>
        )}

        {isOwnerOrManager && business && !business.commission_accepted_at && business.commission_terms && (
          <NavLink
            to="/commission-terms"
            className="mb-4 mx-1 flex items-center px-3 py-2.5 rounded-xl text-[12px] font-medium text-clay bg-clay/10 border border-clay/20"
          >
            Accept commission terms
          </NavLink>
        )}

        {visibleSections.map((section) => (
          <NavSection key={section.title} title={section.title} items={section.items} />
        ))}
      </nav>

      <div className="p-3 border-t border-line/80">
        {session && (
          <div className="rounded-2xl bg-surface/70 border border-line/70 px-3 py-3 shadow-sm shadow-ink/5">
            {business && (
              <p className="text-[11px] font-semibold text-sage-deep truncate">{business.name}</p>
            )}
            <p className="text-[11px] text-slate truncate mt-0.5">{session.user.email}</p>
            <div className="flex items-center gap-3 mt-2.5">
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

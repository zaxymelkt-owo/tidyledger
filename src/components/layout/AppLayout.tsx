import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import Sidebar from './Sidebar'
import OfflineBanner from '../OfflineBanner'
import MobileNav from './MobileNav'

export default function AppLayout({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false)

  return (
    <div className="min-h-dvh flex bg-transparent">
      {/* Desktop sidebar */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* Mobile drawer */}
      <MobileNav open={navOpen} onClose={() => setNavOpen(false)} />

      <div className="flex-1 flex flex-col min-w-0">
        <OfflineBanner />
        {/* Mobile top strip with menu */}
        <div className="md:hidden sticky top-0 z-30 border-b border-line bg-paper-raised/95 backdrop-blur px-4 h-14 flex items-center justify-between safe-pt">
          <button
            type="button"
            aria-label="Open menu"
            onClick={() => setNavOpen(true)}
            className="inline-flex items-center justify-center w-10 h-10 rounded-lg text-ink hover:bg-paper"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
            </svg>
          </button>
          <Link to="/" className="font-display font-semibold text-base">
            <span className="brand-gradient">TidyLedger</span>
          </Link>
          <span className="w-10" />
        </div>

        <div className="flex-1 flex flex-col min-h-0 admin-main-pad">{children}</div>
      </div>
    </div>
  )
}

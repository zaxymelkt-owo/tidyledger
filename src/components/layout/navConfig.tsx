import type { ReactElement } from 'react'

export type NavItem = {
  to: string
  label: string
  icon: () => ReactElement
  subItems?: NavItem[]
}
export type NavSectionConfig = { title: string; items: NavItem[] }

export const navSections: NavSectionConfig[] = [
  {
    title: 'Workspace',
    items: [
      { to: '/dashboard', label: 'Dashboard', icon: IconGrid },
      { to: '/jobs', label: 'Jobs', icon: IconCalendar },
      { to: '/customers', label: 'Customers', icon: IconUsers },
      { to: '/quotes', label: 'Quotes', icon: IconDoc },
      { to: '/quote-requests', label: 'Quote requests', icon: IconInbox },
      { to: '/messages', label: 'Messages', icon: IconInbox },
    ],
  },
  {
    title: 'People & pay',
    items: [
      { to: '/employees', label: 'Employees', icon: IconBadge },
      { to: '/team', label: 'Team logins', icon: IconKey },
      { to: '/payroll', label: 'Payroll', icon: IconPay },
      { to: '/my-pay', label: 'My pay', icon: IconWallet },
      { to: '/inventory', label: 'Inventory', icon: IconBox },
    ],
  },
  {
    title: 'Money',
    items: [
      { to: '/finances', label: 'Finances', icon: IconChart },
      { to: '/payments', label: 'Payments', icon: IconCard },
      { to: '/commission-terms', label: 'Commission', icon: IconPercent },
      { to: '/disputes', label: 'Disputes', icon: IconFlag },
      { to: '/tax-settings', label: 'Tax', icon: IconPercent },
    ],
  },
  {
    title: 'More',
    items: [
      { to: '/reviews', label: 'Reviews', icon: IconStar },
      { to: '/reports', label: 'Reports', icon: IconChart },
      { to: '/data-export', label: 'Data export', icon: IconDoc },
      {
        to: '/theme-settings',
        label: 'Settings',
        icon: IconPalette,
        subItems: [
          { to: '/theme-settings', label: 'Theme', icon: IconPalette },
          { to: '/roles', label: 'Roles', icon: IconLayers },
          { to: '/quote-estimator-settings', label: 'Quote pricing', icon: IconDoc },
        ],
      },
    ],
  },
]

// Flat ordered list, e.g. for the mobile drawer — always derived from
// navSections so it can never fall out of sync with the desktop sidebar.
export const flatNav: NavItem[] = navSections.flatMap((section) => section.items)

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
      <path
        d="M8 4.5v7M6.2 6.2c0-.7.8-1.2 1.8-1.2s1.8.4 1.8 1.2-.8 1-1.8 1.2-1.8.5-1.8 1.2.8 1.2 1.8 1.2 1.8-.5 1.8-1.2"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
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
      <path
        d="M8 2l1.5 3.5L13 6l-2.5 2.5L11 12 8 10.2 5 12l.5-3.5L3 6l3.5-.5L8 2z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
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
function IconPalette() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M8 2.5a5.5 5.5 0 00-5.5 5.5c0 3 2.2 5.2 5 5.2h.5c.8 0 1.5-.7 1.5-1.5v-.5c0-.8.7-1.5 1.5-1.5h1c.8 0 1.5-.7 1.5-1.5A2.5 2.5 0 0011 5c-.7 0-1.4.3-1.9.8A4.5 4.5 0 008 2.5z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
      <circle cx="5.2" cy="6.2" r=".8" fill="currentColor" />
      <circle cx="7.8" cy="4.7" r=".8" fill="currentColor" />
      <circle cx="10.1" cy="6.8" r=".8" fill="currentColor" />
    </svg>
  )
}

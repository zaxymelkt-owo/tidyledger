import Topbar from '../components/layout/Topbar'

const tiers = [
  {
    title: 'Platform owner',
    color: 'border-brass bg-brass/10',
    items: ['All businesses', 'Applications & commissions', 'Disputes resolution', 'Uses business login'],
  },
  {
    title: 'Business owner',
    color: 'border-sage-deep bg-sage/15',
    items: ['Workspace settings', 'Team invites', 'Payroll payouts', 'Tax defaults', 'Commission terms'],
  },
  {
    title: 'Manager',
    color: 'border-sage bg-sage/10',
    items: ['Jobs & customers', 'Leads & employees', 'Hours & payroll runs', 'Inventory & finances'],
  },
  {
    title: 'Lead',
    color: 'border-mist bg-mist/30',
    items: ['Crew oversight', 'Employee hours visibility', 'Field check-in tools'],
  },
  {
    title: 'Employee',
    color: 'border-line bg-paper',
    items: ['Assigned jobs', 'My pay & hours', 'Photos & GPS field mode'],
  },
  {
    title: 'Customer',
    color: 'border-lilac/50 bg-lilac/10',
    items: ['Portal jobs & quotes', 'Payments & reviews', 'Password after portal code'],
  },
]

export default function RoleHierarchy() {
  return (
    <>
      <Topbar title="Role hierarchy" subtitle="Who can see and do what" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="max-w-xl mx-auto space-y-3">
          {tiers.map((tier, i) => (
            <div key={tier.title}>
              <div className={`ticket-card p-5 border-l-4 ${tier.color}`}>
                <h3 className="font-display font-semibold text-ink">{tier.title}</h3>
                <ul className="mt-2 space-y-1">
                  {tier.items.map((item) => (
                    <li key={item} className="text-sm text-slate flex gap-2">
                      <span className="text-sage-deep">·</span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              {i < tiers.length - 1 && (
                <div className="flex justify-center py-1 text-brass text-lg leading-none" aria-hidden>
                  ↓
                </div>
              )}
            </div>
          ))}
        </div>
        <p className="max-w-xl mx-auto mt-6 text-xs text-slate text-center leading-relaxed">
          Higher roles inherit operational access below them within the same business. Platform owners
          sit above all tenants and do not share a customer base with any single business.
        </p>
      </main>
    </>
  )
}

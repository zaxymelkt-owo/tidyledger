export default function StatCard({
  label,
  value,
  ticketNo,
  accent = 'sage',
}: {
  label: string
  value: string
  ticketNo: string
  accent?: 'sage' | 'brass' | 'clay'
}) {
  const accentColor = {
    sage: 'text-sage-deep',
    brass: 'text-brass',
    clay: 'text-clay',
  }[accent]

  return (
    <div className="ticket-card px-5 pt-6 pb-5">
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs uppercase tracking-wide text-slate font-medium">{label}</span>
        <span className="ticket-number">#{ticketNo}</span>
      </div>
      <p className={`font-display text-3xl font-semibold ${accentColor}`}>{value}</p>
    </div>
  )
}

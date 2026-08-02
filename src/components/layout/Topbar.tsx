import { format } from 'date-fns'

export default function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const today = format(new Date(), 'EEE, MMM d')

  return (
    <header className="min-h-14 sm:h-16 border-b border-line bg-paper-raised/90 backdrop-blur px-4 sm:px-6 py-3 sm:py-0 flex items-center justify-between shrink-0 gap-3">
      <div className="min-w-0">
        <h1 className="font-display font-semibold text-lg sm:text-xl text-ink leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-xs sm:text-sm text-slate mt-0.5 truncate max-w-[70vw] sm:max-w-none">
            {subtitle}
          </p>
        )}
      </div>
      <div className="hidden sm:block font-mono-num text-xs text-slate uppercase tracking-wide shrink-0">
        {today}
      </div>
    </header>
  )
}

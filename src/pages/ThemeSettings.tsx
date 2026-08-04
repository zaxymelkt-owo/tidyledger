import Topbar from '../components/layout/Topbar'
import Button from '../components/ui/Button'
import { useAuth } from '../contexts/AuthContext'
import { useTheme } from '../contexts/ThemeContext'

export default function ThemeSettings() {
  const { isOwnerOrManager } = useAuth()
  const { theme, setTheme, colorScheme, setColorScheme } = useTheme()

  const colorOptions = [
    {
      value: 'forest',
      label: 'Forest',
      description: 'Soft green and sage',
      swatches: ['bg-sage-deep', 'bg-sage', 'bg-brass'],
    },
    {
      value: 'violet',
      label: 'Violet',
      description: 'Refined lavender accents',
      swatches: ['bg-brass-deep', 'bg-lilac', 'bg-sage'],
    },
    {
      value: 'terracotta',
      label: 'Terracotta',
      description: 'Warm clay and amber tones',
      swatches: ['bg-clay', 'bg-brass', 'bg-sage'],
    },
  ] as const

  if (!isOwnerOrManager) {
    return (
      <>
        <Topbar title="Dashboard theme" />
        <main className="p-6 text-sm text-slate">Only owners and managers can change the dashboard theme.</main>
      </>
    )
  }

  return (
    <>
      <Topbar title="Dashboard theme" subtitle="Choose how your workspace looks" />
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        <div className="ticket-card max-w-3xl p-6 space-y-6">
          <div>
            <h2 className="font-display text-xl font-semibold text-ink">Appearance</h2>
            <p className="mt-1 text-sm text-slate">
              Pick a display mode and a dashboard color scheme. Preferences are saved locally for this browser.
            </p>
          </div>

          <section className="space-y-3">
            <h3 className="font-display text-lg font-semibold text-ink">Display mode</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                type="button"
                variant={theme === 'light' ? 'primary' : 'secondary'}
                onClick={() => setTheme('light')}
              >
                Light mode
              </Button>
              <Button
                type="button"
                variant={theme === 'dark' ? 'primary' : 'secondary'}
                onClick={() => setTheme('dark')}
              >
                Dark mode
              </Button>
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-display text-lg font-semibold text-ink">Color scheme</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {colorOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setColorScheme(option.value)}
                  className={`rounded-2xl border p-3 text-left transition-all ${
                    colorScheme === option.value
                      ? 'border-sage-deep bg-surface shadow-sm shadow-sage-deep/10'
                      : 'border-line bg-paper hover:border-sage/40'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {option.swatches.map((swatch) => (
                      <span key={swatch} className={`h-4 w-4 rounded-full ${swatch}`} />
                    ))}
                  </div>
                  <p className="font-display font-semibold text-ink">{option.label}</p>
                  <p className="text-xs text-slate mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </section>
        </div>
      </main>
    </>
  )
}

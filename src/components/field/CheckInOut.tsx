import { useState } from 'react'
import Button from '../ui/Button'
import { getCurrentPosition, mapsLink } from '../../lib/geo'

type Props = {
  lastCheckIn?: { lat: number; lng: number; noted_at: string } | null
  lastCheckOut?: { lat: number; lng: number; noted_at: string } | null
  onCheckIn: (pos: { lat: number; lng: number; accuracy_m: number | null }) => void | Promise<void>
  onCheckOut: (pos: { lat: number; lng: number; accuracy_m: number | null }) => void | Promise<void>
  disabled?: boolean
}

export default function CheckInOut({
  lastCheckIn,
  lastCheckOut,
  onCheckIn,
  onCheckOut,
  disabled,
}: Props) {
  const [busy, setBusy] = useState<'in' | 'out' | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run(kind: 'in' | 'out') {
    setBusy(kind)
    setError(null)
    try {
      const pos = await getCurrentPosition()
      if (kind === 'in') await onCheckIn(pos)
      else await onCheckOut(pos)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Location error')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg border border-clay/30 bg-clay/5 px-3 py-2 text-xs text-clay">{error}</div>
      )}
      <div className="grid grid-cols-2 gap-2">
        <Button type="button" onClick={() => run('in')} disabled={disabled || busy !== null}>
          {busy === 'in' ? 'Locating…' : 'GPS check-in'}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => run('out')}
          disabled={disabled || busy !== null}
        >
          {busy === 'out' ? 'Locating…' : 'GPS check-out'}
        </Button>
      </div>
      <div className="text-xs text-slate space-y-1">
        {lastCheckIn && (
          <p>
            Last in:{' '}
            <a
              className="text-sage-deep underline"
              href={mapsLink(lastCheckIn.lat, lastCheckIn.lng)}
              target="_blank"
              rel="noreferrer"
            >
              {lastCheckIn.lat.toFixed(5)}, {lastCheckIn.lng.toFixed(5)}
            </a>{' '}
            · {new Date(lastCheckIn.noted_at).toLocaleString()}
          </p>
        )}
        {lastCheckOut && (
          <p>
            Last out:{' '}
            <a
              className="text-sage-deep underline"
              href={mapsLink(lastCheckOut.lat, lastCheckOut.lng)}
              target="_blank"
              rel="noreferrer"
            >
              {lastCheckOut.lat.toFixed(5)}, {lastCheckOut.lng.toFixed(5)}
            </a>{' '}
            · {new Date(lastCheckOut.noted_at).toLocaleString()}
          </p>
        )}
      </div>
    </div>
  )
}

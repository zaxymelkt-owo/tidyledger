import { useEffect, useState } from 'react'
import { listQueue, isOnline } from '../lib/offlineQueue'

export default function OfflineBanner() {
  const [online, setOnline] = useState(isOnline())
  const [pending, setPending] = useState(0)

  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    const t = setInterval(() => {
      listQueue().then((q) => setPending(q.length)).catch(() => {})
    }, 3000)
    listQueue().then((q) => setPending(q.length)).catch(() => {})
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', off)
      clearInterval(t)
    }
  }, [])

  if (online && pending === 0) return null

  return (
    <div
      className={`px-4 py-2 text-center text-xs font-medium ${
        online ? 'bg-brass/15 text-brass' : 'bg-clay/15 text-clay'
      }`}
    >
      {!online && 'You are offline — changes will sync when you reconnect. '}
      {pending > 0 && (
        <span>
          {pending} action{pending === 1 ? '' : 's'} queued for sync
          {online ? '…' : '.'}
        </span>
      )}
    </div>
  )
}

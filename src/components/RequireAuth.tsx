import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading, profile } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-paper">
        <p className="text-sm text-slate">Loading…</p>
      </div>
    )
  }

  if (!session) {
    return <Navigate to="/" replace state={{ from: location.pathname }} />
  }

  if (profile && !profile.active && profile.role !== 'owner' && location.pathname !== '/my-pay') {
    return <Navigate to="/my-pay" replace state={{ from: location.pathname }} />
  }

  return <>{children}</>
}

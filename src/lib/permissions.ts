import type { UserRole } from '../types'

/**
 * UI-level route access. RLS remains the real boundary;
 * this keeps the sidebar and routes aligned with 011 tenant staff model
 * plus owner-only settings that managers should not manage in the UI.
 */

/** Routes only owners should open in the product UI */
const OWNER_ONLY = new Set([
  '/data-export',
  '/team',
  '/roles',
  '/commission-terms',
  '/tax-settings',
  '/quote-estimator-settings',
])

/** Routes managers+owners can use; employees cannot */
const MANAGER_PLUS = new Set([
  '/employees',
  '/payroll',
  '/finances',
  '/reports',
  '/data-export',
  '/inventory',
  '/payments',
  '/disputes',
  '/theme-settings',
  '/quote-requests',
  '/messages',
])

/** Everyone on staff (owner, manager, employee) */
const STAFF_ALL = new Set([
  '/dashboard',
  '/jobs',
  '/customers',
  '/quotes',
  '/reviews',
  '/my-pay',
])

export function canAccessPath(role: UserRole | null | undefined, path: string): boolean {
  if (!role) return false
  if (role === 'customer') return false

  const base = path.split('?')[0].replace(/\/$/, '') || '/'
  // Field mode under jobs
  if (base.startsWith('/jobs')) return role === 'owner' || role === 'manager' || role === 'employee'

  if (OWNER_ONLY.has(base)) return role === 'owner'
  if (MANAGER_PLUS.has(base)) return role === 'owner' || role === 'manager'
  if (STAFF_ALL.has(base) || STAFF_ALL.has(path)) return role === 'owner' || role === 'manager' || role === 'employee'

  // Default: owners and managers for unknown admin paths
  return role === 'owner' || role === 'manager'
}

export function navVisibleForRole(role: UserRole | null | undefined, to: string): boolean {
  return canAccessPath(role, to)
}

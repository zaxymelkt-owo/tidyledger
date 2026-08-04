/**
 * Client-side throttle for public forms (quote request, review, portal login).
 * This is not a security boundary — pair with database/015_rate_limits.sql RPCs.
 */

const buckets = new Map<string, number[]>()

export function allowAction(key: string, maxPerWindow: number, windowMs: number): boolean {
  const now = Date.now()
  const prev = buckets.get(key) ?? []
  const recent = prev.filter((t) => now - t < windowMs)
  if (recent.length >= maxPerWindow) {
    buckets.set(key, recent)
    return false
  }
  recent.push(now)
  buckets.set(key, recent)
  return true
}

export function rateLimitMessage(retrySeconds = 60) {
  return `Too many attempts. Please wait about ${retrySeconds} seconds and try again.`
}

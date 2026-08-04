import { supabase } from './supabase'

export type NotifyKind =
  | 'quote_request_received'
  | 'staff_invite'
  | 'payment_succeeded'
  | 'review_left'
  | 'quote_accepted'
  | 'portal_message'

/**
 * Fire-and-forget transactional email via the send-email Edge Function.
 * Failures are logged but never thrown — UI flows should not block on email.
 */
export async function notifyEmail(
  kind: NotifyKind,
  to: string | string[],
  data?: Record<string, string | number | null | undefined>
): Promise<void> {
  try {
    const { error } = await supabase.functions.invoke('send-email', {
      body: { kind, to, data },
    })
    if (error) console.warn('[notifyEmail]', kind, error.message)
  } catch (err) {
    console.warn('[notifyEmail]', kind, err)
  }
}

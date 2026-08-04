// Transactional email via Resend.
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Secrets: RESEND_API_KEY, EMAIL_FROM (optional), SITE_URL (optional)

import { handleCors, json } from '../_shared/cors.ts'
import { emailShell, sendResendEmail } from '../_shared/email.ts'

type EmailKind =
  | 'quote_request_received'
  | 'staff_invite'
  | 'payment_succeeded'
  | 'review_left'
  | 'quote_accepted'
  | 'portal_message'

type Payload = {
  kind: EmailKind
  to: string | string[]
  data?: Record<string, string | number | null | undefined>
}

function subjectFor(kind: EmailKind, data: Payload['data']): string {
  switch (kind) {
    case 'quote_request_received':
      return `New quote request from ${data?.name ?? 'a customer'}`
    case 'staff_invite':
      return `You're invited to ${data?.business_name ?? 'a TidyLedger workspace'}`
    case 'payment_succeeded':
      return `Payment received — $${data?.amount ?? '0'}`
    case 'review_left':
      return `New ${data?.rating ?? ''}-star review`
    case 'quote_accepted':
      return `Quote accepted by ${data?.name ?? 'customer'}`
    case 'portal_message':
      return `Message from ${data?.name ?? 'a customer'}`
    default:
      return 'TidyLedger notification'
  }
}

function bodyHtml(kind: EmailKind, data: Payload['data']): string {
  const rows = Object.entries(data ?? {})
    .filter(([, v]) => v != null && String(v).length > 0)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#4A635A">${k}</td><td style="padding:4px 0;color:#0F1F1A">${v}</td></tr>`
    )
    .join('')

  const site = Deno.env.get('SITE_URL') ?? 'https://tidyledger.github.io/tidyledger'
  const intro: Record<EmailKind, string> = {
    quote_request_received: 'A new online quote request was submitted.',
    staff_invite: `Join the team on TidyLedger. Invite link: <a href="${data?.invite_url ?? site}">${data?.invite_url ?? site}</a>`,
    payment_succeeded: 'A customer payment succeeded.',
    review_left: 'A customer left a review.',
    quote_accepted: 'A customer accepted a quote in the portal.',
    portal_message: 'A customer sent a message from the portal.',
  }

  return emailShell(
    'Notification',
    `<p>${intro[kind]}</p><table style="margin-top:16px;font-size:14px">${rows}</table>`
  )
}

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    if (!Deno.env.get('RESEND_API_KEY')) {
      return json({ error: 'RESEND_API_KEY not configured' }, 500)
    }

    const payload = (await req.json()) as Payload
    if (!payload?.kind || !payload?.to) {
      return json({ error: 'kind and to are required' }, 400)
    }

    const result = await sendResendEmail({
      to: payload.to,
      subject: subjectFor(payload.kind, payload.data),
      html: bodyHtml(payload.kind, payload.data),
    })

    if (result.error) return json({ error: result.error }, 502)
    return json({ ok: true, id: result.id, skipped: result.skipped })
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'send failed' }, 500)
  }
})

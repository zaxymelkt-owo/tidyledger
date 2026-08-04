// Supabase Edge Function — transactional email via Resend
// Deploy: supabase functions deploy send-email --no-verify-jwt
// Secrets: RESEND_API_KEY, EMAIL_FROM (e.g. "TidyLedger <onboarding@resend.dev>")
// Optional: INTERNAL_NOTIFY_EMAIL for platform-wide alerts

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? ''
const EMAIL_FROM = Deno.env.get('EMAIL_FROM') ?? 'TidyLedger <onboarding@resend.dev>'
const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://tidyledger.github.io/tidyledger'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#4A635A">${k}</td><td style="padding:4px 0;color:#0F1F1A">${v}</td></tr>`)
    .join('')

  const intro: Record<EmailKind, string> = {
    quote_request_received: 'A new online quote request was submitted.',
    staff_invite: `Join the team on TidyLedger. Invite link: <a href="${data?.invite_url ?? SITE_URL}">${data?.invite_url ?? SITE_URL}</a>`,
    payment_succeeded: 'A customer payment succeeded.',
    review_left: 'A customer left a review.',
    quote_accepted: 'A customer accepted a quote in the portal.',
    portal_message: 'A customer sent a message from the portal.',
  }

  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E4EFE9;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #B9D0C4">
    <p style="font-size:12px;letter-spacing:0.08em;color:#5A4A82;text-transform:uppercase">TidyLedger</p>
    <h1 style="font-size:20px;color:#0F1F1A;margin:8px 0 16px">Notification</h1>
    <p style="color:#4A635A;line-height:1.5">${intro[kind]}</p>
    <table style="margin-top:16px;font-size:14px">${rows}</table>
    <p style="margin-top:24px;font-size:12px;color:#4A635A"><a href="${SITE_URL}">Open TidyLedger</a></p>
  </div></body></html>`
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    if (!RESEND_API_KEY) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not configured' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const payload = (await req.json()) as Payload
    if (!payload?.kind || !payload?.to) {
      return new Response(JSON.stringify({ error: 'kind and to are required' }), {
        status: 400,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    const to = Array.isArray(payload.to) ? payload.to : [payload.to]
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: EMAIL_FROM,
        to,
        subject: subjectFor(payload.kind, payload.data),
        html: bodyHtml(payload.kind, payload.data),
      }),
    })

    const result = await res.json()
    if (!res.ok) {
      return new Response(JSON.stringify({ error: result }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true, id: result.id }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'send failed' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})

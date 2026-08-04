/** Resend helper shared by webhook + send-email */

export async function sendResendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}): Promise<{ id?: string; skipped?: boolean; error?: string }> {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.log('RESEND_API_KEY not set — skipping email')
    return { skipped: true }
  }
  const from = Deno.env.get('EMAIL_FROM') ?? 'TidyLedger <onboarding@resend.dev>'
  const to = Array.isArray(opts.to) ? opts.to : [opts.to]

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to,
      subject: opts.subject,
      html: opts.html,
    }),
  })

  const data = await res.json()
  if (!res.ok) {
    console.error('Resend error', data)
    return { error: data?.message ?? JSON.stringify(data) }
  }
  return { id: data.id as string }
}

export function emailShell(title: string, body: string): string {
  const site = Deno.env.get('SITE_URL') ?? 'https://tidyledger.github.io/tidyledger'
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E4EFE9;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #B9D0C4">
    <p style="font-size:12px;letter-spacing:0.08em;color:#5A4A82;text-transform:uppercase">TidyLedger</p>
    <h1 style="font-size:20px;color:#0F1F1A;margin:8px 0 16px">${title}</h1>
    <div style="color:#4A635A;line-height:1.55;font-size:14px">${body}</div>
    <p style="margin-top:24px;font-size:12px;color:#4A635A"><a href="${site}">Open TidyLedger</a></p>
  </div></body></html>`
}

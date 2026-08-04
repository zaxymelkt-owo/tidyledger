// Lightweight health check for Edge runtime + secret presence (no secrets leaked).
// Deploy: supabase functions deploy health --no-verify-jwt

import { handleCors, json } from '../_shared/cors.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  return json({
    ok: true,
    service: 'tidyledger-edge',
    time: new Date().toISOString(),
    configured: {
      stripe: Boolean(Deno.env.get('STRIPE_SECRET_KEY')),
      stripe_webhook: Boolean(Deno.env.get('STRIPE_WEBHOOK_SECRET')),
      resend: Boolean(Deno.env.get('RESEND_API_KEY')),
      twilio: Boolean(
        Deno.env.get('TWILIO_ACCOUNT_SID') &&
          Deno.env.get('TWILIO_AUTH_TOKEN') &&
          Deno.env.get('TWILIO_FROM_NUMBER')
      ),
      site_url: Boolean(Deno.env.get('SITE_URL')),
    },
  })
})

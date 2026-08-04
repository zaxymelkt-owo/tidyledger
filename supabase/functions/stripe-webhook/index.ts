// Supabase Edge Function: stripe-webhook
// Deploy: supabase functions deploy stripe-webhook --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional email: RESEND_API_KEY, EMAIL_FROM, SITE_URL
// Stripe Dashboard → Webhooks → endpoint:
//   https://<project-ref>.supabase.co/functions/v1/stripe-webhook
// Events: checkout.session.completed, payment_intent.payment_failed, charge.refunded

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

async function sendResendEmail(opts: {
  to: string | string[]
  subject: string
  html: string
}) {
  const key = Deno.env.get('RESEND_API_KEY')
  if (!key) {
    console.log('RESEND_API_KEY not set — skipping email')
    return
  }
  const from = Deno.env.get('EMAIL_FROM') ?? 'TidyLedger <onboarding@resend.dev>'
  const to = Array.isArray(opts.to) ? opts.to : [opts.to]
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to, subject: opts.subject, html: opts.html }),
  })
  if (!res.ok) {
    console.error('Resend error', await res.text())
  }
}

function emailShell(title: string, body: string) {
  const site = Deno.env.get('SITE_URL') ?? 'https://tidyledger.github.io/tidyledger'
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#E4EFE9;padding:24px">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:24px;border:1px solid #B9D0C4">
    <p style="font-size:12px;letter-spacing:0.08em;color:#5A4A82;text-transform:uppercase">TidyLedger</p>
    <h1 style="font-size:20px;color:#0F1F1A;margin:8px 0 16px">${title}</h1>
    <div style="color:#4A635A;line-height:1.55;font-size:14px">${body}</div>
    <p style="margin-top:24px;font-size:12px;color:#4A635A"><a href="${site}">Open TidyLedger</a></p>
  </div></body></html>`
}

Deno.serve(async (req) => {
  const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')
  const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? ''
  const serviceKey =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''

  if (!stripeKey || !webhookSecret || !supabaseUrl || !serviceKey) {
    return new Response('Server misconfigured', { status: 500 })
  }

  const stripe = new Stripe(stripeKey, {
    apiVersion: '2024-12-18.acacia',
    httpClient: Stripe.createFetchHttpClient(),
  })
  const supabase = createClient(supabaseUrl, serviceKey)

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return new Response('Missing stripe-signature', { status: 400 })
  }

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid signature'
    console.error('Webhook signature verification failed:', message)
    return new Response(`Webhook Error: ${message}`, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const paymentId = session.metadata?.payment_id
        const accessToken = session.metadata?.access_token

        let query = supabase.from('payments').update({
          status: 'succeeded',
          method: 'card',
          paid_at: new Date().toISOString(),
          stripe_checkout_session_id: session.id,
          stripe_payment_intent_id:
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          reference: session.payment_intent
            ? String(
                typeof session.payment_intent === 'string'
                  ? session.payment_intent
                  : session.payment_intent.id
              )
            : session.id,
        })

        if (paymentId) query = query.eq('id', paymentId)
        else if (accessToken) query = query.eq('access_token', accessToken)
        else if (session.id) query = query.eq('stripe_checkout_session_id', session.id)
        else break

        const { data: updated, error } = await query
          .select('id, job_id, business_id, customer_id, amount, payer_email, payer_name, description')
          .maybeSingle()
        if (error) {
          console.error('Failed to update payment:', error.message)
          return new Response(error.message, { status: 500 })
        }

        if (updated?.job_id) {
          await supabase
            .from('jobs')
            .update({ payment_status: 'paid' })
            .eq('id', updated.job_id)
        }

        if (updated && session.amount_total != null) {
          await supabase.from('transactions').insert({
            txn_date: new Date().toISOString().slice(0, 10),
            type: 'income',
            category: 'Job payment',
            amount: session.amount_total / 100,
            description: `Stripe payment ${session.id}`,
            related_job_id: updated.job_id,
            payment_method: 'card',
            business_id: updated.business_id ?? null,
          })
        }

        // Notify customer + business owner
        if (updated) {
          const amount =
            session.amount_total != null
              ? (session.amount_total / 100).toFixed(2)
              : Number(updated.amount ?? 0).toFixed(2)
          const desc = updated.description || 'Cleaning service payment'

          if (updated.payer_email) {
            await sendResendEmail({
              to: updated.payer_email,
              subject: `Payment received — $${amount}`,
              html: emailShell(
                'Payment confirmed',
                `<p>Thanks${updated.payer_name ? `, ${updated.payer_name}` : ''}. We received your payment of <strong>$${amount}</strong>.</p>
                 <p>${desc}</p>
                 <p style="font-size:12px;color:#4A635A">Reference: ${session.id}</p>`
              ),
            })
          }

          if (updated.business_id) {
            const { data: biz } = await supabase
              .from('businesses')
              .select('email, name')
              .eq('id', updated.business_id)
              .maybeSingle()
            if (biz?.email) {
              await sendResendEmail({
                to: biz.email,
                subject: `Payment succeeded — $${amount}`,
                html: emailShell(
                  'Customer payment received',
                  `<p><strong>$${amount}</strong> paid for ${desc}.</p>
                   <p>Customer: ${updated.payer_name ?? '—'} (${updated.payer_email ?? 'no email'})</p>
                   <p style="font-size:12px">Business: ${biz.name}</p>`
                ),
              })
            }
          }
        }
        break
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent
        const paymentId = pi.metadata?.payment_id
        if (paymentId) {
          await supabase
            .from('payments')
            .update({ status: 'failed', stripe_payment_intent_id: pi.id })
            .eq('id', paymentId)
        }
        break
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge
        const piId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id
        if (piId) {
          await supabase
            .from('payments')
            .update({ status: 'refunded' })
            .eq('stripe_payment_intent_id', piId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Handler error'
    console.error(message)
    return new Response(message, { status: 500 })
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})

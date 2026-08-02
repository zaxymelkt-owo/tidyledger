// Supabase Edge Function: create-checkout-session
// Deploy: supabase functions deploy create-checkout-session --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
// Optional: SITE_URL (e.g. https://youruser.github.io/housekeeping-admin)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'
import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) {
      return json({ error: 'STRIPE_SECRET_KEY is not configured' }, 500)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? ''
    const serviceKey =
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
    if (!supabaseUrl || !serviceKey) {
      return json({ error: 'Supabase service credentials are not configured' }, 500)
    }

    const { access_token, success_url, cancel_url } = await req.json()
    if (!access_token || typeof access_token !== 'string') {
      return json({ error: 'access_token is required' }, 400)
    }

    const supabase = createClient(supabaseUrl, serviceKey)
    const stripe = new Stripe(stripeKey, {
      apiVersion: '2024-12-18.acacia',
      httpClient: Stripe.createFetchHttpClient(),
    })

    const { data: payment, error: payErr } = await supabase
      .from('payments')
      .select('*')
      .eq('access_token', access_token)
      .maybeSingle()

    if (payErr) return json({ error: payErr.message }, 500)
    if (!payment) return json({ error: 'Payment not found' }, 404)
    if (payment.status === 'succeeded') {
      return json({ error: 'This payment has already been completed' }, 400)
    }
    if (payment.status === 'refunded') {
      return json({ error: 'This payment was refunded' }, 400)
    }

    const amountCents = Math.round(Number(payment.amount) * 100)
    if (!Number.isFinite(amountCents) || amountCents < 50) {
      return json({ error: 'Amount must be at least $0.50' }, 400)
    }

    const siteUrl =
      Deno.env.get('SITE_URL')?.replace(/\/$/, '') ||
      (typeof success_url === 'string' ? new URL(success_url).origin : '')

    const defaultSuccess =
      success_url ||
      `${siteUrl}/pay/${access_token}?status=success&session_id={CHECKOUT_SESSION_ID}`
    const defaultCancel =
      cancel_url || `${siteUrl}/pay/${access_token}?status=cancelled`

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      customer_email: payment.payer_email || undefined,
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: (payment.currency || 'usd').toLowerCase(),
            unit_amount: amountCents,
            product_data: {
              name: payment.description || 'Cleaning service payment',
              metadata: {
                payment_id: payment.id,
                job_id: payment.job_id || '',
                customer_id: payment.customer_id || '',
              },
            },
          },
        },
      ],
      metadata: {
        payment_id: payment.id,
        access_token: payment.access_token,
        job_id: payment.job_id || '',
        customer_id: payment.customer_id || '',
      },
      success_url: defaultSuccess,
      cancel_url: defaultCancel,
      payment_intent_data: {
        metadata: {
          payment_id: payment.id,
          access_token: payment.access_token,
        },
      },
    })

    await supabase
      .from('payments')
      .update({
        status: 'processing',
        stripe_checkout_session_id: session.id,
        method: 'card',
      })
      .eq('id', payment.id)

    return json({ url: session.url, session_id: session.id })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected error'
    console.error(message)
    return json({ error: message }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

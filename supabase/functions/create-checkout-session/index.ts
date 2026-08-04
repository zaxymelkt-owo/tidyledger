// Create a Stripe Checkout session for a payment access_token.
// Deploy: supabase functions deploy create-checkout-session --no-verify-jwt
// Secrets: STRIPE_SECRET_KEY

import Stripe from 'https://esm.sh/stripe@17.7.0?target=deno'
import { handleCors, json } from '../_shared/cors.ts'
import { serviceClient, siteUrl } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  const cors = handleCors(req)
  if (cors) return cors

  try {
    if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405)

    const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')
    if (!stripeKey) return json({ error: 'STRIPE_SECRET_KEY is not configured' }, 500)

    const body = await req.json()
    const access_token = body?.access_token
    const success_url = body?.success_url
    const cancel_url = body?.cancel_url

    if (!access_token || typeof access_token !== 'string') {
      return json({ error: 'access_token is required' }, 400)
    }

    const supabase = serviceClient()
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

    const base = siteUrl()
    const defaultSuccess =
      (typeof success_url === 'string' && success_url) ||
      `${base}/pay/${access_token}?status=success&session_id={CHECKOUT_SESSION_ID}`
    const defaultCancel =
      (typeof cancel_url === 'string' && cancel_url) ||
      `${base}/pay/${access_token}?status=cancelled`

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
        business_id: payment.business_id || '',
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
    console.error('create-checkout-session', message)
    return json({ error: message }, 500)
  }
})

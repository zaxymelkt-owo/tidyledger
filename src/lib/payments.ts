import { supabase } from './supabase'

/**
 * Starts a Stripe Checkout session for a payment access token.
 * Calls the Supabase Edge Function `create-checkout-session`.
 */
export async function startStripeCheckout(accessToken: string): Promise<{ url?: string; error?: string }> {
  const successUrl = `${window.location.origin}${import.meta.env.BASE_URL}pay/${accessToken}?status=success&session_id={CHECKOUT_SESSION_ID}`
  const cancelUrl = `${window.location.origin}${import.meta.env.BASE_URL}pay/${accessToken}?status=cancelled`

  const { data, error } = await supabase.functions.invoke('create-checkout-session', {
    body: {
      access_token: accessToken,
      success_url: successUrl,
      cancel_url: cancelUrl,
    },
  })

  if (error) {
    return { error: error.message || 'Could not start checkout' }
  }

  if (data?.error) {
    return { error: String(data.error) }
  }

  if (!data?.url) {
    return { error: 'No checkout URL returned. Is the Stripe edge function deployed?' }
  }

  return { url: data.url as string }
}

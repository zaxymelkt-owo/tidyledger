# Supabase Edge Functions

| Function | Purpose | Auth |
|----------|---------|------|
| `create-checkout-session` | Stripe Checkout for payment `access_token` | Public (`--no-verify-jwt`) |
| `stripe-webhook` | Payment status + receipt emails | Stripe signature |
| `send-email` | Resend transactional mail from the app | Anon / session |
| `send-job-reminders` | Due SMS job reminders via Twilio | Optional `x-cron-secret` |
| `health` | Config probe (no secret values) | Public |

Shared code lives in `supabase/functions/_shared/`.

## Prerequisites

```bash
npm i -g supabase   # or use npx
supabase login
supabase link --project-ref <your-project-ref>
```

## Secrets

```bash
# Stripe
supabase secrets set STRIPE_SECRET_KEY=sk_live_...
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...

# Site (checkout redirects + email links)
supabase secrets set SITE_URL=https://tidyledger.github.io/tidyledger

# Email (Resend)
supabase secrets set RESEND_API_KEY=re_...
supabase secrets set EMAIL_FROM="TidyLedger <onboarding@resend.dev>"

# SMS (Twilio) — optional until reminders go live
supabase secrets set TWILIO_ACCOUNT_SID=AC...
supabase secrets set TWILIO_AUTH_TOKEN=...
supabase secrets set TWILIO_FROM_NUMBER=+1...

# Cron guard for send-job-reminders
supabase secrets set CRON_SECRET=$(openssl rand -hex 24)
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically on hosted functions.

## Deploy all

```bash
supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
supabase functions deploy send-email --no-verify-jwt
supabase functions deploy send-job-reminders --no-verify-jwt
supabase functions deploy health --no-verify-jwt
```

Or from the repo root:

```bash
bash scripts/deploy-edge-functions.sh
```

## Stripe webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL: `https://<project-ref>.supabase.co/functions/v1/stripe-webhook`
3. Events: `checkout.session.completed`, `payment_intent.payment_failed`, `charge.refunded`
4. Copy signing secret → `STRIPE_WEBHOOK_SECRET`

## Cron: job reminders

Every 15 minutes (example with `curl`):

```bash
curl -X POST \
  "https://<project-ref>.supabase.co/functions/v1/send-job-reminders" \
  -H "x-cron-secret: $CRON_SECRET"
```

Use GitHub Actions scheduled workflow, Supabase scheduled functions (when available), or any external cron.

## Local serve

```bash
supabase functions serve create-checkout-session --env-file .env.edge
```

`.env.edge` example:

```
STRIPE_SECRET_KEY=sk_test_...
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
SITE_URL=http://localhost:5173/tidyledger
RESEND_API_KEY=re_...
```

## App wiring

| Client | Function |
|--------|----------|
| `src/lib/payments.ts` → `startStripeCheckout` | `create-checkout-session` |
| `src/lib/notify.ts` → `notifyEmail` | `send-email` |
| Stripe | `stripe-webhook` |
| Cron | `send-job-reminders` |

## Verify

```bash
curl "https://<project-ref>.supabase.co/functions/v1/health"
# → { "ok": true, "configured": { "stripe": true, ... } }
```

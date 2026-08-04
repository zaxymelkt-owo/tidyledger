#!/usr/bin/env bash
# Deploy all TidyLedger Edge Functions.
# Requires: supabase CLI logged in + project linked.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "Deploying Edge Functions from $ROOT"

deploy() {
  local name="$1"
  echo "→ $name"
  supabase functions deploy "$name" --no-verify-jwt
}

deploy create-checkout-session
deploy stripe-webhook
deploy send-email
deploy send-job-reminders
deploy health

echo "Done. Set secrets if you have not already — see docs/EDGE_FUNCTIONS.md"
echo "Health: https://<project-ref>.supabase.co/functions/v1/health"

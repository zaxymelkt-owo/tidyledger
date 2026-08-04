import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1'

/** Service-role client (bypasses RLS). Available automatically in hosted Edge Functions. */
export function serviceClient(): SupabaseClient {
  const url = Deno.env.get('SUPABASE_URL') ?? Deno.env.get('SB_URL') ?? ''
  const key =
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SB_SERVICE_ROLE_KEY') ?? ''
  if (!url || !key) {
    throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required')
  }
  return createClient(url, key)
}

export function siteUrl(): string {
  return (Deno.env.get('SITE_URL') ?? 'https://tidyledger.github.io/tidyledger').replace(/\/$/, '')
}

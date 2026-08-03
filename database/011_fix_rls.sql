-- Fix RLS gaps found in security audit (Aug 2026)
-- Run this after 010_disputes_tax.sql.
--
-- Problems fixed:
--   1. employees / inventory / transactions / quotes still carried their
--      original schema.sql "authenticated can do anything" policies.
--      008_multitenant_accounts.sql never dropped them, so those policies
--      (which are OR'd with everything else) let ANY signed-in user from
--      ANY business read and write every other business's staff,
--      inventory, and financial data.
--   2. "Public can read payment by token" / "Public can update payment
--      status" on payments were `using (true)` — not actually filtered by
--      token — so any anonymous request could read every payment on the
--      platform (names, emails, amounts) and flip any payment's status,
--      including marking it "succeeded" without paying.
--   3. "Public can lookup portal customers" only checked
--      portal_enabled = true, not the email/portal_code the app was
--      supposedly matching client-side. Anyone could pull every portal
--      customer's full row — including gate_code and alarm_code — with
--      one unauthenticated query.
--
-- Fix strategy: drop the leaky policies, replace direct anon table access
-- with security-definer RPCs (same pattern already used for
-- resolve_portal_customer / portal_list_jobs in 006), and scope all
-- authenticated staff access to business_id, matching the pattern already
-- used correctly for customers/jobs in 008.

-- ─────────────────────────────────────────────
-- 1) Tenant-scope employees / inventory / transactions / quotes
--    (mirrors "Staff tenant jobs" from 008_multitenant_accounts.sql)
-- ─────────────────────────────────────────────

drop policy if exists "Authenticated users can read employees" on employees;
drop policy if exists "Authenticated users can insert employees" on employees;
drop policy if exists "Authenticated users can update employees" on employees;
drop policy if exists "Authenticated users can delete employees" on employees;

create policy "Staff tenant employees"
  on employees for all to authenticated
  using (public.is_staff() and (business_id is null or business_id = public.current_business_id()))
  with check (public.is_staff() and (business_id is null or business_id = public.current_business_id()));

drop policy if exists "Authenticated users can read inventory" on inventory;
drop policy if exists "Authenticated users can insert inventory" on inventory;
drop policy if exists "Authenticated users can update inventory" on inventory;
drop policy if exists "Authenticated users can delete inventory" on inventory;

create policy "Staff tenant inventory"
  on inventory for all to authenticated
  using (public.is_staff() and (business_id is null or business_id = public.current_business_id()))
  with check (public.is_staff() and (business_id is null or business_id = public.current_business_id()));

drop policy if exists "Authenticated users can read transactions" on transactions;
drop policy if exists "Authenticated users can insert transactions" on transactions;
drop policy if exists "Authenticated users can update transactions" on transactions;
drop policy if exists "Authenticated users can delete transactions" on transactions;

create policy "Staff tenant transactions"
  on transactions for all to authenticated
  using (public.is_staff() and (business_id is null or business_id = public.current_business_id()))
  with check (public.is_staff() and (business_id is null or business_id = public.current_business_id()));

drop policy if exists "Authenticated users can read quotes" on quotes;
drop policy if exists "Authenticated users can insert quotes" on quotes;
drop policy if exists "Authenticated users can update quotes" on quotes;
drop policy if exists "Authenticated users can delete quotes" on quotes;

create policy "Staff tenant quotes"
  on quotes for all to authenticated
  using (public.is_staff() and (business_id is null or business_id = public.current_business_id()))
  with check (public.is_staff() and (business_id is null or business_id = public.current_business_id()));

-- Portal customers still need to see their own quotes; this was added in
-- 006_portal_data_access.sql and is unaffected (it's a separate policy for
-- the `anon` role, scoped to sent/accepted/declined/expired + portal_enabled).

-- ─────────────────────────────────────────────
-- 2) Payments: remove direct anon read/write, route through an RPC that
--    actually checks the token server-side. Staff access becomes tenant-scoped.
-- ─────────────────────────────────────────────

drop policy if exists "Authenticated users can manage payments" on payments;
drop policy if exists "Public can read payment by token" on payments;
drop policy if exists "Public can update payment status" on payments;
drop policy if exists "Public can read payments for portal customer" on payments;

create policy "Staff tenant payments"
  on payments for all to authenticated
  using (public.is_staff() and (business_id is null or business_id = public.current_business_id()))
  with check (public.is_staff() and (business_id is null or business_id = public.current_business_id()));

-- Anonymous access to a single payment now only ever happens through this
-- function, which does the token match in SQL instead of trusting a
-- client-side .eq() filter. It never grants write access — status changes
-- only happen via the Stripe webhook, which uses the service-role key and
-- bypasses RLS entirely (see supabase/functions/stripe-webhook).
create or replace function public.get_payment_by_token(p_token text)
returns setof payments
language sql
stable
security definer
set search_path = public
as $$
  select * from payments where access_token = p_token limit 1;
$$;

revoke all on function public.get_payment_by_token(text) from public;
grant execute on function public.get_payment_by_token(text) to anon, authenticated;

-- Portal customers reading their own payment history (used by
-- portal_list_payments already, but keep a direct-select fallback scoped
-- correctly in case anything still queries the table for a *signed-in*
-- portal account):
create policy "Customer read own payments"
  on payments for select to authenticated
  using (customer_id = (select customer_id from profiles where id = auth.uid()));

-- ─────────────────────────────────────────────
-- 3) Customers: remove the broad anon portal-lookup policy and replace
--    the client-side-filtered query with a real credential check.
--    (This also stops leaking gate_code / alarm_code to anonymous
--    requests for every portal-enabled customer.)
-- ─────────────────────────────────────────────

drop policy if exists "Public can lookup portal customers" on customers;

-- Returns only what the portal login screen actually needs — never
-- gate_code / alarm_code / notes — and only for an exact email + code
-- match, checked in SQL rather than trusted from the client.
create or replace function public.portal_login(p_email text, p_portal_code text)
returns table (
  id uuid,
  first_name text,
  last_name text,
  email text,
  portal_code text,
  business_id uuid,
  auth_user_id uuid,
  account_claimed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select c.id, c.first_name, c.last_name, c.email, c.portal_code,
         c.business_id, c.auth_user_id, c.account_claimed_at
  from customers c
  where c.portal_enabled = true
    and c.portal_code = trim(p_portal_code)
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;
$$;

revoke all on function public.portal_login(text, text) from public;
grant execute on function public.portal_login(text, text) to anon, authenticated;

-- Jobs-for-portal and quotes-for-portal anon policies (from schema.sql /
-- 006) already join through customers.portal_enabled and don't select
-- gate_code/alarm_code-bearing rows themselves, so they're left as-is.

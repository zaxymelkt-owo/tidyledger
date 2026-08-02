-- Fix customer portal data access
-- Portal users authenticate with email + portal_code (not Supabase Auth),
-- so queries run as the `anon` role. Row-level security was blocking
-- quotes/jobs/payments/reviews in practice (especially subqueries under RLS).
--
-- Solution: security-definer RPCs that validate portal credentials, then
-- return only that customer's rows.

-- ─────────────────────────────────────────────
-- Helper: resolve portal customer id
-- ─────────────────────────────────────────────
create or replace function public.resolve_portal_customer(
  p_email text,
  p_portal_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  select c.id into cid
  from customers c
  where c.portal_enabled = true
    and c.portal_code = trim(p_portal_code)
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;

  return cid;
end;
$$;

revoke all on function public.resolve_portal_customer(text, text) from public;
grant execute on function public.resolve_portal_customer(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Portal: jobs
-- ─────────────────────────────────────────────
create or replace function public.portal_list_jobs(
  p_email text,
  p_portal_code text
)
returns setof jobs
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := public.resolve_portal_customer(p_email, p_portal_code);
  if cid is null then
    return;
  end if;

  return query
  select j.*
  from jobs j
  where j.customer_id = cid
  order by j.job_date desc;
end;
$$;

revoke all on function public.portal_list_jobs(text, text) from public;
grant execute on function public.portal_list_jobs(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Portal: quotes (hide internal drafts)
-- ─────────────────────────────────────────────
create or replace function public.portal_list_quotes(
  p_email text,
  p_portal_code text
)
returns setof quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := public.resolve_portal_customer(p_email, p_portal_code);
  if cid is null then
    return;
  end if;

  return query
  select q.*
  from quotes q
  where q.customer_id = cid
    and q.status in ('sent', 'accepted', 'declined', 'expired')
  order by q.created_at desc;
end;
$$;

revoke all on function public.portal_list_quotes(text, text) from public;
grant execute on function public.portal_list_quotes(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Portal: payments
-- ─────────────────────────────────────────────
create or replace function public.portal_list_payments(
  p_email text,
  p_portal_code text
)
returns setof payments
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := public.resolve_portal_customer(p_email, p_portal_code);
  if cid is null then
    return;
  end if;

  return query
  select p.*
  from payments p
  where p.customer_id = cid
  order by p.created_at desc;
end;
$$;

revoke all on function public.portal_list_payments(text, text) from public;
grant execute on function public.portal_list_payments(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Portal: reviews (their own, any status)
-- ─────────────────────────────────────────────
create or replace function public.portal_list_reviews(
  p_email text,
  p_portal_code text
)
returns setof reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  cid uuid;
begin
  cid := public.resolve_portal_customer(p_email, p_portal_code);
  if cid is null then
    return;
  end if;

  return query
  select r.*
  from reviews r
  where r.customer_id = cid
  order by r.created_at desc;
end;
$$;

revoke all on function public.portal_list_reviews(text, text) from public;
grant execute on function public.portal_list_reviews(text, text) to anon, authenticated;

-- ─────────────────────────────────────────────
-- Broader anon RLS fallbacks (in addition to RPCs)
-- ─────────────────────────────────────────────
drop policy if exists "Public can read quotes for portal" on quotes;
create policy "Public can read quotes for portal"
  on quotes for select
  to anon
  using (
    status in ('sent', 'accepted', 'declined', 'expired')
    and customer_id is not null
    and exists (
      select 1 from customers c
      where c.id = quotes.customer_id
        and c.portal_enabled = true
    )
  );

drop policy if exists "Public can read payments for portal customer" on payments;
create policy "Public can read payments for portal customer"
  on payments for select
  to anon
  using (
    customer_id is not null
    and exists (
      select 1 from customers c
      where c.id = payments.customer_id
        and c.portal_enabled = true
    )
  );

drop policy if exists "Public can read own portal reviews" on reviews;
create policy "Public can read own portal reviews"
  on reviews for select
  to anon
  using (
    customer_id is not null
    and exists (
      select 1 from customers c
      where c.id = reviews.customer_id
        and c.portal_enabled = true
    )
  );

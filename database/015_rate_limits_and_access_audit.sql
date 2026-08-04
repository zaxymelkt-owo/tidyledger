-- Rate limiting helpers + sensitive field access audit.
-- Run after 014_portal_quote_actions.sql.

-- ── Simple sliding-window rate limit (IP or key string) ─────────────
create table if not exists rate_limit_hits (
  id bigserial primary key,
  bucket text not null,
  created_at timestamptz not null default now()
);

create index if not exists rate_limit_hits_bucket_created_idx
  on rate_limit_hits (bucket, created_at desc);

-- Returns true if under limit; records a hit when allowed.
create or replace function public.check_rate_limit(
  p_bucket text,
  p_max integer default 10,
  p_window_seconds integer default 600
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  if p_bucket is null or length(trim(p_bucket)) < 3 then
    return false;
  end if;

  delete from rate_limit_hits
  where created_at < now() - make_interval(secs => greatest(p_window_seconds * 3, 3600));

  select count(*) into v_count
  from rate_limit_hits
  where bucket = p_bucket
    and created_at > now() - make_interval(secs => p_window_seconds);

  if v_count >= p_max then
    return false;
  end if;

  insert into rate_limit_hits (bucket) values (p_bucket);
  return true;
end;
$$;

revoke all on function public.check_rate_limit(text, integer, integer) from public;
grant execute on function public.check_rate_limit(text, integer, integer) to anon, authenticated;

-- ── Audit log for gate/alarm code views & edits ─────────────────────
create table if not exists sensitive_access_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid references businesses(id) on delete set null,
  customer_id uuid references customers(id) on delete set null,
  actor_user_id uuid,
  action text not null, -- 'view_codes' | 'update_codes'
  meta jsonb
);

create index if not exists sensitive_access_log_business_idx
  on sensitive_access_log (business_id, created_at desc);

alter table sensitive_access_log enable row level security;

drop policy if exists "Staff read own sensitive access log" on sensitive_access_log;
create policy "Staff read own sensitive access log"
  on sensitive_access_log for select to authenticated
  using (public.is_staff() and business_id = public.current_business_id());

-- Staff-only insert of audit rows
drop policy if exists "Staff insert sensitive access log" on sensitive_access_log;
create policy "Staff insert sensitive access log"
  on sensitive_access_log for insert to authenticated
  with check (public.is_staff() and business_id = public.current_business_id());

create or replace function public.log_sensitive_customer_access(
  p_customer_id uuid,
  p_action text,
  p_meta jsonb default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_biz uuid;
begin
  select business_id into v_biz from customers where id = p_customer_id;
  insert into sensitive_access_log (business_id, customer_id, actor_user_id, action, meta)
  values (v_biz, p_customer_id, auth.uid(), p_action, p_meta);
end;
$$;

revoke all on function public.log_sensitive_customer_access(uuid, text, jsonb) from public;
grant execute on function public.log_sensitive_customer_access(uuid, text, jsonb) to authenticated;

-- ── Harden public quote_request insert with rate limit (optional guard) ─
-- Call from Edge or client before insert:
--   select public.check_rate_limit('quote_req:' || lower(email), 5, 3600);

-- ── Platform admin helper (document + SQL, not only README) ───────────
create or replace function public.grant_platform_admin(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Only an existing platform admin may grant another.
  if not exists (select 1 from platform_admins where user_id = auth.uid()) then
    raise exception 'only platform admins can grant platform admin';
  end if;
  insert into platform_admins (user_id) values (p_user_id)
  on conflict do nothing;
end;
$$;

revoke all on function public.grant_platform_admin(uuid) from public;
grant execute on function public.grant_platform_admin(uuid) to authenticated;

-- Bootstrap note: first platform admin must be inserted with the service role:
--   insert into platform_admins (user_id) values ('<auth.users id>');

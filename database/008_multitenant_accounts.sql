-- Multi-tenant businesses, staff profiles, customer password accounts
-- Run after previous migrations.

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- BUSINESSES
-- ─────────────────────────────────────────────
create table if not exists businesses (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  name          text not null,
  slug          text unique,
  phone         text,
  email         text,
  address       text,
  city          text,
  timezone      text default 'America/New_York'
);

-- ─────────────────────────────────────────────
-- PROFILES (1:1 with auth.users)
-- role: owner | manager | employee | customer
-- ─────────────────────────────────────────────
create table if not exists profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  created_at    timestamptz not null default now(),
  business_id   uuid references businesses(id) on delete cascade,
  role          text not null check (role in ('owner','manager','employee','customer')),
  full_name     text,
  email         text,
  customer_id   uuid references customers(id) on delete set null,
  active        boolean not null default true
);

create index if not exists profiles_business_id_idx on profiles (business_id);
create index if not exists profiles_customer_id_idx on profiles (customer_id);

-- ─────────────────────────────────────────────
-- STAFF INVITES (owner/manager creates employee login)
-- ─────────────────────────────────────────────
create table if not exists staff_invites (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  business_id   uuid not null references businesses(id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text not null default 'employee'
                  check (role in ('manager','employee')),
  token         text not null unique default encode(gen_random_bytes(24), 'hex'),
  invited_by    uuid references profiles(id) on delete set null,
  accepted_at   timestamptz,
  expires_at    timestamptz not null default (now() + interval '14 days')
);

create index if not exists staff_invites_token_idx on staff_invites (token);
create index if not exists staff_invites_business_id_idx on staff_invites (business_id);

-- Link customers to auth users after they claim a password
alter table customers
  add column if not exists business_id uuid references businesses(id) on delete cascade,
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null,
  add column if not exists account_claimed_at timestamptz;

create index if not exists customers_business_id_idx on customers (business_id);
create index if not exists customers_auth_user_id_idx on customers (auth_user_id);

-- Tenant column on core tables (nullable for legacy rows; app sets on write)
do $$
declare
  t text;
begin
  foreach t in array array[
    'jobs','quotes','quote_requests','employees','inventory',
    'transactions','payments','reviews','job_photos','job_checkins','job_signatures'
  ]
  loop
    if exists (select 1 from information_schema.tables where table_schema='public' and table_name=t) then
      execute format('alter table %I add column if not exists business_id uuid references businesses(id) on delete cascade', t);
      execute format('create index if not exists %I on %I (business_id)', t||'_business_id_idx', t);
    end if;
  end loop;
end $$;

-- ─────────────────────────────────────────────
-- Helpers
-- ─────────────────────────────────────────────
create or replace function public.current_profile()
returns profiles
language sql
stable
security definer
set search_path = public
as $$
  select * from profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from profiles where id = auth.uid() limit 1;
$$;

create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from profiles where id = auth.uid() limit 1;
$$;

create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid()
      and active = true
      and role in ('owner','manager','employee')
  );
$$;

revoke all on function public.current_profile() from public;
revoke all on function public.current_business_id() from public;
revoke all on function public.current_role() from public;
revoke all on function public.is_staff() from public;
grant execute on function public.current_profile() to authenticated;
grant execute on function public.current_business_id() to authenticated;
grant execute on function public.current_role() to authenticated;
grant execute on function public.is_staff() to authenticated;

-- ─────────────────────────────────────────────
-- Bootstrap: first owner creates business + profile
-- ─────────────────────────────────────────────
create or replace function public.register_business(
  p_business_name text,
  p_full_name text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid;
  uid uuid := auth.uid();
  slug_base text;
  slug_try text;
  n int := 0;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;
  if exists (select 1 from profiles where id = uid) then
    raise exception 'Profile already exists';
  end if;
  if p_business_name is null or length(trim(p_business_name)) < 2 then
    raise exception 'Business name required';
  end if;

  slug_base := lower(regexp_replace(trim(p_business_name), '[^a-zA-Z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'business'; end if;
  slug_try := slug_base;
  while exists (select 1 from businesses where slug = slug_try) loop
    n := n + 1;
    slug_try := slug_base || '-' || n::text;
  end loop;

  insert into businesses (name, slug, email)
  values (trim(p_business_name), slug_try, (select email from auth.users where id = uid))
  returning id into bid;

  insert into profiles (id, business_id, role, full_name, email)
  values (
    uid,
    bid,
    'owner',
    coalesce(nullif(trim(p_full_name), ''), split_part((select email from auth.users where id = uid), '@', 1)),
    (select email from auth.users where id = uid)
  );

  return bid;
end;
$$;

revoke all on function public.register_business(text, text) from public;
grant execute on function public.register_business(text, text) to authenticated;

-- ─────────────────────────────────────────────
-- Customer claims password after portal code use
-- Call AFTER supabase.auth.signUp with same email
-- ─────────────────────────────────────────────
create or replace function public.claim_customer_account(
  p_email text,
  p_portal_code text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  cid uuid;
  bid uuid;
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  select c.id, c.business_id into cid, bid
  from customers c
  where c.portal_enabled = true
    and c.portal_code = trim(p_portal_code)
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;

  if cid is null then
    raise exception 'Invalid portal credentials';
  end if;

  if exists (select 1 from customers where id = cid and auth_user_id is not null and auth_user_id <> uid) then
    raise exception 'This portal account is already linked to another login';
  end if;

  update customers
  set auth_user_id = uid,
      account_claimed_at = coalesce(account_claimed_at, now())
  where id = cid;

  insert into profiles (id, business_id, role, full_name, email, customer_id)
  values (
    uid,
    bid,
    'customer',
    (select first_name || ' ' || last_name from customers where id = cid),
    lower(trim(p_email)),
    cid
  )
  on conflict (id) do update
    set customer_id = excluded.customer_id,
        role = 'customer',
        business_id = coalesce(profiles.business_id, excluded.business_id),
        email = excluded.email;

  return cid;
end;
$$;

revoke all on function public.claim_customer_account(text, text) from public;
grant execute on function public.claim_customer_account(text, text) to authenticated;

-- Validate invite before signup (public)
create or replace function public.get_staff_invite(p_token text)
returns table (
  id uuid,
  email text,
  full_name text,
  role text,
  business_name text,
  expires_at timestamptz,
  accepted_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select
    i.id,
    i.email,
    i.full_name,
    i.role,
    b.name,
    i.expires_at,
    i.accepted_at
  from staff_invites i
  join businesses b on b.id = i.business_id
  where i.token = trim(p_token)
  limit 1;
end;
$$;

revoke all on function public.get_staff_invite(text) from public;
grant execute on function public.get_staff_invite(text) to anon, authenticated;

-- Accept invite after auth.signUp
create or replace function public.accept_staff_invite(p_token text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  inv staff_invites%rowtype;
begin
  if uid is null then raise exception 'Not authenticated'; end if;

  select * into inv from staff_invites where token = trim(p_token) limit 1;
  if inv.id is null then raise exception 'Invite not found'; end if;
  if inv.accepted_at is not null then raise exception 'Invite already used'; end if;
  if inv.expires_at < now() then raise exception 'Invite expired'; end if;

  if lower((select email from auth.users where id = uid)) <> lower(inv.email) then
    raise exception 'Signed-in email does not match invite';
  end if;

  insert into profiles (id, business_id, role, full_name, email)
  values (uid, inv.business_id, inv.role, inv.full_name, inv.email)
  on conflict (id) do update
    set business_id = excluded.business_id,
        role = excluded.role,
        full_name = coalesce(excluded.full_name, profiles.full_name),
        active = true;

  update staff_invites set accepted_at = now() where id = inv.id;

  -- Mirror into employees directory if table exists
  if exists (select 1 from information_schema.tables where table_name = 'employees') then
    insert into employees (business_id, first_name, last_name, email, role, status)
    select
      inv.business_id,
      split_part(coalesce(inv.full_name, inv.email), ' ', 1),
      coalesce(nullif(split_part(coalesce(inv.full_name, inv.email), ' ', 2), ''), 'Staff'),
      inv.email,
      case when inv.role = 'manager' then 'manager' else 'cleaner' end,
      'active'
    where not exists (
      select 1 from employees e where e.email = inv.email and (e.business_id = inv.business_id or e.business_id is null)
    );
  end if;

  return inv.business_id;
end;
$$;

revoke all on function public.accept_staff_invite(text) from public;
grant execute on function public.accept_staff_invite(text) to authenticated;

-- ─────────────────────────────────────────────
-- RLS
-- ─────────────────────────────────────────────
alter table businesses enable row level security;
alter table profiles enable row level security;
alter table staff_invites enable row level security;

drop policy if exists "Staff read own business" on businesses;
create policy "Staff read own business"
  on businesses for select to authenticated
  using (id = public.current_business_id());

drop policy if exists "Owner update own business" on businesses;
create policy "Owner update own business"
  on businesses for update to authenticated
  using (id = public.current_business_id() and public.current_role() in ('owner','manager'));

drop policy if exists "Users read own profile" on profiles;
create policy "Users read own profile"
  on profiles for select to authenticated
  using (id = auth.uid() or (business_id = public.current_business_id() and public.is_staff()));

drop policy if exists "Users update own profile" on profiles;
create policy "Users update own profile"
  on profiles for update to authenticated
  using (id = auth.uid());

drop policy if exists "Staff manage invites" on staff_invites;
create policy "Staff manage invites"
  on staff_invites for all to authenticated
  using (business_id = public.current_business_id() and public.current_role() in ('owner','manager'))
  with check (business_id = public.current_business_id() and public.current_role() in ('owner','manager'));

-- Tighten staff table policies to tenant (additive — keeps working if business_id null on legacy)
-- Customers
drop policy if exists "Staff tenant customers" on customers;
create policy "Staff tenant customers"
  on customers for all to authenticated
  using (
    public.is_staff() and (
      business_id is null or business_id = public.current_business_id()
    )
  )
  with check (
    public.is_staff() and (
      business_id is null or business_id = public.current_business_id()
    )
  );

drop policy if exists "Customer read own row" on customers;
create policy "Customer read own row"
  on customers for select to authenticated
  using (auth_user_id = auth.uid() or id = (select customer_id from profiles where id = auth.uid()));

-- Jobs tenant
drop policy if exists "Staff tenant jobs" on jobs;
create policy "Staff tenant jobs"
  on jobs for all to authenticated
  using (
    public.is_staff() and (business_id is null or business_id = public.current_business_id())
  )
  with check (
    public.is_staff() and (business_id is null or business_id = public.current_business_id())
  );

drop policy if exists "Customer read own jobs" on jobs;
create policy "Customer read own jobs"
  on jobs for select to authenticated
  using (
    customer_id = (select customer_id from profiles where id = auth.uid())
  );

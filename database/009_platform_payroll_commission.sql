-- Platform owner (TidyLedger master), business applications, commissions, payroll
-- Run after 008_multitenant_accounts.sql

-- ─────────────────────────────────────────────
-- PLATFORM ADMINS (TidyLedger operators — not a cleaning business)
-- ─────────────────────────────────────────────
create table if not exists platform_admins (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  full_name   text,
  email       text
);

alter table platform_admins enable row level security;

create or replace function public.is_platform_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from platform_admins where user_id = auth.uid());
$$;

revoke all on function public.is_platform_admin() from public;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "Platform admins read self" on platform_admins;
create policy "Platform admins read self"
  on platform_admins for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- ─────────────────────────────────────────────
-- BUSINESS APPLICATIONS (onboarding before approval)
-- ─────────────────────────────────────────────
alter table businesses
  add column if not exists status text not null default 'active'
    check (status in ('pending','active','suspended','denied')),
  add column if not exists application_notes text,
  add column if not exists reviewed_at timestamptz,
  add column if not exists reviewed_by uuid references auth.users(id),
  add column if not exists commission_rate_pct numeric(5,2) default 8.00,
  add column if not exists commission_terms text,
  add column if not exists commission_accepted_at timestamptz;

create table if not exists business_applications (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid references businesses(id) on delete set null,
  business_name   text not null,
  contact_name    text not null,
  contact_email   text not null,
  contact_phone   text,
  city            text,
  message         text,
  status          text not null default 'pending'
                    check (status in ('pending','approved','denied','terms_sent')),
  review_notes    text,
  commission_rate_pct numeric(5,2),
  commission_terms text,
  reviewed_at     timestamptz,
  reviewed_by     uuid references auth.users(id)
);

alter table business_applications enable row level security;

drop policy if exists "Platform manage applications" on business_applications;
create policy "Platform manage applications"
  on business_applications for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Anyone submit application" on business_applications;
create policy "Anyone submit application"
  on business_applications for insert to anon, authenticated
  with check (true);

drop policy if exists "Platform read all businesses" on businesses;
create policy "Platform read all businesses"
  on businesses for select to authenticated
  using (public.is_platform_admin() or id = public.current_business_id());

drop policy if exists "Platform update any business" on businesses;
create policy "Platform update any business"
  on businesses for update to authenticated
  using (public.is_platform_admin() or (
    id = public.current_business_id() and public.current_role() in ('owner','manager')
  ));

-- Update register_business to create pending status by default for new workspaces
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
  uemail text;
begin
  if uid is null then raise exception 'Not authenticated'; end if;
  if exists (select 1 from profiles where id = uid) then
    raise exception 'Profile already exists';
  end if;
  if p_business_name is null or length(trim(p_business_name)) < 2 then
    raise exception 'Business name required';
  end if;

  select email into uemail from auth.users where id = uid;

  slug_base := lower(regexp_replace(trim(p_business_name), '[^a-zA-Z0-9]+', '-', 'g'));
  slug_base := trim(both '-' from slug_base);
  if slug_base = '' then slug_base := 'business'; end if;
  slug_try := slug_base;
  while exists (select 1 from businesses where slug = slug_try) loop
    n := n + 1;
    slug_try := slug_base || '-' || n::text;
  end loop;

  insert into businesses (name, slug, email, status)
  values (trim(p_business_name), slug_try, uemail, 'pending')
  returning id into bid;

  insert into profiles (id, business_id, role, full_name, email)
  values (
    uid, bid, 'owner',
    coalesce(nullif(trim(p_full_name), ''), split_part(uemail, '@', 1)),
    uemail
  );

  insert into business_applications (
    business_id, business_name, contact_name, contact_email, status
  ) values (
    bid, trim(p_business_name),
    coalesce(nullif(trim(p_full_name), ''), split_part(uemail, '@', 1)),
    uemail, 'pending'
  );

  return bid;
end;
$$;

-- Platform review actions
create or replace function public.review_business_application(
  p_application_id uuid,
  p_action text, -- approve | deny | send_terms
  p_commission_rate_pct numeric default null,
  p_commission_terms text default null,
  p_review_notes text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  app business_applications%rowtype;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin only';
  end if;

  select * into app from business_applications where id = p_application_id;
  if app.id is null then raise exception 'Application not found'; end if;

  if p_action = 'approve' then
    update business_applications set
      status = 'approved',
      review_notes = p_review_notes,
      commission_rate_pct = coalesce(p_commission_rate_pct, commission_rate_pct, 8),
      commission_terms = coalesce(p_commission_terms, commission_terms),
      reviewed_at = now(),
      reviewed_by = auth.uid()
    where id = p_application_id;

    if app.business_id is not null then
      update businesses set
        status = 'active',
        commission_rate_pct = coalesce(p_commission_rate_pct, commission_rate_pct, 8),
        commission_terms = coalesce(p_commission_terms, commission_terms),
        reviewed_at = now(),
        reviewed_by = auth.uid()
      where id = app.business_id;
    end if;

  elsif p_action = 'deny' then
    update business_applications set
      status = 'denied',
      review_notes = p_review_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid()
    where id = p_application_id;

    if app.business_id is not null then
      update businesses set status = 'denied', reviewed_at = now(), reviewed_by = auth.uid()
      where id = app.business_id;
    end if;

  elsif p_action = 'send_terms' then
    update business_applications set
      status = 'terms_sent',
      commission_rate_pct = coalesce(p_commission_rate_pct, 8),
      commission_terms = p_commission_terms,
      review_notes = p_review_notes,
      reviewed_at = now(),
      reviewed_by = auth.uid()
    where id = p_application_id;

    if app.business_id is not null then
      update businesses set
        status = 'pending',
        commission_rate_pct = coalesce(p_commission_rate_pct, 8),
        commission_terms = p_commission_terms
      where id = app.business_id;
    end if;
  else
    raise exception 'Unknown action';
  end if;
end;
$$;

revoke all on function public.review_business_application(uuid, text, numeric, text, text) from public;
grant execute on function public.review_business_application(uuid, text, numeric, text, text) to authenticated;

-- Business accepts commission terms
create or replace function public.accept_commission_terms()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid := public.current_business_id();
begin
  if public.current_role() not in ('owner','manager') then
    raise exception 'Only owner/manager can accept terms';
  end if;
  update businesses set
    commission_accepted_at = now(),
    status = case when status = 'pending' then 'active' else status end
  where id = bid;
  update business_applications set status = 'approved'
  where business_id = bid and status = 'terms_sent';
end;
$$;

revoke all on function public.accept_commission_terms() from public;
grant execute on function public.accept_commission_terms() to authenticated;

-- ─────────────────────────────────────────────
-- COMMISSION LEDGER (platform fee on revenue)
-- ─────────────────────────────────────────────
create table if not exists commission_entries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references businesses(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  gross_revenue   numeric(12,2) not null default 0,
  rate_pct        numeric(5,2) not null,
  commission_due  numeric(12,2) not null default 0,
  status          text not null default 'open'
                    check (status in ('open','invoiced','paid','waived')),
  notes           text,
  paid_at         timestamptz
);

create index if not exists commission_entries_business_idx on commission_entries (business_id);

alter table commission_entries enable row level security;

drop policy if exists "Platform manage commissions" on commission_entries;
create policy "Platform manage commissions"
  on commission_entries for all to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

drop policy if exists "Business read own commissions" on commission_entries;
create policy "Business read own commissions"
  on commission_entries for select to authenticated
  using (business_id = public.current_business_id());

-- Generate commission for a business/period from paid jobs
create or replace function public.generate_commission_entry(
  p_business_id uuid,
  p_period_start date,
  p_period_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  rate numeric(5,2);
  gross numeric(12,2);
  due numeric(12,2);
  eid uuid;
begin
  if not public.is_platform_admin() then
    raise exception 'Platform admin only';
  end if;

  select coalesce(commission_rate_pct, 8) into rate from businesses where id = p_business_id;
  select coalesce(sum(price), 0) into gross
  from jobs
  where business_id = p_business_id
    and payment_status = 'paid'
    and job_date >= p_period_start
    and job_date <= p_period_end
    and status <> 'cancelled';

  due := round(gross * rate / 100.0, 2);

  insert into commission_entries (business_id, period_start, period_end, gross_revenue, rate_pct, commission_due)
  values (p_business_id, p_period_start, p_period_end, gross, rate, due)
  returning id into eid;

  return eid;
end;
$$;

revoke all on function public.generate_commission_entry(uuid, date, date) from public;
grant execute on function public.generate_commission_entry(uuid, date, date) to authenticated;

-- ─────────────────────────────────────────────
-- PAYROLL
-- ─────────────────────────────────────────────
-- Link employees directory to profiles when possible
alter table employees
  add column if not exists profile_id uuid references profiles(id) on delete set null,
  add column if not exists pay_period text not null default 'biweekly'
    check (pay_period in ('weekly','biweekly','semimonthly','monthly')),
  add column if not exists business_id uuid references businesses(id) on delete cascade;

create table if not exists time_entries (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references businesses(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  work_date       date not null,
  hours           numeric(6,2) not null check (hours >= 0 and hours <= 24),
  job_id          uuid references jobs(id) on delete set null,
  notes           text,
  entered_by      uuid references profiles(id)
);

create index if not exists time_entries_employee_idx on time_entries (employee_id);
create index if not exists time_entries_business_idx on time_entries (business_id);
create index if not exists time_entries_work_date_idx on time_entries (work_date);

create table if not exists payroll_runs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references businesses(id) on delete cascade,
  period_start    date not null,
  period_end      date not null,
  status          text not null default 'draft'
                    check (status in ('draft','approved','paid')),
  notes           text,
  approved_at     timestamptz,
  paid_at         timestamptz,
  created_by      uuid references profiles(id)
);

create table if not exists payroll_lines (
  id              uuid primary key default gen_random_uuid(),
  payroll_run_id  uuid not null references payroll_runs(id) on delete cascade,
  employee_id     uuid not null references employees(id) on delete cascade,
  hours           numeric(8,2) not null default 0,
  hourly_rate     numeric(8,2) not null default 0,
  gross_pay       numeric(12,2) not null default 0,
  notes           text
);

create index if not exists payroll_lines_run_idx on payroll_lines (payroll_run_id);
create index if not exists payroll_lines_employee_idx on payroll_lines (employee_id);

alter table time_entries enable row level security;
alter table payroll_runs enable row level security;
alter table payroll_lines enable row level security;

-- Staff of business can manage time/payroll; employees read own
drop policy if exists "Tenant time entries" on time_entries;
create policy "Tenant time entries"
  on time_entries for all to authenticated
  using (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  )
  with check (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  );

drop policy if exists "Tenant payroll runs" on payroll_runs;
create policy "Tenant payroll runs"
  on payroll_runs for all to authenticated
  using (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  )
  with check (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  );

drop policy if exists "Tenant payroll lines" on payroll_lines;
create policy "Tenant payroll lines"
  on payroll_lines for all to authenticated
  using (
    public.is_platform_admin()
    or exists (
      select 1 from payroll_runs r
      where r.id = payroll_lines.payroll_run_id
        and r.business_id = public.current_business_id()
    )
  )
  with check (
    public.is_platform_admin()
    or exists (
      select 1 from payroll_runs r
      where r.id = payroll_lines.payroll_run_id
        and r.business_id = public.current_business_id()
    )
  );

-- Build payroll run from time entries
create or replace function public.build_payroll_run(
  p_period_start date,
  p_period_end date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  bid uuid := public.current_business_id();
  rid uuid;
  emp record;
  hrs numeric(8,2);
  rate numeric(8,2);
begin
  if public.current_role() not in ('owner','manager') and not public.is_platform_admin() then
    raise exception 'Only owner/manager can run payroll';
  end if;
  if bid is null then raise exception 'No business'; end if;

  insert into payroll_runs (business_id, period_start, period_end, status, created_by)
  values (bid, p_period_start, p_period_end, 'draft', auth.uid())
  returning id into rid;

  for emp in
    select e.* from employees e
    where (e.business_id = bid or e.business_id is null)
      and e.status = 'active'
  loop
    select coalesce(sum(t.hours), 0) into hrs
    from time_entries t
    where t.employee_id = emp.id
      and t.work_date >= p_period_start
      and t.work_date <= p_period_end;

    rate := coalesce(emp.hourly_rate, 0);

    insert into payroll_lines (payroll_run_id, employee_id, hours, hourly_rate, gross_pay)
    values (rid, emp.id, hrs, rate, round(hrs * rate, 2));
  end loop;

  return rid;
end;
$$;

revoke all on function public.build_payroll_run(date, date) from public;
grant execute on function public.build_payroll_run(date, date) to authenticated;

create or replace function public.mark_payroll_paid(p_run_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.current_role() not in ('owner','manager') and not public.is_platform_admin() then
    raise exception 'Only owner/manager can mark payroll paid';
  end if;
  update payroll_runs
  set status = 'paid', paid_at = now(), approved_at = coalesce(approved_at, now())
  where id = p_run_id
    and (business_id = public.current_business_id() or public.is_platform_admin());
end;
$$;

revoke all on function public.mark_payroll_paid(uuid) from public;
grant execute on function public.mark_payroll_paid(uuid) to authenticated;

-- Seed instruction: insert your platform admin after creating the auth user:
-- insert into platform_admins (user_id, email, full_name)
-- values ('YOUR-AUTH-USER-UUID', 'you@tidyledger.com', 'Platform Owner');

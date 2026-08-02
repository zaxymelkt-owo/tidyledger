-- Commission disputes + tax withholding config

create table if not exists commission_disputes (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  business_id     uuid not null references businesses(id) on delete cascade,
  commission_id   uuid references commission_entries(id) on delete set null,
  opened_by       uuid references profiles(id) on delete set null,
  subject         text not null,
  description     text not null,
  status          text not null default 'open'
                    check (status in ('open','under_review','resolved','rejected')),
  resolution      text,
  resolved_at     timestamptz,
  resolved_by     uuid references auth.users(id)
);

create index if not exists commission_disputes_business_idx on commission_disputes (business_id);
create index if not exists commission_disputes_status_idx on commission_disputes (status);

alter table commission_disputes enable row level security;

drop policy if exists "Business manage own disputes" on commission_disputes;
create policy "Business manage own disputes"
  on commission_disputes for all to authenticated
  using (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  )
  with check (
    public.is_platform_admin()
    or business_id = public.current_business_id()
  );

-- Tax withholding defaults at business level + per employee overrides
alter table businesses
  add column if not exists tax_federal_pct numeric(5,2) default 0,
  add column if not exists tax_state_pct numeric(5,2) default 0,
  add column if not exists tax_local_pct numeric(5,2) default 0,
  add column if not exists tax_notes text;

alter table employees
  add column if not exists tax_federal_pct numeric(5,2),
  add column if not exists tax_state_pct numeric(5,2),
  add column if not exists tax_local_pct numeric(5,2),
  add column if not exists tax_exempt boolean not null default false;

alter table payroll_lines
  add column if not exists tax_withheld numeric(12,2) not null default 0,
  add column if not exists net_pay numeric(12,2);

-- Recalc helper when building payroll — update build to apply tax if function replaced
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
  gross numeric(12,2);
  fed numeric(5,2);
  st numeric(5,2);
  loc numeric(5,2);
  withheld numeric(12,2);
  biz_fed numeric(5,2);
  biz_st numeric(5,2);
  biz_loc numeric(5,2);
begin
  if public.current_role() not in ('owner','manager') and not public.is_platform_admin() then
    raise exception 'Only owner/manager can run payroll';
  end if;
  if bid is null then raise exception 'No business'; end if;

  select coalesce(tax_federal_pct,0), coalesce(tax_state_pct,0), coalesce(tax_local_pct,0)
    into biz_fed, biz_st, biz_loc
  from businesses where id = bid;

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
    gross := round(hrs * rate, 2);

    if emp.tax_exempt then
      fed := 0; st := 0; loc := 0;
    else
      fed := coalesce(emp.tax_federal_pct, biz_fed, 0);
      st := coalesce(emp.tax_state_pct, biz_st, 0);
      loc := coalesce(emp.tax_local_pct, biz_loc, 0);
    end if;

    withheld := round(gross * (fed + st + loc) / 100.0, 2);

    insert into payroll_lines (payroll_run_id, employee_id, hours, hourly_rate, gross_pay, tax_withheld, net_pay)
    values (rid, emp.id, hrs, rate, gross, withheld, gross - withheld);
  end loop;

  return rid;
end;
$$;

-- Job SMS / reminder queue + optional customer opt-in columns.
-- Run after 016_reviews_business_id.sql.

alter table customers
  add column if not exists sms_opt_in boolean not null default false;

alter table jobs
  add column if not exists remind_sms boolean not null default false,
  add column if not exists reminded_at timestamptz;

create table if not exists job_reminders (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid references businesses(id) on delete cascade,
  job_id uuid not null references jobs(id) on delete cascade,
  channel text not null default 'sms' check (channel in ('sms', 'email')),
  scheduled_for timestamptz not null,
  sent_at timestamptz,
  status text not null default 'pending'
    check (status in ('pending', 'sent', 'failed', 'cancelled')),
  error text,
  to_phone text,
  to_email text,
  body text
);

create index if not exists job_reminders_pending_idx
  on job_reminders (status, scheduled_for)
  where status = 'pending';

create index if not exists job_reminders_job_id_idx on job_reminders (job_id);

alter table job_reminders enable row level security;

drop policy if exists "Staff tenant job reminders" on job_reminders;
create policy "Staff tenant job reminders"
  on job_reminders for all to authenticated
  using (public.is_staff() and business_id = public.current_business_id())
  with check (public.is_staff() and business_id = public.current_business_id());

-- Queue a day-before SMS reminder when staff enables remind_sms on a job.
create or replace function public.queue_job_sms_reminder(p_job_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job jobs%rowtype;
  v_phone text;
  v_name text;
  v_id uuid;
  v_when timestamptz;
  v_body text;
begin
  select * into v_job from jobs where id = p_job_id;
  if v_job.id is null then
    raise exception 'job not found';
  end if;

  select c.phone, trim(c.first_name || ' ' || c.last_name)
    into v_phone, v_name
  from customers c
  where c.id = v_job.customer_id;

  if v_phone is null or length(trim(v_phone)) < 7 then
    raise exception 'customer has no phone number';
  end if;

  -- 9:00 local-ish morning the day before (stored as UTC of job_date - 1 day at 14:00 UTC as a simple default)
  v_when := (v_job.job_date::timestamp - interval '1 day' + time '14:00') at time zone 'UTC';
  if v_when < now() then
    v_when := now() + interval '5 minutes';
  end if;

  v_body := format(
    'Hi%s, reminder: your cleaning is scheduled for %s. Reply STOP to opt out. — TidyLedger',
    case when v_name is not null and v_name <> '' then ' ' || split_part(v_name, ' ', 1) else '' end,
    to_char(v_job.job_date::date, 'Mon DD, YYYY')
  );

  -- Cancel prior pending reminders for this job
  update job_reminders
  set status = 'cancelled'
  where job_id = p_job_id and status = 'pending';

  insert into job_reminders (business_id, job_id, channel, scheduled_for, to_phone, body, status)
  values (v_job.business_id, p_job_id, 'sms', v_when, v_phone, v_body, 'pending')
  returning id into v_id;

  update jobs set remind_sms = true where id = p_job_id;

  return v_id;
end;
$$;

revoke all on function public.queue_job_sms_reminder(uuid) from public;
grant execute on function public.queue_job_sms_reminder(uuid) to authenticated;

-- Claim due reminders (service role / Edge Function)
create or replace function public.claim_due_job_reminders(p_limit integer default 25)
returns setof job_reminders
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with picked as (
    select id
    from job_reminders
    where status = 'pending'
      and scheduled_for <= now()
    order by scheduled_for
    limit greatest(p_limit, 1)
    for update skip locked
  )
  update job_reminders r
  set status = 'pending' -- still pending until sender marks sent
  from picked
  where r.id = picked.id
  returning r.*;
end;
$$;

revoke all on function public.claim_due_job_reminders(integer) from public;
-- Only service role should call this from Edge; no grant to anon/authenticated

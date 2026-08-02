-- Housekeeping Admin — initial schema
-- Run this in the Supabase SQL Editor (Project → SQL Editor → New query)

create extension if not exists "pgcrypto";

-- ─────────────────────────────────────────────
-- CUSTOMERS
-- ─────────────────────────────────────────────
create table if not exists customers (
  id                   uuid primary key default gen_random_uuid(),
  created_at           timestamptz not null default now(),
  first_name           text not null,
  last_name            text not null,
  phone                text,
  email                text,
  address              text,
  city                 text,
  zip                  text,
  gate_code            text,
  alarm_code           text,
  pets                 text,
  preferred_cleaner    text,
  cleaning_frequency   text,
  square_footage       integer,
  bedrooms             integer,
  bathrooms            numeric(3,1),
  notes                text
);

create index if not exists customers_last_name_idx on customers (last_name);

-- ─────────────────────────────────────────────
-- JOBS  (minimal version — enough to drive dashboard stats;
-- expand later with checklist, photos, mileage, etc.)
-- ─────────────────────────────────────────────
create table if not exists jobs (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  customer_id     uuid not null references customers(id) on delete cascade,
  job_date        date not null,
  status          text not null default 'scheduled'
                    check (status in ('scheduled','in_progress','completed','cancelled')),
  service         text,
  price           numeric(10,2),
  payment_status  text not null default 'unpaid'
                    check (payment_status in ('unpaid','paid','partial')),
  assigned_employee text,
  notes           text
);

create index if not exists jobs_customer_id_idx on jobs (customer_id);
create index if not exists jobs_job_date_idx on jobs (job_date);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- These tables hold gate codes and alarm codes — lock them down so
-- only signed-in users of your app (i.e. you and your staff accounts)
-- can read or write them. Anonymous/public access is blocked entirely.
-- ─────────────────────────────────────────────
alter table customers enable row level security;
alter table jobs enable row level security;

create policy "Authenticated users can read customers"
  on customers for select
  to authenticated
  using (true);

create policy "Authenticated users can insert customers"
  on customers for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update customers"
  on customers for update
  to authenticated
  using (true);

create policy "Authenticated users can delete customers"
  on customers for delete
  to authenticated
  using (true);

create policy "Authenticated users can read jobs"
  on jobs for select
  to authenticated
  using (true);

create policy "Authenticated users can insert jobs"
  on jobs for insert
  to authenticated
  with check (true);

create policy "Authenticated users can update jobs"
  on jobs for update
  to authenticated
  using (true);

create policy "Authenticated users can delete jobs"
  on jobs for delete
  to authenticated
  using (true);

-- ─────────────────────────────────────────────
-- EMPLOYEES
-- ─────────────────────────────────────────────
create table if not exists employees (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  first_name      text not null,
  last_name       text not null,
  email           text,
  phone           text,
  role            text not null default 'cleaner'
                    check (role in ('cleaner','lead','manager','admin')),
  hire_date       date,
  hourly_rate     numeric(8,2),
  status          text not null default 'active'
                    check (status in ('active','inactive','on_leave')),
  notes           text
);

create index if not exists employees_last_name_idx on employees (last_name);
create index if not exists employees_status_idx on employees (status);

-- ─────────────────────────────────────────────
-- INVENTORY
-- ─────────────────────────────────────────────
create table if not exists inventory (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  name            text not null,
  category        text not null default 'supplies'
                    check (category in ('supplies','equipment','consumables','ppe','other')),
  quantity        numeric(10,2) not null default 0,
  unit            text not null default 'each',
  reorder_level   numeric(10,2) not null default 5,
  unit_cost       numeric(10,2),
  notes           text
);

create index if not exists inventory_name_idx on inventory (name);
create index if not exists inventory_category_idx on inventory (category);

-- ─────────────────────────────────────────────
-- FINANCIAL TRANSACTIONS
-- ─────────────────────────────────────────────
create table if not exists transactions (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  txn_date        date not null default current_date,
  type            text not null check (type in ('income','expense')),
  category        text not null,
  amount          numeric(12,2) not null,
  description     text,
  related_job_id  uuid references jobs(id) on delete set null,
  payment_method  text
);

create index if not exists transactions_txn_date_idx on transactions (txn_date);
create index if not exists transactions_type_idx on transactions (type);
create index if not exists transactions_category_idx on transactions (category);

-- ─────────────────────────────────────────────
-- QUOTES
-- ─────────────────────────────────────────────
create table if not exists quotes (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  customer_id       uuid references customers(id) on delete set null,
  customer_name     text,
  square_footage    integer,
  bedrooms          integer,
  bathrooms         numeric(3,1),
  service_type      text not null default 'standard',
  frequency         text not null default 'one_time',
  base_rate         numeric(10,2) not null default 0,
  addons_total      numeric(10,2) not null default 0,
  discount_pct      numeric(5,2) not null default 0,
  total             numeric(10,2) not null,
  status            text not null default 'draft'
                      check (status in ('draft','sent','accepted','declined','expired')),
  valid_until       date,
  notes             text
);

create index if not exists quotes_customer_id_idx on quotes (customer_id);
create index if not exists quotes_status_idx on quotes (status);

-- RLS for new tables
alter table employees enable row level security;
alter table inventory enable row level security;
alter table transactions enable row level security;
alter table quotes enable row level security;

create policy "Authenticated users can read employees" on employees for select to authenticated using (true);
create policy "Authenticated users can insert employees" on employees for insert to authenticated with check (true);
create policy "Authenticated users can update employees" on employees for update to authenticated using (true);
create policy "Authenticated users can delete employees" on employees for delete to authenticated using (true);

create policy "Authenticated users can read inventory" on inventory for select to authenticated using (true);
create policy "Authenticated users can insert inventory" on inventory for insert to authenticated with check (true);
create policy "Authenticated users can update inventory" on inventory for update to authenticated using (true);
create policy "Authenticated users can delete inventory" on inventory for delete to authenticated using (true);

create policy "Authenticated users can read transactions" on transactions for select to authenticated using (true);
create policy "Authenticated users can insert transactions" on transactions for insert to authenticated with check (true);
create policy "Authenticated users can update transactions" on transactions for update to authenticated using (true);
create policy "Authenticated users can delete transactions" on transactions for delete to authenticated using (true);

create policy "Authenticated users can read quotes" on quotes for select to authenticated using (true);
create policy "Authenticated users can insert quotes" on quotes for insert to authenticated with check (true);
create policy "Authenticated users can update quotes" on quotes for update to authenticated using (true);
create policy "Authenticated users can delete quotes" on quotes for delete to authenticated using (true);

-- ─────────────────────────────────────────────
-- PORTAL / PAYMENTS / REVIEWS (from 004)
-- ─────────────────────────────────────────────
alter table customers
  add column if not exists portal_code text,
  add column if not exists portal_enabled boolean not null default false;

create unique index if not exists customers_portal_code_idx
  on customers (portal_code) where portal_code is not null;

create table if not exists quote_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  first_name        text not null,
  last_name         text not null,
  email             text not null,
  phone             text,
  address           text,
  city              text,
  zip               text,
  square_footage    integer,
  bedrooms          integer,
  bathrooms         numeric(3,1),
  service_type      text not null default 'standard',
  frequency         text not null default 'one_time',
  preferred_date    date,
  message           text,
  status            text not null default 'new'
                      check (status in ('new','reviewed','quoted','declined','converted')),
  admin_notes       text,
  converted_quote_id uuid references quotes(id) on delete set null
);

create table if not exists payments (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  customer_id       uuid references customers(id) on delete set null,
  job_id            uuid references jobs(id) on delete set null,
  amount            numeric(12,2) not null,
  currency          text not null default 'usd',
  status            text not null default 'pending'
                      check (status in ('pending','processing','succeeded','failed','refunded')),
  method            text default 'card'
                      check (method in ('card','bank','cash','check','other')),
  reference         text,
  payer_name        text,
  payer_email       text,
  description       text,
  paid_at           timestamptz,
  access_token      text unique default encode(gen_random_bytes(16), 'hex')
);

create table if not exists reviews (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  customer_id       uuid references customers(id) on delete set null,
  job_id            uuid references jobs(id) on delete set null,
  customer_name     text not null,
  rating            integer not null check (rating between 1 and 5),
  title             text,
  body              text,
  status            text not null default 'pending'
                      check (status in ('pending','published','hidden')),
  is_featured       boolean not null default false,
  admin_reply       text,
  access_token      text unique default encode(gen_random_bytes(16), 'hex')
);

alter table quote_requests enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;

create policy "Anyone can submit quote requests" on quote_requests for insert to anon, authenticated with check (true);
create policy "Authenticated users can read quote requests" on quote_requests for select to authenticated using (true);
create policy "Authenticated users can update quote requests" on quote_requests for update to authenticated using (true);
create policy "Authenticated users can delete quote requests" on quote_requests for delete to authenticated using (true);

create policy "Authenticated users can manage payments" on payments for all to authenticated using (true) with check (true);
create policy "Public can read payment by token" on payments for select to anon using (true);
create policy "Public can update payment status" on payments for update to anon using (true);

create policy "Anyone can submit reviews" on reviews for insert to anon, authenticated with check (true);
create policy "Public can read published reviews" on reviews for select to anon using (status = 'published');
create policy "Authenticated users can manage reviews" on reviews for all to authenticated using (true) with check (true);

create policy "Public can lookup portal customers" on customers for select to anon using (portal_enabled = true);
create policy "Public can read jobs for portal" on jobs for select to anon using (
  exists (select 1 from customers c where c.id = jobs.customer_id and c.portal_enabled = true)
);
create policy "Public can read quotes for portal" on quotes for select to anon using (
  customer_id is not null and exists (
    select 1 from customers c where c.id = quotes.customer_id and c.portal_enabled = true
  )
);

-- Stripe columns on payments
alter table payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

-- See also database/007_field_ops.sql for job_photos, job_checkins, job_signatures + storage

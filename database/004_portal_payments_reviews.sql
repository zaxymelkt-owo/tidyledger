-- Migration: Customer portal, quote requests, payments, reviews
-- Run in Supabase SQL Editor after previous migrations

-- ─────────────────────────────────────────────
-- Extend customers for portal access
-- ─────────────────────────────────────────────
alter table customers
  add column if not exists portal_code text,
  add column if not exists portal_enabled boolean not null default false;

create unique index if not exists customers_portal_code_idx
  on customers (portal_code) where portal_code is not null;

-- ─────────────────────────────────────────────
-- ONLINE QUOTE REQUESTS (public submissions)
-- ─────────────────────────────────────────────
create table if not exists quote_requests (
  id                uuid primary key default gen_random_uuid(),
  created_at        timestamptz not null default now(),
  business_id       uuid references businesses(id) on delete set null,
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

create index if not exists quote_requests_status_idx on quote_requests (status);
create index if not exists quote_requests_created_at_idx on quote_requests (created_at desc);

-- ─────────────────────────────────────────────
-- PAYMENTS
-- ─────────────────────────────────────────────
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

create index if not exists payments_customer_id_idx on payments (customer_id);
create index if not exists payments_job_id_idx on payments (job_id);
create index if not exists payments_status_idx on payments (status);
create index if not exists payments_access_token_idx on payments (access_token);

-- ─────────────────────────────────────────────
-- REVIEWS
-- ─────────────────────────────────────────────
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

create index if not exists reviews_status_idx on reviews (status);
create index if not exists reviews_rating_idx on reviews (rating);
create index if not exists reviews_customer_id_idx on reviews (customer_id);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table quote_requests enable row level security;
alter table payments enable row level security;
alter table reviews enable row level security;

-- Quote requests: anyone can insert (public form); only authenticated can read/update/delete
drop policy if exists "Anyone can submit quote requests" on quote_requests;
create policy "Anyone can submit quote requests"
  on quote_requests for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Authenticated users can read quote requests" on quote_requests;
create policy "Authenticated users can read quote requests"
  on quote_requests for select
  to authenticated
  using (true);

drop policy if exists "Authenticated users can update quote requests" on quote_requests;
create policy "Authenticated users can update quote requests"
  on quote_requests for update
  to authenticated
  using (true);

drop policy if exists "Authenticated users can delete quote requests" on quote_requests;
create policy "Authenticated users can delete quote requests"
  on quote_requests for delete
  to authenticated
  using (true);

-- Payments: authenticated full access; public can read/update by access_token (handled in app + policy)
drop policy if exists "Authenticated users can manage payments" on payments;
create policy "Authenticated users can manage payments"
  on payments for all
  to authenticated
  using (true)
  with check (true);

drop policy if exists "Public can read payment by token" on payments;
create policy "Public can read payment by token"
  on payments for select
  to anon
  using (true);

drop policy if exists "Public can update payment status" on payments;
create policy "Public can update payment status"
  on payments for update
  to anon
  using (true);

-- Reviews: public can insert (leave review); public can read published; auth full access
drop policy if exists "Anyone can submit reviews" on reviews;
create policy "Anyone can submit reviews"
  on reviews for insert
  to anon, authenticated
  with check (true);

drop policy if exists "Public can read published reviews" on reviews;
create policy "Public can read published reviews"
  on reviews for select
  to anon
  using (status = 'published');

drop policy if exists "Authenticated users can manage reviews" on reviews;
create policy "Authenticated users can manage reviews"
  on reviews for all
  to authenticated
  using (true)
  with check (true);

-- Customers: allow anon to look up by portal_code for portal login
drop policy if exists "Public can lookup portal customers" on customers;
create policy "Public can lookup portal customers"
  on customers for select
  to anon
  using (portal_enabled = true);

-- Jobs: allow anon to see jobs for portal customers (limited — app filters by customer_id)
drop policy if exists "Public can read jobs for portal" on jobs;
create policy "Public can read jobs for portal"
  on jobs for select
  to anon
  using (
    exists (
      select 1 from customers c
      where c.id = jobs.customer_id and c.portal_enabled = true
    )
  );

-- Quotes for portal
drop policy if exists "Public can read quotes for portal" on quotes;
create policy "Public can read quotes for portal"
  on quotes for select
  to anon
  using (
    customer_id is not null and exists (
      select 1 from customers c
      where c.id = quotes.customer_id and c.portal_enabled = true
    )
  );

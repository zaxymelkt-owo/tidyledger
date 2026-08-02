-- Migration: Employees, Inventory, Finances, Quotes
-- Run this in the Supabase SQL Editor after schema.sql

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

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────
alter table employees enable row level security;
alter table inventory enable row level security;
alter table transactions enable row level security;
alter table quotes enable row level security;

-- Employees policies
create policy "Authenticated users can read employees"
  on employees for select to authenticated using (true);
create policy "Authenticated users can insert employees"
  on employees for insert to authenticated with check (true);
create policy "Authenticated users can update employees"
  on employees for update to authenticated using (true);
create policy "Authenticated users can delete employees"
  on employees for delete to authenticated using (true);

-- Inventory policies
create policy "Authenticated users can read inventory"
  on inventory for select to authenticated using (true);
create policy "Authenticated users can insert inventory"
  on inventory for insert to authenticated with check (true);
create policy "Authenticated users can update inventory"
  on inventory for update to authenticated using (true);
create policy "Authenticated users can delete inventory"
  on inventory for delete to authenticated using (true);

-- Transactions policies
create policy "Authenticated users can read transactions"
  on transactions for select to authenticated using (true);
create policy "Authenticated users can insert transactions"
  on transactions for insert to authenticated with check (true);
create policy "Authenticated users can update transactions"
  on transactions for update to authenticated using (true);
create policy "Authenticated users can delete transactions"
  on transactions for delete to authenticated using (true);

-- Quotes policies
create policy "Authenticated users can read quotes"
  on quotes for select to authenticated using (true);
create policy "Authenticated users can insert quotes"
  on quotes for insert to authenticated with check (true);
create policy "Authenticated users can update quotes"
  on quotes for update to authenticated using (true);
create policy "Authenticated users can delete quotes"
  on quotes for delete to authenticated using (true);

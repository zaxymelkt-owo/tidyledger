-- Quote estimator pricing defaults and business-owned add-ons
-- Add business-wide quote calculator settings and custom add-on catalog support.

alter table businesses
  add column if not exists quote_base_rate_standard numeric(12,2) not null default 0.12,
  add column if not exists quote_base_rate_deep numeric(12,2) not null default 0.20,
  add column if not exists quote_base_rate_move_in_out numeric(12,2) not null default 0.25,
  add column if not exists quote_base_rate_post_construction numeric(12,2) not null default 0.30,
  add column if not exists quote_base_rate_airbnb numeric(12,2) not null default 0.15,
  add column if not exists quote_bedroom_addon numeric(12,2) not null default 15,
  add column if not exists quote_bathroom_addon numeric(12,2) not null default 25,
  add column if not exists quote_discount_weekly numeric(5,2) not null default 15,
  add column if not exists quote_discount_biweekly numeric(5,2) not null default 10,
  add column if not exists quote_discount_monthly numeric(5,2) not null default 5;

create table if not exists quote_pricing_addons (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid not null references businesses(id) on delete cascade,
  label text not null,
  price numeric(12,2) not null default 0,
  description text,
  sort_order integer not null default 0,
  active boolean not null default true,
  is_multiple boolean not null default false,
  quantity_label text,
  quantity_default integer not null default 1
);

create index if not exists quote_pricing_addons_business_id_idx
  on quote_pricing_addons (business_id, active, sort_order);

alter table quote_pricing_addons enable row level security;

-- Owners/managers can manage their own business add-ons.
drop policy if exists "Business owners/managers manage quote add-ons" on quote_pricing_addons;
create policy "Business owners/managers manage quote add-ons"
on quote_pricing_addons for all to authenticated
using (
  business_id = public.current_business_id()
  and public.current_role() in ('owner', 'manager')
)
with check (
  business_id = public.current_business_id()
  and public.current_role() in ('owner', 'manager')
);

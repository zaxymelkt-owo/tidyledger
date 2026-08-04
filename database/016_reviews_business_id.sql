-- Attach reviews to a specific business (multi-tenant).
-- Run after 015_rate_limits_and_access_audit.sql.

alter table reviews
  add column if not exists business_id uuid references businesses(id) on delete set null;

-- Backfill from linked customer or job when possible
update reviews r
set business_id = c.business_id
from customers c
where r.business_id is null
  and r.customer_id = c.id
  and c.business_id is not null;

update reviews r
set business_id = j.business_id
from jobs j
where r.business_id is null
  and r.job_id = j.id
  and j.business_id is not null;

create index if not exists reviews_business_id_idx on reviews (business_id, status, created_at desc);

-- Tighten staff access to tenant scope (replace open "manage all" policy)
drop policy if exists "Authenticated users can manage reviews" on reviews;
create policy "Staff tenant reviews"
  on reviews for all to authenticated
  using (
    public.is_staff()
    and (
      business_id is null
      or business_id = public.current_business_id()
    )
  )
  with check (
    public.is_staff()
    and (
      business_id is null
      or business_id = public.current_business_id()
    )
  );

-- Public insert must include a real business_id
drop policy if exists "Anyone can submit reviews" on reviews;
create policy "Anyone can submit reviews"
  on reviews for insert
  to anon, authenticated
  with check (
    business_id is not null
    and exists (select 1 from businesses b where b.id = business_id)
  );

-- Public can still update their invite row by access_token (leave review form)
drop policy if exists "Public can complete review by token" on reviews;
create policy "Public can complete review by token"
  on reviews for update
  to anon, authenticated
  using (access_token is not null)
  with check (access_token is not null);

-- Public read: published reviews only (optionally filter by business in the app)
drop policy if exists "Public can read published reviews" on reviews;
create policy "Public can read published reviews"
  on reviews for select
  to anon
  using (status = 'published');

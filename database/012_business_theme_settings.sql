-- Business-wide dashboard theme settings
-- Add persisted color and display preferences to each business record.

alter table businesses
  add column if not exists dashboard_theme_mode text not null default 'light'
    check (dashboard_theme_mode in ('light', 'dark')),
  add column if not exists dashboard_color_scheme text not null default 'forest'
    check (dashboard_color_scheme in ('forest', 'violet', 'terracotta'));

-- Allow owners/managers to update their own business theme settings.
create policy "Owner update own business theme"
on businesses for update to authenticated
using (id = public.current_business_id() and public.current_role() in ('owner','manager'))
with check (id = public.current_business_id() and public.current_role() in ('owner','manager'));

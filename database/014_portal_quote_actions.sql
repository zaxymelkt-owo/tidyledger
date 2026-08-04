-- Portal: customers can accept/decline their own quotes and leave a message for the business.
-- Run after 011_fix_rls.sql (and portal RPCs from 006).

-- Optional inbound messages from portal customers
create table if not exists portal_messages (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  business_id uuid references businesses(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  customer_name text,
  customer_email text,
  body text not null,
  read_at timestamptz
);

create index if not exists portal_messages_business_id_idx on portal_messages (business_id, created_at desc);

alter table portal_messages enable row level security;

drop policy if exists "Staff read portal messages" on portal_messages;
create policy "Staff read portal messages"
  on portal_messages for select to authenticated
  using (public.is_staff() and business_id = public.current_business_id());

drop policy if exists "Staff update portal messages" on portal_messages;
create policy "Staff update portal messages"
  on portal_messages for update to authenticated
  using (public.is_staff() and business_id = public.current_business_id());

-- Accept / decline a quote that belongs to the portal customer (by email + portal code).
create or replace function public.portal_update_quote_status(
  p_email text,
  p_portal_code text,
  p_quote_id uuid,
  p_status text
)
returns quotes
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer customers%rowtype;
  v_quote quotes%rowtype;
begin
  if p_status not in ('accepted', 'declined') then
    raise exception 'status must be accepted or declined';
  end if;

  select * into v_customer
  from customers c
  where c.portal_enabled = true
    and c.portal_code = trim(p_portal_code)
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;

  if v_customer.id is null then
    raise exception 'portal credentials invalid';
  end if;

  select * into v_quote
  from quotes q
  where q.id = p_quote_id
    and q.customer_id = v_customer.id
    and q.status in ('sent', 'accepted', 'declined')
  limit 1;

  if v_quote.id is null then
    raise exception 'quote not found';
  end if;

  update quotes
  set status = p_status
  where id = v_quote.id
  returning * into v_quote;

  return v_quote;
end;
$$;

revoke all on function public.portal_update_quote_status(text, text, uuid, text) from public;
grant execute on function public.portal_update_quote_status(text, text, uuid, text) to anon, authenticated;

-- Customer sends a short message to the business from the portal.
create or replace function public.portal_send_message(
  p_email text,
  p_portal_code text,
  p_body text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer customers%rowtype;
  v_id uuid;
begin
  if length(trim(coalesce(p_body, ''))) < 2 then
    raise exception 'message too short';
  end if;

  select * into v_customer
  from customers c
  where c.portal_enabled = true
    and c.portal_code = trim(p_portal_code)
    and lower(trim(c.email)) = lower(trim(p_email))
  limit 1;

  if v_customer.id is null then
    raise exception 'portal credentials invalid';
  end if;

  insert into portal_messages (business_id, customer_id, customer_name, customer_email, body)
  values (
    v_customer.business_id,
    v_customer.id,
    trim(v_customer.first_name || ' ' || v_customer.last_name),
    v_customer.email,
    left(trim(p_body), 2000)
  )
  returning id into v_id;

  return v_id;
end;
$$;

revoke all on function public.portal_send_message(text, text, text) from public;
grant execute on function public.portal_send_message(text, text, text) to anon, authenticated;

-- Stripe fields on payments
alter table payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;

create index if not exists payments_stripe_session_idx
  on payments (stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;

create index if not exists payments_stripe_pi_idx
  on payments (stripe_payment_intent_id)
  where stripe_payment_intent_id is not null;

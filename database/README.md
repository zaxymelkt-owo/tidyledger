# TidyLedger database migrations

Run these in the **Supabase SQL Editor** (or via CLI) in order.  
For a **brand-new** project, prefer `schema.sql` first, then any numbered files not already included in that snapshot.

## Recommended order (existing / incremental installs)

| Order | File | Purpose |
|------:|------|---------|
| 1 | `schema.sql` | Core tables (customers, jobs, employees, inventory, transactions, quotes) + baseline RLS |
| 2 | `002_jobs_add_fields.sql` | Extra job columns (if upgrading an early schema) |
| 3 | `003_new_modules.sql` | Employees / inventory / transactions / quotes modules if not in schema |
| 4 | `004_portal_payments_reviews.sql` | Portal fields, quote_requests, payments, reviews |
| 5 | `005_stripe_payments.sql` | Stripe session / payment intent columns on payments |
| 6 | `006_portal_data_access.sql` | Portal RPCs and safer portal data access |
| 7 | `007_field_ops.sql` | Job photos, check-ins, signatures + `job-media` storage |
| 8 | `008_multitenant_accounts.sql` | Businesses, profiles, invites, `business_id` scoping |
| 9 | `009_platform_payroll_commission.sql` | Platform admins, applications, commissions, payroll |
| 10 | `010_disputes_tax.sql` | Commission disputes + tax settings columns |
| 11 | `011_fix_rls.sql` | Tighter role-based RLS |
| 12 | `012_business_theme_settings.sql` | Dashboard theme / color scheme on businesses |
| 13 | `013_quote_estimator_pricing.sql` | Per-business quote rates + `quote_pricing_addons` |

## Fresh project checklist

1. Create Supabase project.
2. Run `schema.sql`, then **008 → 013** if `schema.sql` does not already contain multitenant / portal / field / pricing (inspect before re-running).
3. Prefer **idempotent** statements (`if not exists`, `add column if not exists`) — safe to re-run carefully, but still review diffs.
4. Auth → URL configuration: add production site URL and redirect URLs:
   - `https://tidyledger.github.io/tidyledger/login`
   - `http://localhost:5173/tidyledger/login` (local)
5. Deploy Edge Functions for Stripe (`create-checkout-session`, `stripe-webhook`) and set secrets.
6. Storage: confirm `job-media` bucket + policies from `007`.
7. Platform owner (optional): insert your user into `platform_admins`.

## Quote pricing (`013`)

Adds:

- `businesses.quote_base_rate_*`, room add-ons, frequency discount %
- `quote_pricing_addons` (`active`, `is_multiple`, `quantity_label`, `quantity_default`)

Staff calculator (`Quotes.tsx`) loads business rates + active add-ons and multiplies `is_multiple` lines by quantity.

## Verification queries

```sql
-- Multitenant helpers present?
select proname from pg_proc where proname in ('current_business_id', 'current_role', 'is_staff');

-- Quote add-ons table
select column_name from information_schema.columns
where table_name = 'quote_pricing_addons'
order by ordinal_position;

-- Portal login RPC
select proname from pg_proc where proname like 'portal_%';
```

## Notes

- Policies may `drop policy if exists` then recreate — expect harmless notices.
- If a migration references `businesses` before `008`, run multitenant first.
- Keep this file updated when adding `014_*.sql`.

| 14 | `014_portal_quote_actions.sql` | Portal accept/decline quotes + customer messages |


| 15 | `015_rate_limits_and_access_audit.sql` | Rate limits, sensitive access audit, grant_platform_admin |

| 16 | `016_reviews_business_id.sql` | Reviews scoped to business_id + tenant RLS |

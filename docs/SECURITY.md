# TidyLedger security notes

## Auth

| Setting | Recommendation |
|---------|----------------|
| Email confirmation | Supabase Auth → Providers → Email → **Confirm email** ON for production |
| Session lifetime | JWT expiry default is fine for staff; shorten in Auth settings if needed |
| Password recovery | Redirect URLs must include `/login` (see README) |
| Portal | Code + optional claimed password; never expose `gate_code` / `alarm_code` via portal RPCs |

## Platform admins

First admin (service role / SQL editor only):

```sql
insert into platform_admins (user_id)
values ('<uuid from auth.users>');
```

Additional admins (must already be platform admin):

```sql
select public.grant_platform_admin('<uuid>');
```

See `database/015_rate_limits_and_access_audit.sql`.

## Sensitive customer fields

- `gate_code` and `alarm_code` are **staff-only**.
- UI shows a warning and requires an explicit reveal; views/edits can be logged via `log_sensitive_customer_access`.
- Portal RPCs must not select these columns (enforced in 011 + portal function definitions).

## Public abuse controls

- Client throttle: `src/lib/rateLimit.ts` on quote request, review, portal login.
- Server helper: `check_rate_limit(bucket, max, window_seconds)` in 015.
- Prefer Edge Function or CAPTCHA in front of high-traffic endpoints for production.

## Monitoring

- Optional `VITE_SENTRY_DSN` → `src/lib/monitoring.ts`
- Stripe webhook logs payment update failures to the function console; enable Resend for payment emails.

## Backups

- Owners/managers: **Data export** page (`/data-export`) downloads CSV + JSON.
- Also enable Supabase PITR / daily backups on the paid plan for database-level recovery.

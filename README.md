# TidyLedger — Housekeeping Admin

A static admin dashboard for a housekeeping business: React + TypeScript + Vite + Tailwind on the frontend,
Supabase (Postgres) for data. Built to run entirely on GitHub Pages with no server of your own.

**Modules:** Auth · Dashboard · Customers · Jobs · **Quote Calculator** · **Employees** · **Inventory** · **Finances** · **Reports & Analytics**

## 1. Create your Supabase project

1. Go to [supabase.com](https://supabase.com) → New project (free tier is fine).
2. Once it's ready, open **SQL Editor → New query**, paste in the contents of
   [`database/schema.sql`](./database/schema.sql), and run it. This creates all tables
   (`customers`, `jobs`, `employees`, `inventory`, `transactions`, `quotes`) with row-level
   security locked to signed-in users only.
   - If you already had the original schema and just need the new modules, run
     [`database/003_new_modules.sql`](./database/003_new_modules.sql) instead.
   - If you'd already run an earlier version before the Jobs module existed, run
     [`database/002_jobs_add_fields.sql`](./database/002_jobs_add_fields.sql) first.
   - Full ordered list (portal, Stripe, field ops, multitenant, payroll, quote pricing, etc.):
     see [`database/README.md`](./database/README.md).
3. Go to **Project Settings → API** and copy the **Project URL** and **anon public key**.
   In **Authentication → URL configuration**, add redirect URLs for password recovery, e.g.
   `https://tidyledger.github.io/tidyledger/login` and `http://localhost:5173/tidyledger/login`.
4. Create your login: **Authentication → Users → Add user**, and set an email + password. There's no
   public sign-up screen in the app on purpose — this is an internal admin tool, so accounts are created
   by you, not self-served. Add one user per staff member who needs access.

## 2. Local setup

```bash
npm install
cp .env.example .env
# paste your Project URL and anon key into .env
npm run dev
```

The app will be running at `http://localhost:5173`. Sign in with the user you created in step 4 above.

## 3. Deploy to GitHub Pages

1. Push this repo to GitHub.
2. In **Settings → Pages**, set the source to **GitHub Actions**.
3. In **Settings → Secrets and variables → Actions**, add two repository secrets:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Push to `main` — the included workflow (`.github/workflows/deploy.yml`) builds and deploys automatically.

If your repo isn't named `tidyledger`, update the `base` in `vite.config.ts` and the `basename` in
`src/App.tsx` to match your actual repo name (GitHub Pages serves project sites from `/<repo-name>/`).

## Project structure

```
src/
  components/
    layout/          Sidebar, Topbar, AppLayout
    ui/              Button, Field/Input/Select, Modal, StatCard
    RequireAuth.tsx  Route guard
    CustomerForm.tsx
    JobForm.tsx
    EmployeeForm.tsx
    InventoryForm.tsx
    TransactionForm.tsx
  contexts/
    AuthContext.tsx
  pages/
    Login.tsx
    Dashboard.tsx
    Customers.tsx
    Jobs.tsx
    Quotes.tsx         ← Quote calculator + saved quotes
    Employees.tsx
    Inventory.tsx
    Finances.tsx       ← Income / expense ledger
    Reports.tsx        ← Charts & analytics (recharts)
  lib/
    supabase.ts
  types/
    index.ts
database/
  schema.sql              Full schema (fresh install)
  002_jobs_add_fields.sql Jobs column migration
  003_new_modules.sql     Employees, Inventory, Transactions, Quotes
.github/workflows/
  deploy.yml
```

## Module overview

| Module | What it does |
| --- | --- |
| **Quotes** | Live pricing calculator (sq ft × rate + rooms + add-ons − frequency discount). Save as draft or sent; track accepted / declined. |
| **Employees** | Team roster with role, hourly rate, hire date, status (active / inactive / on leave). Jobs can assign from this list. |
| **Inventory** | Supplies & equipment tracking with quantity, unit cost, reorder level, and low-stock alerts. |
| **Finances** | Income & expense ledger with categories, payment methods, monthly income/expense/net summary cards. |
| **Reports** | 6-month analytics: revenue vs expenses bar chart, jobs-by-status pie, expense breakdown, jobs-by-employee, net cash-flow trend. |

## Design notes

Dashboard and table cards use a "work order ticket" motif (dashed perforation + ticket number) — a nod to
the physical job tickets a cleaning business runs on, carried into the UI rather than a generic card style.
Colors and type are defined as Tailwind v4 theme tokens in `src/index.css` if you want to adjust the palette.

## Stripe payments setup

Online payments use **Stripe Checkout** via two Supabase Edge Functions. Card data never touches your app.

### 1. Database

Run in the SQL Editor:

```sql
-- database/005_stripe_payments.sql
alter table payments
  add column if not exists stripe_checkout_session_id text,
  add column if not exists stripe_payment_intent_id text;
```

### 2. Stripe account

1. Create an account at [stripe.com](https://stripe.com)
2. Copy **Secret key** from Developers → API keys (`sk_test_…` for testing)

### 3. Deploy Edge Functions

Install the [Supabase CLI](https://supabase.com/docs/guides/cli), then from the project root:

```bash
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Set secrets (use test keys first)
supabase secrets set STRIPE_SECRET_KEY=sk_test_...
supabase secrets set SITE_URL=https://tidyledger.github.io/tidyledger
# SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are usually auto-injected;
# if not, set them from Project Settings → API

supabase functions deploy create-checkout-session --no-verify-jwt
supabase functions deploy stripe-webhook --no-verify-jwt
```

### 4. Webhook

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. URL:

   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/stripe-webhook`

3. Events to send:
   - `checkout.session.completed`
   - `payment_intent.payment_failed`
   - `charge.refunded`
4. Copy the **Signing secret** (`whsec_…`) and set:

```bash
supabase secrets set STRIPE_WEBHOOK_SECRET=whsec_...
```

### 5. Test

1. Admin → **Payments** → **Create payment link** (amount ≥ $0.50)
2. **Copy link** and open it
3. Click **Pay securely with Stripe**
4. Use test card `4242 4242 4242 4242`, any future expiry, any CVC
5. After redirect, payment should show **succeeded** (webhook marks job paid and can log income)

### Flow

```
Customer opens /pay/:token
  → app calls create-checkout-session
  → Stripe Checkout hosted page
  → payment succeeds
  → stripe-webhook updates payments + jobs + transactions
  → customer returns to /pay/:token?status=success
```

## Progressive Web App & field tools

### PWA / offline
- `public/manifest.webmanifest` + icons — installable on phones
- `public/sw.js` — caches app shell for offline viewing
- IndexedDB queue (`src/lib/offlineQueue.ts`) stores check-ins, photos, and signatures when offline and syncs on reconnect

### Field mode (per job)
Open **Jobs → Field** on a job (`/jobs/:jobId/field`):

| Feature | How it works |
|--------|----------------|
| **GPS check-in / out** | Uses device geolocation; stores lat/lng + accuracy on `job_checkins`; updates job status / timestamps |
| **Photo uploads** | Camera/`capture` input, client-side compression, upload to Supabase Storage bucket `job-media` |
| **Digital signatures** | Canvas signature pad → PNG in storage + `job_signatures` row |

### Setup
1. Run `database/007_field_ops.sql` in Supabase (creates tables + `job-media` storage bucket and policies).
2. Deploy over **HTTPS** (GitHub Pages is fine) so geolocation, camera, and service workers work on phones.
3. On iOS Safari: Share → **Add to Home Screen** to install the PWA.

## Multi-tenant businesses & accounts

Run `database/008_multitenant_accounts.sql`.

| Who | How they get in |
|-----|------------------|
| **Business owner** | `/register` → creates auth user + business + owner profile |
| **Manager / employee** | Owner opens **Team logins** → invite → share `/invite/:token` link |
| **Customer** | Staff enables portal code → customer uses code once → **creates password** → later email+password |

Data is scoped by `business_id` on customers, jobs, etc., with RLS helpers `current_business_id()` and `is_staff()`.

## Platform master (TidyLedger owner)

1. Run `database/009_platform_payroll_commission.sql`
2. Create your auth user in Supabase, then:

```sql
insert into platform_admins (user_id, email, full_name)
values ('YOUR-AUTH-USER-UUID', 'you@tidyledger.com', 'Platform Owner');
```

3. Sign in → **Platform master** in the sidebar:
   - Review business applications (approve / deny / send commission terms)
   - Directory of all businesses
   - Generate & track platform commissions from paid job revenue

Business owners see **Accept commission terms** until accepted. Payroll lives under **Payroll** (owners/managers) and **My pay** (employees).
# tidyledger


## Security

See [`docs/SECURITY.md`](./docs/SECURITY.md) for auth, platform admins, sensitive fields, and rate limits.


## Mobile & reminders

- Calendar export (.ics) and per-job Google Calendar links on **Jobs**
- SMS reminders: `database/017_job_reminders.sql` + `supabase/functions/send-job-reminders` (Twilio)
- Native shell notes: [`docs/MOBILE.md`](./docs/MOBILE.md)

export type Customer = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  zip: string | null
  gate_code: string | null
  alarm_code: string | null
  pets: string | null
  preferred_cleaner: string | null
  cleaning_frequency: string | null
  square_footage: number | null
  bedrooms: number | null
  bathrooms: number | null
  notes: string | null
  portal_code: string | null
  portal_enabled: boolean
  business_id: string | null
  auth_user_id: string | null
  account_claimed_at: string | null
  sms_opt_in?: boolean
}

export type CustomerFormInput = Omit<
  Customer,
  'id' | 'created_at' | 'portal_code' | 'portal_enabled' | 'business_id' | 'auth_user_id' | 'account_claimed_at'
>

export type JobStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled'
export type JobPaymentStatus = 'unpaid' | 'paid' | 'partial'

export type Job = {
  id: string
  created_at: string
  customer_id: string
  job_date: string
  status: JobStatus
  service: string | null
  price: number | null
  payment_status: JobPaymentStatus
  assigned_employee: string | null
  notes: string | null
  remind_sms?: boolean
  reminded_at?: string | null
}

export type JobFormInput = Omit<Job, 'id' | 'created_at'>

export type JobWithCustomer = Job & {
  customers: { first_name: string; last_name: string; address: string | null; city: string | null } | null
}

export type DashboardStats = {
  jobsToday: number
  revenueThisWeek: number
  revenueThisMonth: number
  outstandingQuotes: number
  activeCustomers: number
}

// ── Employees ──────────────────────────────────
export type EmployeeRole = 'cleaner' | 'lead' | 'manager' | 'admin'
export type EmployeeStatus = 'active' | 'inactive' | 'on_leave'

export type Employee = {
  id: string
  created_at: string
  first_name: string
  last_name: string
  email: string | null
  phone: string | null
  role: EmployeeRole
  hire_date: string | null
  hourly_rate: number | null
  status: EmployeeStatus
  notes: string | null
}

export type EmployeeFormInput = Omit<Employee, 'id' | 'created_at'>

// ── Inventory ──────────────────────────────────
export type InventoryCategory = 'supplies' | 'equipment' | 'consumables' | 'ppe' | 'other'

export type InventoryItem = {
  id: string
  created_at: string
  name: string
  category: InventoryCategory
  quantity: number
  unit: string
  reorder_level: number
  unit_cost: number | null
  notes: string | null
}

export type InventoryFormInput = Omit<InventoryItem, 'id' | 'created_at'>

// ── Transactions (Finances) ────────────────────
export type TransactionType = 'income' | 'expense'

export type Transaction = {
  id: string
  created_at: string
  txn_date: string
  type: TransactionType
  category: string
  amount: number
  description: string | null
  related_job_id: string | null
  payment_method: string | null
}

export type TransactionFormInput = Omit<Transaction, 'id' | 'created_at'>

// ── Quotes ─────────────────────────────────────
export type QuoteStatus = 'draft' | 'sent' | 'accepted' | 'declined' | 'expired'
export type ServiceType = 'standard' | 'deep' | 'move_in_out' | 'post_construction' | 'airbnb'
export type QuoteFrequency = 'one_time' | 'weekly' | 'biweekly' | 'monthly'

export type Quote = {
  id: string
  created_at: string
  customer_id: string | null
  customer_name: string | null
  square_footage: number | null
  bedrooms: number | null
  bathrooms: number | null
  service_type: ServiceType
  frequency: QuoteFrequency
  base_rate: number
  addons_total: number
  discount_pct: number
  total: number
  status: QuoteStatus
  valid_until: string | null
  notes: string | null
}

export type QuoteFormInput = Omit<Quote, 'id' | 'created_at'>

// ── Customer portal fields ─────────────────────
// (portal_code / portal_enabled added on Customer via migration)

// ── Online quote requests ──────────────────────
export type QuoteRequestStatus = 'new' | 'reviewed' | 'quoted' | 'declined' | 'converted'

export type QuoteRequest = {
  id: string
  created_at: string
  business_id: string | null
  first_name: string
  last_name: string
  email: string
  phone: string | null
  address: string | null
  city: string | null
  zip: string | null
  square_footage: number | null
  bedrooms: number | null
  bathrooms: number | null
  service_type: string
  frequency: string
  preferred_date: string | null
  message: string | null
  status: QuoteRequestStatus
  admin_notes: string | null
  converted_quote_id: string | null
}

export type QuoteRequestFormInput = Omit<
  QuoteRequest,
  'id' | 'created_at' | 'status' | 'admin_notes' | 'converted_quote_id'
>

// ── Payments ───────────────────────────────────
export type PaymentStatus = 'pending' | 'processing' | 'succeeded' | 'failed' | 'refunded'
export type PaymentMethod = 'card' | 'bank' | 'cash' | 'check' | 'other'

export type Payment = {
  id: string
  created_at: string
  customer_id: string | null
  job_id: string | null
  amount: number
  currency: string
  status: PaymentStatus
  method: PaymentMethod | null
  reference: string | null
  payer_name: string | null
  payer_email: string | null
  description: string | null
  paid_at: string | null
  access_token: string | null
  stripe_checkout_session_id: string | null
  stripe_payment_intent_id: string | null
}

export type PaymentFormInput = Omit<
  Payment,
  'id' | 'created_at' | 'access_token' | 'paid_at' | 'stripe_checkout_session_id' | 'stripe_payment_intent_id'
>

export type PaymentWithRelations = Payment & {
  customers: { first_name: string; last_name: string; email: string | null } | null
  jobs: { job_date: string; service: string | null } | null
}

// ── Reviews ────────────────────────────────────
export type ReviewStatus = 'pending' | 'published' | 'hidden'

export type Review = {
  id: string
  created_at: string
  business_id: string | null
  customer_id: string | null
  job_id: string | null
  customer_name: string
  rating: number
  title: string | null
  body: string | null
  status: ReviewStatus
  is_featured: boolean
  admin_reply: string | null
  access_token: string | null
}

export type ReviewFormInput = {
  business_id: string
  customer_id?: string | null
  job_id?: string | null
  customer_name: string
  rating: number
  title?: string | null
  body?: string | null
}

// ── Field ops ──────────────────────────────────
export type JobPhoto = {
  id: string
  created_at: string
  job_id: string
  storage_path: string
  caption: string | null
  taken_at: string
  lat: number | null
  lng: number | null
  uploaded_by: string | null
}

export type CheckinKind = 'check_in' | 'check_out'

export type JobCheckin = {
  id: string
  created_at: string
  job_id: string
  employee_name: string | null
  kind: CheckinKind
  lat: number
  lng: number
  accuracy_m: number | null
  noted_at: string
}

export type JobSignature = {
  id: string
  created_at: string
  job_id: string
  signer_name: string
  signer_role: 'customer' | 'employee' | 'manager'
  storage_path: string
  signed_at: string
  lat: number | null
  lng: number | null
}

// ── Multi-tenant ───────────────────────────────
export type UserRole = 'owner' | 'manager' | 'employee' | 'customer'

export type Business = {
  id: string
  created_at: string
  name: string
  slug: string | null
  phone: string | null
  email: string | null
  address: string | null
  city: string | null
  timezone: string | null
  status?: BusinessStatus
  application_notes?: string | null
  commission_rate_pct?: number | null
  commission_terms?: string | null
  commission_accepted_at?: string | null
  reviewed_at?: string | null
  tax_federal_pct?: number | null
  tax_state_pct?: number | null
  tax_local_pct?: number | null
  tax_notes?: string | null
  dashboard_theme_mode?: 'light' | 'dark' | null
  dashboard_color_scheme?: 'forest' | 'violet' | 'terracotta' | null
  quote_base_rate_standard?: number | null
  quote_base_rate_deep?: number | null
  quote_base_rate_move_in_out?: number | null
  quote_base_rate_post_construction?: number | null
  quote_base_rate_airbnb?: number | null
  quote_bedroom_addon?: number | null
  quote_bathroom_addon?: number | null
  quote_discount_weekly?: number | null
  quote_discount_biweekly?: number | null
  quote_discount_monthly?: number | null
}

export type QuotePricingAddon = {
  id: string
  created_at: string
  business_id: string
  label: string
  price: number
  description: string | null
  sort_order: number | null
  active: boolean
  is_multiple?: boolean | null
  quantity_label?: string | null
  quantity_default?: number | null
}

export type Profile = {
  id: string
  created_at: string
  business_id: string | null
  role: UserRole
  full_name: string | null
  email: string | null
  customer_id: string | null
  active: boolean
}

export type StaffInvite = {
  id: string
  created_at: string
  business_id: string
  email: string
  full_name: string | null
  role: 'manager' | 'employee'
  token: string
  invited_by: string | null
  accepted_at: string | null
  expires_at: string
}

// ── Platform & payroll ─────────────────────────
export type BusinessStatus = 'pending' | 'active' | 'suspended' | 'denied'
export type ApplicationStatus = 'pending' | 'approved' | 'denied' | 'terms_sent'
export type CommissionStatus = 'open' | 'invoiced' | 'paid' | 'waived'
export type PayPeriodType = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly'
export type PayrollRunStatus = 'draft' | 'approved' | 'paid'

export type BusinessApplication = {
  id: string
  created_at: string
  business_id: string | null
  business_name: string
  contact_name: string
  contact_email: string
  contact_phone: string | null
  city: string | null
  message: string | null
  status: ApplicationStatus
  review_notes: string | null
  commission_rate_pct: number | null
  commission_terms: string | null
  reviewed_at: string | null
  reviewed_by: string | null
}

export type CommissionEntry = {
  id: string
  created_at: string
  business_id: string
  period_start: string
  period_end: string
  gross_revenue: number
  rate_pct: number
  commission_due: number
  status: CommissionStatus
  notes: string | null
  paid_at: string | null
}

export type TimeEntry = {
  id: string
  created_at: string
  business_id: string
  employee_id: string
  work_date: string
  hours: number
  job_id: string | null
  notes: string | null
  entered_by: string | null
}

export type PayrollRun = {
  id: string
  created_at: string
  business_id: string
  period_start: string
  period_end: string
  status: PayrollRunStatus
  notes: string | null
  approved_at: string | null
  paid_at: string | null
  created_by: string | null
}

export type PayrollLine = {
  id: string
  payroll_run_id: string
  employee_id: string
  hours: number
  hourly_rate: number
  gross_pay: number
  notes: string | null
}

import { Link } from 'react-router-dom'
import Seo from '../../components/Seo'

const LAST_UPDATED = 'August 4, 2026'

export default function PrivacyPolicy() {
  return (
    <>
      <Seo
        title="Privacy Policy"
        description="Privacy Policy for TidyLedger — how we collect, use, and protect information on the housekeeping operations platform and customer portal."
        path="/privacy"
      />
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="font-display font-semibold text-lg tracking-tight">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/terms" className="text-slate hover:text-ink">
                Terms
              </Link>
              <Link to="/" className="text-slate hover:text-ink">
                Home
              </Link>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-3xl mx-auto px-5 py-10 sm:py-14 w-full">
          <p className="ticket-number mb-2">LEGAL</p>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-ink tracking-tight">
            Privacy Policy
          </h1>
          <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

          <div className="ticket-card mt-8 p-6 sm:p-8 space-y-8 text-sm text-slate leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">1. Overview</h2>
              <p>
                This Privacy Policy explains how TidyLedger (&quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;) collects, uses, stores, and shares information when you use our
                website, admin dashboard, customer portal, field tools, and related services (the
                &quot;Service&quot;).
              </p>
              <p>
                Depending on how you use the Service, we may process data as a service provider to
                cleaning businesses (for example, job and customer records in a business workspace) or
                as a controller for platform accounts, applications, and our own operations.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">2. Information we collect</h2>
              <p className="text-ink font-medium">Account and profile information</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Name, email, password (stored as a secure hash by our auth provider)</li>
                <li>Role (owner, manager, employee, customer) and business association</li>
                <li>Invite tokens and portal codes used to grant access</li>
              </ul>
              <p className="text-ink font-medium pt-2">Business workspace data</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Business name, contact details, theme and pricing settings</li>
                <li>Customers, jobs, quotes, employees, inventory, finances, payroll-related entries</li>
                <li>Optional sensitive operational notes (for example gate or alarm codes) entered by staff</li>
                <li>Reviews, payments metadata, commission and tax settings where enabled</li>
              </ul>
              <p className="text-ink font-medium pt-2">Customer and public interactions</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Quote request forms (contact details, property info, preferred service)</li>
                <li>Portal session data needed to show jobs, quotes, and payments</li>
                <li>Review content and ratings</li>
                <li>Payment link usage and status (amounts, status, processor references — not full card numbers)</li>
              </ul>
              <p className="text-ink font-medium pt-2">Field and device data</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Approximate or precise location when check-in/out is used and permission is granted</li>
                <li>Photos and digital signatures uploaded for a job</li>
                <li>Offline queue data stored on the device until sync completes</li>
              </ul>
              <p className="text-ink font-medium pt-2">Technical data</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>IP address, browser type, device information, and basic usage logs</li>
                <li>Cookies or local/session storage needed for authentication, portal sessions, and preferences</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">3. How we use information</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Provide, secure, and improve the Service</li>
                <li>Authenticate users and enforce role-based access within each business</li>
                <li>Process quote requests, payments (via processors), reviews, and field job records</li>
                <li>Support multi-tenant isolation so one business cannot access another&apos;s data</li>
                <li>Review business applications and operate platform commissions where applicable</li>
                <li>Communicate about account, security, or service changes</li>
                <li>Comply with law and protect against abuse or fraud</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">4. How we share information</h2>
              <p>We do not sell personal information. We may share information with:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <span className="text-ink font-medium">Service providers</span> — hosting, database,
                  authentication, storage, and payment processing (for example Supabase and Stripe)
                </li>
                <li>
                  <span className="text-ink font-medium">The business you interact with</span> — customer
                  submissions, portal activity, and payments related to that business&apos;s workspace
                </li>
                <li>
                  <span className="text-ink font-medium">Staff of that business</span> — according to roles
                  and permissions set by the business owner or managers
                </li>
                <li>
                  <span className="text-ink font-medium">Legal and safety</span> — when required by law or
                  to protect rights, security, or integrity of the Service
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">5. Payments</h2>
              <p>
                Online card payments are processed by Stripe or similar providers. Card numbers and
                sensitive payment credentials are collected and stored by the payment processor under
                their terms and security standards. We receive payment status, amounts, and references
                needed to update jobs and records in the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">6. Location, camera, and offline data</h2>
              <p>
                Field features only access location or camera when you (or staff using a shared device)
                grant permission in the browser or operating system. Location is used for job check-in
                and related field records. Photos and signatures are stored for the associated job.
              </p>
              <p>
                If the app queues actions while offline, data may remain on the device until a
                connection is available. Clearing site data or uninstalling the app may remove unsynced
                items.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">7. Data retention</h2>
              <p>
                We retain information for as long as an account or workspace remains active and as
                needed to provide the Service, resolve disputes, enforce agreements, and meet legal
                obligations. Businesses control much of the operational data in their workspace and may
                request deletion or export subject to technical and legal limits.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">8. Security</h2>
              <p>
                We use industry-standard measures such as encrypted transport (HTTPS), authentication
                controls, and database access policies (including row-level security where configured).
                No method of transmission or storage is completely secure; you are responsible for
                protecting passwords, invite links, and portal codes.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">9. Children</h2>
              <p>
                The Service is directed to businesses and adult customers. We do not knowingly collect
                personal information from children under 13 (or the minimum age required in your
                jurisdiction). If you believe a child has provided information, contact us so we can
                delete it.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">10. Your choices and rights</h2>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Update profile and business settings inside the app where available</li>
                <li>Revoke location or camera permission in device settings</li>
                <li>Request access, correction, or deletion of personal data we control, subject to law</li>
                <li>Customers should also contact the cleaning business that holds their service records</li>
              </ul>
              <p>
                Depending on where you live, you may have additional rights under laws such as the CCPA
                or GDPR. We will respond to verifiable requests as required.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">11. International transfers</h2>
              <p>
                We may process and store information in the United States or other countries where our
                providers operate. Those locations may have different data-protection rules than your
                home country.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">12. Changes</h2>
              <p>
                We may update this Privacy Policy from time to time. The &quot;Last updated&quot; date at
                the top will change when we post revisions. Continued use of the Service after an update
                constitutes acceptance of the revised policy where permitted by law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">13. Contact</h2>
              <p>
                For privacy questions or requests, use the contact channels published on the TidyLedger
                site or the email associated with your business application or platform account.
              </p>
            </section>
          </div>
        </main>

        <footer className="border-t border-line mt-auto">
          <div className="max-w-3xl mx-auto px-5 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate">
            <span>© {new Date().getFullYear()} TidyLedger</span>
            <div className="flex gap-4">
              <Link to="/terms" className="hover:text-ink">
                Terms
              </Link>
              <Link to="/privacy" className="hover:text-ink">
                Privacy
              </Link>
              <Link to="/" className="hover:text-ink">
                Home
              </Link>
            </div>
          </div>
        </footer>
      </div>
    </>
  )
}

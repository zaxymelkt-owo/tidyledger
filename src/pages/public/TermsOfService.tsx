import { Link } from 'react-router-dom'
import Seo from '../../components/Seo'

const LAST_UPDATED = 'August 4, 2026'

export default function TermsOfService() {
  return (
    <>
      <Seo
        title="Terms of Service"
        description="Terms of Service for TidyLedger — the housekeeping operations platform and customer portal."
        path="/terms"
      />
      <div className="min-h-screen bg-transparent flex flex-col">
        <header className="border-b border-line bg-paper-raised/90 backdrop-blur sticky top-0 z-20">
          <div className="max-w-3xl mx-auto px-5 h-16 flex items-center justify-between gap-4">
            <Link to="/" className="font-display font-semibold text-lg tracking-tight">
              <span className="brand-gradient">TidyLedger</span>
            </Link>
            <nav className="flex items-center gap-3 text-sm">
              <Link to="/privacy" className="text-slate hover:text-ink">
                Privacy
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
            Terms of Service
          </h1>
          <p className="mt-2 text-sm text-slate">Last updated: {LAST_UPDATED}</p>

          <div className="ticket-card mt-8 p-6 sm:p-8 space-y-8 text-sm text-slate leading-relaxed">
            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">1. Agreement to these terms</h2>
              <p>
                These Terms of Service (&quot;Terms&quot;) govern your access to and use of TidyLedger
                (the &quot;Service&quot;), including our website, admin dashboard, customer portal, field
                tools, and related features operated by TidyLedger (&quot;we,&quot; &quot;us,&quot; or
                &quot;our&quot;).
              </p>
              <p>
                By creating an account, accepting an invite, using a portal code, submitting a quote
                request, making a payment, or otherwise using the Service, you agree to these Terms. If
                you do not agree, do not use the Service.
              </p>
              <p>
                If you use the Service on behalf of a business, you represent that you have authority to
                bind that business to these Terms, and &quot;you&quot; includes that business.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">2. Who the Service is for</h2>
              <p>TidyLedger is an operations platform for housekeeping and cleaning businesses and their customers. Typical roles include:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>
                  <span className="text-ink font-medium">Business owners and managers</span> — workspace
                  registration, team invites, jobs, quotes, payroll settings, and related admin tools.
                </li>
                <li>
                  <span className="text-ink font-medium">Employees / field staff</span> — login via invite,
                  job and field features (e.g. check-in, photos, signatures) as enabled by their employer.
                </li>
                <li>
                  <span className="text-ink font-medium">Customers</span> — quote requests, portal access
                  (code or password), payments, and reviews.
                </li>
                <li>
                  <span className="text-ink font-medium">Platform operators</span> — TidyLedger staff who
                  review business applications and platform-level commissions where applicable.
                </li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">3. Accounts and access</h2>
              <p>
                You are responsible for the accuracy of information you provide and for keeping login
                credentials, invite links, and portal codes confidential. You must promptly notify us if
                you suspect unauthorized access to your account or workspace.
              </p>
              <p>
                Business owners are responsible for users they invite, for data entered in their
                workspace (including customer gate/alarm notes and similar sensitive fields), and for
                complying with applicable employment, privacy, and consumer laws in their jurisdiction.
              </p>
              <p>
                We may suspend or terminate access if we reasonably believe these Terms have been
                violated, if required by law, or to protect the Service, other users, or third parties.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">4. Business workspaces and multi-tenant data</h2>
              <p>
                Data in a business workspace is scoped to that business. Staff access is controlled by
                roles and invites set by the business. Customers only access their own portal data when
                portal access has been enabled for them.
              </p>
              <p>
                You must not attempt to access another business&apos;s data, probe security controls, or
                misuse public endpoints (quote request, payment links, reviews, portal login).
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">5. Acceptable use</h2>
              <p>You agree not to:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Use the Service for unlawful, fraudulent, or harmful purposes</li>
                <li>Upload malware, scrape the Service in a way that degrades performance, or attempt to bypass authentication or rate limits</li>
                <li>Harass users, submit false reviews, or impersonate others</li>
                <li>Resell or sublicense the Service except as expressly permitted in writing</li>
                <li>Reverse engineer the Service except where such restriction is prohibited by law</li>
              </ul>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">6. Quotes, jobs, and customer content</h2>
              <p>
                Quote calculators and pricing settings are tools for your business. Final prices, service
                commitments, and customer contracts are between the cleaning business and its customers
                unless we expressly state otherwise in a separate written agreement.
              </p>
              <p>
                Online quote requests, messages, reviews, photos, signatures, and similar content you
                submit remain your responsibility. You grant us a limited license to host, process, and
                display that content as needed to operate the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">7. Payments and third-party services</h2>
              <p>
                Card payments may be processed by Stripe or similar providers. Card data is handled by
                those providers; we do not store full card numbers on our servers. Payment outcomes
                (success, failure, refund) depend on the processor, banks, and the business&apos;s
                configuration.
              </p>
              <p>
                Fees, refunds, and chargebacks for cleaning services are between the customer and the
                business, subject to the payment provider&apos;s rules. Platform commissions (if any)
                between TidyLedger and a business are governed by the commission terms accepted in the
                product or in a separate agreement.
              </p>
              <p>
                The Service may rely on hosting, authentication, databases, maps, and other third-party
                infrastructure. Their availability and terms may affect the Service.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">8. Field tools, location, and device access</h2>
              <p>
                Optional field features may use device location, camera, and storage (for example GPS
                check-in, job photos, or signatures). You control browser/device permissions. Location and
                media are used to support job operations as configured by the business and described in
                our Privacy Policy.
              </p>
              <p>
                Field tools require a supported device and, for many features, a secure (HTTPS) context.
                Offline queues may store data on the device until connectivity returns; users and
                businesses remain responsible for verifying critical job records after sync.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">9. Intellectual property</h2>
              <p>
                TidyLedger, including its software, branding, and documentation, is owned by us or our
                licensors. These Terms do not transfer ownership of the Service to you. You retain
                ownership of your business and customer content, subject to the license in Section 6.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">10. Disclaimer of warranties</h2>
              <p>
                THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE.&quot; TO THE MAXIMUM
                EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR IMPLIED, INCLUDING
                MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. We do not
                warrant that the Service will be uninterrupted, error-free, or free of harmful
                components, or that quote estimates, payroll figures, or reports will meet your specific
                requirements without your own verification.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">11. Limitation of liability</h2>
              <p>
                TO THE MAXIMUM EXTENT PERMITTED BY LAW, TIDYLEDGER AND ITS SUPPLIERS WILL NOT BE LIABLE
                FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST
                PROFITS, REVENUE, DATA, OR GOODWILL, ARISING FROM YOUR USE OF THE SERVICE.
              </p>
              <p>
                OUR TOTAL LIABILITY FOR CLAIMS ARISING OUT OF OR RELATING TO THE SERVICE WILL NOT EXCEED
                THE GREATER OF (A) THE AMOUNTS YOU PAID TO TIDYLEDGER FOR THE SERVICE IN THE TWELVE (12)
                MONTHS BEFORE THE CLAIM OR (B) ONE HUNDRED U.S. DOLLARS (US $100), EXCEPT WHERE LIABILITY
                CANNOT BE LIMITED UNDER APPLICABLE LAW.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">12. Indemnification</h2>
              <p>
                You agree to defend and indemnify TidyLedger against claims, damages, and expenses
                (including reasonable attorneys&apos; fees) arising from your content, your use of the
                Service, your violation of these Terms, or your violation of any law or third-party
                rights — including disputes between a cleaning business and its customers or employees.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">13. Termination</h2>
              <p>
                You may stop using the Service at any time. Business owners may request closure of a
                workspace subject to outstanding obligations (including commissions, if any). Provisions
                that by their nature should survive (including ownership, disclaimers, limitations, and
                indemnity) will survive termination.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">14. Changes</h2>
              <p>
                We may update these Terms from time to time. We will post the updated Terms on this page
                and revise the &quot;Last updated&quot; date. Continued use after changes become effective
                constitutes acceptance of the updated Terms, except where applicable law requires a
                different process.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">15. Governing law</h2>
              <p>
                These Terms are governed by the laws of the State of California, USA, excluding conflict
                of law rules, unless mandatory consumer protections in your jurisdiction require
                otherwise. Courts in California will have exclusive jurisdiction over disputes, subject
                to applicable law.
              </p>
            </section>

            <section className="space-y-3">
              <h2 className="font-display text-lg font-semibold text-ink">16. Contact</h2>
              <p>
                Questions about these Terms: use the contact channels published on the TidyLedger site
                or email the address associated with your business application or platform account.
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

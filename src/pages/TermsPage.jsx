export default function TermsPage() {
  return (
    <div className="animate-fade-in">
      <h1 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">Terms & Conditions</h1>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-6">Last updated: May 2026</p>

      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl p-8 space-y-6 text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">1. Invoice Chasing Service</h2>
          <p className="mb-3">InvoiceChaser provides automated invoice reminder services designed to help businesses collect payments faster. When you enable chasing on an invoice, our system will send automated email reminders to your customer at strategically timed intervals until the invoice is paid or chasing is disabled.</p>
          <p>Our AI-powered system analyzes the best times to send reminders based on your customer's behavior patterns and timezone to maximize response rates.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">2. Collection Fee Structure</h2>
          <p className="mb-3">When a customer pays an invoice through our "Pay Now" button using any supported payment method, InvoiceChaser collects a <strong className="text-neutral-900 dark:text-white">5% service fee</strong> on the total amount paid. This fee covers:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Payment processing fees</li>
            <li>Automated chasing service</li>
            <li>Platform maintenance and security</li>
            <li>Customer support</li>
            <li>Escrow protection</li>
          </ul>
          <p>The remaining 95% is transferred to your linked account within 2 business days. No fees are charged if no payment is collected.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">3. Payment Methods</h2>
          <p className="mb-3">We support multiple payment methods to accommodate your customers:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li><strong>Credit/Debit Cards:</strong> Visa, Mastercard (processed via Stripe)</li>
            <li><strong>Mobile Money:</strong> Paynow (Zimbabwe), other regional providers</li>
            <li><strong>PayPal:</strong> International payments</li>
            <li><strong>Bank Transfer:</strong> Direct bank deposits with reference tracking</li>
          </ul>
          <p>All transactions are processed securely through PCI-compliant payment partners with bank-level encryption.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">4. Automated Reminder Schedule</h2>
          <p className="mb-3">By placing a customer on chased invoice status, you authorize InvoiceChaser to send professional email reminders on your behalf. Our default reminder schedule includes:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li><strong>Day -3:</strong> Friendly payment reminder before due date</li>
            <li><strong>Day 0:</strong> Due date notification</li>
            <li><strong>Day 7:</strong> First overdue notice</li>
            <li><strong>Day 14:</strong> Final notice before escalation</li>
          </ul>
          <p>All reminders are customizable and can be paused or cancelled at any time through your dashboard.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">5. Professional Debt Collection</h2>
          <p className="mb-3">For invoices overdue by more than 90 days, you may opt to engage our professional debt collection partners. This service includes:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Legal demand letters</li>
            <li>Phone follow-ups by trained agents</li>
            <li>Credit bureau reporting</li>
            <li>Legal action coordination (additional costs)</li>
          </ul>
          <p>Debt collection fees are quoted case by case and typically range from 15-25% of recovered amounts.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">6. Data Privacy & Security</h2>
          <p className="mb-3">We take data protection seriously. Your customer data and invoice information are:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Encrypted at rest and in transit (AES-256, TLS 1.3)</li>
            <li>Stored in secure, SOC 2 compliant data centers</li>
            <li>Never sold or shared with third parties for marketing</li>
            <li>Accessible only to authorized team members</li>
          </ul>
          <p>You retain full ownership of your customer data. We are GDPR and POPIA compliant.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">7. Limitation of Liability</h2>
          <p className="mb-3">InvoiceChaser is a facilitation platform and is not liable for unpaid invoices. Our service provides tools to improve collection rates but does not guarantee payment. The 5% fee only applies when payment is successfully collected through our platform.</p>
          <p>We are not responsible for:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Customer disputes over invoice validity</li>
            <li>Chargebacks or payment reversals</li>
            <li>Customer insolvency or bankruptcy</li>
            <li>Email deliverability issues beyond our control</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">8. Subscription & Cancellation</h2>
          <p className="mb-3">You can cancel your subscription at any time from your account settings. Upon cancellation:</p>
          <ul className="list-disc pl-5 space-y-1 mb-3">
            <li>Your account remains active until the end of the current billing period</li>
            <li>All your data is retained for 30 days then permanently deleted</li>
            <li>You can export your data before cancellation</li>
            <li>No refunds for partial months</li>
          </ul>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">9. Changes to Terms</h2>
          <p>We may update these terms from time to time. We will notify you of any material changes via email or through your dashboard. Continued use of the service after changes constitutes acceptance of the new terms.</p>
        </section>

        <section>
          <h2 className="font-semibold text-base text-neutral-900 dark:text-white mb-3">10. Contact Us</h2>
          <p>For questions about these terms or our services, please contact us at support@invoicechaser.com or through the chat feature in your dashboard.</p>
        </section>
      </div>
    </div>
  )
}

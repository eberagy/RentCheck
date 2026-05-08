import { NextResponse } from 'next/server'

// SCAFFOLD: Stripe webhook handler (Phase 2)
// Will handle: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted, invoice.payment_failed
//
// Returns 501 unconditionally until Phase 2 ships. Previously returned
// 200 { received: true } whenever the webhook secret env var was set —
// which would silently ack events to Stripe (so retries stop), without
// any verification or business-logic side effects. That hides missing
// implementation behind a successful-looking dashboard delivery row.
// Match /api/stripe/checkout's 503 pattern, but use 501 ("not
// implemented") since Stripe documents it as a non-retryable signal
// the integration isn't built yet rather than a temporary outage.
export async function POST() {
  return NextResponse.json({ error: 'Webhook handler not yet implemented' }, { status: 501 })
}

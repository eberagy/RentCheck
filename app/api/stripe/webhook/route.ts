import { NextRequest, NextResponse } from 'next/server'

// SCAFFOLD: Stripe webhook handler (Phase 2)
// Handles: checkout.session.completed, customer.subscription.updated,
// customer.subscription.deleted, invoice.payment_failed

export async function POST(req: NextRequest) {
  const _body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json({ error: 'Webhook not configured' }, { status: 400 })
  }

  // TODO Phase 2:
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)
  // switch (event.type) {
  //   case 'checkout.session.completed': ...
  //   case 'customer.subscription.deleted': ...
  // }

  return NextResponse.json({ received: true })
}

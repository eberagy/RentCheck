import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-06-20' as const,
  typescript: true,
})

// Scaffolded — not charging yet. Activate when ready.
export const STRIPE_PRICES = {
  verifiedMonthly: process.env.STRIPE_PRICE_VERIFIED_MONTHLY ?? '',
  verifiedAnnual: process.env.STRIPE_PRICE_VERIFIED_ANNUAL ?? '',
} as const

export async function createCheckoutSession({
  customerId,
  priceId,
  landlordId,
  returnUrl,
}: {
  customerId: string
  priceId: string
  landlordId: string
  returnUrl: string
}) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${returnUrl}?session_id={CHECKOUT_SESSION_ID}&landlord=${landlordId}`,
    cancel_url: returnUrl,
    metadata: { landlordId },
    subscription_data: { metadata: { landlordId } },
  })
}

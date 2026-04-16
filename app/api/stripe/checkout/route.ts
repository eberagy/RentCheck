import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// SCAFFOLD: Stripe checkout not yet active — landlord badge $99/month (Phase 2)
export async function POST(_req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // TODO Phase 2: Create Stripe checkout session
  // const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)
  // const session = await stripe.checkout.sessions.create({...})
  // return NextResponse.json({ url: session.url })

  return NextResponse.json({ error: 'Paid features not yet available' }, { status: 503 })
}

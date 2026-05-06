import { NextResponse } from 'next/server'
import { captureException } from './sentry'

// Wraps the boilerplate
//   if (error) { console.error('[db]', error); return NextResponse.json(...) }
// pattern that's repeated in ~30 API routes. Adds Sentry capture so we
// actually find out when production DB writes start failing — without
// this, each route silently 500s and we'd only see it via user reports.
//
// `where` should be a stable string identifying the route + step, e.g.
// 'reviews:insert' or 'me/delete:profile'. Avoid leaking PII into it.
export function dbError(where: string, error: unknown): NextResponse {
  console.error('[db]', error)
  captureException(error, { where: `${where}:db` })
  return NextResponse.json({ error: 'Database error' }, { status: 500 })
}

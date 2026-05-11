import { NextRequest, NextResponse } from 'next/server'
import { dbError } from '@/lib/api-errors'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { requireAdmin } from '@/lib/admin-auth'
import { logAdminAction } from '@/lib/audit'
import { captureException } from '@/lib/sentry'

// Verification docs (utility bills, govt IDs, deeds) uploaded by landlords
// during the claim/submission flow are sensitive PII. This route is the
// single point of access — generates a 1-hour signed URL AND logs the
// view to the audit table for GDPR/CCPA accountability.
//
// Sibling to /api/admin/lease-url; same shape (?path or ?submissionId/
// ?claimId), same dual JSON/redirect response based on Accept header.
const DOC_PATH_RE = /^[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9._-]+)*$/
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const user = await requireAdmin(supabase)
  if (!user) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const submissionId = req.nextUrl.searchParams.get('submissionId')
  const claimId = req.nextUrl.searchParams.get('claimId')
  let path = req.nextUrl.searchParams.get('path')

  const serviceClient = createServiceClient()
  let resourceType: 'submission' | 'claim' | 'verification-path' = 'verification-path'
  let resourceId = path ?? ''

  if (submissionId) {
    if (!UUID_RE.test(submissionId)) {
      return NextResponse.json({ error: 'Invalid submissionId' }, { status: 400 })
    }
    const { data: sub, error } = await serviceClient
      .from('landlord_submissions')
      .select('proof_doc_url')
      .eq('id', submissionId)
      .single()
    if (error && error.code !== 'PGRST116') return dbError('admin/verification-doc-url:submission-lookup', error)
    if (!sub || !sub.proof_doc_url) {
      return NextResponse.json({ error: 'Submission not found or no doc' }, { status: 404 })
    }
    path = sub.proof_doc_url
    resourceType = 'submission'
    resourceId = submissionId
  } else if (claimId) {
    if (!UUID_RE.test(claimId)) {
      return NextResponse.json({ error: 'Invalid claimId' }, { status: 400 })
    }
    const { data: claim, error } = await serviceClient
      .from('landlord_claims')
      .select('doc_url')
      .eq('id', claimId)
      .single()
    if (error && error.code !== 'PGRST116') return dbError('admin/verification-doc-url:claim-lookup', error)
    if (!claim || !claim.doc_url) {
      return NextResponse.json({ error: 'Claim not found or no doc' }, { status: 404 })
    }
    path = claim.doc_url
    resourceType = 'claim'
    resourceId = claimId
  }

  if (!path) {
    return NextResponse.json({ error: 'submissionId, claimId, or path required' }, { status: 400 })
  }
  if (!DOC_PATH_RE.test(path) || path.includes('..')) {
    return NextResponse.json({ error: 'Invalid path' }, { status: 400 })
  }

  const { data, error } = await serviceClient.storage
    .from('landlord-verification-docs')
    .createSignedUrl(path, 3600)
  // Storage signed-URL failure (bucket policy regression, expired
  // service role, transient outage) was responding with a generic
  // 500 and no Sentry breadcrumb. Capture before responding.
  if (error || !data) {
    if (error) captureException(error, { where: 'admin/verification-doc-url:storage', resourceType, resourceId })
    return NextResponse.json({ error: 'Could not generate URL' }, { status: 500 })
  }

  // Audit log: admin viewed a verification doc. Mirrors lease.viewed
  // pattern (added in 56a892c). Required for accountability when a
  // landlord later requests "who at Vett saw my utility bill?"
  logAdminAction({
    adminId: user.id,
    actionType: 'lease.viewed', // reuse — both are 'admin viewed sensitive doc'
    resourceType,
    resourceId,
    detail: { docType: 'verification' },
  })

  // Same Accept-header content negotiation as lease-url: html → 302,
  // anything else → JSON.
  const accept = req.headers.get('accept') ?? ''
  if (accept.includes('text/html')) {
    return NextResponse.redirect(data.signedUrl, 302)
  }

  // Defense-in-depth: signed URLs are short-lived single-tenant
  // credentials and the JSON body carries PII-document URLs. no-store
  // prevents a future CDN regression from caching the response.
  return NextResponse.json(
    { signedUrl: data.signedUrl },
    { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
  )
}

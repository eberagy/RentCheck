import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLandlordSummary, buildPropertySummary, truncateSummary } from '@/lib/summaries'
import { rateLimit, rateLimitResponse } from '@/lib/rate-limit'
import { z } from 'zod'
import type { Landlord, Property } from '@/types'

const schema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['all', 'landlord', 'property']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  // Rate-limit on IP since search allows unauthenticated use. Tight limits
  // because search_all is an expensive full-text RPC.
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip') ?? 'anon'
  const rl = rateLimit(`search:${ip}`, 60, 60_000)
  if (!rl.success) return rateLimitResponse()

  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

  const { q, type, limit } = parsed.data
  const supabase = await createClient()

  type SearchHit = {
    id: string
    result_type: 'landlord' | 'property'
    slug?: string | null
    review_count?: number | null
    avg_rating?: number | null
    open_violation_count?: number | null
    total_violation_count?: number | null
    is_verified?: boolean | null
    record_count?: number | null
    summary?: string | null
  }
  type LandlordRow = Pick<Landlord, 'id' | 'display_name' | 'slug' | 'avg_rating' | 'review_count' | 'open_violation_count' | 'total_violation_count' | 'eviction_count' | 'city' | 'state_abbr' | 'is_verified' | 'response_rate'>
  type PropertyRow = Pick<Property, 'id' | 'address_line1' | 'avg_rating' | 'review_count' | 'city' | 'state_abbr'> & {
    landlord: { display_name: string } | null
  }
  type RecordRow = { property_id: string | null; title: string; status: string | null; filed_date: string | null }

  const { data, error } = await supabase.rpc('search_all', { query: q, limit_n: limit })
  if (error) { console.error("[db]", error); return NextResponse.json({ error: "Database error" }, { status: 500 }) }

  const allHits = (data ?? []) as SearchHit[]
  const rawResults = allHits.filter(r => type === 'all' || r.result_type === type)
  const landlordIds = rawResults.filter(r => r.result_type === 'landlord').map(r => r.id)
  const propertyIds = rawResults.filter(r => r.result_type === 'property').map(r => r.id)

  const [
    { data: landlords },
    { data: properties },
    { data: propertyRecords },
  ] = await Promise.all([
    landlordIds.length
      ? supabase
          .from('landlords')
          .select('id, display_name, slug, avg_rating, review_count, open_violation_count, total_violation_count, eviction_count, city, state_abbr, is_verified, response_rate')
          .in('id', landlordIds) as unknown as Promise<{ data: LandlordRow[] | null; error: unknown }>
      : Promise.resolve({ data: [] as LandlordRow[], error: null }),
    propertyIds.length
      ? supabase
          .from('properties')
          .select('id, address_line1, avg_rating, review_count, city, state_abbr, landlord:landlords(display_name)')
          .in('id', propertyIds) as unknown as Promise<{ data: PropertyRow[] | null; error: unknown }>
      : Promise.resolve({ data: [] as PropertyRow[], error: null }),
    propertyIds.length
      ? supabase
          .from('public_records')
          .select('property_id, title, status, filed_date')
          .in('property_id', propertyIds) as unknown as Promise<{ data: RecordRow[] | null; error: unknown }>
      : Promise.resolve({ data: [] as RecordRow[], error: null }),
  ])

  const landlordsById = new Map((landlords ?? []).map(landlord => [landlord.id, landlord]))
  const propertiesById = new Map((properties ?? []).map(property => [property.id, property]))
  const recordsByPropertyId = new Map<string, Array<{ title: string; status: string | null; filed_date: string | null }>>()

  for (const record of propertyRecords ?? []) {
    if (!record.property_id) continue
    const bucket = recordsByPropertyId.get(record.property_id) ?? []
    bucket.push(record)
    recordsByPropertyId.set(record.property_id, bucket)
  }

  const results: SearchHit[] = rawResults.map(result => {
    if (result.result_type === 'landlord') {
      const landlord = landlordsById.get(result.id)
      if (!landlord) return result
      return {
        ...result,
        slug: landlord.slug ?? result.slug,
        open_violation_count: landlord.open_violation_count ?? 0,
        total_violation_count: landlord.total_violation_count ?? 0,
        review_count: landlord.review_count ?? result.review_count,
        avg_rating: landlord.avg_rating ?? result.avg_rating,
        is_verified: landlord.is_verified ?? result.is_verified,
        summary: truncateSummary(buildLandlordSummary({ landlord }), 140),
      }
    }

    const property = propertiesById.get(result.id)
    if (!property) return result

    return {
      ...result,
      summary: truncateSummary(
        buildPropertySummary({
          property,
          landlordName: property.landlord?.display_name ?? null,
          records: recordsByPropertyId.get(result.id) ?? [],
        }),
        140
      ),
      record_count: (recordsByPropertyId.get(result.id) ?? []).length,
      review_count: property.review_count ?? 0,
    }
  })

  // Push property results that have NO reviews AND NO records to the bottom.
  // They're noise — a street name matched the query but the row has nothing
  // useful to show. Landlord results stay in their original ranked order.
  const enriched = results.map(r => {
    const isEmptyProperty = r.result_type === 'property'
      && (r.review_count ?? 0) === 0
      && (r.record_count ?? 0) === 0
    return { r, isEmptyProperty }
  })
  enriched.sort((a, b) => {
    if (a.isEmptyProperty !== b.isEmptyProperty) return a.isEmptyProperty ? 1 : -1
    return 0
  })

  return NextResponse.json({ results: enriched.map(e => e.r), query: q })
}

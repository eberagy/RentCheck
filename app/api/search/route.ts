import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildLandlordSummary, buildPropertySummary, truncateSummary } from '@/lib/summaries'
import { z } from 'zod'

const schema = z.object({
  q: z.string().min(2).max(200),
  type: z.enum(['all', 'landlord', 'property']).default('all'),
  limit: z.coerce.number().min(1).max(50).default(10),
})

export async function GET(req: NextRequest) {
  const parsed = schema.safeParse(Object.fromEntries(req.nextUrl.searchParams))
  if (!parsed.success) return NextResponse.json({ error: 'Invalid query' }, { status: 400 })

  const { q, type, limit } = parsed.data
  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_all', { query: q, limit_n: limit })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const rawResults = (data ?? []).filter((r: any) => type === 'all' || r.result_type === type)
  const landlordIds = rawResults.filter((r: any) => r.result_type === 'landlord').map((r: any) => r.id)
  const propertyIds = rawResults.filter((r: any) => r.result_type === 'property').map((r: any) => r.id)

  const [
    { data: landlords },
    { data: properties },
    { data: propertyRecords },
  ] = await Promise.all([
    landlordIds.length
      ? supabase
          .from('landlords')
          .select('id, display_name, slug, avg_rating, review_count, open_violation_count, total_violation_count, eviction_count, city, state_abbr, is_verified, grade')
          .in('id', landlordIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    propertyIds.length
      ? supabase
          .from('properties')
          .select('id, address_line1, avg_rating, review_count, city, state_abbr, landlord:landlords(display_name)')
          .in('id', propertyIds)
      : Promise.resolve({ data: [] as any[], error: null }),
    propertyIds.length
      ? supabase
          .from('public_records')
          .select('property_id, title, status, filed_date')
          .in('property_id', propertyIds)
      : Promise.resolve({ data: [] as any[], error: null }),
  ])

  const landlordsById = new Map((landlords ?? []).map((landlord: any) => [landlord.id, landlord]))
  const propertiesById = new Map((properties ?? []).map((property: any) => [property.id, property]))
  const recordsByPropertyId = new Map<string, Array<{ title: string; status: string | null; filed_date: string | null }>>()

  for (const record of propertyRecords ?? []) {
    if (!record.property_id) continue
    const bucket = recordsByPropertyId.get(record.property_id) ?? []
    bucket.push(record)
    recordsByPropertyId.set(record.property_id, bucket)
  }

  const results = rawResults.map((result: any) => {
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
        grade: landlord.grade ?? result.grade,
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
    }
  })

  return NextResponse.json({ results, query: q })
}

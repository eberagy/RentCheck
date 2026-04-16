import type { Landlord, Property, PublicRecord } from '@/types'

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`
}

function formatRating(rating: number) {
  return Number.isFinite(rating) && rating > 0 ? rating.toFixed(1) : null
}

export function buildLandlordSummary(input: {
  landlord: Pick<Landlord, 'display_name' | 'avg_rating' | 'review_count' | 'open_violation_count' | 'total_violation_count' | 'eviction_count' | 'city' | 'state_abbr' | 'is_verified'>
  propertyCount?: number
}) {
  const { landlord, propertyCount = 0 } = input
  const parts: string[] = []
  const rating = formatRating(Number(landlord.avg_rating ?? 0))

  if ((landlord.review_count ?? 0) > 0 && rating) {
    parts.push(
      `${landlord.display_name} has ${pluralize(landlord.review_count, 'lease-verified review')} with a ${rating} average rating`
    )
  } else {
    parts.push(`No lease-verified renter reviews are published for ${landlord.display_name} yet`)
  }

  if ((landlord.open_violation_count ?? 0) > 0) {
    parts.push(`${pluralize(landlord.open_violation_count, 'open public record')} currently linked`)
  } else if ((landlord.total_violation_count ?? 0) > 0) {
    parts.push(`${pluralize(landlord.total_violation_count, 'public record')} on file, none currently open`)
  }

  if ((landlord.eviction_count ?? 0) > 0) {
    parts.push(`${pluralize(landlord.eviction_count, 'eviction filing')} on record`)
  }

  if (propertyCount > 0) {
    parts.push(`${pluralize(propertyCount, 'linked property')}`)
  }

  if (landlord.is_verified) {
    parts.push('landlord identity verified by Vett')
  }

  return parts.join('. ') + '.'
}

export function buildPropertySummary(input: {
  property: Pick<Property, 'address_line1' | 'avg_rating' | 'review_count' | 'city' | 'state_abbr'>
  landlordName?: string | null
  records: Pick<PublicRecord, 'title' | 'status' | 'filed_date'>[]
}) {
  const { property, landlordName, records } = input
  const parts: string[] = []
  const rating = formatRating(Number(property.avg_rating ?? 0))
  const openRecords = records.filter((record) => {
    const status = record.status?.toLowerCase()
    return status !== 'closed' && status !== 'dismissed'
  })

  if ((property.review_count ?? 0) > 0 && rating) {
    parts.push(
      `${property.address_line1} has ${pluralize(property.review_count, 'lease-verified review')} with a ${rating} average rating`
    )
  } else {
    parts.push(`No lease-verified renter reviews are published for ${property.address_line1} yet`)
  }

  if (landlordName) {
    parts.push(`linked to ${landlordName}`)
  }

  if (openRecords.length > 0) {
    const latestOpenRecord = [...openRecords]
      .sort((a, b) => (b.filed_date ?? '').localeCompare(a.filed_date ?? ''))[0]
    parts.push(`${pluralize(openRecords.length, 'open public record')} currently linked`)
    if (latestOpenRecord?.title) {
      parts.push(`latest filing: ${latestOpenRecord.title.toLowerCase()}`)
    }
  } else if (records.length > 0) {
    parts.push(`${pluralize(records.length, 'historical public record')} on file`)
  }

  return parts.join('. ') + '.'
}

export function truncateSummary(summary: string, maxLength = 180) {
  if (summary.length <= maxLength) return summary
  return `${summary.slice(0, maxLength - 1).trimEnd()}…`
}

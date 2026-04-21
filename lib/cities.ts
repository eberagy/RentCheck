/**
 * Metro-area alias resolution.
 *
 * Some cities are stored in the DB under borough / neighbourhood names that
 * differ from the "marketing" metro name used in URLs and navigation.  This
 * module provides helpers so that every variant resolves to the same canonical
 * city page and every query fans out to all known variants.
 */

interface MetroArea {
  /** Display name used in URLs and headings (e.g. "New York") */
  canonical: string
  /** State abbreviation */
  state: string
  /** Every value the DB might contain for this metro, INCLUDING the canonical name */
  variants: string[]
}

const METRO_AREAS: MetroArea[] = [
  {
    canonical: 'New York',
    state: 'NY',
    variants: [
      'New York',
      'New York City',
      'NYC',
      'Manhattan',
      'Brooklyn',
      'Queens',
      'Bronx',
      'The Bronx',
      'Staten Island',
    ],
  },
  // Add more metros here as data is ingested with non-canonical city names.
  // Example:
  // {
  //   canonical: 'Washington',
  //   state: 'DC',
  //   variants: ['Washington', 'Washington DC', 'Washington D.C.', 'D.C.'],
  // },
]

/** Pre-built lowercase lookup → MetroArea */
const _lookup = new Map<string, MetroArea>()
for (const metro of METRO_AREAS) {
  for (const v of metro.variants) {
    _lookup.set(v.toLowerCase(), metro)
  }
}

/**
 * Given a city name (from a URL slug or DB field), return the list of DB
 * values that should match, or `null` if the city isn't part of a known metro.
 */
export function getCityAliases(cityName: string): string[] | null {
  const metro = _lookup.get(cityName.toLowerCase())
  return metro ? metro.variants : null
}

/**
 * Given a DB city name, return the canonical display name for the metro, or
 * the original name if it isn't part of a known metro.  Use this when building
 * breadcrumb links so that "Manhattan" → "New York", etc.
 */
export function getCanonicalCity(dbCity: string): string {
  const metro = _lookup.get(dbCity.toLowerCase())
  return metro ? metro.canonical : dbCity
}

/**
 * Build a URL-safe slug from a city name:  "New York" → "new-york"
 */
export function citySlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Build the canonical city-page path for a given DB city + state.
 * "Manhattan" + "NY"  →  "/city/ny/new-york"
 * "Pittsburgh" + "PA" →  "/city/pa/pittsburgh"
 */
export function cityPagePath(dbCity: string, stateAbbr: string): string {
  const display = getCanonicalCity(dbCity)
  return `/city/${stateAbbr.toLowerCase()}/${citySlug(display)}`
}

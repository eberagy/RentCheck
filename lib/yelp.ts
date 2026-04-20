/**
 * Yelp Fusion API helpers
 * Free tier: 500 requests/day
 * Get API key: https://fusion.yelp.com
 * Set YELP_API_KEY in Vercel env vars
 */

export interface YelpBusiness {
  id: string
  name: string
  url: string
  rating: number
  review_count: number
  location: { display_address: string[] }
  categories: { title: string }[]
  phone: string
  image_url: string | null
}

export async function searchYelp(
  name: string,
  city: string,
  stateAbbr: string
): Promise<YelpBusiness | null> {
  const apiKey = process.env.YELP_API_KEY
  if (!apiKey) return null

  const params = new URLSearchParams({
    term: name,
    location: `${city}, ${stateAbbr}`,
    categories: 'realestate,propertymanagement',
    limit: '1',
  })

  try {
    const res = await fetch(`https://api.yelp.com/v3/businesses/search?${params}`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      next: { revalidate: 86400 }, // Cache 24h
    })
    if (!res.ok) return null
    const data = await res.json()
    const businesses: YelpBusiness[] = data.businesses ?? []
    if (!businesses.length) return null

    // Fuzzy match: check if the top result name is similar enough
    const topName = businesses[0]!.name.toLowerCase()
    const searchName = name.toLowerCase()
    if (!topName.includes(searchName.split(' ')[0]!) && !searchName.includes(topName.split(' ')[0]!)) {
      return null
    }
    return businesses[0]!
  } catch {
    return null
  }
}

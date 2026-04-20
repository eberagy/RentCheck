import { ExternalLink, Star } from 'lucide-react'
import type { YelpBusiness } from '@/lib/yelp'

interface ExternalReviewLinksProps {
  landlordName: string
  city: string
  stateAbbr: string
  yelp: YelpBusiness | null
}

export function ExternalReviewLinks({ landlordName, city, stateAbbr, yelp }: ExternalReviewLinksProps) {
  const googleSearchUrl =
    `https://www.google.com/search?q=${encodeURIComponent(`"${landlordName}" ${city} ${stateAbbr} reviews`)}`
  const yelpSearchUrl =
    `https://www.yelp.com/search?find_desc=${encodeURIComponent(landlordName)}&find_loc=${encodeURIComponent(`${city}, ${stateAbbr}`)}`

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Reviews on other platforms</h3>
      <div className="flex flex-col gap-2">

        {/* Yelp — show rating if found, otherwise show search link */}
        {yelp ? (
          <a
            href={yelp.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2.5 hover:border-red-300 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <YelpIcon />
              <div>
                <p className="text-xs font-medium text-gray-800">{yelp.name}</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Star className="h-3 w-3 fill-red-400 text-red-400" />
                  <span className="text-xs text-gray-500">{yelp.rating} · {yelp.review_count.toLocaleString()} reviews</span>
                </div>
              </div>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-400" />
          </a>
        ) : (
          <a
            href={yelpSearchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2.5 hover:border-red-300 hover:bg-red-50 transition-colors group"
          >
            <div className="flex items-center gap-2.5">
              <YelpIcon />
              <span className="text-xs text-gray-600">Search on Yelp</span>
            </div>
            <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-red-400" />
          </a>
        )}

        {/* Google */}
        <a
          href={googleSearchUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2.5 hover:border-blue-300 hover:bg-blue-50 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <GoogleIcon />
            <span className="text-xs text-gray-600">Search reviews on Google</span>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-blue-400" />
        </a>

        {/* Apartments.com */}
        <a
          href={`https://www.apartments.com/search/?q=${encodeURIComponent(`${landlordName} ${city}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-between rounded-lg bg-white border border-gray-200 px-3 py-2.5 hover:border-teal-300 hover:bg-teal-50 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <ApartmentsIcon />
            <span className="text-xs text-gray-600">Search on Apartments.com</span>
          </div>
          <ExternalLink className="h-3.5 w-3.5 text-gray-400 group-hover:text-teal-400" />
        </a>
      </div>
      <p className="text-xs text-gray-400 mt-2.5">
        External ratings are not verified by Vett and are provided for reference only.
      </p>
    </div>
  )
}

function YelpIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#FF1A1A" />
      <path d="M10.2 16.8c-.1.5-.6.9-1.1.8l-2.8-.5c-.5-.1-.8-.6-.7-1.1l.2-1c.1-.5.5-.8 1-.8l3 .1c.7 0 1.2.7 1 1.4l-.6 1.1zm1.5-3.7c-.3.5-.9.7-1.4.4l-2.6-1.2c-.5-.2-.7-.8-.5-1.3l.4-.9c.2-.5.8-.7 1.3-.5l2.8 1.5c.6.3.7 1.1.3 1.7l-.3.3zm.8-4c-.5.3-1.1.1-1.4-.3l-1.5-2.3c-.3-.5-.1-1.1.3-1.4l.8-.5c.5-.3 1.1-.1 1.4.4l1.1 2.5c.3.7-.1 1.5-.7 1.6zm4.2 7.9c-.3.4-.9.5-1.4.3l-.9-.6c-.4-.3-.6-.8-.4-1.3l1-2.8c.2-.6 1-.9 1.6-.5l.5.4c.4.3.5.9.3 1.4l-.7 3.1zm.4-5c-.5.2-1.1 0-1.4-.5l-1-2.5c-.2-.5 0-1.1.5-1.4l.9-.4c.5-.2 1.1 0 1.3.5l.8 2.6c.2.7-.3 1.5-1.1 1.7z" fill="white" />
    </svg>
  )
}

function GoogleIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  )
}

function ApartmentsIcon() {
  return (
    <svg className="h-5 w-5 flex-shrink-0" viewBox="0 0 24 24" fill="none">
      <rect width="24" height="24" rx="4" fill="#0072CE" />
      <path d="M12 3L4 8v13h5v-7h6v7h5V8L12 3z" fill="white" />
    </svg>
  )
}

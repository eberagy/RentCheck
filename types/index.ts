// ============================================================
// Vett — TypeScript Types
// ============================================================

export type UserType = 'renter' | 'landlord' | 'admin'
export type ReviewStatus = 'pending' | 'approved' | 'rejected' | 'flagged'
export type ClaimStatus = 'pending' | 'approved' | 'rejected'
export type SyncStatus = 'running' | 'completed' | 'failed'
export type RecordType =
  | 'hpd_violation' | 'dob_violation' | 'dob_complaint' | 'nyc_311' | 'court_case' | 'eviction'
  | 'eviction_filing' | '311_complaint' | 'code_enforcement' | 'lsc_eviction' | 'hud_inspection'
  | 'chicago_violation' | 'sf_violation' | 'sf_eviction' | 'boston_violation'
  | 'philly_violation' | 'austin_complaint' | 'seattle_violation' | 'la_violation'
  | 'court_listener' | 'pittsburgh_violation' | 'baltimore_vacant_notice'
  | 'houston_violation' | 'miami_violation' | 'denver_violation' | 'dallas_violation'
  | 'dc_violation' | 'atlanta_violation' | 'nashville_violation'
  | 'phoenix_violation' | 'minneapolis_violation' | 'portland_violation'
  | 'san_antonio_violation' | 'detroit_violation' | 'charlotte_violation' | 'columbus_violation'
export type Severity = 'low' | 'medium' | 'high' | 'critical'
export type LandlordGrade = 'A' | 'B' | 'C' | 'D' | 'F'

// ─── DATABASE ROW TYPES ──────────────────────────────────────

export interface Profile {
  id: string
  email: string
  full_name: string | null
  user_type: UserType
  is_verified_landlord: boolean
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  subscription_status: string | null
  avatar_url: string | null
  bio: string | null
  is_banned: boolean
  email_watchlist: boolean
  created_at: string
  updated_at: string
}

export interface Landlord {
  id: string
  slug: string
  display_name: string
  business_name: string | null
  claimed_by: string | null
  is_claimed: boolean
  is_verified: boolean
  verification_docs_url: string | null
  verification_date: string | null
  avg_rating: number
  review_count: number
  city: string | null
  state: string | null
  state_abbr: string | null
  zip: string | null
  lat: number | null
  lng: number | null
  bio: string | null
  website: string | null
  phone: string | null
  grade: LandlordGrade | null
  open_violation_count: number
  total_violation_count: number
  eviction_count: number
  response_rate?: number | null
  responded_review_count?: number
  ai_summary?: string | null
  opencorporates_id: string | null
  created_at: string
  updated_at: string
}

export interface Property {
  id: string
  landlord_id: string | null
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  state_abbr: string
  zip: string
  lat: number | null
  lng: number | null
  property_type: 'apartment' | 'house' | 'condo' | 'townhouse' | 'commercial' | 'other' | null
  unit_count: number | null
  year_built: number | null
  avg_rating: number
  review_count: number
  address_normalized: string | null
  created_at: string
  updated_at: string
}

export interface Review {
  id: string
  reviewer_id: string | null
  landlord_id: string
  property_id: string | null
  rating_overall: number
  rating_responsiveness: number | null
  rating_maintenance: number | null
  rating_honesty: number | null
  rating_lease_fairness: number | null
  would_rent_again: boolean | null
  title: string
  body: string
  rental_period_start: string | null
  rental_period_end: string | null
  is_current_tenant: boolean
  lease_verified: boolean
  lease_doc_path: string | null
  lease_verified_at: string | null
  lease_verified_by: string | null
  lease_hash: string | null
  lease_filename: string | null
  lease_file_size: number | null
  status: ReviewStatus
  moderation_note: string | null
  admin_notes: string | null
  moderated_by: string | null
  moderated_at: string | null
  landlord_response: string | null
  landlord_response_at: string | null
  landlord_response_status: 'pending' | 'approved' | 'rejected' | null
  helpful_count: number
  flag_count: number
  created_at: string
  updated_at: string
  // Joined fields
  reviewer?: Pick<Profile, 'full_name' | 'email' | 'avatar_url'>
  property?: Pick<Property, 'address_line1' | 'city' | 'state_abbr'>
  evidence?: ReviewEvidence[]
}

export interface ReviewEvidence {
  id: string
  review_id: string
  file_path: string
  file_name: string | null
  file_type: string | null
  file_size: number | null
  uploaded_at: string
}

export interface PublicRecord {
  id: string
  property_id: string | null
  landlord_id: string | null
  record_type: RecordType
  source: string
  source_id: string | null
  source_url: string | null
  severity: Severity | null
  status: string | null
  title: string
  description: string | null
  violation_class: string | null
  case_number: string | null
  filed_date: string | null
  closed_date: string | null
  plaintiff_name: string | null
  defendant_name: string | null
  court_name: string | null
  nature_of_suit: string | null
  outcome: string | null
  raw_data: unknown
  last_synced_at: string
  created_at: string
}

export interface LandlordClaim {
  id: string
  landlord_id: string
  claimed_by: string
  verification_type: 'utility_bill' | 'government_id' | 'deed' | 'business_reg' | 'other'
  doc_url: string
  doc_filename: string | null
  status: ClaimStatus
  admin_notes: string | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string
  // Joined
  landlord?: Pick<Landlord, 'display_name' | 'slug' | 'city' | 'state_abbr'>
  claimant?: Pick<Profile, 'full_name' | 'email'>
}

export interface SyncLog {
  id: string
  source: string
  started_at: string
  completed_at: string | null
  finished_at: string | null
  records_added: number
  records_updated: number
  records_skipped: number
  error_message: string | null
  status: SyncStatus
}

export interface WatchlistEntry {
  id: string
  user_id: string
  landlord_id: string | null
  property_id: string | null
  notify_email: boolean
  created_at: string
  landlord?: Pick<Landlord, 'display_name' | 'slug' | 'avg_rating' | 'city' | 'state_abbr'>
}

// ─── API RESPONSE TYPES ──────────────────────────────────────

export interface ApiResponse<T> {
  data: T | null
  error: string | null
}

export interface PaginatedResponse<T> {
  data: T[]
  count: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface SearchResult {
  result_type: 'landlord' | 'property'
  id: string
  slug: string | null
  display_name: string
  city: string | null
  state_abbr: string | null
  avg_rating: number | null
  review_count: number | null
  is_verified: boolean
  rank: number
  summary?: string
}

// ─── FORM INPUT TYPES ────────────────────────────────────────

export interface ReviewFormInput {
  landlordId: string
  propertyId?: string
  ratingOverall: number
  ratingResponsiveness?: number
  ratingMaintenance?: number
  ratingHonesty?: number
  ratingLeaseFairness?: number
  wouldRentAgain?: boolean
  title: string
  body: string
  rentalPeriodStart?: string
  rentalPeriodEnd?: string
  isCurrentTenant: boolean
  confirmedGenuine: boolean
  confirmedLiability: boolean
}

export interface LandlordProfileFormInput {
  bio?: string
  website?: string
  phone?: string
}

export interface CreateLandlordInput {
  displayName: string
  businessName?: string
  city: string
  stateAbbr: string
  zip?: string
  addresses?: string[]
}

// ─── CONSTANTS ───────────────────────────────────────────────

export const US_STATES = [
  { abbr: 'AL', name: 'Alabama' }, { abbr: 'AK', name: 'Alaska' },
  { abbr: 'AZ', name: 'Arizona' }, { abbr: 'AR', name: 'Arkansas' },
  { abbr: 'CA', name: 'California' }, { abbr: 'CO', name: 'Colorado' },
  { abbr: 'CT', name: 'Connecticut' }, { abbr: 'DE', name: 'Delaware' },
  { abbr: 'FL', name: 'Florida' }, { abbr: 'GA', name: 'Georgia' },
  { abbr: 'HI', name: 'Hawaii' }, { abbr: 'ID', name: 'Idaho' },
  { abbr: 'IL', name: 'Illinois' }, { abbr: 'IN', name: 'Indiana' },
  { abbr: 'IA', name: 'Iowa' }, { abbr: 'KS', name: 'Kansas' },
  { abbr: 'KY', name: 'Kentucky' }, { abbr: 'LA', name: 'Louisiana' },
  { abbr: 'ME', name: 'Maine' }, { abbr: 'MD', name: 'Maryland' },
  { abbr: 'MA', name: 'Massachusetts' }, { abbr: 'MI', name: 'Michigan' },
  { abbr: 'MN', name: 'Minnesota' }, { abbr: 'MS', name: 'Mississippi' },
  { abbr: 'MO', name: 'Missouri' }, { abbr: 'MT', name: 'Montana' },
  { abbr: 'NE', name: 'Nebraska' }, { abbr: 'NV', name: 'Nevada' },
  { abbr: 'NH', name: 'New Hampshire' }, { abbr: 'NJ', name: 'New Jersey' },
  { abbr: 'NM', name: 'New Mexico' }, { abbr: 'NY', name: 'New York' },
  { abbr: 'NC', name: 'North Carolina' }, { abbr: 'ND', name: 'North Dakota' },
  { abbr: 'OH', name: 'Ohio' }, { abbr: 'OK', name: 'Oklahoma' },
  { abbr: 'OR', name: 'Oregon' }, { abbr: 'PA', name: 'Pennsylvania' },
  { abbr: 'RI', name: 'Rhode Island' }, { abbr: 'SC', name: 'South Carolina' },
  { abbr: 'SD', name: 'South Dakota' }, { abbr: 'TN', name: 'Tennessee' },
  { abbr: 'TX', name: 'Texas' }, { abbr: 'UT', name: 'Utah' },
  { abbr: 'VT', name: 'Vermont' }, { abbr: 'VA', name: 'Virginia' },
  { abbr: 'WA', name: 'Washington' }, { abbr: 'WV', name: 'West Virginia' },
  { abbr: 'WI', name: 'Wisconsin' }, { abbr: 'WY', name: 'Wyoming' },
  { abbr: 'DC', name: 'District of Columbia' },
] as const

export type StateAbbr = typeof US_STATES[number]['abbr']

export const RECORD_TYPE_LABELS: Record<RecordType, string> = {
  hpd_violation: 'Housing Violation',
  dob_violation: 'Building Violation',
  dob_complaint: 'Building Complaint',
  court_case: 'Court Case',
  eviction: 'Eviction Filing',
  eviction_filing: 'Eviction Filing',
  '311_complaint': '311 Complaint',
  code_enforcement: 'Code Enforcement',
  lsc_eviction: 'Eviction Filing',
  chicago_violation: 'Building Violation',
  sf_violation: 'Housing Violation',
  sf_eviction: 'Eviction Notice',
  boston_violation: 'Housing Violation',
  philly_violation: 'L&I Violation',
  austin_complaint: 'Code Complaint',
  seattle_violation: 'Code Violation',
  la_violation: 'Housing Violation',
  court_listener: 'Federal Court Case',
  pittsburgh_violation: 'Pittsburgh Violation',
  baltimore_vacant_notice: 'Vacant Building Notice',
  houston_violation: 'Houston Code Violation',
  miami_violation: 'Miami-Dade Violation',
  denver_violation: 'Denver Code Case',
  dallas_violation: 'Dallas Code Violation',
  dc_violation: 'DC Housing Violation',
  atlanta_violation: 'Atlanta Building Permit',
  nashville_violation: 'Nashville Code Violation',
  nyc_311: 'NYC 311 Complaint',
  hud_inspection: 'HUD Inspection',
  phoenix_violation: 'Phoenix Code Violation',
  minneapolis_violation: 'Minneapolis Code Complaint',
  portland_violation: 'Portland Code Violation',
  san_antonio_violation: 'San Antonio Code Violation',
  detroit_violation: 'Detroit Blight Violation',
  charlotte_violation: 'Charlotte Code Violation',
  columbus_violation: 'Columbus Code Violation',
}

export const SOURCE_LABELS: Record<string, string> = {
  nyc_hpd: 'NYC HPD',
  nyc_dob: 'NYC DOB',
  nyc_registration: 'NYC HPD Registration',
  chicago_buildings: 'Chicago Data Portal',
  sf_housing: 'DataSF',
  boston_isd: 'Analyze Boston',
  philly_li: 'OpenDataPhilly',
  austin_code: 'Austin Open Data',
  seattle_sdci: 'Seattle Open Data',
  la_lahd: 'LA Open Data',
  court_listener: 'CourtListener (Federal)',
  lsc_evictions: 'LSC Civil Court Data',
  pittsburgh_pli: 'Pittsburgh Open Data',
  baltimore_vacants: 'Baltimore Open Data',
  houston_code: 'Houston Open Data',
  miami_dade: 'Miami-Dade Open Data',
  denver_code: 'Denver Open Data',
  dallas_code: 'Dallas Open Data',
  dc_dcra: 'DC Open Data',
  atlanta_permits: 'Atlanta Regional Open Data',
  nashville_code: 'Nashville Open Data',
  nyc_311: 'NYC 311',
  hud_reac: 'HUD REAC',
  phoenix_code: 'Phoenix Open Data',
  minneapolis_code: 'Minneapolis Open Data',
  portland_bds: 'Portland Open Data',
  san_antonio_code: 'San Antonio Open Data',
  detroit_blight: 'Detroit Open Data',
  charlotte_code: 'Charlotte Open Data',
  columbus_code: 'Columbus Open Data',
}

export const COLLEGE_CITIES = [
  { city: 'Baltimore', state: 'MD', universities: ['Johns Hopkins University', 'University of Maryland Baltimore', 'Towson University', 'MICA'] },
  { city: 'Pittsburgh', state: 'PA', universities: ['University of Pittsburgh', 'Carnegie Mellon University', 'Duquesne University'] },
  { city: 'State College', state: 'PA', universities: ['Pennsylvania State University'] },
  { city: 'Philadelphia', state: 'PA', universities: ['University of Pennsylvania', 'Temple University', 'Drexel University', 'Jefferson University'] },
  { city: 'New York', state: 'NY', universities: ['NYU', 'Columbia University', 'CUNY', 'Fordham University', 'The New School'] },
  { city: 'Chicago', state: 'IL', universities: ['University of Chicago', 'Northwestern University', 'DePaul University', 'Loyola University', 'UIC'] },
  { city: 'Boston', state: 'MA', universities: ['Harvard University', 'MIT', 'Boston University', 'Northeastern University', 'Boston College'] },
  { city: 'San Francisco', state: 'CA', universities: ['UCSF', 'San Francisco State University', 'University of San Francisco'] },
  { city: 'Los Angeles', state: 'CA', universities: ['UCLA', 'USC', 'Caltech', 'LMU'] },
  { city: 'Austin', state: 'TX', universities: ['University of Texas at Austin', 'St. Edward\'s University'] },
  { city: 'Seattle', state: 'WA', universities: ['University of Washington', 'Seattle University', 'Seattle Pacific University'] },
  { city: 'Columbia', state: 'SC', universities: ['University of South Carolina'] },
  { city: 'Conway', state: 'SC', universities: ['Coastal Carolina University'] },
  { city: 'Houston', state: 'TX', universities: ['University of Houston', 'Rice University'] },
  { city: 'Miami', state: 'FL', universities: ['University of Miami', 'Florida International University'] },
  { city: 'Denver', state: 'CO', universities: ['University of Denver', 'Colorado State University'] },
  { city: 'Atlanta', state: 'GA', universities: ['Georgia Tech', 'Emory University', 'Georgia State University'] },
  { city: 'Washington', state: 'DC', universities: ['Georgetown University', 'George Washington University', 'American University', 'Howard University'] },
  { city: 'Nashville', state: 'TN', universities: ['Vanderbilt University', 'Belmont University'] },
  { city: 'Dallas', state: 'TX', universities: ['SMU', 'UT Dallas', 'TCU'] },
  { city: 'Phoenix', state: 'AZ', universities: ['Arizona State University', 'University of Arizona'] },
  { city: 'Minneapolis', state: 'MN', universities: ['University of Minnesota', 'Macalester College'] },
  { city: 'Portland', state: 'OR', universities: ['Portland State University', 'Reed College', 'University of Portland'] },
] as const

/** All major US metros with open data coverage */
export const MAJOR_CITIES = [
  { city: 'New York', state: 'NY', dataCoverage: true },
  { city: 'Los Angeles', state: 'CA', dataCoverage: true },
  { city: 'Chicago', state: 'IL', dataCoverage: true },
  { city: 'Houston', state: 'TX', dataCoverage: true },
  { city: 'Phoenix', state: 'AZ', dataCoverage: true },
  { city: 'Philadelphia', state: 'PA', dataCoverage: true },
  { city: 'San Antonio', state: 'TX', dataCoverage: true },
  { city: 'Dallas', state: 'TX', dataCoverage: true },
  { city: 'San Francisco', state: 'CA', dataCoverage: true },
  { city: 'Austin', state: 'TX', dataCoverage: true },
  { city: 'Columbus', state: 'OH', dataCoverage: true },
  { city: 'Charlotte', state: 'NC', dataCoverage: true },
  { city: 'Miami', state: 'FL', dataCoverage: true },
  { city: 'Atlanta', state: 'GA', dataCoverage: true },
  { city: 'Washington', state: 'DC', dataCoverage: true },
  { city: 'Boston', state: 'MA', dataCoverage: true },
  { city: 'Seattle', state: 'WA', dataCoverage: true },
  { city: 'Denver', state: 'CO', dataCoverage: true },
  { city: 'Nashville', state: 'TN', dataCoverage: true },
  { city: 'Detroit', state: 'MI', dataCoverage: true },
  { city: 'Baltimore', state: 'MD', dataCoverage: true },
  { city: 'Pittsburgh', state: 'PA', dataCoverage: true },
  { city: 'Portland', state: 'OR', dataCoverage: true },
  { city: 'Minneapolis', state: 'MN', dataCoverage: true },
] as const

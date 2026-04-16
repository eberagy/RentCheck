import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  Shield,
  ExternalLink,
  Scale,
  Home,
  AlertTriangle,
  DollarSign,
  Clock,
  FileText,
  ChevronRight,
  Info,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { US_STATES } from '@/types'

interface TenantRightsPageProps {
  params: { state: string }
}

// Tenant rights data — key state protections
const TENANT_RIGHTS: Record<
  string,
  {
    securityDeposit: string
    noticeToEnter: string
    repairsTimeline: string
    rentControl: string
    evictionNotice: string
    habitabilityLaw: string
    resources: { label: string; url: string }[]
    // Quick reference numbers
    depositLimit: string
    depositReturnDays: string
    noticeHours: string
    evictionDays: string
  }
> = {
  MD: {
    securityDeposit:
      'Maximum 2 months rent. Must be returned within 45 days of move-out with itemized list.',
    noticeToEnter:
      'Reasonable notice required (typically 24 hours). Emergency entry allowed.',
    repairsTimeline:
      'Landlord must make repairs within a reasonable time. "Rent escrow" available for serious defects.',
    rentControl:
      "No statewide rent control. Some local jurisdictions (Montgomery County, Prince George's County) have rent stabilization.",
    evictionNotice:
      'Non-payment: 10-day notice. Lease violation: 30-day notice. No-cause: 60-day notice (12+ month tenancies).',
    habitabilityLaw:
      'Maryland Code § 8-211: Landlord must maintain fit premises. Implied warranty of habitability.',
    resources: [
      { label: 'Maryland Legal Aid', url: 'https://www.mdlab.org' },
      {
        label: 'Maryland Attorney General - Landlord-Tenant',
        url: 'https://www.marylandattorneygeneral.gov/Pages/CPD/landlord.aspx',
      },
      { label: 'Baltimore City Housing Court', url: 'https://www.baltimorecity.gov/housing-courts' },
    ],
    depositLimit: '2 months rent',
    depositReturnDays: '45 days',
    noticeHours: '24 hours',
    evictionDays: '10 days (non-payment)',
  },
  PA: {
    securityDeposit:
      'First year: max 2 months rent. After first year: max 1 month. Must return within 30 days.',
    noticeToEnter: '24 hours advance notice required except in emergencies.',
    repairsTimeline:
      'Landlord must make repairs within a reasonable time after written notice.',
    rentControl: 'No statewide rent control in Pennsylvania.',
    evictionNotice:
      'Non-payment: 10-day notice. Lease violation: 15-day notice (monthly tenancy). No-cause: 15 days (monthly) or lease term.',
    habitabilityLaw:
      'Pennsylvania Landlord-Tenant Act (68 P.S. § 250.201 et seq.) and implied warranty of habitability.',
    resources: [
      { label: 'Pennsylvania Legal Aid Network', url: 'https://palawhelp.org' },
      {
        label: 'Philadelphia Tenant Rights',
        url: 'https://www.phila.gov/services/property-lots-housing/tenant-rights',
      },
      { label: 'Pittsburgh CLO Tenant Rights', url: 'https://clopgh.org/tenant-rights' },
    ],
    depositLimit: '2 months (yr 1), 1 month after',
    depositReturnDays: '30 days',
    noticeHours: '24 hours',
    evictionDays: '10 days (non-payment)',
  },
  SC: {
    securityDeposit:
      'No statutory limit on security deposits. Must return within 30 days after move-out.',
    noticeToEnter: '24 hours notice required except in emergencies.',
    repairsTimeline:
      'After written notice, landlord has 14 days to repair. Tenant may terminate after 14 days for serious defects.',
    rentControl: 'No rent control in South Carolina.',
    evictionNotice:
      'Non-payment: 5-day notice. Lease violation: 14-day notice. No-cause (month-to-month): 30-day notice.',
    habitabilityLaw:
      'South Carolina Residential Landlord-Tenant Act (S.C. Code Ann. § 27-40-10 et seq.).',
    resources: [
      { label: 'South Carolina Legal Services', url: 'https://www.sclegal.org' },
      {
        label: 'SC Attorney General Tenant Rights',
        url: 'https://www.scag.gov/protecting-south-carolinians/consumer-protection',
      },
    ],
    depositLimit: 'No statutory limit',
    depositReturnDays: '30 days',
    noticeHours: '24 hours',
    evictionDays: '5 days (non-payment)',
  },
  NY: {
    securityDeposit:
      'Maximum 1 month rent. Must return within 14 days after move-out with itemized statement.',
    noticeToEnter: '24 hours advance notice required.',
    repairsTimeline:
      'Emergency repairs: within 24 hours. Other repairs: reasonable time. Rent withholding allowed for serious violations.',
    rentControl:
      'NYC: Rent stabilization and rent control apply to many apartments. Statewide HSTPA 2019 protections.',
    evictionNotice:
      'Non-payment: 14-day notice (as of 2024). No-cause: 30 days (< 1 year), 60 days (1-2 years), 90 days (2+ years).',
    habitabilityLaw:
      'NYC Housing Maintenance Code, NY RPL §235-b implied warranty of habitability.',
    resources: [
      { label: 'NYC Tenant Rights (HCR)', url: 'https://hcr.ny.gov/tenant-rights' },
      { label: 'Met Council on Housing', url: 'https://metcouncilonhousing.org' },
      { label: 'Legal Aid Society NYC', url: 'https://legalaidnyc.org' },
    ],
    depositLimit: '1 month rent',
    depositReturnDays: '14 days',
    noticeHours: '24 hours',
    evictionDays: '14 days (non-payment)',
  },
  CA: {
    securityDeposit:
      'As of 2024: max 1 month rent for unfurnished, 2 months for furnished. Must return within 21 days.',
    noticeToEnter:
      '24 hours advance written notice required. 48 hours for final move-out inspection.',
    repairsTimeline:
      "Reasonable time after notice. Tenant may \"repair and deduct\" up to one month's rent.",
    rentControl:
      'AB 1482 (2020): statewide rent cap of 5% + CPI (max 10%) for most units built before 2005. Many cities have additional local control.',
    evictionNotice:
      'Non-payment: 3-day notice. Lease violation: 3-day notice to cure. No-cause: 30 days (< 1 year), 60 days (1+ year).',
    habitabilityLaw:
      'California Civil Code §1941-1942: warranty of habitability. Substandard housing provisions.',
    resources: [
      {
        label: 'California Courts Self-Help Center',
        url: 'https://www.courts.ca.gov/selfhelp-eviction.htm',
      },
      { label: 'Bay Area Legal Aid', url: 'https://baylegal.org' },
      { label: 'LA Tenant Protections', url: 'https://housing.lacity.gov/residents/tenant-protections' },
    ],
    depositLimit: '1 month (unfurnished)',
    depositReturnDays: '21 days',
    noticeHours: '24 hours',
    evictionDays: '3 days (non-payment)',
  },
  IL: {
    securityDeposit:
      'Chicago: must pay 5% interest if held > 6 months. No statewide limit but Chicago caps at none.',
    noticeToEnter:
      'No statewide statute; generally 24 hours. Chicago requires reasonable notice.',
    repairsTimeline:
      '14-day written notice for repairs. Chicago: repair-and-deduct allowed up to $500 or half monthly rent.',
    rentControl:
      'Chicago, Evanston, and other municipalities have rent stabilization. No statewide rent control.',
    evictionNotice:
      'Non-payment: 5-day notice. Lease violation: 10-day notice. No-cause: 30-day notice (month-to-month).',
    habitabilityLaw:
      'Chicago RLTO (MCC 5-12) — among strongest tenant protections in the US.',
    resources: [
      {
        label: 'Chicago Tenant Rights (RLTO)',
        url: 'https://www.chicago.gov/city/en/depts/doh/supp_info/rental_housing.html',
      },
      {
        label: 'Metropolitan Tenants Organization',
        url: 'https://www.tenants-rights.org',
      },
    ],
    depositLimit: 'No statewide limit',
    depositReturnDays: '30 days',
    noticeHours: '24 hours',
    evictionDays: '5 days (non-payment)',
  },
  TX: {
    securityDeposit:
      'No statutory limit. Must return within 30 days (or 60 days if forwarding address not provided).',
    noticeToEnter: 'Reasonable notice; no specific statute. Generally 24 hours.',
    repairsTimeline:
      'Tenant must give written notice. Landlord has "reasonable time" (7 days presumed for most repairs).',
    rentControl: 'Rent control prohibited by state law.',
    evictionNotice:
      'Non-payment or lease violation: 3-day notice. No-cause (month-to-month): 1 month notice.',
    habitabilityLaw:
      'Texas Property Code § 92.151-92.165: duty to repair and remedy conditions.',
    resources: [
      { label: 'Texas Law Help - Tenants', url: 'https://texaslawhelp.org/issues/housing' },
      { label: 'Austin Tenant Rights', url: 'https://www.austintexas.gov/page/tenant-rights' },
    ],
    depositLimit: 'No statutory limit',
    depositReturnDays: '30 days',
    noticeHours: '24 hours (customary)',
    evictionDays: '3 days (non-payment)',
  },
  WA: {
    securityDeposit: 'No statutory cap. Must return within 30 days with itemized deductions.',
    noticeToEnter: '2 days (48 hours) advance written notice required.',
    repairsTimeline:
      'Urgent repairs: landlord has 24 hours. Other repairs: 10 days after written notice.',
    rentControl:
      'No statewide rent control. Seattle has some protections (relocation assistance, etc.).',
    evictionNotice:
      'Non-payment: 14-day notice. Lease violation: 10-day notice. No-cause: 20 days (month-to-month).',
    habitabilityLaw:
      'Washington Residential Landlord-Tenant Act (RCW 59.18): comprehensive habitability protections.',
    resources: [
      { label: 'Washington Law Help', url: 'https://www.washingtonlawhelp.org' },
      { label: 'Seattle Office of Housing', url: 'https://www.seattle.gov/housing/renters' },
    ],
    depositLimit: 'No statutory cap',
    depositReturnDays: '30 days',
    noticeHours: '48 hours',
    evictionDays: '14 days (non-payment)',
  },
  MA: {
    securityDeposit:
      'Maximum 1 month rent. Must return within 30 days with itemized statement.',
    noticeToEnter: 'No specific statute; generally 24 hours. Emergency entry allowed.',
    repairsTimeline:
      'Emergency: 24 hours. Other conditions: reasonable time. Rent withholding allowed after written notice.',
    rentControl:
      'No statewide rent control (ban lifted 1994). Cambridge, Somerville exploring local options.',
    evictionNotice:
      'Non-payment: 14-day notice. Lease violation: 30-day notice. No-cause: 30 days or rental period.',
    habitabilityLaw:
      'Massachusetts Sanitary Code (105 CMR 410): detailed habitability standards.',
    resources: [
      { label: 'Greater Boston Legal Services', url: 'https://www.gbls.org' },
      { label: 'Massachusetts Attorney General', url: 'https://www.mass.gov/guides/tenant-rights' },
    ],
    depositLimit: '1 month rent',
    depositReturnDays: '30 days',
    noticeHours: '24 hours',
    evictionDays: '14 days (non-payment)',
  },
}

const DEFAULT_RIGHTS = {
  securityDeposit:
    'Varies by state. Most states require return within 30 days with itemized deductions.',
  noticeToEnter: 'Most states require 24-48 hours advance notice except in emergencies.',
  repairsTimeline:
    'Landlord must make repairs within a reasonable time after written notice.',
  rentControl: 'Most states do not have statewide rent control. Check local municipal laws.',
  evictionNotice:
    'Varies by state and reason. Non-payment typically requires 3-14 days notice.',
  habitabilityLaw:
    'All states have an implied warranty of habitability. Properties must be safe and livable.',
  resources: [
    {
      label: 'Legal Services Corporation',
      url: 'https://www.lsc.gov/about-lsc/what-legal-aid/get-legal-help',
    },
    {
      label: 'HUD Tenant Rights',
      url: 'https://www.hud.gov/topics/rental_assistance/tenantrights',
    },
    { label: 'National Housing Law Project', url: 'https://nhlp.org' },
  ],
  depositLimit: 'Varies by state',
  depositReturnDays: 'Typically 30 days',
  noticeHours: '24-48 hours',
  evictionDays: '3-14 days',
}

export async function generateMetadata({
  params,
}: TenantRightsPageProps): Promise<Metadata> {
  const p = await params
  const stateInfo = US_STATES.find(s => s.abbr.toLowerCase() === p.state.toLowerCase())
  if (!stateInfo) return { title: 'Tenant Rights | RentCheck' }
  return {
    title: `${stateInfo.name} Tenant Rights | RentCheck`,
    description: `Know your rights as a renter in ${stateInfo.name}. Security deposits, notice to enter, repairs, eviction protections, and legal resources.`,
  }
}

export default async function TenantRightsPage({ params }: TenantRightsPageProps) {
  const p = await params
  const stateAbbr = p.state.toUpperCase()
  const stateInfo = US_STATES.find(s => s.abbr === stateAbbr)
  if (!stateInfo) notFound()

  const rights = TENANT_RIGHTS[stateAbbr] ?? DEFAULT_RIGHTS
  const hasFullGuide = stateAbbr in TENANT_RIGHTS

  const sections = [
    {
      title: 'Security Deposit',
      icon: DollarSign,
      content: rights.securityDeposit,
      color: 'text-teal-700',
      bg: 'bg-teal-50',
      border: 'border-teal-200',
    },
    {
      title: 'Landlord Right to Enter',
      icon: Home,
      content: rights.noticeToEnter,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
    },
    {
      title: 'Repairs & Maintenance',
      icon: Clock,
      content: rights.repairsTimeline,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
    },
    {
      title: 'Rent Control',
      icon: Scale,
      content: rights.rentControl,
      color: 'text-purple-700',
      bg: 'bg-purple-50',
      border: 'border-purple-200',
    },
    {
      title: 'Eviction Notice Requirements',
      icon: AlertTriangle,
      content: rights.evictionNotice,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
    },
    {
      title: 'Habitability Law',
      icon: Shield,
      content: rights.habitabilityLaw,
      color: 'text-navy-700',
      bg: 'bg-navy-50',
      border: 'border-navy-200',
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1 text-xs text-gray-500 mb-6">
        <Link href="/" className="hover:text-navy-700 hover:underline transition-colors">
          Home
        </Link>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        <Link href="/rights" className="hover:text-navy-700 hover:underline transition-colors">
          Tenant Rights
        </Link>
        <ChevronRight className="h-3 w-3 text-gray-300" />
        <span className="text-gray-700 font-medium">{stateInfo.name}</span>
      </nav>

      {/* ── Page header ── */}
      <div className="flex items-start gap-4 mb-6">
        <div className="h-12 w-12 rounded-2xl bg-navy-100 flex items-center justify-center flex-shrink-0">
          <Shield className="h-6 w-6 text-navy-600" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-extrabold text-gray-900">
              {stateInfo.name} Tenant Rights
            </h1>
            {hasFullGuide && (
              <span className="text-xs bg-teal-100 text-teal-700 border border-teal-200 rounded-full px-2.5 py-0.5 font-semibold">
                Full Guide
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm mt-1">
            Renter protections in {stateInfo.name}. General information only — consult a local
            attorney for advice on your specific situation.
          </p>
        </div>
      </div>

      {/* General info banner for states without a full guide */}
      {!hasFullGuide && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6 text-sm text-amber-800">
          <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <span>
            A detailed guide for {stateInfo.name} is coming soon. The information below reflects
            general US tenant rights — check your local municipality for specific rules.
          </span>
        </div>
      )}

      {/* ── Quick Reference Card ── */}
      <div className="bg-navy-900 text-white rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="h-4 w-4 text-teal-400" />
          <p className="text-sm font-semibold text-teal-300 uppercase tracking-wider">
            Quick Reference
          </p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-navy-300 mb-1">Deposit Limit</p>
            <p className="text-sm font-bold text-white leading-snug">{rights.depositLimit}</p>
          </div>
          <div>
            <p className="text-xs text-navy-300 mb-1">Deposit Return</p>
            <p className="text-sm font-bold text-white leading-snug">{rights.depositReturnDays}</p>
          </div>
          <div>
            <p className="text-xs text-navy-300 mb-1">Entry Notice</p>
            <p className="text-sm font-bold text-white leading-snug">{rights.noticeHours}</p>
          </div>
          <div>
            <p className="text-xs text-navy-300 mb-1">Eviction Notice</p>
            <p className="text-sm font-bold text-white leading-snug">{rights.evictionDays}</p>
          </div>
        </div>
      </div>

      {/* ── Rights sections ── */}
      <div className="space-y-3 mb-8">
        {sections.map(({ title, icon: Icon, content, color, bg, border }) => (
          <Card key={title} className={`border ${border} shadow-none`}>
            <CardHeader className="pb-2 pt-4 px-5">
              <CardTitle className={`text-sm font-semibold flex items-center gap-2.5 ${color}`}>
                <div
                  className={`h-8 w-8 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}
                >
                  <Icon className="h-4 w-4" />
                </div>
                {title}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4">
              <p className="text-sm text-gray-700 leading-relaxed">{content}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Legal Resources ── */}
      <Card className="border-navy-200 bg-navy-50 mb-8 shadow-none">
        <CardHeader className="pb-3 px-5 pt-5">
          <CardTitle className="text-sm font-bold text-navy-900 flex items-center gap-2">
            <ExternalLink className="h-4 w-4" />
            Legal Resources in {stateInfo.name}
          </CardTitle>
        </CardHeader>
        <CardContent className="px-5 pb-5">
          <ul className="space-y-2.5">
            {rights.resources.map(r => (
              <li key={r.url}>
                <a
                  href={r.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-navy-700 hover:text-navy-900 hover:underline transition-colors"
                >
                  <ExternalLink className="h-3.5 w-3.5 flex-shrink-0" />
                  {r.label}
                </a>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {/* ── Browse other states ── */}
      <div>
        <p className="text-sm font-semibold text-gray-700 mb-3">Browse other states</p>
        <div className="flex flex-wrap gap-2">
          {US_STATES.slice(0, 20).map(s => (
            <Link
              key={s.abbr}
              href={`/rights/${s.abbr.toLowerCase()}`}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                s.abbr === stateAbbr
                  ? 'bg-navy-700 text-white border-navy-700'
                  : 'border-gray-200 text-gray-700 hover:border-navy-300 hover:text-navy-700 bg-white'
              }`}
            >
              {s.abbr}
            </Link>
          ))}
          <Link
            href="/rights"
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:border-navy-300 hover:text-navy-700 bg-white font-medium transition-colors"
          >
            All states →
          </Link>
        </div>
      </div>
    </div>
  )
}

/**
 * Per-source raw_data → normalized RecordDetails extractor.
 *
 * The public_records table stores the upstream Socrata/CKAN/ArcGIS payload
 * verbatim in raw_data. This module pulls out the fields the user UI cares
 * about (apartment, due dates, inspector comments, citation links, etc.)
 * so the records panel can render rich detail without each component
 * relearning the per-city schema.
 *
 * Sources covered (live counts as of 2026-05-04):
 *   nyc_hpd 192k, nyc_dob 101k, seattle_sdci 101k, dallas_code 98k,
 *   kansas_city_code 57k, nyc_marshals 24k, chicago_buildings 11k,
 *   pittsburgh_pli 10k, sf_housing 6k, boston_isd 5k, austin_code 4k,
 *   baltimore_vacants 84.
 */

export interface RecordDetails {
  /** Unit / apartment number when known. */
  apartment?: string | null
  /** Building / structure identifier (NYC BIN, Boston SAM ID, etc.). */
  buildingId?: string | null
  /** NYC borough-block-lot reference. */
  bbl?: string | null
  /** Borough or municipality (NYC: MANHATTAN/BROOKLYN/etc; other: city name). */
  borough?: string | null
  /** Neighborhood (NTA, council district, ward, etc. — source-specific label). */
  neighborhood?: string | null
  /** Council / community district number. */
  councilDistrict?: string | null
  /** Notice / NOV / docket / case identifier the city assigns. */
  caseId?: string | null
  /** When the inspection happened. */
  inspectionDate?: string | null
  /** When the violation notice was issued (often after the inspection). */
  noticeIssuedDate?: string | null
  /** When the city expects the issue to be corrected. Past = overdue. */
  correctByDate?: string | null
  /** When the landlord must certify the correction. */
  certifyByDate?: string | null
  /** Last-modified / status update timestamp. */
  statusUpdatedDate?: string | null
  /** Days the case has been open (when the source ships it). */
  daysOpen?: number | null
  /** Specific code section / ordinance the violation cites. */
  ordinanceCode?: string | null
  /** Inspector's free-text comments. */
  inspectorComments?: string | null
  /** Whether this violation is "rent-impairing" (NYC HPD specific). */
  rentImpairing?: boolean
  /** Whether this is a residential or commercial proceeding (NYC marshals). */
  residential?: boolean | null
  /** True if the city's own status string represents an open issue. */
  isOpen?: boolean
  /** A working URL to the citation on the city's portal, if we can build one. */
  citationLink?: string | null
  /** Marshal/judge/inspector name. */
  agent?: string | null
}

type RawData = Record<string, unknown> | null | undefined

const str = (raw: RawData, key: string): string | null => {
  if (!raw) return null
  const v = (raw as Record<string, unknown>)[key]
  if (typeof v === 'string') return v.trim() || null
  if (typeof v === 'number') return String(v)
  return null
}

const num = (raw: RawData, key: string): number | null => {
  const v = str(raw, key)
  if (!v) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

const yesno = (raw: RawData, key: string): boolean | undefined => {
  const v = str(raw, key)
  if (!v) return undefined
  const u = v.toUpperCase()
  if (u === 'Y' || u === 'YES' || u === 'TRUE' || u === '1') return true
  if (u === 'N' || u === 'NO' || u === 'FALSE' || u === '0') return false
  return undefined
}

const titleCase = (s: string): string =>
  s.toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

/**
 * Pull normalized detail fields out of raw_data based on `source`.
 * Always returns an object — fields the source doesn't ship are
 * left undefined.
 */
export function extractRecordDetails(
  source: string | null | undefined,
  raw: RawData,
): RecordDetails {
  if (!raw) return {}
  switch (source) {
    case 'nyc_hpd': {
      const buildingId = str(raw, 'buildingid')
      const bbl = str(raw, 'bbl')
      const novId = str(raw, 'novid') ?? str(raw, 'violationid')
      const status = str(raw, 'currentstatus') ?? str(raw, 'violationstatus')
      const isOpen = !!status && !/close|dismiss|complied|certif/i.test(status)
      // HPD has a public building page keyed by BIN — works for any address.
      const citationLink = buildingId
        ? `https://hpdonline.nyc.gov/hpdonline/building/${buildingId}/violations`
        : null
      return {
        apartment: str(raw, 'apartment'),
        buildingId,
        bbl,
        borough: str(raw, 'boro'),
        neighborhood: str(raw, 'nta'),
        councilDistrict: str(raw, 'councildistrict') ?? str(raw, 'communityboard'),
        caseId: novId,
        inspectionDate: str(raw, 'inspectiondate'),
        noticeIssuedDate: str(raw, 'novissueddate'),
        correctByDate: str(raw, 'newcorrectbydate') ?? str(raw, 'originalcorrectbydate'),
        certifyByDate: str(raw, 'newcertifybydate') ?? str(raw, 'originalcertifybydate'),
        statusUpdatedDate: str(raw, 'currentstatusdate'),
        rentImpairing: yesno(raw, 'rentimpairing'),
        isOpen,
        citationLink,
      }
    }
    case 'nyc_dob': {
      const bin = str(raw, 'bin')
      const complaintNumber = str(raw, 'complaint_number')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|resolve|dismiss/i.test(status)
      const citationLink = complaintNumber
        ? `https://a810-bisweb.nyc.gov/bisweb/OverviewForComplaintServlet?complaintno=${complaintNumber}`
        : bin ? `https://a810-bisweb.nyc.gov/bisweb/PropertyProfileOverviewServlet?bin=${bin}` : null
      return {
        apartment: str(raw, 'unit'),
        buildingId: bin,
        borough: null,
        neighborhood: str(raw, 'community_board'),
        caseId: complaintNumber,
        inspectionDate: str(raw, 'inspection_date'),
        statusUpdatedDate: str(raw, 'disposition_date'),
        ordinanceCode: str(raw, 'disposition_code'),
        isOpen,
        citationLink,
      }
    }
    case 'nyc_marshals': {
      const docket = str(raw, 'docket_number')
      const courtIndex = str(raw, 'court_index_number')
      const bbl = str(raw, 'bbl')
      const bin = str(raw, 'bin')
      const first = str(raw, 'marshal_first_name')
      const last = str(raw, 'marshal_last_name')
      const agent = first && last ? `Marshal ${first} ${last}` : null
      const resi = str(raw, 'residential_commercial_ind')
      // Executed evictions are completed events, not open issues.
      return {
        apartment: str(raw, 'eviction_apt_num'),
        buildingId: bin,
        bbl,
        borough: str(raw, 'borough'),
        neighborhood: str(raw, 'nta'),
        councilDistrict: str(raw, 'council_district') ?? str(raw, 'community_board'),
        caseId: courtIndex ?? docket,
        statusUpdatedDate: str(raw, 'executed_date'),
        // NYC's published values are 'Residential' / 'Commercial' but
        // case may shift if Tyler ever normalizes the upstream — match
        // case-insensitively so a one-character drift doesn't flip the
        // chip from residential to commercial.
        residential: resi != null ? resi.toLowerCase() === 'residential' : null,
        agent,
        isOpen: false,
      }
    }
    case 'chicago_buildings': {
      const id = str(raw, 'id')
      const status = str(raw, 'violation_status')
      const isOpen = !!status && !/close|complied|complete/i.test(status)
      return {
        apartment: null,
        buildingId: null,
        borough: 'Chicago',
        neighborhood: str(raw, 'property_group'),
        caseId: id,
        inspectionDate: null,
        noticeIssuedDate: str(raw, 'violation_date'),
        statusUpdatedDate: str(raw, 'violation_status_date') ?? str(raw, 'violation_last_modified_date'),
        ordinanceCode: str(raw, 'violation_code') ?? str(raw, 'violation_ordinance'),
        inspectorComments: str(raw, 'violation_inspector_comments'),
        isOpen,
        citationLink: id ? `https://data.cityofchicago.org/Buildings/Building-Violations/22u3-xenr/${id}` : null,
      }
    }
    case 'pittsburgh_pli': {
      const docket = str(raw, 'docket_number')
      const casefile = str(raw, 'casefile_number')
      const decision = str(raw, 'court_decision')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|complied|paid|satisfied/i.test(status)
      return {
        borough: 'Pittsburgh',
        caseId: docket ?? casefile,
        inspectionDate: str(raw, 'investigation_date'),
        ordinanceCode: str(raw, 'violation_code_section_title'),
        inspectorComments: str(raw, 'investigation_findings'),
        isOpen,
        citationLink: null,
        agent: decision ? `Court: ${decision}` : null,
      }
    }
    case 'philadelphia': {
      const casenumber = str(raw, 'casenumber')
      const status = str(raw, 'casestatus') ?? str(raw, 'status')
      const isOpen = !!status && !/close|complied|resolved/i.test(status)
      return {
        borough: 'Philadelphia',
        caseId: casenumber,
        ordinanceCode: str(raw, 'aptype'),
        noticeIssuedDate: str(raw, 'violationdate'),
        statusUpdatedDate: str(raw, 'caseresolutiondate'),
        isOpen,
        citationLink: casenumber ? `https://li.phila.gov/violations/${casenumber}` : null,
        agent: str(raw, 'organization'),
      }
    }
    case 'austin_code': {
      const id = str(raw, 'case_id')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|resolved|complete/i.test(status)
      const link = str(raw, 'violationcaselink')
      return {
        borough: 'Austin',
        caseId: id ?? str(raw, 'servicerequestnumber'),
        ordinanceCode: str(raw, 'case_type'),
        noticeIssuedDate: str(raw, 'opened_date'),
        statusUpdatedDate: str(raw, 'date_updated'),
        agent: str(raw, 'inspector'),
        isOpen,
        citationLink: link,
      }
    }
    case 'seattle_sdci': {
      const recordnum = str(raw, 'recordnum')
      const status = str(raw, 'statuscurrent')
      const isOpen = !!status && !/close|complete|resolved/i.test(status)
      return {
        borough: 'Seattle',
        caseId: recordnum,
        inspectionDate: str(raw, 'lastinspdate'),
        noticeIssuedDate: str(raw, 'opendate'),
        ordinanceCode: str(raw, 'recordtypedesc') ?? str(raw, 'recordtype'),
        isOpen,
        citationLink: str(raw, 'link'),
      }
    }
    case 'dallas_code': {
      const type = str(raw, 'type')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|complete/i.test(status)
      return {
        borough: 'Dallas',
        ordinanceCode: type,
        noticeIssuedDate: str(raw, 'created'),
        statusUpdatedDate: str(raw, 'updated'),
        isOpen,
        citationLink: null,
      }
    }
    case 'kansas_city_code': {
      const id = str(raw, 'case_id')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|complete/i.test(status)
      return {
        borough: 'Kansas City',
        neighborhood: str(raw, 'neighborhood'),
        councilDistrict: str(raw, 'council_district'),
        caseId: id,
        ordinanceCode: str(raw, 'violation_code') ?? str(raw, 'ordinance'),
        noticeIssuedDate: str(raw, 'violation_entry_date') ?? str(raw, 'case_opened'),
        daysOpen: num(raw, 'days_open'),
        statusUpdatedDate: str(raw, 'case_closed'),
        isOpen,
      }
    }
    case 'boston_isd': {
      const caseNo = str(raw, 'case_no') ?? str(raw, 'sam_id')
      const status = str(raw, 'status')
      const isOpen = !!status && !/close|complete/i.test(status)
      return {
        borough: titleCase(str(raw, 'violation_city') ?? 'Boston'),
        neighborhood: str(raw, 'ward'),
        caseId: caseNo,
        ordinanceCode: str(raw, 'code'),
        statusUpdatedDate: str(raw, 'status_dttm'),
        isOpen,
      }
    }
    case 'baltimore_vacants': {
      return {
        borough: 'Baltimore',
        neighborhood: str(raw, 'Neighborhood'),
        bbl: str(raw, 'BLOCKLOT'),
        caseId: str(raw, 'NoticeNum'),
        noticeIssuedDate: str(raw, 'DateNotice'),
        statusUpdatedDate: str(raw, 'DateAbate'),
        agent: str(raw, 'OWNER_ABBR'),
        isOpen: !str(raw, 'DateAbate'),
      }
    }
    case 'sf_housing': {
      const permitNumber = str(raw, 'permit_number')
      const status = str(raw, 'status')
      const isOpen = !!status && !/complete|approved|issued/i.test(status)
      return {
        apartment: str(raw, 'unit'),
        borough: 'San Francisco',
        neighborhood: str(raw, 'neighborhoods_analysis_boundaries'),
        councilDistrict: str(raw, 'supervisor_district'),
        caseId: permitNumber,
        ordinanceCode: str(raw, 'permit_type_definition') ?? str(raw, 'permit_type'),
        noticeIssuedDate: str(raw, 'filed_date') ?? str(raw, 'permit_creation_date'),
        statusUpdatedDate: str(raw, 'status_date'),
        isOpen,
      }
    }
    default:
      return {
        caseId: str(raw, 'case_number') ?? str(raw, 'case_id') ?? str(raw, 'id'),
        noticeIssuedDate: str(raw, 'date_filed') ?? str(raw, 'opened_date') ?? str(raw, 'created_date'),
        ordinanceCode: str(raw, 'violation_code') ?? str(raw, 'case_type'),
      }
  }
}

import { describe, it, expect } from 'vitest'
import { extractRecordDetails } from './extract'

describe('extractRecordDetails', () => {
  it('returns empty object when raw_data is null/undefined', () => {
    expect(extractRecordDetails('nyc_hpd', null)).toEqual({})
    expect(extractRecordDetails('nyc_hpd', undefined)).toEqual({})
  })

  it('returns empty object for unknown source with empty raw', () => {
    expect(extractRecordDetails('mars_violations', {})).toEqual({
      caseId: null,
      noticeIssuedDate: null,
      ordinanceCode: null,
    })
  })

  describe('nyc_hpd', () => {
    it('extracts the canonical fields from a real HPD payload', () => {
      const raw = {
        bbl: '5011580063',
        boro: 'STATEN ISLAND',
        novid: '10318628',
        apartment: '1F',
        buildingid: '989969',
        currentstatus: 'NOV SENT OUT',
        novissueddate: '2026-03-11T00:00:00.000',
        rentimpairing: 'N',
        inspectiondate: '2026-02-24T00:00:00.000',
        originalcorrectbydate: '2026-04-15T00:00:00.000',
        originalcertifybydate: '2026-04-29T00:00:00.000',
        nta: "Mariner's Harbor-Arlington-Graniteville",
        councildistrict: '49',
        currentstatusdate: '2026-03-11T00:00:00.000',
      }
      const d = extractRecordDetails('nyc_hpd', raw)
      expect(d.apartment).toBe('1F')
      expect(d.buildingId).toBe('989969')
      expect(d.bbl).toBe('5011580063')
      expect(d.borough).toBe('STATEN ISLAND')
      expect(d.caseId).toBe('10318628')
      expect(d.correctByDate).toBe('2026-04-15T00:00:00.000')
      expect(d.rentImpairing).toBe(false)
      expect(d.isOpen).toBe(true)
      expect(d.citationLink).toBe('https://hpdonline.nyc.gov/hpdonline/building/989969/violations')
    })

    it('marks closed/dismissed/complied violations as not open', () => {
      const close = extractRecordDetails('nyc_hpd', { currentstatus: 'VIOLATION CLOSED' })
      expect(close.isOpen).toBe(false)
      const dismiss = extractRecordDetails('nyc_hpd', { currentstatus: 'DISMISSED' })
      expect(dismiss.isOpen).toBe(false)
      const certif = extractRecordDetails('nyc_hpd', { currentstatus: 'NOV CERTIFIED LATE' })
      expect(certif.isOpen).toBe(false)
    })

    it('parses rentimpairing Y as true', () => {
      const d = extractRecordDetails('nyc_hpd', { rentimpairing: 'Y' })
      expect(d.rentImpairing).toBe(true)
    })

    it('returns null citationLink when buildingid is missing', () => {
      const d = extractRecordDetails('nyc_hpd', { novid: '123' })
      expect(d.citationLink).toBeNull()
    })
  })

  describe('nyc_marshals', () => {
    it('always reports isOpen=false (executed evictions are completed)', () => {
      const d = extractRecordDetails('nyc_marshals', {
        court_index_number: 'L&T-12345/2026',
        executed_date: '2026-04-01',
        residential_commercial_ind: 'Residential',
        marshal_first_name: 'John',
        marshal_last_name: 'Doe',
      })
      expect(d.isOpen).toBe(false)
      expect(d.caseId).toBe('L&T-12345/2026')
      expect(d.agent).toBe('Marshal John Doe')
      expect(d.residential).toBe(true)
    })

    it('matches residential/commercial case-insensitively', () => {
      // Upstream value drift shouldn't flip the chip
      expect(extractRecordDetails('nyc_marshals', { residential_commercial_ind: 'RESIDENTIAL' }).residential).toBe(true)
      expect(extractRecordDetails('nyc_marshals', { residential_commercial_ind: 'residential' }).residential).toBe(true)
      expect(extractRecordDetails('nyc_marshals', { residential_commercial_ind: 'Commercial' }).residential).toBe(false)
      expect(extractRecordDetails('nyc_marshals', { residential_commercial_ind: 'COMMERCIAL' }).residential).toBe(false)
    })

    it('residential is null when the field is missing', () => {
      const d = extractRecordDetails('nyc_marshals', { docket_number: 'X' })
      expect(d.residential).toBeNull()
    })
  })

  describe('chicago_buildings', () => {
    it('builds a citationLink when id is present', () => {
      const d = extractRecordDetails('chicago_buildings', {
        id: 'AB-123',
        violation_status: 'OPEN',
        violation_inspector_comments: 'Broken handrail',
      })
      expect(d.borough).toBe('Chicago')
      expect(d.isOpen).toBe(true)
      expect(d.inspectorComments).toBe('Broken handrail')
      expect(d.citationLink).toBe('https://data.cityofchicago.org/Buildings/Building-Violations/22u3-xenr/AB-123')
    })

    it('treats COMPLIED as closed', () => {
      const d = extractRecordDetails('chicago_buildings', { violation_status: 'COMPLIED WITH' })
      expect(d.isOpen).toBe(false)
    })
  })

  describe('boston_isd', () => {
    it('title-cases the violation_city for the borough chip', () => {
      const d = extractRecordDetails('boston_isd', {
        violation_city: 'BOSTON',
        case_no: 'V-2026-001',
        status: 'Open',
      })
      expect(d.borough).toBe('Boston')
      expect(d.caseId).toBe('V-2026-001')
    })

    it('falls back to "Boston" when violation_city is missing', () => {
      const d = extractRecordDetails('boston_isd', { case_no: 'X' })
      expect(d.borough).toBe('Boston')
    })
  })

  describe('baltimore_vacants', () => {
    it('isOpen tracks the absence of DateAbate', () => {
      const open = extractRecordDetails('baltimore_vacants', { NoticeNum: '1', BLOCKLOT: '0001 001' })
      expect(open.isOpen).toBe(true)
      const closed = extractRecordDetails('baltimore_vacants', { NoticeNum: '1', DateAbate: '2026-01-01' })
      expect(closed.isOpen).toBe(false)
    })
  })

  describe('philadelphia', () => {
    it('builds the LI portal link', () => {
      const d = extractRecordDetails('philadelphia', { casenumber: 'CV-2026-1' })
      expect(d.citationLink).toBe('https://li.phila.gov/violations/CV-2026-1')
    })
  })

  describe('nyc_dob', () => {
    it('builds the BIS portal link from the complaint number', () => {
      const d = extractRecordDetails('nyc_dob', {
        complaint_number: '4567890',
        bin: '1010101',
        status: 'OPEN',
      })
      expect(d.caseId).toBe('4567890')
      expect(d.citationLink).toBe('https://a810-bisweb.nyc.gov/bisweb/OverviewForComplaintServlet?complaintno=4567890')
      expect(d.isOpen).toBe(true)
    })

    it('falls back to BIN-based link when complaint_number missing', () => {
      const d = extractRecordDetails('nyc_dob', { bin: '1010101' })
      expect(d.citationLink).toBe('https://a810-bisweb.nyc.gov/bisweb/PropertyProfileOverviewServlet?bin=1010101')
    })
  })

  describe('pittsburgh_pli', () => {
    it('reports court_decision through agent', () => {
      const d = extractRecordDetails('pittsburgh_pli', {
        docket_number: 'D-2026-1',
        court_decision: 'GUILTY',
        status: 'OPEN',
      })
      expect(d.borough).toBe('Pittsburgh')
      expect(d.caseId).toBe('D-2026-1')
      expect(d.agent).toBe('Court: GUILTY')
    })

    it('treats SATISFIED as closed', () => {
      const d = extractRecordDetails('pittsburgh_pli', { status: 'SATISFIED' })
      expect(d.isOpen).toBe(false)
    })
  })

  describe('austin_code', () => {
    it('uses the violationcaselink for the citation link', () => {
      const d = extractRecordDetails('austin_code', {
        case_id: 'A-1',
        violationcaselink: 'https://austin/case/A-1',
        status: 'OPEN',
      })
      expect(d.citationLink).toBe('https://austin/case/A-1')
      expect(d.caseId).toBe('A-1')
    })
  })

  describe('seattle_sdci', () => {
    it('extracts open record + citation link', () => {
      const d = extractRecordDetails('seattle_sdci', {
        recordnum: 'S-1',
        statuscurrent: 'In Progress',
        link: 'https://sdci/S-1',
      })
      expect(d.borough).toBe('Seattle')
      expect(d.isOpen).toBe(true)
      expect(d.citationLink).toBe('https://sdci/S-1')
    })
  })

  describe('dallas_code', () => {
    it('uses type as ordinanceCode', () => {
      const d = extractRecordDetails('dallas_code', { type: 'TALL_GRASS', status: 'OPEN' })
      expect(d.borough).toBe('Dallas')
      expect(d.ordinanceCode).toBe('TALL_GRASS')
      expect(d.isOpen).toBe(true)
    })
  })

  describe('kansas_city_code', () => {
    it('parses days_open as a number', () => {
      const d = extractRecordDetails('kansas_city_code', {
        case_id: 'KC-1',
        days_open: '42',
        status: 'OPEN',
      })
      expect(d.daysOpen).toBe(42)
      expect(d.borough).toBe('Kansas City')
    })
  })

  describe('sf_housing', () => {
    it('uses permit_number as case id and matches "issued" as closed', () => {
      const open = extractRecordDetails('sf_housing', { permit_number: 'P-1', status: 'IN PROGRESS' })
      expect(open.caseId).toBe('P-1')
      expect(open.borough).toBe('San Francisco')
      expect(open.isOpen).toBe(true)

      const issued = extractRecordDetails('sf_housing', { permit_number: 'P-2', status: 'ISSUED' })
      expect(issued.isOpen).toBe(false)
    })
  })
})

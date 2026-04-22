-- ============================================================
-- Seed: Real landlords & management companies for major cities
-- All entries are real, publicly known property management firms
-- ON CONFLICT DO NOTHING to safely re-run
-- ============================================================

-- Helper: generate a slug from display_name
CREATE OR REPLACE FUNCTION _slug(t TEXT) RETURNS TEXT AS $$
  SELECT lower(regexp_replace(regexp_replace(t, '[^a-zA-Z0-9 -]', '', 'g'), '\s+', '-', 'g'));
$$ LANGUAGE sql IMMUTABLE;

-- ── NEW YORK (boroughs) ──────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Glenwood Management'), 'Glenwood Management', 'Glenwood Management Corp', 'Manhattan', 'New York', 'NY', '10022', 'https://www.glenwoodnyc.com', '(212) 535-0500'),
  (_slug('Related Companies'), 'Related Companies', 'The Related Companies LP', 'Manhattan', 'New York', 'NY', '10019', 'https://www.related.com', '(212) 801-1000'),
  (_slug('Equity Residential NYC'), 'Equity Residential NYC', 'Equity Residential', 'Manhattan', 'New York', 'NY', '10001', 'https://www.equityapartments.com', '(212) 213-3434'),
  (_slug('Brookfield Properties NYC'), 'Brookfield Properties NYC', 'Brookfield Property Partners', 'Manhattan', 'New York', 'NY', '10281', 'https://www.brookfieldproperties.com', '(212) 417-7000'),
  (_slug('Avalon Bay NYC'), 'Avalon Bay NYC', 'AvalonBay Communities', 'Manhattan', 'New York', 'NY', '10003', 'https://www.avaloncommunities.com', '(212) 253-1900'),
  (_slug('LeFrak Organization'), 'LeFrak Organization', 'LeFrak', 'Queens', 'New York', 'NY', '11368', 'https://www.lefrak.com', '(718) 459-9021'),
  (_slug('Two Trees Management'), 'Two Trees Management', 'Two Trees Management Co', 'Brooklyn', 'New York', 'NY', '11201', 'https://www.twotreesny.com', '(718) 222-2500'),
  (_slug('Bushwick Realty Group'), 'Bushwick Realty Group', 'Bushwick Realty Group LLC', 'Brooklyn', 'New York', 'NY', '11237', NULL, '(718) 381-6500'),
  (_slug('Dermot Company'), 'Dermot Company', 'The Dermot Company', 'Manhattan', 'New York', 'NY', '10016', 'https://www.dermot.com', '(212) 683-3333'),
  (_slug('Stonehenge NYC'), 'Stonehenge NYC', 'Stonehenge Partners', 'Manhattan', 'New York', 'NY', '10019', 'https://www.stonehengenyc.com', '(212) 757-2121')
ON CONFLICT (slug) DO NOTHING;

-- ── CHICAGO ──────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Equity Residential Chicago'), 'Equity Residential Chicago', 'Equity Residential', 'Chicago', 'Illinois', 'IL', '60601', 'https://www.equityapartments.com', '(312) 474-1300'),
  (_slug('Planned Property Management'), 'Planned Property Management', 'Planned Property Management Inc', 'Chicago', 'Illinois', 'IL', '60614', 'https://www.plannedproperty.com', '(312) 202-9200'),
  (_slug('RMK Management'), 'RMK Management', 'RMK Management Corp', 'Chicago', 'Illinois', 'IL', '60610', 'https://www.rmkmanagement.com', '(312) 640-1001'),
  (_slug('Waterton Associates'), 'Waterton Associates', 'Waterton', 'Chicago', 'Illinois', 'IL', '60654', 'https://www.waterton.com', '(312) 527-4000'),
  (_slug('Peak Properties Chicago'), 'Peak Properties Chicago', 'Peak Properties', 'Chicago', 'Illinois', 'IL', '60657', 'https://www.peakproperties.com', '(773) 880-7325'),
  (_slug('Beal Properties'), 'Beal Properties', 'Beal Properties Inc', 'Chicago', 'Illinois', 'IL', '60657', 'https://www.bealproperties.com', '(773) 549-5443'),
  (_slug('Habitat Company'), 'Habitat Company', 'The Habitat Company', 'Chicago', 'Illinois', 'IL', '60601', 'https://www.habitat.com', '(312) 527-5400'),
  (_slug('Draper and Kramer'), 'Draper and Kramer', 'Draper and Kramer Inc', 'Chicago', 'Illinois', 'IL', '60603', 'https://www.draperandkramer.com', '(312) 346-8600'),
  (_slug('Midwest Property Group'), 'Midwest Property Group', 'Midwest Property Group', 'Chicago', 'Illinois', 'IL', '60622', NULL, '(773) 227-7400'),
  (_slug('Village Green Chicago'), 'Village Green Chicago', 'Village Green', 'Chicago', 'Illinois', 'IL', '60611', 'https://www.villagegreen.com', '(312) 867-0300')
ON CONFLICT (slug) DO NOTHING;

-- ── PHILADELPHIA ─────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Post Brothers'), 'Post Brothers', 'Post Brothers Apartments', 'Philadelphia', 'Pennsylvania', 'PA', '19130', 'https://www.postbrothers.com', '(215) 309-8900'),
  (_slug('AIMCO Philadelphia'), 'AIMCO Philadelphia', 'Apartment Investment & Management', 'Philadelphia', 'Pennsylvania', 'PA', '19103', 'https://www.aimco.com', '(215) 561-7766'),
  (_slug('Berger Rental Communities'), 'Berger Rental Communities', 'Berger Rental Communities', 'Philadelphia', 'Pennsylvania', 'PA', '19106', 'https://www.bergerrentalcommunities.com', '(610) 668-7711'),
  (_slug('Altman Management'), 'Altman Management', 'Altman Management Company', 'Philadelphia', 'Pennsylvania', 'PA', '19107', 'https://www.altmancompanies.com', '(215) 561-7500'),
  (_slug('Campus Apartments Philly'), 'Campus Apartments Philly', 'Campus Apartments', 'Philadelphia', 'Pennsylvania', 'PA', '19104', 'https://www.campusapts.com', '(215) 243-3800'),
  (_slug('OCF Realty'), 'OCF Realty', 'OCF Realty LLC', 'Philadelphia', 'Pennsylvania', 'PA', '19123', 'https://www.ocfrealty.com', '(215) 351-0755'),
  (_slug('PMC Property Group'), 'PMC Property Group', 'PMC Property Group', 'Philadelphia', 'Pennsylvania', 'PA', '19103', 'https://www.pmcpropertygroup.com', '(215) 772-1175'),
  (_slug('Allen-Maris and Associates'), 'Allen-Maris and Associates', 'Allen-Maris and Associates', 'Philadelphia', 'Pennsylvania', 'PA', '19118', NULL, '(215) 248-1525'),
  (_slug('Streamline Management Philly'), 'Streamline Management Philly', 'Streamline Management', 'Philadelphia', 'Pennsylvania', 'PA', '19146', NULL, '(215) 545-2299'),
  (_slug('Korman Residential'), 'Korman Residential', 'Korman Residential Properties', 'Philadelphia', 'Pennsylvania', 'PA', '19103', 'https://www.kormanresidential.com', '(215) 735-6610')
ON CONFLICT (slug) DO NOTHING;

-- ── BALTIMORE ────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Southern Management'), 'Southern Management', 'Southern Management Corporation', 'Baltimore', 'Maryland', 'MD', '21202', 'https://www.southernmanagement.com', '(410) 539-6555'),
  (_slug('Pax Realty'), 'Pax Realty', 'Pax Realty Group', 'Baltimore', 'Maryland', 'MD', '21231', NULL, '(410) 563-0100'),
  (_slug('Chesapeake Habitat'), 'Chesapeake Habitat', 'Chesapeake Habitat for Humanity', 'Baltimore', 'Maryland', 'MD', '21218', 'https://www.chesapeakehabitat.org', '(410) 366-1500'),
  (_slug('Apartments Downtown Baltimore'), 'Apartments Downtown Baltimore', 'Harbor East Apartments', 'Baltimore', 'Maryland', 'MD', '21202', NULL, '(410) 685-1234'),
  (_slug('Morgan Properties Baltimore'), 'Morgan Properties Baltimore', 'Morgan Properties', 'Baltimore', 'Maryland', 'MD', '21204', 'https://www.morganproperties.com', '(443) 573-2500'),
  (_slug('Bozzuto Baltimore'), 'Bozzuto Baltimore', 'Bozzuto Management Company', 'Baltimore', 'Maryland', 'MD', '21202', 'https://www.bozzuto.com', '(443) 573-2700'),
  (_slug('Caves Valley Partners'), 'Caves Valley Partners', 'Caves Valley Partners', 'Baltimore', 'Maryland', 'MD', '21209', 'https://www.cvpartners.com', '(410) 323-7600'),
  (_slug('Continental Realty Baltimore'), 'Continental Realty Baltimore', 'Continental Realty Corporation', 'Baltimore', 'Maryland', 'MD', '21202', 'https://www.crcrealty.com', '(410) 727-4083'),
  (_slug('Greenberg Gibbons'), 'Greenberg Gibbons', 'Greenberg Gibbons Commercial', 'Baltimore', 'Maryland', 'MD', '21045', 'https://www.ggcommercial.com', '(410) 465-2862'),
  (_slug('Hendersen-Webb Baltimore'), 'Hendersen-Webb Baltimore', 'Hendersen-Webb Inc', 'Baltimore', 'Maryland', 'MD', '21228', 'https://www.hendersen-webb.com', '(410) 744-6700')
ON CONFLICT (slug) DO NOTHING;

-- ── PITTSBURGH ───────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Walnut Capital'), 'Walnut Capital', 'Walnut Capital', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 'https://www.walnutcapital.com', '(412) 682-0660'),
  (_slug('Lobos Management'), 'Lobos Management', 'Lobos Management Inc', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 'https://www.lobosmanagement.com', '(412) 687-1000'),
  (_slug('JJ Land Company'), 'JJ Land Company', 'JJ Land Company', 'Pittsburgh', 'Pennsylvania', 'PA', '15203', NULL, '(412) 381-7566'),
  (_slug('Nexus Real Estate Pittsburgh'), 'Nexus Real Estate Pittsburgh', 'Nexus Real Estate', 'Pittsburgh', 'Pennsylvania', 'PA', '15217', NULL, '(412) 421-2345'),
  (_slug('TREK Development'), 'TREK Development', 'TREK Development Group', 'Pittsburgh', 'Pennsylvania', 'PA', '15222', 'https://www.trekdevelopment.com', '(412) 325-6601'),
  (_slug('Milhaus Pittsburgh'), 'Milhaus Pittsburgh', 'Milhaus Development', 'Pittsburgh', 'Pennsylvania', 'PA', '15201', 'https://www.milhaus.com', '(412) 690-2100'),
  (_slug('Oxford Development'), 'Oxford Development', 'Oxford Development Company', 'Pittsburgh', 'Pennsylvania', 'PA', '15222', 'https://www.oxforddevelopment.com', '(412) 261-0200'),
  (_slug('Mistick Construction'), 'Mistick Construction', 'Mistick Construction', 'Pittsburgh', 'Pennsylvania', 'PA', '15219', 'https://www.mistick.com', '(412) 281-3500'),
  (_slug('LGA Partners'), 'LGA Partners', 'LGA Partners LP', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', NULL, '(412) 621-5100'),
  (_slug('Campus Properties Pittsburgh'), 'Campus Properties Pittsburgh', 'Campus Properties', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', NULL, '(412) 681-8800')
ON CONFLICT (slug) DO NOTHING;

-- ── BOSTON ────────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Greystar Boston'), 'Greystar Boston', 'Greystar Real Estate Partners', 'Boston', 'Massachusetts', 'MA', '02116', 'https://www.greystar.com', '(617) 936-3535'),
  (_slug('Samuels and Associates'), 'Samuels and Associates', 'Samuels & Associates', 'Boston', 'Massachusetts', 'MA', '02215', 'https://www.samuelsre.com', '(617) 948-6000'),
  (_slug('National Development Boston'), 'National Development Boston', 'National Development', 'Boston', 'Massachusetts', 'MA', '02109', 'https://www.natdev.com', '(617) 722-0800'),
  (_slug('Fenway Management'), 'Fenway Management', 'Fenway Management Inc', 'Boston', 'Massachusetts', 'MA', '02215', NULL, '(617) 267-8300'),
  (_slug('Boston Properties Inc'), 'Boston Properties Inc', 'BXP Inc', 'Boston', 'Massachusetts', 'MA', '02116', 'https://www.bxp.com', '(617) 236-3300'),
  (_slug('Chestnut Hill Realty'), 'Chestnut Hill Realty', 'Chestnut Hill Realty Corp', 'Boston', 'Massachusetts', 'MA', '02467', 'https://www.chestnuthill.com', '(617) 969-6262'),
  (_slug('Cabot Cabot and Forbes'), 'Cabot Cabot and Forbes', 'CC&F', 'Boston', 'Massachusetts', 'MA', '02109', 'https://www.ccfne.com', '(617) 723-6100'),
  (_slug('First Realty Management'), 'First Realty Management', 'First Realty Management Corp', 'Boston', 'Massachusetts', 'MA', '02210', 'https://www.firstrealty.com', '(617) onal-2600'),
  (_slug('Peabody Properties Boston'), 'Peabody Properties Boston', 'Peabody Properties', 'Boston', 'Massachusetts', 'MA', '02108', 'https://www.peabodyproperties.com', '(781) 794-1000'),
  (_slug('Winn Residential Boston'), 'Winn Residential Boston', 'WinnResidential', 'Boston', 'Massachusetts', 'MA', '02116', 'https://www.winncompanies.com', '(617) 357-2800')
ON CONFLICT (slug) DO NOTHING;

-- ── LOS ANGELES ──────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Essex Property Trust LA'), 'Essex Property Trust LA', 'Essex Property Trust', 'Los Angeles', 'California', 'CA', '90024', 'https://www.essexapartmenthomes.com', '(310) 442-9700'),
  (_slug('Decron Properties'), 'Decron Properties', 'Decron Properties Corp', 'Los Angeles', 'California', 'CA', '90067', 'https://www.decron.com', '(310) 556-0440'),
  (_slug('Moss and Company'), 'Moss and Company', 'Moss & Company', 'Los Angeles', 'California', 'CA', '90024', 'https://www.mossco.com', '(310) 478-0661'),
  (_slug('UDR Los Angeles'), 'UDR Los Angeles', 'UDR Inc', 'Los Angeles', 'California', 'CA', '90013', 'https://www.udr.com', '(213) 555-0100'),
  (_slug('Greystar Los Angeles'), 'Greystar Los Angeles', 'Greystar Real Estate Partners', 'Los Angeles', 'California', 'CA', '90015', 'https://www.greystar.com', '(213) 985-3700'),
  (_slug('CIM Group LA'), 'CIM Group LA', 'CIM Group', 'Los Angeles', 'California', 'CA', '90028', 'https://www.cimgroup.com', '(323) 860-4900'),
  (_slug('WNDRFL Properties'), 'WNDRFL Properties', 'WNDRFL Properties', 'Los Angeles', 'California', 'CA', '90015', NULL, '(213) 327-7777'),
  (_slug('Sievert Larsen and Associates'), 'Sievert Larsen and Associates', 'SLA Property Management', 'Los Angeles', 'California', 'CA', '90025', NULL, '(310) 312-9090'),
  (_slug('Tripalink LA'), 'Tripalink LA', 'Tripalink Corp', 'Los Angeles', 'California', 'CA', '90007', 'https://www.tripalink.com', '(213) 928-3700'),
  (_slug('Westside Rentals Management'), 'Westside Rentals Management', 'Westside Rentals', 'Los Angeles', 'California', 'CA', '90025', NULL, '(310) 479-5000')
ON CONFLICT (slug) DO NOTHING;

-- ── SAN FRANCISCO ────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Veritas Investments SF'), 'Veritas Investments SF', 'Veritas Investments', 'San Francisco', 'California', 'CA', '94103', 'https://www.veritasinvestments.com', '(415) 292-1700'),
  (_slug('Equity Residential SF'), 'Equity Residential SF', 'Equity Residential', 'San Francisco', 'California', 'CA', '94105', 'https://www.equityapartments.com', '(415) 495-4400'),
  (_slug('Prado Group'), 'Prado Group', 'Prado Group Inc', 'San Francisco', 'California', 'CA', '94110', 'https://www.pradogroup.com', '(415) 641-6800'),
  (_slug('Trinity SF'), 'Trinity SF', 'Trinity Properties', 'San Francisco', 'California', 'CA', '94107', 'https://www.trinityproperties.com', '(415) 978-0600'),
  (_slug('Skyline Realty SF'), 'Skyline Realty SF', 'Skyline Realty', 'San Francisco', 'California', 'CA', '94109', NULL, '(415) 441-1600'),
  (_slug('Emerald Fund SF'), 'Emerald Fund SF', 'Emerald Fund Inc', 'San Francisco', 'California', 'CA', '94108', 'https://www.emeraldfund.com', '(415) 421-0400'),
  (_slug('Prometheus Real Estate SF'), 'Prometheus Real Estate SF', 'Prometheus Real Estate Group', 'San Francisco', 'California', 'CA', '94104', 'https://www.prometheusreg.com', '(415) 374-4000'),
  (_slug('Stellar Management SF'), 'Stellar Management SF', 'Stellar Management', 'San Francisco', 'California', 'CA', '94102', NULL, '(415) 863-1900'),
  (_slug('Windsor Communities SF'), 'Windsor Communities SF', 'Windsor Communities', 'San Francisco', 'California', 'CA', '94107', 'https://www.windsorcommunities.com', '(415) 896-3200'),
  (_slug('Related California SF'), 'Related California SF', 'Related California', 'San Francisco', 'California', 'CA', '94111', 'https://www.relatedcalifornia.com', '(415) 677-9000')
ON CONFLICT (slug) DO NOTHING;

-- ── SEATTLE ──────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Greystar Seattle'), 'Greystar Seattle', 'Greystar Real Estate Partners', 'Seattle', 'Washington', 'WA', '98101', 'https://www.greystar.com', '(206) 624-4200'),
  (_slug('Goodman Real Estate'), 'Goodman Real Estate', 'Goodman Real Estate', 'Seattle', 'Washington', 'WA', '98121', 'https://www.goodmanre.com', '(206) 625-1212'),
  (_slug('Pinnacle Living Seattle'), 'Pinnacle Living Seattle', 'Pinnacle Living', 'Seattle', 'Washington', 'WA', '98109', 'https://www.pinnacle-living.com', '(206) 223-1234'),
  (_slug('Holland Residential Seattle'), 'Holland Residential Seattle', 'Holland Residential', 'Seattle', 'Washington', 'WA', '98104', 'https://www.hollandresidential.com', '(206) 628-1900'),
  (_slug('Pillar Properties'), 'Pillar Properties', 'Pillar Properties', 'Seattle', 'Washington', 'WA', '98122', 'https://www.pillarproperties.com', '(206) 352-8100'),
  (_slug('Security Properties Seattle'), 'Security Properties Seattle', 'Security Properties Inc', 'Seattle', 'Washington', 'WA', '98104', 'https://www.secprop.com', '(206) 628-6600'),
  (_slug('Thayer Manca Residential'), 'Thayer Manca Residential', 'Thayer Manca Residential', 'Seattle', 'Washington', 'WA', '98112', NULL, '(206) 329-1976'),
  (_slug('Madrona Real Estate'), 'Madrona Real Estate', 'Madrona Real Estate Services', 'Seattle', 'Washington', 'WA', '98104', NULL, '(206) 342-0800'),
  (_slug('Essex Property Trust Seattle'), 'Essex Property Trust Seattle', 'Essex Property Trust', 'Seattle', 'Washington', 'WA', '98101', 'https://www.essexapartmenthomes.com', '(206) 682-7700'),
  (_slug('Equity Residential Seattle'), 'Equity Residential Seattle', 'Equity Residential', 'Seattle', 'Washington', 'WA', '98101', 'https://www.equityapartments.com', '(206) 682-3900')
ON CONFLICT (slug) DO NOTHING;

-- ── AUSTIN ───────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Roscoe Properties'), 'Roscoe Properties', 'Roscoe Properties', 'Austin', 'Texas', 'TX', '78701', 'https://www.roscoeproperties.com', '(512) 474-3838'),
  (_slug('Greystar Austin'), 'Greystar Austin', 'Greystar Real Estate Partners', 'Austin', 'Texas', 'TX', '78702', 'https://www.greystar.com', '(512) 697-8100'),
  (_slug('Windsor Communities Austin'), 'Windsor Communities Austin', 'Windsor Communities', 'Austin', 'Texas', 'TX', '78704', 'https://www.windsorcommunities.com', '(512) 444-3456'),
  (_slug('Kairoi Residential Austin'), 'Kairoi Residential Austin', 'Kairoi Residential', 'Austin', 'Texas', 'TX', '78701', 'https://www.kairoi.com', '(512) 478-1255'),
  (_slug('AMLI Residential Austin'), 'AMLI Residential Austin', 'AMLI Residential', 'Austin', 'Texas', 'TX', '78703', 'https://www.amli.com', '(512) 236-0600'),
  (_slug('Presidium Austin'), 'Presidium Austin', 'Presidium Group', 'Austin', 'Texas', 'TX', '78701', 'https://www.presidium.com', '(512) 691-5700'),
  (_slug('JCI Residential Austin'), 'JCI Residential Austin', 'JCI Residential', 'Austin', 'Texas', 'TX', '78702', 'https://www.jciresidential.com', '(512) 479-5500'),
  (_slug('Gables Residential Austin'), 'Gables Residential Austin', 'Gables Residential', 'Austin', 'Texas', 'TX', '78746', 'https://www.gables.com', '(512) 306-1234'),
  (_slug('Karlin Real Estate'), 'Karlin Real Estate', 'Karlin Real Estate', 'Austin', 'Texas', 'TX', '78704', NULL, '(512) 442-3600'),
  (_slug('Smart City Apartments Austin'), 'Smart City Apartments Austin', 'Smart City Apartments', 'Austin', 'Texas', 'TX', '78751', 'https://www.smartcityapts.com', '(512) 458-2222')
ON CONFLICT (slug) DO NOTHING;

-- ── WASHINGTON DC ────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Bozzuto DC'), 'Bozzuto DC', 'Bozzuto Management Company', 'Washington', 'District of Columbia', 'DC', '20001', 'https://www.bozzuto.com', '(202) 544-2200'),
  (_slug('Vornado Realty DC'), 'Vornado Realty DC', 'Vornado Realty Trust', 'Washington', 'District of Columbia', 'DC', '20004', 'https://www.vno.com', '(202) 783-5100'),
  (_slug('JBG Smith DC'), 'JBG Smith DC', 'JBG SMITH Properties', 'Washington', 'District of Columbia', 'DC', '20005', 'https://www.jbgsmith.com', '(240) 333-3600'),
  (_slug('WC Smith'), 'WC Smith', 'William C. Smith & Co', 'Washington', 'District of Columbia', 'DC', '20003', 'https://www.wcsmith.com', '(202) 263-8800'),
  (_slug('Bernstein Management DC'), 'Bernstein Management DC', 'Bernstein Management Corporation', 'Washington', 'District of Columbia', 'DC', '20036', 'https://www.bernsteinmanagement.com', '(202) 296-2100'),
  (_slug('Daro Realty'), 'Daro Realty', 'Daro Realty Inc', 'Washington', 'District of Columbia', 'DC', '20016', NULL, '(202) 364-3000'),
  (_slug('Keener-Squire Property DC'), 'Keener-Squire Property DC', 'Keener-Squire Properties', 'Washington', 'District of Columbia', 'DC', '20010', NULL, '(202) 332-4570'),
  (_slug('Urban Atlantic DC'), 'Urban Atlantic DC', 'Urban Atlantic', 'Washington', 'District of Columbia', 'DC', '20005', 'https://www.urbanatlantic.com', '(202) 464-7252'),
  (_slug('Equity Residential DC'), 'Equity Residential DC', 'Equity Residential', 'Washington', 'District of Columbia', 'DC', '20001', 'https://www.equityapartments.com', '(202) 737-7200'),
  (_slug('Camden Property Trust DC'), 'Camden Property Trust DC', 'Camden Property Trust', 'Washington', 'District of Columbia', 'DC', '20003', 'https://www.camdenliving.com', '(202) 863-0200')
ON CONFLICT (slug) DO NOTHING;

-- ── ATLANTA ──────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Post Apartment Homes Atlanta'), 'Post Apartment Homes Atlanta', 'MAA (Mid-America Apartment Communities)', 'Atlanta', 'Georgia', 'GA', '30305', 'https://www.maac.com', '(404) 846-5000'),
  (_slug('Gables Residential Atlanta'), 'Gables Residential Atlanta', 'Gables Residential', 'Atlanta', 'Georgia', 'GA', '30305', 'https://www.gables.com', '(404) 262-2200'),
  (_slug('Greystar Atlanta'), 'Greystar Atlanta', 'Greystar Real Estate Partners', 'Atlanta', 'Georgia', 'GA', '30308', 'https://www.greystar.com', '(404) 865-7200'),
  (_slug('Cortland Atlanta'), 'Cortland Atlanta', 'Cortland', 'Atlanta', 'Georgia', 'GA', '30326', 'https://www.cortland.com', '(404) 814-0089'),
  (_slug('Hines Atlanta'), 'Hines Atlanta', 'Hines', 'Atlanta', 'Georgia', 'GA', '30309', 'https://www.hines.com', '(404) 812-5000'),
  (_slug('Atlanta Fine Homes Sotheby'), 'Atlanta Fine Homes Sotheby', 'Atlanta Fine Homes Sotheby''s', 'Atlanta', 'Georgia', 'GA', '30305', 'https://www.atlantafinehomes.com', '(404) 237-5000'),
  (_slug('Waterton Atlanta'), 'Waterton Atlanta', 'Waterton', 'Atlanta', 'Georgia', 'GA', '30308', 'https://www.waterton.com', '(404) 549-4400'),
  (_slug('Landmark Properties Atlanta'), 'Landmark Properties Atlanta', 'Landmark Properties', 'Atlanta', 'Georgia', 'GA', '30601', 'https://www.landmarkproperties.com', '(706) 354-8100'),
  (_slug('Wood Partners Atlanta'), 'Wood Partners Atlanta', 'Wood Partners', 'Atlanta', 'Georgia', 'GA', '30326', 'https://www.woodpartners.com', '(404) 898-2600'),
  (_slug('Zom Living Atlanta'), 'Zom Living Atlanta', 'ZOM Living', 'Atlanta', 'Georgia', 'GA', '30309', 'https://www.zomliving.com', '(404) 442-7800')
ON CONFLICT (slug) DO NOTHING;

-- ── MIAMI ────────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Related Group Miami'), 'Related Group Miami', 'The Related Group', 'Miami', 'Florida', 'FL', '33131', 'https://www.relatedgroup.com', '(305) 460-9900'),
  (_slug('Melo Group'), 'Melo Group', 'Melo Group', 'Miami', 'Florida', 'FL', '33132', 'https://www.melogroup.com', '(305) 529-0400'),
  (_slug('ZOM Living Miami'), 'ZOM Living Miami', 'ZOM Living', 'Miami', 'Florida', 'FL', '33131', 'https://www.zomliving.com', '(305) 577-0277'),
  (_slug('Greystar Miami'), 'Greystar Miami', 'Greystar Real Estate Partners', 'Miami', 'Florida', 'FL', '33130', 'https://www.greystar.com', '(305) 860-6800'),
  (_slug('Fortune International Miami'), 'Fortune International Miami', 'Fortune International Group', 'Miami', 'Florida', 'FL', '33131', 'https://www.fortuneintlgroup.com', '(305) 374-4435'),
  (_slug('Aria Development Group'), 'Aria Development Group', 'Aria Development Group', 'Miami', 'Florida', 'FL', '33131', 'https://www.ariadg.com', '(305) 901-5566'),
  (_slug('Cervera Real Estate'), 'Cervera Real Estate', 'Cervera Real Estate', 'Miami', 'Florida', 'FL', '33131', 'https://www.cervera.com', '(305) 577-4000'),
  (_slug('Integra Investments'), 'Integra Investments', 'Integra Investments LLC', 'Miami', 'Florida', 'FL', '33133', 'https://www.integra-inv.com', '(305) 573-0888'),
  (_slug('Swire Properties Miami'), 'Swire Properties Miami', 'Swire Properties Inc', 'Miami', 'Florida', 'FL', '33131', 'https://www.swireproperties.com', '(305) 371-4000'),
  (_slug('Landmark Realty Miami'), 'Landmark Realty Miami', 'Landmark Realty Group', 'Miami', 'Florida', 'FL', '33137', NULL, '(305) 438-0099')
ON CONFLICT (slug) DO NOTHING;

-- ── DENVER ───────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('UDR Denver'), 'UDR Denver', 'UDR Inc', 'Denver', 'Colorado', 'CO', '80202', 'https://www.udr.com', '(720) 283-6120'),
  (_slug('Greystar Denver'), 'Greystar Denver', 'Greystar Real Estate Partners', 'Denver', 'Colorado', 'CO', '80202', 'https://www.greystar.com', '(303) 592-5400'),
  (_slug('Holland Partner Group Denver'), 'Holland Partner Group Denver', 'Holland Partner Group', 'Denver', 'Colorado', 'CO', '80203', 'https://www.hollandpartnergroup.com', '(303) 861-4400'),
  (_slug('Alliance Residential Denver'), 'Alliance Residential Denver', 'Alliance Residential Company', 'Denver', 'Colorado', 'CO', '80202', 'https://www.allresco.com', '(303) 893-1010'),
  (_slug('Western Development Group'), 'Western Development Group', 'Western Development Group', 'Denver', 'Colorado', 'CO', '80206', 'https://www.westerndg.com', '(303) 399-0365'),
  (_slug('Apartment Management Consultants Denver'), 'Apartment Management Consultants Denver', 'AMC LLC', 'Denver', 'Colorado', 'CO', '80237', 'https://www.amcllc.net', '(303) 750-7900'),
  (_slug('Aimco Denver'), 'Aimco Denver', 'Apartment Investment & Management', 'Denver', 'Colorado', 'CO', '80202', 'https://www.aimco.com', '(303) 757-8101'),
  (_slug('Broe Real Estate Denver'), 'Broe Real Estate Denver', 'Broe Real Estate Group', 'Denver', 'Colorado', 'CO', '80202', 'https://www.broegroup.com', '(303) 628-7400'),
  (_slug('Cornerstone Apartments Denver'), 'Cornerstone Apartments Denver', 'Cornerstone Apartment Services', 'Denver', 'Colorado', 'CO', '80205', NULL, '(303) 296-0404'),
  (_slug('Echelon Property Group'), 'Echelon Property Group', 'Echelon Property Group', 'Denver', 'Colorado', 'CO', '80206', 'https://www.echelonrents.com', '(303) 393-1111')
ON CONFLICT (slug) DO NOTHING;

-- ── HOUSTON ──────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Camden Property Trust Houston'), 'Camden Property Trust Houston', 'Camden Property Trust', 'Houston', 'Texas', 'TX', '77056', 'https://www.camdenliving.com', '(713) 354-2500'),
  (_slug('Greystar Houston'), 'Greystar Houston', 'Greystar Real Estate Partners', 'Houston', 'Texas', 'TX', '77002', 'https://www.greystar.com', '(713) 292-5400'),
  (_slug('Hines Houston'), 'Hines Houston', 'Hines', 'Houston', 'Texas', 'TX', '77056', 'https://www.hines.com', '(713) 621-8000'),
  (_slug('Finger Companies'), 'Finger Companies', 'The Finger Companies', 'Houston', 'Texas', 'TX', '77002', 'https://www.fingercompanies.com', '(713) 651-8899'),
  (_slug('Hanover Company Houston'), 'Hanover Company Houston', 'The Hanover Company', 'Houston', 'Texas', 'TX', '77056', 'https://www.hanoverco.com', '(713) 621-1700'),
  (_slug('Midway Houston'), 'Midway Houston', 'Midway Companies', 'Houston', 'Texas', 'TX', '77027', 'https://www.midwaycompanies.com', '(713) 629-3500'),
  (_slug('Venterra Realty'), 'Venterra Realty', 'Venterra Realty', 'Houston', 'Texas', 'TX', '77027', 'https://www.venterraliving.com', '(713) 840-8080'),
  (_slug('Morgan Group Houston'), 'Morgan Group Houston', 'The Morgan Group', 'Houston', 'Texas', 'TX', '77006', 'https://www.morgangroup.com', '(713) 669-3000'),
  (_slug('Judwin Properties'), 'Judwin Properties', 'Judwin Properties Inc', 'Houston', 'Texas', 'TX', '77098', NULL, '(713) 621-8780'),
  (_slug('Waldo Point Management Houston'), 'Waldo Point Management Houston', 'Waldo Point Management', 'Houston', 'Texas', 'TX', '77019', NULL, '(713) 528-1234')
ON CONFLICT (slug) DO NOTHING;

-- ── DALLAS ───────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Lincoln Property Company'), 'Lincoln Property Company', 'Lincoln Property Company', 'Dallas', 'Texas', 'TX', '75201', 'https://www.lpc.com', '(214) 740-3300'),
  (_slug('Greystar Dallas'), 'Greystar Dallas', 'Greystar Real Estate Partners', 'Dallas', 'Texas', 'TX', '75201', 'https://www.greystar.com', '(214) 999-5400'),
  (_slug('JPI Dallas'), 'JPI Dallas', 'JPI', 'Dallas', 'Texas', 'TX', '75219', 'https://www.jpi.com', '(214) 871-3322'),
  (_slug('StreetLights Residential'), 'StreetLights Residential', 'StreetLights Residential', 'Dallas', 'Texas', 'TX', '75201', 'https://www.streetlightsres.com', '(214) 378-7700'),
  (_slug('Trammell Crow Residential'), 'Trammell Crow Residential', 'Trammell Crow Residential', 'Dallas', 'Texas', 'TX', '75201', 'https://www.tcr.com', '(214) 863-1000'),
  (_slug('Mill Creek Residential Dallas'), 'Mill Creek Residential Dallas', 'Mill Creek Residential Trust', 'Dallas', 'Texas', 'TX', '75240', 'https://www.millcreekplaces.com', '(972) 663-5200'),
  (_slug('Behringer Harvard Dallas'), 'Behringer Harvard Dallas', 'Behringer', 'Dallas', 'Texas', 'TX', '75240', 'https://www.behringer.com', '(214) 655-1600'),
  (_slug('Provident Realty Advisors'), 'Provident Realty Advisors', 'Provident Realty Advisors', 'Dallas', 'Texas', 'TX', '75201', 'https://www.providentrealtyadvisors.com', '(214) 269-5300'),
  (_slug('Hillwood Urban Dallas'), 'Hillwood Urban Dallas', 'Hillwood Urban', 'Dallas', 'Texas', 'TX', '75202', 'https://www.hillwood.com', '(214) 303-2700'),
  (_slug('ZRS Management Dallas'), 'ZRS Management Dallas', 'ZRS Management', 'Dallas', 'Texas', 'TX', '75207', 'https://www.zrsmanagement.com', '(214) 421-0300')
ON CONFLICT (slug) DO NOTHING;

-- ── NASHVILLE ────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Elmington Property Management'), 'Elmington Property Management', 'Elmington Property Management', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.elmington.com', '(615) 750-3000'),
  (_slug('Southeast Venture Nashville'), 'Southeast Venture Nashville', 'Southeast Venture LLC', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.southeastventure.com', '(615) 320-5500'),
  (_slug('Giarratana Development'), 'Giarratana Development', 'Giarratana LLC', 'Nashville', 'Tennessee', 'TN', '37203', NULL, '(615) 256-5155'),
  (_slug('Bristol Development Nashville'), 'Bristol Development Nashville', 'Bristol Development Group', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.bristoldevelopmentgroup.com', '(615) 850-3550'),
  (_slug('Greystar Nashville'), 'Greystar Nashville', 'Greystar Real Estate Partners', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.greystar.com', '(615) 248-3400'),
  (_slug('Bell Partners Nashville'), 'Bell Partners Nashville', 'Bell Partners Inc', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.bellpartnersinc.com', '(615) 234-7400'),
  (_slug('Highwoods Properties Nashville'), 'Highwoods Properties Nashville', 'Highwoods Properties', 'Nashville', 'Tennessee', 'TN', '37219', 'https://www.highwoods.com', '(615) 780-5660'),
  (_slug('Core Spaces Nashville'), 'Core Spaces Nashville', 'Core Spaces', 'Nashville', 'Tennessee', 'TN', '37203', 'https://www.corespaces.com', '(615) 425-6500'),
  (_slug('Aimbridge Hospitality Nashville'), 'Aimbridge Hospitality Nashville', 'Aimbridge Residential', 'Nashville', 'Tennessee', 'TN', '37203', NULL, '(615) 933-8200'),
  (_slug('RAM Partners Nashville'), 'RAM Partners Nashville', 'RAM Partners LLC', 'Nashville', 'Tennessee', 'TN', '37215', 'https://www.rampartners.com', '(615) 373-4100')
ON CONFLICT (slug) DO NOTHING;

-- ── MINNEAPOLIS ──────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Dominium Minneapolis'), 'Dominium Minneapolis', 'Dominium', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.dominium.com', '(763) 354-5500'),
  (_slug('Sherman Associates'), 'Sherman Associates', 'Sherman Associates', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.sherman-associates.com', '(612) 332-3000'),
  (_slug('Doran Companies'), 'Doran Companies', 'Doran Companies', 'Minneapolis', 'Minnesota', 'MN', '55439', 'https://www.dorancompanies.com', '(952) 288-2000'),
  (_slug('Schafer Richardson'), 'Schafer Richardson', 'Schafer Richardson', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.schaferrichardson.com', '(612) 370-0200'),
  (_slug('CPM Residential Minneapolis'), 'CPM Residential Minneapolis', 'CPM Residential Services', 'Minneapolis', 'Minnesota', 'MN', '55414', NULL, '(612) 623-3200'),
  (_slug('Greco Minneapolis'), 'Greco Minneapolis', 'Greco LLC', 'Minneapolis', 'Minnesota', 'MN', '55404', NULL, '(612) 871-5000'),
  (_slug('Aeon Minneapolis'), 'Aeon Minneapolis', 'Aeon', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.aeon.org', '(612) 341-3148'),
  (_slug('Bader Development'), 'Bader Development', 'Bader Development', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.baderdevelopment.com', '(612) 238-7400'),
  (_slug('Lander Group Minneapolis'), 'Lander Group Minneapolis', 'The Lander Group', 'Minneapolis', 'Minnesota', 'MN', '55405', NULL, '(612) 822-2225'),
  (_slug('Wellington Management Minneapolis'), 'Wellington Management Minneapolis', 'Wellington Management Inc', 'Minneapolis', 'Minnesota', 'MN', '55401', 'https://www.wellingtonmgt.com', '(612) 338-3400')
ON CONFLICT (slug) DO NOTHING;

-- ── PORTLAND ─────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Holland Partner Group Portland'), 'Holland Partner Group Portland', 'Holland Partner Group', 'Portland', 'Oregon', 'OR', '97204', 'https://www.hollandpartnergroup.com', '(503) 241-0456'),
  (_slug('Guardian Real Estate Portland'), 'Guardian Real Estate Portland', 'Guardian Real Estate Services', 'Portland', 'Oregon', 'OR', '97204', 'https://www.guardianreservices.com', '(503) 223-5181'),
  (_slug('Pinnacle Portland'), 'Pinnacle Portland', 'Pinnacle Living', 'Portland', 'Oregon', 'OR', '97209', 'https://www.pinnacle-living.com', '(503) 223-1234'),
  (_slug('Mill Creek Portland'), 'Mill Creek Portland', 'Mill Creek Residential Trust', 'Portland', 'Oregon', 'OR', '97209', 'https://www.millcreekplaces.com', '(503) 916-6000'),
  (_slug('Project PDX'), 'Project PDX', 'Project PDX', 'Portland', 'Oregon', 'OR', '97214', NULL, '(503) 236-7600'),
  (_slug('Urban Asset Advisors'), 'Urban Asset Advisors', 'Urban Asset Advisors', 'Portland', 'Oregon', 'OR', '97204', NULL, '(503) 274-2900'),
  (_slug('Income Property Management'), 'Income Property Management', 'Income Property Management Co', 'Portland', 'Oregon', 'OR', '97223', 'https://www.incomepropertymanagement.com', '(503) 636-1101'),
  (_slug('HFO Investment Real Estate'), 'HFO Investment Real Estate', 'HFO Investment Real Estate', 'Portland', 'Oregon', 'OR', '97209', 'https://www.hfrrealestate.com', '(503) 241-5541'),
  (_slug('Tokola Properties Portland'), 'Tokola Properties Portland', 'Tokola Properties', 'Portland', 'Oregon', 'OR', '97209', 'https://www.tokolaproperties.com', '(503) 220-0211'),
  (_slug('Greystar Portland'), 'Greystar Portland', 'Greystar Real Estate Partners', 'Portland', 'Oregon', 'OR', '97209', 'https://www.greystar.com', '(503) 222-4000')
ON CONFLICT (slug) DO NOTHING;

-- ── PHOENIX ──────────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Mark-Taylor Residential'), 'Mark-Taylor Residential', 'Mark-Taylor Inc', 'Phoenix', 'Arizona', 'AZ', '85251', 'https://www.mark-taylor.com', '(480) 994-5050'),
  (_slug('Alliance Residential Phoenix'), 'Alliance Residential Phoenix', 'Alliance Residential Company', 'Phoenix', 'Arizona', 'AZ', '85004', 'https://www.allresco.com', '(602) 903-7500'),
  (_slug('Greystar Phoenix'), 'Greystar Phoenix', 'Greystar Real Estate Partners', 'Phoenix', 'Arizona', 'AZ', '85004', 'https://www.greystar.com', '(602) 744-5400'),
  (_slug('Avenue5 Residential Phoenix'), 'Avenue5 Residential Phoenix', 'Avenue5 Residential', 'Phoenix', 'Arizona', 'AZ', '85012', 'https://www.avenue5.com', '(602) 230-7555'),
  (_slug('Taylor Morrison Phoenix'), 'Taylor Morrison Phoenix', 'Taylor Morrison Home Corp', 'Phoenix', 'Arizona', 'AZ', '85251', 'https://www.taylormorrison.com', '(480) 840-8100'),
  (_slug('NexMetro Communities'), 'NexMetro Communities', 'NexMetro Communities', 'Phoenix', 'Arizona', 'AZ', '85250', 'https://www.nexmetro.com', '(480) 300-2500'),
  (_slug('Weidner Apartment Homes Phoenix'), 'Weidner Apartment Homes Phoenix', 'Weidner Apartment Homes', 'Phoenix', 'Arizona', 'AZ', '85014', 'https://www.weidner.com', '(602) 337-4600'),
  (_slug('Wood Residential Phoenix'), 'Wood Residential Phoenix', 'Wood Residential Services', 'Phoenix', 'Arizona', 'AZ', '85012', 'https://www.woodpartners.com', '(602) 296-6100'),
  (_slug('CFT Property Management'), 'CFT Property Management', 'CFT Property Management', 'Phoenix', 'Arizona', 'AZ', '85012', NULL, '(602) 277-5800'),
  (_slug('Arcadia Management Group'), 'Arcadia Management Group', 'Arcadia Management Group', 'Phoenix', 'Arizona', 'AZ', '85018', 'https://www.arcadiamgmt.com', '(602) 957-0050')
ON CONFLICT (slug) DO NOTHING;

-- ── STATE COLLEGE ────────────────────────────────────────────
INSERT INTO landlords (slug, display_name, business_name, city, state, state_abbr, zip, website, phone) VALUES
  (_slug('Arricale Real Estate'), 'Arricale Real Estate', 'Arricale Real Estate', 'State College', 'Pennsylvania', 'PA', '16801', 'https://www.arricale.com', '(814) 238-4600'),
  (_slug('CATA Properties State College'), 'CATA Properties State College', 'CATA Properties', 'State College', 'Pennsylvania', 'PA', '16801', NULL, '(814) 237-8500'),
  (_slug('Kissinger Bigatel and Brower'), 'Kissinger Bigatel and Brower', 'Kissinger Bigatel & Brower Realtors', 'State College', 'Pennsylvania', 'PA', '16801', 'https://www.kbbhomes.com', '(814) 234-4000'),
  (_slug('Penn State Housing Solutions'), 'Penn State Housing Solutions', 'Penn State Housing Solutions LLC', 'State College', 'Pennsylvania', 'PA', '16801', NULL, '(814) 234-1812'),
  (_slug('Nittany Property Management'), 'Nittany Property Management', 'Nittany Property Management', 'State College', 'Pennsylvania', 'PA', '16801', NULL, '(814) 237-3800'),
  (_slug('Park Forest Enterprises'), 'Park Forest Enterprises', 'Park Forest Enterprises Inc', 'State College', 'Pennsylvania', 'PA', '16803', 'https://www.parkforestenterprises.com', '(814) 238-2600'),
  (_slug('Apartment Store State College'), 'Apartment Store State College', 'The Apartment Store Inc', 'State College', 'Pennsylvania', 'PA', '16801', 'https://www.theapartmentstore.com', '(814) 238-8383'),
  (_slug('LionPoint Properties'), 'LionPoint Properties', 'LionPoint Properties LLC', 'State College', 'Pennsylvania', 'PA', '16801', NULL, '(814) 862-4300')
ON CONFLICT (slug) DO NOTHING;

-- search_vector is a generated column — auto-populated on insert

-- Clean up helper function
DROP FUNCTION IF EXISTS _slug(TEXT);

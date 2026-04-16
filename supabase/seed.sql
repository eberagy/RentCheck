-- ============================================================
-- Vett Seed Data — Comprehensive nationwide landlord & property data
-- Run against your Supabase database to populate initial data.
-- All landlord/owner names are fictional for demo/development.
-- Addresses use real street names in each city.
-- ============================================================

-- ── LANDLORDS ───────────────────────────────────────────────

INSERT INTO public.landlords
  (id, slug, display_name, business_name, city, state, state_abbr, zip, avg_rating, review_count, grade, open_violation_count, total_violation_count, eviction_count, is_claimed, is_verified)
VALUES
  -- New York City
  ('11000001-0000-0000-0000-000000000001', 'eastside-property-mgmt-nyc', 'Eastside Property Management', 'Eastside Property Mgmt LLC', 'New York', 'New York', 'NY', '10001', 2.8, 0, 'D', 14, 32, 4, false, false),
  ('11000001-0000-0000-0000-000000000002', 'beacon-residential-nyc', 'Beacon Residential Group', 'Beacon Residential Group Inc', 'New York', 'New York', 'NY', '10025', 3.9, 0, 'B', 3, 11, 1, false, false),
  ('11000001-0000-0000-0000-000000000003', 'harlem-heights-properties', 'Harlem Heights Properties', NULL, 'New York', 'New York', 'NY', '10031', 2.1, 0, 'F', 21, 45, 7, false, false),
  ('11000001-0000-0000-0000-000000000004', 'manhattan-home-solutions', 'Manhattan Home Solutions', 'Manhattan Home Solutions Corp', 'New York', 'New York', 'NY', '10002', 4.3, 0, 'A', 1, 4, 0, false, false),
  ('11000001-0000-0000-0000-000000000005', 'brooklyn-gateway-realty', 'Brooklyn Gateway Realty', 'Brooklyn Gateway Realty LLC', 'New York', 'New York', 'NY', '11201', 3.5, 0, 'C', 6, 18, 2, false, false),

  -- Chicago
  ('11000002-0000-0000-0000-000000000001', 'lakeview-property-co-chicago', 'Lakeview Property Co', 'Lakeview Property Co LLC', 'Chicago', 'Illinois', 'IL', '60657', 3.7, 0, 'B', 4, 13, 1, false, false),
  ('11000002-0000-0000-0000-000000000002', 'southside-realty-chicago', 'Southside Realty Partners', NULL, 'Chicago', 'Illinois', 'IL', '60621', 1.9, 0, 'F', 28, 61, 9, false, false),
  ('11000002-0000-0000-0000-000000000003', 'wicker-park-rentals', 'Wicker Park Rentals', 'Wicker Park Rentals Inc', 'Chicago', 'Illinois', 'IL', '60647', 4.1, 0, 'A', 2, 7, 0, false, false),
  ('11000002-0000-0000-0000-000000000004', 'chicago-urban-living', 'Chicago Urban Living', 'Chicago Urban Living LLC', 'Chicago', 'Illinois', 'IL', '60614', 3.2, 0, 'C', 9, 24, 3, false, false),

  -- Los Angeles
  ('11000003-0000-0000-0000-000000000001', 'sunset-boulevard-properties', 'Sunset Boulevard Properties', 'SBP Holdings LLC', 'Los Angeles', 'California', 'CA', '90028', 2.6, 0, 'D', 11, 29, 3, false, false),
  ('11000003-0000-0000-0000-000000000002', 'la-premier-rentals', 'LA Premier Rentals', 'LA Premier Rentals Corp', 'Los Angeles', 'California', 'CA', '90036', 4.4, 0, 'A', 1, 3, 0, false, false),
  ('11000003-0000-0000-0000-000000000003', 'valley-view-mgmt-la', 'Valley View Management', NULL, 'Los Angeles', 'California', 'CA', '91605', 2.3, 0, 'F', 19, 41, 6, false, false),
  ('11000003-0000-0000-0000-000000000004', 'westside-housing-group', 'Westside Housing Group', 'Westside Housing Group Inc', 'Los Angeles', 'California', 'CA', '90291', 3.8, 0, 'B', 5, 15, 1, false, false),

  -- San Francisco
  ('11000004-0000-0000-0000-000000000001', 'mission-district-properties', 'Mission District Properties', 'MDP Real Estate LLC', 'San Francisco', 'California', 'CA', '94110', 3.4, 0, 'C', 7, 19, 2, false, false),
  ('11000004-0000-0000-0000-000000000002', 'bay-area-rentals-sf', 'Bay Area Rentals', 'Bay Area Rentals Inc', 'San Francisco', 'California', 'CA', '94102', 4.0, 0, 'A', 2, 8, 0, false, false),
  ('11000004-0000-0000-0000-000000000003', 'tenderloin-property-group', 'Tenderloin Property Group', NULL, 'San Francisco', 'California', 'CA', '94102', 1.8, 0, 'F', 24, 53, 8, false, false),

  -- Boston
  ('11000005-0000-0000-0000-000000000001', 'fenway-property-mgmt', 'Fenway Property Management', 'Fenway PM LLC', 'Boston', 'Massachusetts', 'MA', '02215', 3.6, 0, 'B', 5, 16, 1, false, false),
  ('11000005-0000-0000-0000-000000000002', 'allston-housing-boston', 'Allston Housing Group', NULL, 'Boston', 'Massachusetts', 'MA', '02134', 2.4, 0, 'D', 13, 30, 4, false, false),
  ('11000005-0000-0000-0000-000000000003', 'back-bay-realty-boston', 'Back Bay Realty', 'Back Bay Realty Partners LLC', 'Boston', 'Massachusetts', 'MA', '02116', 4.5, 0, 'A', 1, 4, 0, false, false),

  -- Philadelphia
  ('11000006-0000-0000-0000-000000000001', 'fishtown-properties-philly', 'Fishtown Properties', 'Fishtown Properties LLC', 'Philadelphia', 'Pennsylvania', 'PA', '19125', 3.3, 0, 'C', 8, 21, 2, false, false),
  ('11000006-0000-0000-0000-000000000002', 'center-city-landlord-philly', 'Center City Rentals', 'Center City Rentals Inc', 'Philadelphia', 'Pennsylvania', 'PA', '19103', 4.1, 0, 'A', 2, 6, 0, false, false),
  ('11000006-0000-0000-0000-000000000003', 'kensington-realty-philly', 'Kensington Realty', NULL, 'Philadelphia', 'Pennsylvania', 'PA', '19134', 1.7, 0, 'F', 31, 68, 11, false, false),

  -- Baltimore
  ('11000007-0000-0000-0000-000000000001', 'canton-property-mgmt-balt', 'Canton Property Management', 'Canton PM LLC', 'Baltimore', 'Maryland', 'MD', '21224', 3.5, 0, 'C', 6, 17, 2, false, false),
  ('11000007-0000-0000-0000-000000000002', 'charles-village-rentals', 'Charles Village Rentals', NULL, 'Baltimore', 'Maryland', 'MD', '21218', 2.7, 0, 'D', 12, 27, 3, false, false),
  ('11000007-0000-0000-0000-000000000003', 'inner-harbor-properties-balt', 'Inner Harbor Properties', 'Inner Harbor Properties Inc', 'Baltimore', 'Maryland', 'MD', '21202', 4.2, 0, 'A', 1, 5, 0, false, false),

  -- Pittsburgh
  ('11000008-0000-0000-0000-000000000001', 'squirrel-hill-housing-pgh', 'Squirrel Hill Housing', 'SH Housing LLC', 'Pittsburgh', 'Pennsylvania', 'PA', '15217', 3.8, 0, 'B', 4, 12, 1, false, false),
  ('11000008-0000-0000-0000-000000000002', 'oakland-student-rentals-pgh', 'Oakland Student Rentals', NULL, 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 2.2, 0, 'F', 17, 38, 5, false, false),

  -- Seattle
  ('11000009-0000-0000-0000-000000000001', 'capitol-hill-rentals-sea', 'Capitol Hill Rentals', 'Capitol Hill Rentals LLC', 'Seattle', 'Washington', 'WA', '98102', 3.9, 0, 'B', 3, 10, 1, false, false),
  ('11000009-0000-0000-0000-000000000002', 'belltown-property-mgmt', 'Belltown Property Management', NULL, 'Seattle', 'Washington', 'WA', '98121', 2.5, 0, 'D', 10, 24, 3, false, false),
  ('11000009-0000-0000-0000-000000000003', 'fremont-housing-seattle', 'Fremont Housing Group', 'Fremont Housing Inc', 'Seattle', 'Washington', 'WA', '98103', 4.3, 0, 'A', 1, 4, 0, false, false),

  -- Austin
  ('11000010-0000-0000-0000-000000000001', 'east-austin-properties', 'East Austin Properties', 'EAP LLC', 'Austin', 'Texas', 'TX', '78702', 3.7, 0, 'B', 5, 14, 1, false, false),
  ('11000010-0000-0000-0000-000000000002', 'south-congress-rentals', 'South Congress Rentals', NULL, 'Austin', 'Texas', 'TX', '78704', 2.9, 0, 'D', 9, 22, 2, false, false),
  ('11000010-0000-0000-0000-000000000003', 'domain-area-mgmt-austin', 'Domain Area Management', 'Domain Area Mgmt LLC', 'Austin', 'Texas', 'TX', '78758', 4.4, 0, 'A', 1, 3, 0, false, false),

  -- Houston
  ('11000011-0000-0000-0000-000000000001', 'montrose-property-mgmt-hou', 'Montrose Property Management', 'Montrose PM Inc', 'Houston', 'Texas', 'TX', '77006', 3.5, 0, 'C', 7, 19, 2, false, false),
  ('11000011-0000-0000-0000-000000000002', 'heights-housing-houston', 'Heights Housing Partners', NULL, 'Houston', 'Texas', 'TX', '77009', 2.6, 0, 'D', 14, 32, 4, false, false),
  ('11000011-0000-0000-0000-000000000003', 'river-oaks-rentals-houston', 'River Oaks Rentals', 'River Oaks Rentals LLC', 'Houston', 'Texas', 'TX', '77019', 4.5, 0, 'A', 0, 2, 0, false, false),

  -- Miami
  ('11000012-0000-0000-0000-000000000001', 'brickell-property-group-miami', 'Brickell Property Group', 'Brickell PG LLC', 'Miami', 'Florida', 'FL', '33131', 3.8, 0, 'B', 4, 12, 1, false, false),
  ('11000012-0000-0000-0000-000000000002', 'little-havana-rentals', 'Little Havana Rentals', NULL, 'Miami', 'Florida', 'FL', '33135', 2.3, 0, 'F', 20, 44, 6, false, false),
  ('11000012-0000-0000-0000-000000000003', 'south-beach-properties-miami', 'South Beach Properties', 'SBP Holdings Inc', 'Miami', 'Florida', 'FL', '33139', 4.2, 0, 'A', 1, 5, 0, false, false),

  -- Denver
  ('11000013-0000-0000-0000-000000000001', 'cap-hill-property-denver', 'Capitol Hill Property Co', 'CHPC LLC', 'Denver', 'Colorado', 'CO', '80203', 3.6, 0, 'B', 5, 14, 1, false, false),
  ('11000013-0000-0000-0000-000000000002', 'highlands-housing-denver', 'Highlands Housing Group', NULL, 'Denver', 'Colorado', 'CO', '80211', 2.8, 0, 'D', 11, 25, 3, false, false),
  ('11000013-0000-0000-0000-000000000003', 'cherry-creek-rentals-denver', 'Cherry Creek Rentals', 'CCR LLC', 'Denver', 'Colorado', 'CO', '80206', 4.4, 0, 'A', 1, 3, 0, false, false),

  -- Dallas
  ('11000014-0000-0000-0000-000000000001', 'deep-ellum-properties-dallas', 'Deep Ellum Properties', 'DEP LLC', 'Dallas', 'Texas', 'TX', '75226', 3.4, 0, 'C', 8, 20, 2, false, false),
  ('11000014-0000-0000-0000-000000000002', 'uptown-dallas-rentals', 'Uptown Dallas Rentals', NULL, 'Dallas', 'Texas', 'TX', '75204', 4.0, 0, 'A', 2, 7, 0, false, false),
  ('11000014-0000-0000-0000-000000000003', 'oak-cliff-housing-dallas', 'Oak Cliff Housing', 'OCH Partners LLC', 'Dallas', 'Texas', 'TX', '75208', 2.5, 0, 'D', 13, 29, 4, false, false),

  -- Washington DC
  ('11000015-0000-0000-0000-000000000001', 'columbia-heights-properties-dc', 'Columbia Heights Properties', 'CHP LLC', 'Washington', 'District of Columbia', 'DC', '20010', 3.3, 0, 'C', 9, 23, 2, false, false),
  ('11000015-0000-0000-0000-000000000002', 'dupont-circle-rentals-dc', 'Dupont Circle Rentals', 'DCR Inc', 'Washington', 'District of Columbia', 'DC', '20036', 4.3, 0, 'A', 1, 4, 0, false, false),
  ('11000015-0000-0000-0000-000000000003', 'anacostia-housing-dc', 'Anacostia Housing Partners', NULL, 'Washington', 'District of Columbia', 'DC', '20020', 2.1, 0, 'F', 22, 48, 7, false, false),

  -- Atlanta
  ('11000016-0000-0000-0000-000000000001', 'midtown-atlanta-properties', 'Midtown Atlanta Properties', 'MAP LLC', 'Atlanta', 'Georgia', 'GA', '30309', 3.9, 0, 'B', 4, 11, 1, false, false),
  ('11000016-0000-0000-0000-000000000002', 'east-atlanta-rentals', 'East Atlanta Rentals', NULL, 'Atlanta', 'Georgia', 'GA', '30316', 2.7, 0, 'D', 12, 27, 3, false, false),
  ('11000016-0000-0000-0000-000000000003', 'buckhead-property-mgmt', 'Buckhead Property Management', 'Buckhead PM Inc', 'Atlanta', 'Georgia', 'GA', '30305', 4.5, 0, 'A', 0, 2, 0, false, false),

  -- Nashville
  ('11000017-0000-0000-0000-000000000001', 'east-nashville-housing', 'East Nashville Housing', 'ENH LLC', 'Nashville', 'Tennessee', 'TN', '37206', 3.7, 0, 'B', 5, 14, 1, false, false),
  ('11000017-0000-0000-0000-000000000002', 'gulch-property-group-nash', 'Gulch Property Group', NULL, 'Nashville', 'Tennessee', 'TN', '37203', 3.0, 0, 'C', 8, 20, 2, false, false),

  -- State College PA
  ('11000018-0000-0000-0000-000000000001', 'penn-state-area-rentals', 'Penn State Area Rentals', NULL, 'State College', 'Pennsylvania', 'PA', '16801', 2.4, 0, 'D', 16, 35, 5, false, false),
  ('11000018-0000-0000-0000-000000000002', 'collegetown-property-mgmt', 'Collegetown Property Management', 'CPM LLC', 'State College', 'Pennsylvania', 'PA', '16803', 3.6, 0, 'B', 5, 14, 1, false, false)
ON CONFLICT (slug) DO NOTHING;


-- ── PROPERTIES ──────────────────────────────────────────────

INSERT INTO public.properties
  (id, landlord_id, address_line1, city, state, state_abbr, zip, property_type, unit_count, year_built, avg_rating, review_count, address_normalized)
VALUES
  -- NYC properties
  ('22000001-0000-0000-0000-000000000001', '11000001-0000-0000-0000-000000000001', '245 E 14th St', 'New York', 'New York', 'NY', '10003', 'apartment', 24, 1962, 2.7, 0, '245 e 14th st'),
  ('22000001-0000-0000-0000-000000000002', '11000001-0000-0000-0000-000000000002', '315 W 86th St', 'New York', 'New York', 'NY', '10024', 'apartment', 18, 1948, 3.8, 0, '315 w 86th st'),
  ('22000001-0000-0000-0000-000000000003', '11000001-0000-0000-0000-000000000003', '510 W 125th St', 'New York', 'New York', 'NY', '10027', 'apartment', 32, 1938, 2.0, 0, '510 w 125th st'),
  ('22000001-0000-0000-0000-000000000004', '11000001-0000-0000-0000-000000000004', '88 Orchard St', 'New York', 'New York', 'NY', '10002', 'apartment', 12, 1971, 4.3, 0, '88 orchard st'),
  ('22000001-0000-0000-0000-000000000005', '11000001-0000-0000-0000-000000000005', '412 Atlantic Ave', 'New York', 'New York', 'NY', '11217', 'apartment', 20, 1955, 3.4, 0, '412 atlantic ave'),
  -- Chicago properties
  ('22000002-0000-0000-0000-000000000001', '11000002-0000-0000-0000-000000000001', '3224 N Halsted St', 'Chicago', 'Illinois', 'IL', '60657', 'apartment', 8, 1924, 3.6, 0, '3224 n halsted st'),
  ('22000002-0000-0000-0000-000000000002', '11000002-0000-0000-0000-000000000002', '6801 S Cottage Grove Ave', 'Chicago', 'Illinois', 'IL', '60637', 'apartment', 16, 1941, 1.8, 0, '6801 s cottage grove ave'),
  ('22000002-0000-0000-0000-000000000003', '11000002-0000-0000-0000-000000000003', '1450 N Milwaukee Ave', 'Chicago', 'Illinois', 'IL', '60622', 'apartment', 6, 1908, 4.0, 0, '1450 n milwaukee ave'),
  -- LA properties
  ('22000003-0000-0000-0000-000000000001', '11000003-0000-0000-0000-000000000001', '6842 Hollywood Blvd', 'Los Angeles', 'California', 'CA', '90028', 'apartment', 28, 1967, 2.5, 0, '6842 hollywood blvd'),
  ('22000003-0000-0000-0000-000000000002', '11000003-0000-0000-0000-000000000002', '520 S Burnside Ave', 'Los Angeles', 'California', 'CA', '90036', 'apartment', 14, 1959, 4.4, 0, '520 s burnside ave'),
  ('22000003-0000-0000-0000-000000000003', '11000003-0000-0000-0000-000000000003', '7721 Havenhurst Ave', 'Los Angeles', 'California', 'CA', '91605', 'apartment', 36, 1972, 2.2, 0, '7721 havenhurst ave'),
  -- SF properties
  ('22000004-0000-0000-0000-000000000001', '11000004-0000-0000-0000-000000000001', '2845 Mission St', 'San Francisco', 'California', 'CA', '94110', 'apartment', 22, 1931, 3.3, 0, '2845 mission st'),
  ('22000004-0000-0000-0000-000000000002', '11000004-0000-0000-0000-000000000002', '180 Fell St', 'San Francisco', 'California', 'CA', '94102', 'apartment', 18, 1956, 3.9, 0, '180 fell st'),
  -- Boston properties
  ('22000005-0000-0000-0000-000000000001', '11000005-0000-0000-0000-000000000001', '12 Peterborough St', 'Boston', 'Massachusetts', 'MA', '02215', 'apartment', 10, 1945, 3.5, 0, '12 peterborough st'),
  ('22000005-0000-0000-0000-000000000002', '11000005-0000-0000-0000-000000000002', '34 Brighton Ave', 'Boston', 'Massachusetts', 'MA', '02134', 'apartment', 8, 1928, 2.3, 0, '34 brighton ave'),
  -- Philadelphia properties
  ('22000006-0000-0000-0000-000000000001', '11000006-0000-0000-0000-000000000001', '1340 Frankford Ave', 'Philadelphia', 'Pennsylvania', 'PA', '19125', 'apartment', 12, 1947, 3.2, 0, '1340 frankford ave'),
  ('22000006-0000-0000-0000-000000000002', '11000006-0000-0000-0000-000000000002', '230 S 22nd St', 'Philadelphia', 'Pennsylvania', 'PA', '19103', 'apartment', 16, 1963, 4.0, 0, '230 s 22nd st'),
  -- Baltimore properties
  ('22000007-0000-0000-0000-000000000001', '11000007-0000-0000-0000-000000000001', '3012 O Donnell St', 'Baltimore', 'Maryland', 'MD', '21224', 'townhouse', 1, 1925, 3.4, 0, '3012 o donnell st'),
  ('22000007-0000-0000-0000-000000000002', '11000007-0000-0000-0000-000000000002', '3415 N Charles St', 'Baltimore', 'Maryland', 'MD', '21218', 'apartment', 20, 1938, 2.6, 0, '3415 n charles st'),
  -- Pittsburgh properties
  ('22000008-0000-0000-0000-000000000001', '11000008-0000-0000-0000-000000000001', '5716 Forbes Ave', 'Pittsburgh', 'Pennsylvania', 'PA', '15217', 'apartment', 8, 1932, 3.7, 0, '5716 forbes ave'),
  ('22000008-0000-0000-0000-000000000002', '11000008-0000-0000-0000-000000000002', '418 Meyran Ave', 'Pittsburgh', 'Pennsylvania', 'PA', '15213', 'apartment', 12, 1955, 2.1, 0, '418 meyran ave'),
  -- Seattle properties
  ('22000009-0000-0000-0000-000000000001', '11000009-0000-0000-0000-000000000001', '417 E Pine St', 'Seattle', 'Washington', 'WA', '98122', 'apartment', 14, 1952, 3.8, 0, '417 e pine st'),
  ('22000009-0000-0000-0000-000000000002', '11000009-0000-0000-0000-000000000002', '2204 2nd Ave', 'Seattle', 'Washington', 'WA', '98121', 'apartment', 22, 1968, 2.4, 0, '2204 2nd ave'),
  -- Austin properties
  ('22000010-0000-0000-0000-000000000001', '11000010-0000-0000-0000-000000000001', '2808 E Cesar Chavez St', 'Austin', 'Texas', 'TX', '78702', 'house', 1, 1948, 3.6, 0, '2808 e cesar chavez st'),
  ('22000010-0000-0000-0000-000000000002', '11000010-0000-0000-0000-000000000002', '1610 S Congress Ave', 'Austin', 'Texas', 'TX', '78704', 'apartment', 18, 1972, 2.8, 0, '1610 s congress ave'),
  -- Houston properties
  ('22000011-0000-0000-0000-000000000001', '11000011-0000-0000-0000-000000000001', '808 Westheimer Rd', 'Houston', 'Texas', 'TX', '77006', 'apartment', 24, 1965, 3.4, 0, '808 westheimer rd'),
  ('22000011-0000-0000-0000-000000000002', '11000011-0000-0000-0000-000000000002', '1422 Yale St', 'Houston', 'Texas', 'TX', '77008', 'house', 1, 1940, 2.5, 0, '1422 yale st'),
  -- Miami properties
  ('22000012-0000-0000-0000-000000000001', '11000012-0000-0000-0000-000000000001', '1428 Brickell Ave', 'Miami', 'Florida', 'FL', '33131', 'apartment', 40, 1980, 3.7, 0, '1428 brickell ave'),
  ('22000012-0000-0000-0000-000000000002', '11000012-0000-0000-0000-000000000002', '1830 SW 8th St', 'Miami', 'Florida', 'FL', '33135', 'apartment', 16, 1958, 2.2, 0, '1830 sw 8th st'),
  -- Denver properties
  ('22000013-0000-0000-0000-000000000001', '11000013-0000-0000-0000-000000000001', '1035 E 17th Ave', 'Denver', 'Colorado', 'CO', '80218', 'apartment', 12, 1952, 3.5, 0, '1035 e 17th ave'),
  ('22000013-0000-0000-0000-000000000002', '11000013-0000-0000-0000-000000000002', '3315 W 32nd Ave', 'Denver', 'Colorado', 'CO', '80211', 'house', 1, 1937, 2.7, 0, '3315 w 32nd ave'),
  -- Dallas properties
  ('22000014-0000-0000-0000-000000000001', '11000014-0000-0000-0000-000000000001', '3520 Commerce St', 'Dallas', 'Texas', 'TX', '75226', 'apartment', 10, 1968, 3.3, 0, '3520 commerce st'),
  ('22000014-0000-0000-0000-000000000002', '11000014-0000-0000-0000-000000000002', '2525 McKinney Ave', 'Dallas', 'Texas', 'TX', '75201', 'apartment', 28, 1985, 3.9, 0, '2525 mckinney ave'),
  -- DC properties
  ('22000015-0000-0000-0000-000000000001', '11000015-0000-0000-0000-000000000001', '3216 14th St NW', 'Washington', 'District of Columbia', 'DC', '20010', 'apartment', 20, 1944, 3.2, 0, '3216 14th st nw'),
  ('22000015-0000-0000-0000-000000000002', '11000015-0000-0000-0000-000000000002', '1726 Connecticut Ave NW', 'Washington', 'District of Columbia', 'DC', '20009', 'apartment', 30, 1960, 4.2, 0, '1726 connecticut ave nw'),
  -- Atlanta properties
  ('22000016-0000-0000-0000-000000000001', '11000016-0000-0000-0000-000000000001', '830 Peachtree St NE', 'Atlanta', 'Georgia', 'GA', '30308', 'apartment', 28, 1971, 3.8, 0, '830 peachtree st ne'),
  ('22000016-0000-0000-0000-000000000002', '11000016-0000-0000-0000-000000000002', '1104 Glenwood Ave SE', 'Atlanta', 'Georgia', 'GA', '30316', 'house', 1, 1948, 2.6, 0, '1104 glenwood ave se'),
  -- Nashville properties
  ('22000017-0000-0000-0000-000000000001', '11000017-0000-0000-0000-000000000001', '1012 Gallatin Ave', 'Nashville', 'Tennessee', 'TN', '37206', 'apartment', 14, 1960, 3.6, 0, '1012 gallatin ave'),
  -- State College properties
  ('22000018-0000-0000-0000-000000000001', '11000018-0000-0000-0000-000000000001', '312 E Beaver Ave', 'State College', 'Pennsylvania', 'PA', '16801', 'apartment', 16, 1968, 2.3, 0, '312 e beaver ave'),
  ('22000018-0000-0000-0000-000000000002', '11000018-0000-0000-0000-000000000002', '204 W College Ave', 'State College', 'Pennsylvania', 'PA', '16801', 'apartment', 24, 1975, 3.5, 0, '204 w college ave')
ON CONFLICT DO NOTHING;


-- ── PUBLIC RECORDS ───────────────────────────────────────────

INSERT INTO public.public_records
  (source, source_id, record_type, landlord_id, property_id, title, description, severity, status, filed_date, source_url, raw_data)
VALUES
  -- NYC HPD violations
  ('nyc_hpd','SEED-HPD-001','hpd_violation','11000001-0000-0000-0000-000000000001','22000001-0000-0000-0000-000000000001',
   'HPD Violation: Class C - No Heat/Hot Water','Failure to maintain minimum heat (68°F daytime) as required by NY Admin Code §27-2029','high','open','2025-11-15','https://data.cityofnewyork.us','{}'),
  ('nyc_hpd','SEED-HPD-002','hpd_violation','11000001-0000-0000-0000-000000000001','22000001-0000-0000-0000-000000000001',
   'HPD Violation: Class C - Mold','Mold growth in bathroom exceeding acceptable limits. Owner must remediate within 7 days.','high','open','2025-10-03','https://data.cityofnewyork.us','{}'),
  ('nyc_hpd','SEED-HPD-003','hpd_violation','11000001-0000-0000-0000-000000000001','22000001-0000-0000-0000-000000000001',
   'HPD Violation: Class B - Plumbing','Defective plumbing — persistent leak from pipe above bathroom ceiling causing water damage','medium','open','2025-08-21','https://data.cityofnewyork.us','{}'),
  ('nyc_hpd','SEED-HPD-004','hpd_violation','11000001-0000-0000-0000-000000000003','22000001-0000-0000-0000-000000000003',
   'HPD Violation: Class C - Vermin Infestation','Active cockroach and mouse infestation throughout building. Extermination required immediately.','critical','open','2025-12-01','https://data.cityofnewyork.us','{}'),
  ('nyc_hpd','SEED-HPD-005','hpd_violation','11000001-0000-0000-0000-000000000003','22000001-0000-0000-0000-000000000003',
   'HPD Violation: Class C - Broken Windows','Multiple windows not weathertight — 4 windows broken in building common areas','high','open','2025-09-14','https://data.cityofnewyork.us','{}'),
  ('nyc_hpd','SEED-HPD-006','hpd_violation','11000001-0000-0000-0000-000000000005','22000001-0000-0000-0000-000000000005',
   'HPD Violation: Class B - Peeling Paint','Lead paint hazard — peeling paint in units with children under 6. Required remediation overdue.','high','open','2025-10-28','https://data.cityofnewyork.us','{}'),

  -- NYC DOB violations
  ('nyc_dob','SEED-DOB-001','dob_violation','11000001-0000-0000-0000-000000000001','22000001-0000-0000-0000-000000000001',
   'DOB Violation: Fire Safety - Missing Smoke Detectors','Missing or inoperable smoke detectors on floors 2, 3, and 4. Building code section 28-301.1.','high','open','2025-07-09','https://data.cityofnewyork.us','{}'),
  ('nyc_dob','SEED-DOB-002','dob_violation','11000001-0000-0000-0000-000000000003','22000001-0000-0000-0000-000000000003',
   'DOB Violation: Structural - Unsafe Parapet','Unsafe structural conditions noted: cracked masonry parapet wall. Emergency repair ordered.','critical','open','2025-05-18','https://data.cityofnewyork.us','{}'),

  -- Chicago violations
  ('chicago_buildings','SEED-CHI-001','chicago_violation','11000002-0000-0000-0000-000000000002','22000002-0000-0000-0000-000000000002',
   'Chicago Violation: Failure to Maintain — Exterior','Owner failed to maintain exterior walls, roof, foundation per Chicago Municipal Code 13-196-010','high','open','2025-10-22','https://www.chicago.gov','{}'),
  ('chicago_buildings','SEED-CHI-002','chicago_violation','11000002-0000-0000-0000-000000000002','22000002-0000-0000-0000-000000000002',
   'Chicago Violation: Inadequate Heat','Failure to provide heat at minimum 68°F during heating season (Sept 15–June 1)','high','open','2025-11-03','https://www.chicago.gov','{}'),
  ('chicago_buildings','SEED-CHI-003','chicago_violation','11000002-0000-0000-0000-000000000004','22000002-0000-0000-0000-000000000001',
   'Chicago Violation: Illegal Conversion','Basement unit converted to residential use without permit. Chicago Building Code violation.','medium','pending','2025-06-15','https://www.chicago.gov','{}'),
  ('chicago_buildings','SEED-CHI-004','chicago_violation','11000002-0000-0000-0000-000000000002',NULL,
   'Chicago Violation: Bedbugs — Owner Failed to Treat','Owner failed to remediate bedbug infestation in multiple units within required timeframe.','high','open','2025-12-05','https://www.chicago.gov','{}'),

  -- SF violations
  ('sf_housing','SEED-SF-001','sf_violation','11000004-0000-0000-0000-000000000003','22000004-0000-0000-0000-000000000001',
   'SF Housing: Habitability Complaint — Rodent Infestation','Multiple tenant complaints of rodent infestation. Owner failed to remediate within required 72 hours.','high','open','2025-09-28','https://www.sf.gov','{}'),
  ('sf_housing','SEED-SF-002','sf_violation','11000004-0000-0000-0000-000000000003','22000004-0000-0000-0000-000000000001',
   'SF Housing: Illegal Rent Increase','Owner imposed rent increase exceeding annual allowable limit under SF Rent Ordinance','medium','open','2025-07-12','https://www.sf.gov','{}'),

  -- LA violations
  ('la_lahd','SEED-LA-001','la_violation','11000003-0000-0000-0000-000000000001','22000003-0000-0000-0000-000000000001',
   'Los Angeles: LAHD Code Case — Habitability','Multiple habitability violations: broken windows, plumbing leaks, inadequate lighting in common areas','high','open','2025-08-05','https://housing.lacity.gov','{}'),
  ('la_lahd','SEED-LA-002','la_violation','11000003-0000-0000-0000-000000000003','22000003-0000-0000-0000-000000000003',
   'Los Angeles: LAHD Code Case — Lead Paint','Lead paint hazard identified in pre-1978 building. Owner ordered to remediate.','critical','open','2025-06-30','https://housing.lacity.gov','{}'),
  ('la_lahd','SEED-LA-003','la_violation','11000003-0000-0000-0000-000000000003','22000003-0000-0000-0000-000000000003',
   'Los Angeles: LAHD Code Case — No Hot Water','Building has had no hot water for 14+ days. Emergency notice issued to owner.','critical','open','2025-11-20','https://housing.lacity.gov','{}'),

  -- Boston violations
  ('boston_isd','SEED-BOS-001','boston_violation','11000005-0000-0000-0000-000000000002','22000005-0000-0000-0000-000000000002',
   'Boston ISD: Sanitary Code — Cockroach Infestation','Inspector confirmed active cockroach infestation in multiple units. Owner must treat within 14 days.','high','open','2025-10-15','https://data.boston.gov','{}'),
  ('boston_isd','SEED-BOS-002','boston_violation','11000005-0000-0000-0000-000000000002','22000005-0000-0000-0000-000000000002',
   'Boston ISD: Sanitary Code — Inadequate Heat','Temperatures recorded below minimum 68°F. Failure to comply with MA Gen. Laws Ch. 186 §14.','high','open','2025-12-08','https://data.boston.gov','{}'),

  -- Philadelphia violations
  ('philly_li','SEED-PHL-001','philly_violation','11000006-0000-0000-0000-000000000003',NULL,
   'Philadelphia L&I: Housing Violation — Structural Deficiency','Structural deficiencies: cracked foundation, deteriorated floor joists in occupied unit','critical','open','2025-09-03','https://opendataphilly.org','{}'),
  ('philly_li','SEED-PHL-002','philly_violation','11000006-0000-0000-0000-000000000003',NULL,
   'Philadelphia L&I: Housing Violation — No Running Water','Failure to maintain running water. Occupied residential unit without cold water supply.','critical','open','2025-11-01','https://opendataphilly.org','{}'),

  -- Baltimore
  ('baltimore_vacants','SEED-BALT-001','baltimore_vacant_notice','11000007-0000-0000-0000-000000000002','22000007-0000-0000-0000-000000000002',
   'Baltimore: Vacant Building Notice','Building declared vacant by Baltimore Housing. Conditions: broken windows, unsecured entrances.','high','open','2025-04-22','https://data.baltimorecity.gov','{}'),

  -- Seattle violations
  ('seattle_sdci','SEED-SEA-001','seattle_violation','11000009-0000-0000-0000-000000000002','22000009-0000-0000-0000-000000000002',
   'Seattle SDCI: Rental Housing Code Violation','Violation of Seattle Residential Code: lack of required ventilation, defective plumbing fixtures','medium','open','2025-08-30','https://data.seattle.gov','{}'),

  -- Austin violations
  ('austin_code','SEED-AUS-001','austin_complaint','11000010-0000-0000-0000-000000000002','22000010-0000-0000-0000-000000000002',
   'Austin Code: Property Maintenance Complaint','Failure to maintain property per Austin City Code. Issues: deteriorated siding, overgrown vegetation blocking exits.','low','open','2025-07-14','https://data.austintexas.gov','{}'),

  -- Houston violations
  ('houston_code','SEED-HOU-001','houston_violation','11000011-0000-0000-0000-000000000002','22000011-0000-0000-0000-000000000002',
   'Houston Code: Property Maintenance Violation','Exterior deterioration, missing siding, non-functional HVAC. Owner cited under Houston City Code Chapter 10.','medium','open','2025-07-19','https://data.houstontx.gov','{}'),
  ('houston_code','SEED-HOU-002','houston_violation','11000011-0000-0000-0000-000000000002',NULL,
   'Houston Code: Sewage Backup — Repeated Violations','Third sewage backup incident in 90 days. Owner failed to repair main sewer line.','high','open','2025-10-11','https://data.houstontx.gov','{}'),

  -- Miami violations
  ('miami_dade','SEED-MIA-001','miami_violation','11000012-0000-0000-0000-000000000002','22000012-0000-0000-0000-000000000002',
   'Miami-Dade: Code Compliance — AC Failure','Owner failed to maintain functional air conditioning as required by Miami-Dade County ordinance during heat emergency.','high','open','2025-08-14','https://opendata.miamidade.gov','{}'),
  ('miami_dade','SEED-MIA-002','miami_violation','11000012-0000-0000-0000-000000000002',NULL,
   'Miami-Dade: Code Compliance — Mold Remediation Failure','Third citation for failure to remediate mold in multiple units. Owner faces fines and potential receivership.','critical','open','2025-11-28','https://opendata.miamidade.gov','{}'),

  -- Denver violations
  ('denver_code','SEED-DEN-001','denver_violation','11000013-0000-0000-0000-000000000002','22000013-0000-0000-0000-000000000002',
   'Denver Code: Residential Code Violation','Failure to maintain property per Denver Revised Municipal Code 10-2. Broken gutters, deteriorated siding.','medium','open','2025-09-22','https://www.denvergov.org','{}'),

  -- Dallas violations
  ('dallas_code','SEED-DAL-001','dallas_violation','11000014-0000-0000-0000-000000000003','22000014-0000-0000-0000-000000000001',
   'Dallas Code: Property Maintenance Violation','Multiple exterior and interior code violations. Owner failed to respond to 30-day notice to repair.','medium','open','2025-06-18','https://www.dallasopendata.com','{}'),

  -- DC violations
  ('dc_dcra','SEED-DC-001','dc_violation','11000015-0000-0000-0000-000000000003',NULL,
   'DC DCRA: Housing Violation — Habitability','Inspector found multiple habitability violations: mold in 3 units, broken heating system, rodent infestation.','high','open','2025-10-07','https://opendata.dc.gov','{}'),
  ('dc_dcra','SEED-DC-002','dc_violation','11000015-0000-0000-0000-000000000001','22000015-0000-0000-0000-000000000001',
   'DC DCRA: Building Permit Violation — Unpermitted Work','Unpermitted construction in residential units. Work must stop and owner must obtain permits retroactively.','medium','pending','2025-05-30','https://opendata.dc.gov','{}'),

  -- Atlanta violations
  ('atlanta_permits','SEED-ATL-001','atlanta_violation','11000016-0000-0000-0000-000000000002','22000016-0000-0000-0000-000000000002',
   'Atlanta: Building Permit — Expired/Abandoned','Permitted renovation work abandoned for 6+ months. Permit expired without final inspection.','low','open','2025-03-11','https://opendata.atlantaregional.com','{}'),

  -- Nashville violations
  ('nashville_code','SEED-NASH-001','nashville_violation','11000017-0000-0000-0000-000000000002',NULL,
   'Nashville: Code Enforcement — Property Maintenance','Failure to maintain exterior of property. Issues: broken gutters, deteriorated deck, overgrown lot.','low','open','2025-08-25','https://data.nashville.gov','{}'),

  -- Court cases
  ('court_listener','SEED-CRT-001','court_listener','11000001-0000-0000-0000-000000000003',NULL,
   'Federal Court Case: Fair Housing Act Complaint','Complaint alleges discriminatory refusal to rent based on source of income (Section 8 vouchers). Case filed in SDNY.','high','pending','2024-03-15','https://www.courtlistener.com','{}'),
  ('court_listener','SEED-CRT-002','court_listener','11000004-0000-0000-0000-000000000003',NULL,
   'Federal Court Case: Retaliatory Eviction','Tenants allege retaliatory eviction following habitability complaints to SF DBI. Case filed in N.D. Cal.','medium','pending','2024-09-08','https://www.courtlistener.com','{}'),
  ('court_listener','SEED-CRT-003','court_listener','11000012-0000-0000-0000-000000000002',NULL,
   'Federal Court Case: Habitability — Class Action','Class action filed by 12 tenants alleging persistent uninhabitable conditions. Filed in S.D. Fla.','high','pending','2025-02-14','https://www.courtlistener.com','{}'),

  -- Pittsburgh violations
  ('pittsburgh_pli','SEED-PGH-001','pittsburgh_violation','11000008-0000-0000-0000-000000000002','22000008-0000-0000-0000-000000000002',
   'Pittsburgh PLI: Housing Violation — No Certificate of Occupancy','Building lacks valid Certificate of Occupancy. All units occupied illegally per Pittsburgh Code.','high','open','2025-05-09','https://data.wprdc.org','{}'),

  -- Eviction filings
  ('lsc_evictions','SEED-EVC-001','lsc_eviction','11000001-0000-0000-0000-000000000003',NULL,
   'Eviction Filing: Non-Payment of Rent','Landlord filed eviction action against tenant. Case number 2025-LT-001234.','medium','pending','2025-10-01','https://civilcourtdata.lsc.gov','{}'),
  ('lsc_evictions','SEED-EVC-002','lsc_eviction','11000002-0000-0000-0000-000000000002',NULL,
   'Eviction Filing: Lease Violation','Eviction filed for alleged lease violations. Case number 2025-LT-002891.','medium','pending','2025-11-14','https://civilcourtdata.lsc.gov','{}')

ON CONFLICT (source, source_id) DO NOTHING;


-- ── UPDATE LANDLORD VIOLATION COUNTS ────────────────────────
-- Refresh the materialized counts from the seed data above

UPDATE public.landlords l SET
  open_violation_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE pr.landlord_id = l.id AND pr.status = 'open'
  ),
  total_violation_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE pr.landlord_id = l.id
  ),
  eviction_count = (
    SELECT COUNT(*) FROM public.public_records pr
    WHERE pr.landlord_id = l.id
    AND pr.record_type IN ('eviction', 'eviction_filing', 'lsc_eviction', 'court_listener')
  )
WHERE l.id IN (
  SELECT DISTINCT landlord_id FROM public.public_records WHERE landlord_id IS NOT NULL
);
